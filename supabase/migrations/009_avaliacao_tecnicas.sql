-- =====================================================================
-- Radar de Vendas — atualização 009: nota de qualidade das técnicas
-- A IA dá nota de 0 a 10 para cada técnica; abaixo de 4 não é usada.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 008).
-- =====================================================================
alter table knowledge_insights add column if not exists quality int check (quality between 0 and 10);
alter table knowledge_insights add column if not exists quality_note text;
create index if not exists knowledge_insights_quality_idx on knowledge_insights (quality);

-- busca: ignora as técnicas fracas e dá mais peso às de nota alta
create or replace function public.match_insights(q text, emb extensions.vector(384), n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select i.*, d.name as doc_name,
           case when emb is not null and i.embedding is not null then 1 - (i.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(i.tsv, to_tsquery('portuguese', q)) else 0 end as kw
    from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
    where (i.quality is null or i.quality >= 4)
      and ((emb is not null and i.embedding is not null)
       or (coalesce(q, '') <> '' and i.tsv @@ to_tsquery('portuguese', q)))
  )
  select id, kind, title, content, example, doc_name,
         ((sim * 2 + least(kw, 0.5)) * (1 + wins * 0.4 + least(used, 50) * 0.01) * (0.6 + coalesce(quality, 6) / 15.0))::real as score
  from c
  where sim > 0 or kw > 0
  order by score desc
  limit n
$$;

create or replace function public.search_insights(q text, n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable as $$
  select i.id, i.kind, i.title, i.content, i.example, d.name,
         (ts_rank(i.tsv, to_tsquery('portuguese', q)) * (1 + i.wins * 0.4 + least(i.used, 50) * 0.01) * (0.6 + coalesce(i.quality, 6) / 15.0))::real as score
  from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
  where i.tsv @@ to_tsquery('portuguese', q) and (i.quality is null or i.quality >= 4)
  order by score desc
  limit n
$$;
