-- =====================================================================
-- Radar de Vendas — atualização 013: base ativa, prioridade dos livros e Prompt Master
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 012).
-- =====================================================================

-- 1) prioridade do material: primário (base principal) ou secundário (apoio)
alter table knowledge_docs add column if not exists priority text not null default 'secundario';
do $$ begin
  alter table knowledge_docs add constraint knowledge_docs_priority_chk check (priority in ('primario', 'secundario'));
exception when duplicate_object then null; end $$;

-- 2) Prompt Master: diretriz fixa da agência. Fica numa tabela própria,
--    então a atualização do Cérebro de vendas nunca encosta nela.
create table if not exists prompt_master (
  id int primary key default 1 check (id = 1),
  content text,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into prompt_master (id) values (1) on conflict do nothing;
alter table prompt_master enable row level security;
drop policy if exists equipe_ler on prompt_master;
create policy equipe_ler on prompt_master for select to authenticated using (public.is_team());
drop policy if exists master_grava on prompt_master;
create policy master_grava on prompt_master for all to authenticated using (public.is_master()) with check (public.is_master());

-- 3) limpeza da base: apaga técnicas e trechos sem livro (órfãos) e devolve quantos saíram
create or replace function public.kb_sync_orphans()
returns table (insights bigint, chunks bigint)
language plpgsql security definer set search_path = public as $$
declare a bigint; b bigint;
begin
  delete from knowledge_insights i where not exists (select 1 from knowledge_docs d where d.id = i.doc_id);
  get diagnostics a = row_count;
  delete from knowledge_chunks c where not exists (select 1 from knowledge_docs d where d.id = c.doc_id);
  get diagnostics b = row_count;
  update knowledge_docs d set insights = (select count(*) from knowledge_insights i where i.doc_id = d.id);
  return query select a, b;
end $$;

-- 4) busca de técnicas com a prioridade do livro (primário pesa mais)
create or replace function public.match_insights_v2(q text, emb extensions.vector(384), n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, priority text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select i.*, d.name as doc_name, d.priority as doc_priority,
           case when emb is not null and i.embedding is not null then 1 - (i.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(i.tsv, to_tsquery('portuguese', q)) else 0 end as kw
    from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
    where (i.quality is null or i.quality >= 4)
      and ((emb is not null and i.embedding is not null)
       or (coalesce(q, '') <> '' and i.tsv @@ to_tsquery('portuguese', q)))
  )
  select id, kind, title, content, example, doc_name, doc_priority,
         ((sim * 2 + least(kw, 0.5)) * (1 + wins * 0.4 + least(used, 50) * 0.01) * (0.6 + coalesce(quality, 6) / 15.0)
           * case when doc_priority = 'primario' then 1.0 else 0.43 end)::real as score
  from c
  where sim > 0 or kw > 0
  order by score desc
  limit n
$$;

-- trechos dos livros: os do primário também pesam mais
create or replace function public.match_chunks(q text, emb extensions.vector(384), n int default 3)
returns table (id bigint, content text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select ch.id, ch.content, d.name as doc_name, d.priority as doc_priority,
           case when emb is not null and ch.embedding is not null then 1 - (ch.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(ch.tsv, to_tsquery('portuguese', q) || to_tsquery('english', q)) else 0 end as kw
    from knowledge_chunks ch join knowledge_docs d on d.id = ch.doc_id
    where (emb is not null and ch.embedding is not null)
       or (coalesce(q, '') <> '' and ch.tsv @@ (to_tsquery('portuguese', q) || to_tsquery('english', q)))
  )
  select id, content, doc_name, ((sim * 2 + least(kw, 0.5)) * case when doc_priority = 'primario' then 1.0 else 0.6 end)::real as score
  from c where sim > 0.86 or kw > 0
  order by score desc
  limit n
$$;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table prompt_master';
  exception when others then null;
  end;
end $$;
