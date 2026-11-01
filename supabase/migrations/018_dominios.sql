-- Domínios próprios (painel, checkout e prévias). O sistema mostra o DNS e confere sozinho.
create table if not exists domains (
  host text primary key,
  roles text[] not null default '{}',
  dns_ok boolean not null default false,
  https_ok boolean not null default false,
  dns_found text,
  last_check timestamptz,
  error text,
  created_at timestamptz not null default now()
);
alter table domains enable row level security;
drop policy if exists equipe on domains;
create policy equipe on domains for select to authenticated using (public.is_team());
