-- 027: Link na bio (olinks.com.br/empresa)
-- Cada página tem um endereço (slug), os dados (jsonb) e um link secreto para o próprio cliente editar.
create table if not exists bio_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'previa', 'publicado', 'pausado')),
  data jsonb not null default '{}'::jsonb,
  edit_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  views int not null default 0,
  clicks int not null default 0,
  created_by_name text,
  published_at timestamptz,
  client_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bio_pages_lead_idx on bio_pages (lead_id);
alter table bio_pages enable row level security;
drop policy if exists ler on bio_pages;
create policy ler on bio_pages for select to authenticated using (public.is_team());

-- visitas e cliques por dia (um registro por página/dia/botão, só soma)
create table if not exists bio_stats (
  page_id uuid references bio_pages on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  kind text not null,
  target text not null default '',
  n int not null default 0,
  primary key (page_id, day, kind, target)
);
alter table bio_stats enable row level security;
drop policy if exists ler on bio_stats;
create policy ler on bio_stats for select to authenticated using (public.is_team());

create or replace function public.bio_hit(p_page uuid, p_kind text, p_target text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into bio_stats (page_id, kind, target, n) values (p_page, p_kind, coalesce(left(p_target, 60), ''), 1)
  on conflict (page_id, day, kind, target) do update set n = bio_stats.n + 1;
  if p_kind = 'view' then update bio_pages set views = views + 1 where id = p_page;
  else update bio_pages set clicks = clicks + 1 where id = p_page; end if;
end $$;

-- novo menu com permissão própria: quem já via Modelos passa a ver Link na bio
update team_members set perms = array_append(perms, 'bio')
 where 'modelos' = any(perms) and not ('bio' = any(perms));
