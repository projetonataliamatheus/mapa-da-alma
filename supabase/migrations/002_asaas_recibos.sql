-- =====================================================================
-- Radar de Vendas — atualização 002: Pix pelo Asaas e recibos em PDF
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001).
-- =====================================================================
alter table leads add column if not exists cpf_cnpj text;
alter table leads add column if not exists asaas_customer_id text;
alter table leads add column if not exists accepted_offer jsonb;

alter table payments alter column provider set default 'asaas';
alter table payments add column if not exists receipt_number bigint generated always as identity;
alter table payments add column if not exists receipt_path text;
alter table payments add column if not exists receipt_sent_at timestamptz;
alter table payments add column if not exists receipt_attempts int not null default 0;
alter table payments add column if not exists receipt_error text;
alter table payments add column if not exists asaas_receipt_url text;

-- pasta privada para os PDFs dos recibos
insert into storage.buckets (id, name, public) values ('recibos', 'recibos', false)
on conflict (id) do nothing;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table payments';
  exception when others then null;
  end;
end $$;
