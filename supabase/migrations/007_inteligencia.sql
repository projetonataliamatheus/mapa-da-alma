-- =====================================================================
-- Radar de Vendas — atualização 007: inteligência que aprende com as vendas
--  · Base 1 (livros): busca por significado (vetores) além da busca por palavras
--  · Base 2 (cenários reais): casos ganhos/perdidos e mensagens campeãs
--  · 👍/👎 da equipe nas mensagens da IA
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 006).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists vector with schema extensions;

-- vetores de significado (modelo multilingual-e5-small, 384 dimensões, roda grátis na VPS)
alter table knowledge_insights add column if not exists embedding extensions.vector(384);
alter table knowledge_chunks add column if not exists embedding extensions.vector(384);

-- cada mensagem enviada é medida uma vez (respondeu? esquentou? vendeu?)
alter table messages add column if not exists scored boolean not null default false;
create index if not exists messages_unscored_idx on messages (created_at) where scored = false and direction = 'out';

-- 👍/👎 da equipe
alter table messages add column if not exists feedback int check (feedback in (-1, 1));
alter table messages add column if not exists feedback_note text;
alter table messages add column if not exists feedback_by uuid;

-- segunda camada do cérebro: o que funciona com os NOSSOS clientes
alter table knowledge_brain add column if not exists real_content text;
alter table knowledge_brain add column if not exists real_cases int not null default 0;
alter table knowledge_brain add column if not exists real_updated_at timestamptz;

alter table leads add column if not exists case_done boolean not null default false;

-- ---------- Base 2: casos reais ----------
create table if not exists sales_cases (
  id bigserial primary key,
  lead_id uuid unique references leads on delete set null,
  outcome text not null check (outcome in ('ganho', 'perdido')),
  niche text,
  channel text,
  approach_slug text,
  service text,
  price numeric,
  days_to_close numeric,
  messages int not null default 0,
  pains text[] not null default '{}',
  objections jsonb not null default '[]'::jsonb,
  turning_point text,
  lost_reason text,
  lesson text not null,
  summary text not null,
  tags text[] not null default '{}',
  used int not null default 0,
  wins int not null default 0,
  embedding extensions.vector(384),
  tsv tsvector,
  created_at timestamptz not null default now()
);
create index if not exists sales_cases_niche_idx on sales_cases (niche, outcome);
create index if not exists sales_cases_tsv_idx on sales_cases using gin (tsv);

create or replace function public.sales_cases_tsv() returns trigger language plpgsql as $$
begin
  new.tsv := to_tsvector('portuguese',
    coalesce(new.niche, '') || ' ' || coalesce(new.summary, '') || ' ' || coalesce(new.lesson, '') || ' ' ||
    coalesce(new.turning_point, '') || ' ' || coalesce(new.lost_reason, '') || ' ' ||
    array_to_string(new.pains, ' ') || ' ' || array_to_string(new.tags, ' ') || ' ' || coalesce(new.objections::text, ''));
  return new;
end $$;
drop trigger if exists sales_cases_tsv_t on sales_cases;
create trigger sales_cases_tsv_t before insert or update of niche, summary, lesson, turning_point, lost_reason, pains, tags, objections
  on sales_cases for each row execute function public.sales_cases_tsv();

