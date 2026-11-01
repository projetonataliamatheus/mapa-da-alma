-- 039: Financeiro
-- Contas a pagar (despesas) e lançamentos de receita manuais. Os pagamentos do Asaas/Pix (tabela payments) entram
-- direto nos recebimentos, sem duplicar. Comprovantes (imagem/PDF) ficam na pasta privada "financeiro".

create table if not exists fin_entries (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  kind text not null default 'despesa' check (kind in ('despesa', 'receita')),
  description text not null,
  category text not null default 'Outros',
  amount numeric not null check (amount >= 0),
  recurrence text not null default 'unico' check (recurrence in ('unico', 'mensal', 'anual')),
  due_date date,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  paid_at timestamptz,
  method text,
  supplier text,
  notes text,
  lead_id uuid references leads on delete set null,
  service text,
  parent_id uuid references fin_entries on delete set null,
  archived boolean not null default false,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fin_entries_due_idx on fin_entries (kind, status, due_date);
create index if not exists fin_entries_lead_idx on fin_entries (lead_id);

-- comprovantes e comentários de qualquer lançamento (despesa, receita manual ou pagamento do Asaas)
create table if not exists fin_files (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references fin_entries on delete cascade,
  payment_id uuid references payments on delete cascade,
  path text not null,
  name text not null,
  mime text,
  size int,
  created_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists fin_files_entry_idx on fin_files (entry_id);
create index if not exists fin_files_payment_idx on fin_files (payment_id);

create table if not exists fin_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references fin_entries on delete cascade,
  payment_id uuid references payments on delete cascade,
  text text not null,
  author text,
  created_at timestamptz not null default now()
);

-- observações em pagamentos do Asaas
alter table payments add column if not exists notes text;

-- só o servidor lê e grava (a API confere a permissão "financeiro")
alter table fin_entries enable row level security;
alter table fin_files enable row level security;
alter table fin_comments enable row level security;

do $$
begin
  begin
    insert into storage.buckets (id, name, public) values ('financeiro', 'financeiro', false) on conflict (id) do nothing;
  exception when others then raise notice 'storage: %', sqlerrm;
  end;
end $$;
