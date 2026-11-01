-- 037: Segurança (parte 1)
-- 1) Área do cliente: usuário e senha para editar Link na bio e Catálogo (o link de edição sozinho não basta mais)
-- 2) Mostrar/ocultar prévias, links na bio e catálogos para o cliente

create table if not exists client_accounts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads on delete set null,
  name text not null default '',
  username text unique not null,
  pass_hash text not null,
  pass_ver int not null default 1,
  active boolean not null default true,
  failed int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_accounts_lead_idx on client_accounts (lead_id);
-- sem políticas: só o servidor (chave de serviço) lê e grava; a senha nunca chega ao navegador
alter table client_accounts enable row level security;

alter table bio_pages add column if not exists account_id uuid references client_accounts on delete set null;
alter table bio_pages add column if not exists visible boolean not null default true;
alter table catalogs add column if not exists account_id uuid references client_accounts on delete set null;
alter table catalogs add column if not exists visible boolean not null default true;
alter table previews add column if not exists visible boolean not null default true;

-- derruba as sessões de uma pessoa (usado ao redefinir a verificação em 2 etapas)
create or replace function public.signout_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.sessions where user_id = p_user;
end $$;
revoke all on function public.signout_user(uuid) from public, anon, authenticated;
grant execute on function public.signout_user(uuid) to service_role;
