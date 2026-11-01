-- =====================================================================
-- Radar de Vendas — atualização 017: modelos premium (GitHub) e mensagens não lidas
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 016).
-- =====================================================================

-- modelos premium (cópia do que está na pasta Modelos do GitHub)
create table if not exists premium_templates (
  slug text primary key,
  name text not null,
  niche text,
  niches text[] not null default '{}',
  keywords text[] not null default '{}',
  style text,
  description text,
  hash text,
  build_ok boolean not null default false,
  build_error text,
  thumb_url text,
  html_path text,
  content jsonb,
  embedding jsonb,
  status text not null default 'pronto',
  active boolean not null default true,
  uses int not null default 0,
  updated_at timestamptz not null default now()
);
alter table premium_templates enable row level security;
drop policy if exists equipe on premium_templates;
create policy equipe on premium_templates for select to authenticated using (public.is_team());

-- modelo escolhido para o cliente
alter table leads add column if not exists premium_template text;
-- mensagens do cliente ainda não vistas pela equipe (bolinha vermelha em Conversas)
alter table leads add column if not exists team_unread int not null default 0;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table premium_templates';
  exception when others then null;
  end;
end $$;
