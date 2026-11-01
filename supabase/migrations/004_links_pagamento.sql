-- =====================================================================
-- Radar de Vendas — atualização 004: links de pagamento e checkout próprio
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001, 002 e 003).
-- =====================================================================

create table if not exists checkout_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  service_slug text,
  title text not null,
  description text,
  includes text,
  amount numeric not null check (amount > 0),
  billing text not null default 'unico' check (billing in ('unico', 'mensal')),
  max_installments int not null default 1,
  methods text[] not null default '{pix,card}',
  status text not null default 'ativo' check (status in ('ativo', 'pago', 'cancelado', 'expirado')),
  expires_at timestamptz,
  created_by text not null default 'equipe',
  created_by_user uuid,
  customer_name text,
  customer_document text,
  customer_phone text,
  customer_email text,
  asaas_customer_id text,
  asaas_payment_id text,
  asaas_subscription_id text,
  last_method text,
  attempts int not null default 0,
  views int not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkout_links_lead_idx on checkout_links (lead_id);
create index if not exists checkout_links_status_idx on checkout_links (status);
create index if not exists checkout_links_sub_idx on checkout_links (asaas_subscription_id);

drop trigger if exists checkout_links_touch on checkout_links;
create trigger checkout_links_touch before update on checkout_links for each row execute function public.touch_updated_at();

alter table payments add column if not exists checkout_id uuid references checkout_links on delete set null;
alter table payments add column if not exists method text;

-- só a equipe logada vê os links; o checkout público usa o servidor (chave de serviço)
alter table checkout_links enable row level security;
drop policy if exists equipe on checkout_links;
create policy equipe on checkout_links for all to authenticated using (public.is_team()) with check (public.is_team());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table checkout_links';
  exception when others then null;
  end;
end $$;
