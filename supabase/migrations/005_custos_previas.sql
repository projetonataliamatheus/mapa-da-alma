-- =====================================================================
-- Radar de Vendas — atualização 005: controle de custos, modelos de site e prévias
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 004).
-- =====================================================================

-- Cada chamada paga (IA ou Google) fica registrada aqui para o painel de Custos
create table if not exists usage_log (
  id bigint generated always as identity primary key,
  kind text not null,              -- 'ai' | 'google_pro' | 'google_ent'
  task text,                       -- resposta, abertura, follow_up, previa, livro…
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  calls int not null default 1,
  cost_usd numeric not null default 0,
  lead_id uuid references leads on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists usage_log_created_idx on usage_log (created_at);
create index if not exists usage_log_kind_idx on usage_log (kind, created_at);

-- Soma do mês corrente (horário de São Paulo)
create or replace function public.usage_month()
returns table (kind text, task text, model text, calls bigint, input_tokens bigint, output_tokens bigint, cost_usd numeric)
language sql stable security definer set search_path = public as $$
  select kind, task, model, sum(calls)::bigint, sum(input_tokens)::bigint, sum(output_tokens)::bigint, sum(cost_usd)
  from usage_log
  where (auth.role() = 'service_role' or public.is_team())
    and created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
  group by kind, task, model;
$$;

-- Modelos de site por nicho (exemplos prontos + base da prévia)
create table if not exists site_templates (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  name text not null,
  example_url text,
  accent text not null default '#e8562a',
  style text not null default 'moderno',
  hero_image text,
  gallery text[] not null default '{}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists site_templates_touch on site_templates;
create trigger site_templates_touch before update on site_templates for each row execute function public.touch_updated_at();

-- Prévias geradas para leads
create table if not exists previews (
  slug text primary key,
  lead_id uuid references leads on delete cascade,
  template_id uuid references site_templates on delete set null,
  content jsonb not null,
  views int not null default 0,
  created_by text not null default 'ia',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists previews_lead_idx on previews (lead_id);
drop trigger if exists previews_touch on previews;
create trigger previews_touch before update on previews for each row execute function public.touch_updated_at();

alter table leads add column if not exists preview_slug text;
alter table leads add column if not exists example_sent boolean not null default false;

alter table usage_log enable row level security;
alter table site_templates enable row level security;
alter table previews enable row level security;
drop policy if exists equipe on usage_log;
create policy equipe on usage_log for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists equipe on site_templates;
create policy equipe on site_templates for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists equipe on previews;
create policy equipe on previews for all to authenticated using (public.is_team()) with check (public.is_team());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table previews';
  exception when others then null;
  end;
end $$;
