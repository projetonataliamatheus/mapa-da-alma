-- =====================================================================
-- Radar de Vendas — atualização 003: base de conhecimento que aprende
-- e conversas com probabilidade de compra.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 e 002).
-- =====================================================================

-- conversas
alter table leads add column if not exists close_probability int not null default 0;
alter table messages add column if not exists meta jsonb not null default '{}'::jsonb;

-- livros: progresso da leitura pela IA
alter table knowledge_docs add column if not exists sections int not null default 0;
alter table knowledge_docs add column if not exists sections_done int not null default 0;
alter table knowledge_docs add column if not exists insights int not null default 0;
alter table knowledge_docs add column if not exists chars int not null default 0;
alter table knowledge_docs add column if not exists updated_at timestamptz not null default now();

-- busca em português e inglês (livros podem estar nos dois idiomas)
drop index if exists knowledge_chunks_tsv_idx;
alter table knowledge_chunks drop column if exists tsv;
alter table knowledge_chunks add column tsv tsvector
  generated always as (to_tsvector('portuguese', content) || to_tsvector('english', content)) stored;
create index if not exists knowledge_chunks_tsv_idx on knowledge_chunks using gin (tsv);
create index if not exists knowledge_chunks_doc_idx on knowledge_chunks (doc_id, id);

-- técnicas extraídas dos livros
create table if not exists knowledge_insights (
  id bigserial primary key,
  doc_id uuid not null references knowledge_docs on delete cascade,
  kind text not null default 'tecnica',
  title text not null,
  content text not null,
  example text,
  tags text[] not null default '{}',
  used int not null default 0,
  wins int not null default 0,
  created_at timestamptz not null default now(),
  tsv tsvector
);

create or replace function public.knowledge_insights_tsv() returns trigger language plpgsql as $$
begin
  new.tsv := setweight(to_tsvector('portuguese', coalesce(new.title, '') || ' ' || array_to_string(new.tags, ' ')), 'A')
          || setweight(to_tsvector('portuguese', coalesce(new.content, '') || ' ' || coalesce(new.example, '')), 'B');
  return new;
end $$;
drop trigger if exists knowledge_insights_tsv on knowledge_insights;
create trigger knowledge_insights_tsv before insert or update of title, content, example, tags on knowledge_insights
  for each row execute function public.knowledge_insights_tsv();
create index if not exists knowledge_insights_tsv_idx on knowledge_insights using gin (tsv);
create index if not exists knowledge_insights_doc_idx on knowledge_insights (doc_id);

-- cérebro de vendas: o resumo de tudo o que foi aprendido, usado em toda conversa
create table if not exists knowledge_brain (
  id int primary key default 1 check (id = 1),
  content text,
  docs int not null default 0,
  insights int not null default 0,
  updated_at timestamptz not null default now()
);
insert into knowledge_brain (id) values (1) on conflict do nothing;

-- busca: técnicas mais relevantes (as que já ajudaram a vender sobem)
create or replace function public.search_insights(q text, n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable as $$
  select i.id, i.kind, i.title, i.content, i.example, d.name,
         (ts_rank(i.tsv, to_tsquery('portuguese', q)) * (1 + i.wins * 0.4 + least(i.used, 50) * 0.01))::real as score
  from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
  where i.tsv @@ to_tsquery('portuguese', q)
  order by score desc
  limit n
$$;

-- busca: trechos originais dos livros
create or replace function public.search_chunks(q text, n int default 3)
returns table (id bigint, content text, doc_name text, score real)
language sql stable as $$
  select c.id, c.content, d.name,
         ts_rank(c.tsv, to_tsquery('portuguese', q) || to_tsquery('english', q))::real as score
  from knowledge_chunks c join knowledge_docs d on d.id = c.doc_id
  where c.tsv @@ (to_tsquery('portuguese', q) || to_tsquery('english', q))
  order by score desc
  limit n
$$;

create or replace function public.bump_insights(ids bigint[], field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if field = 'wins' then
    update knowledge_insights set wins = wins + 1 where id = any(ids);
  else
    update knowledge_insights set used = used + 1 where id = any(ids);
  end if;
end $$;

drop function if exists public.search_knowledge(text, int);

-- segurança e tempo real
do $$
declare t text;
begin
  foreach t in array array['knowledge_insights','knowledge_brain'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
  foreach t in array array['knowledge_docs','knowledge_brain'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- livros enviados antes desta atualização: a IA lê de novo
update knowledge_docs set status = 'aprendendo', sections_done = 0 where status = 'processado' and insights = 0;
