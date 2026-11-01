-- 029: Catálogo digital (cardápio com QR Code)
-- Loja, categorias e produtos ficam num só registro (jsonb): carrega a página com uma consulta só.
-- O dono edita pelo link secreto (sem login), igual ao Link na bio.
create table if not exists catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'previa', 'publicado', 'pausado')),
  plan text not null default 'unico' check (plan in ('unico', 'mensal')),
  data jsonb not null default '{}'::jsonb,
  edit_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  views int not null default 0,
  opens int not null default 0,
  created_by_name text,
  published_at timestamptz,
  client_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalogs_lead_idx on catalogs (lead_id);
alter table catalogs enable row level security;
drop policy if exists ler on catalogs;
create policy ler on catalogs for select to authenticated using (public.is_team());

create table if not exists catalog_stats (
  catalog_id uuid references catalogs on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  kind text not null,
  target text not null default '',
  n int not null default 0,
  primary key (catalog_id, day, kind, target)
);
alter table catalog_stats enable row level security;
drop policy if exists ler on catalog_stats;
create policy ler on catalog_stats for select to authenticated using (public.is_team());

create or replace function public.catalog_hit(p_id uuid, p_kind text, p_target text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into catalog_stats (catalog_id, kind, target, n) values (p_id, p_kind, coalesce(left(p_target, 60), ''), 1)
  on conflict (catalog_id, day, kind, target) do update set n = catalog_stats.n + 1;
  if p_kind = 'view' then update catalogs set views = views + 1 where id = p_id;
  elsif p_kind = 'open' then update catalogs set opens = opens + 1 where id = p_id; end if;
end $$;

update team_members set perms = array_append(perms, 'catalogo')
 where 'bio' = any(perms) and not ('catalogo' = any(perms));