-- ---------- Base 2: mensagens medidas (as campeãs sobem) ----------
create table if not exists msg_snippets (
  id bigserial primary key,
  message_id uuid unique references messages on delete cascade,
  lead_id uuid references leads on delete cascade,
  author text not null default 'ai',
  niche text,
  stage text,
  kind text not null default 'resposta', -- abertura | follow_up | resposta | objecao | fechamento
  situation text,                         -- o que o cliente tinha dito antes
  text text not null,
  got_reply boolean,
  temp_delta int,
  advanced boolean not null default false,
  won boolean not null default false,
  feedback int,
  score numeric not null default 0,
  used int not null default 0,
  wins int not null default 0,
  embedding extensions.vector(384),
  tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists msg_snippets_rank_idx on msg_snippets (kind, niche, score desc);
create index if not exists msg_snippets_lead_idx on msg_snippets (lead_id);
create index if not exists msg_snippets_tsv_idx on msg_snippets using gin (tsv);

create or replace function public.msg_snippets_tsv() returns trigger language plpgsql as $$
begin
  new.tsv := to_tsvector('portuguese', coalesce(new.situation, '') || ' ' || coalesce(new.text, '') || ' ' || coalesce(new.niche, ''));
  -- pontuação: respondeu, esquentou, avançou de etapa, virou venda, 👍/👎 da equipe e quantas vezes inspirou vendas
  new.score := (case when new.got_reply then 1 when new.got_reply = false then -0.5 else 0 end)
             + greatest(-1, least(2, coalesce(new.temp_delta, 0) / 15.0))
             + (case when new.advanced then 1 else 0 end)
             + (case when new.won then 3 else 0 end)
             + coalesce(new.feedback, 0) * 2.5
             + least(new.wins, 10) * 0.5;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists msg_snippets_tsv_t on msg_snippets;
create trigger msg_snippets_tsv_t before insert or update on msg_snippets for each row execute function public.msg_snippets_tsv();

-- ---------- busca híbrida (significado + palavras) ----------
-- q: termos para busca por palavras (pode ser vazio) · emb: vetor da pergunta (pode ser nulo)

create or replace function public.match_insights(q text, emb extensions.vector(384), n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select i.*, d.name as doc_name,
           case when emb is not null and i.embedding is not null then 1 - (i.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(i.tsv, to_tsquery('portuguese', q)) else 0 end as kw
    from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
    where (emb is not null and i.embedding is not null)
       or (coalesce(q, '') <> '' and i.tsv @@ to_tsquery('portuguese', q))
  )
  select id, kind, title, content, example, doc_name,
         ((sim * 2 + least(kw, 0.5)) * (1 + wins * 0.4 + least(used, 50) * 0.01))::real as score
  from c
  where sim > 0 or kw > 0
  order by score desc
  limit n
$$;

create or replace function public.match_chunks(q text, emb extensions.vector(384), n int default 3)
returns table (id bigint, content text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select ch.id, ch.content, d.name as doc_name,
           case when emb is not null and ch.embedding is not null then 1 - (ch.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(ch.tsv, to_tsquery('portuguese', q) || to_tsquery('english', q)) else 0 end as kw
    from knowledge_chunks ch join knowledge_docs d on d.id = ch.doc_id
    where (emb is not null and ch.embedding is not null)
       or (coalesce(q, '') <> '' and ch.tsv @@ (to_tsquery('portuguese', q) || to_tsquery('english', q)))
  )
  select id, content, doc_name, (sim * 2 + least(kw, 0.5))::real as score
  from c where sim > 0.86 or kw > 0
  order by score desc
  limit n
$$;

create or replace function public.match_cases(q text, emb extensions.vector(384), p_niche text, p_outcome text, n int default 2)
returns table (id bigint, outcome text, niche text, summary text, lesson text, turning_point text, lost_reason text, objections jsonb, price numeric, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select s.*,
           case when emb is not null and s.embedding is not null then 1 - (s.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(s.tsv, to_tsquery('portuguese', q)) else 0 end as kw,
           case when p_niche is not null and lower(s.niche) = lower(p_niche) then 0.35 else 0 end as same
    from sales_cases s
    where (p_outcome is null or s.outcome = p_outcome)
  )
  select id, outcome, niche, summary, lesson, turning_point, lost_reason, objections, price,
         ((sim * 2 + least(kw, 0.5) + same) * (1 + least(wins, 10) * 0.15))::real as score
  from c
  where sim > 0.86 or kw > 0 or (same > 0 and emb is null)
  order by score desc
  limit n
$$;

create or replace function public.match_snippets(q text, emb extensions.vector(384), p_niche text, p_kinds text[], n int default 3)
returns table (id bigint, kind text, niche text, situation text, text text, score real, total numeric)
language sql stable set search_path = public, extensions as $$
  with c as (
    select s.*,
           case when emb is not null and s.embedding is not null then 1 - (s.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(s.tsv, to_tsquery('portuguese', q)) else 0 end as kw,
           case when p_niche is not null and lower(s.niche) = lower(p_niche) then 0.3 else 0 end as same
    from msg_snippets s
    where s.score >= 1.5 and coalesce(s.feedback, 0) >= 0
      and (p_kinds is null or s.kind = any(p_kinds))
  )
  select c.id, c.kind, c.niche, c.situation, c.text, (c.sim * 1.5 + least(c.kw, 0.5) + c.same)::real as score, c.score as total
  from c
  where c.sim > 0.85 or c.kw > 0 or emb is null
  order by (c.sim * 1.5 + least(c.kw, 0.5) + c.same) * (1 + c.score / 4) desc
  limit n
$$;

create or replace function public.bump_cases(ids bigint[], field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if field = 'wins' then update sales_cases set wins = wins + 1 where id = any(ids);
  else update sales_cases set used = used + 1 where id = any(ids); end if;
end $$;

create or replace function public.bump_snippets(ids bigint[], field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if field = 'wins' then update msg_snippets set wins = wins + 1 where id = any(ids);
  else update msg_snippets set used = used + 1 where id = any(ids); end if;
end $$;

-- ---------- acesso ----------
alter table sales_cases enable row level security;
alter table msg_snippets enable row level security;
drop policy if exists ler on sales_cases;
drop policy if exists ler on msg_snippets;
create policy ler on sales_cases for select to authenticated using (public.is_team());
create policy ler on msg_snippets for select to authenticated using (public.is_team());
-- alterações passam pelo servidor (que confere a permissão)

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table sales_cases';
  exception when others then null;
  end;
end $$;
