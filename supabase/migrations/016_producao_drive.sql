-- =====================================================================
-- Radar de Vendas — atualização 016: Produção + backup no Google Drive
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 015).
-- =====================================================================

-- integrações com segredo (token do Google Drive): só o servidor lê (sem política para o painel)
create table if not exists integrations (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table integrations enable row level security;

-- pasta do cliente no Drive + produção
alter table leads add column if not exists drive_folder_id text;
alter table leads add column if not exists drive_folder_url text;
alter table leads add column if not exists drive_subfolders jsonb;
alter table leads add column if not exists drive_doc_id text;
alter table leads add column if not exists drive_doc_url text;
alter table leads add column if not exists drive_error text;
alter table leads add column if not exists doc_dirty boolean not null default false;
alter table leads add column if not exists project_summary text;
alter table leads add column if not exists project_tasks jsonb;
alter table leads add column if not exists project_summary_at timestamptz;
alter table leads add column if not exists production_status text;
alter table leads add column if not exists production_owner text;
alter table leads add column if not exists production_due date;
alter table leads add column if not exists production_notes text;
alter table leads add column if not exists production_started_at timestamptz;
alter table leads add column if not exists delivered_at timestamptz;
do $$ begin
  alter table leads add constraint leads_production_status_chk
    check (production_status is null or production_status in ('fila', 'materiais', 'producao', 'revisao', 'entregue', 'pausado'));
exception when duplicate_object then null; end $$;
create index if not exists leads_production_idx on leads (production_status) where production_status is not null;

-- arquivos que o cliente mandou: cópia no Drive
alter table messages add column if not exists drive_file_id text;
alter table messages add column if not exists drive_url text;
alter table messages add column if not exists drive_tries int not null default 0;
create index if not exists messages_drive_pending_idx on messages (created_at)
  where drive_file_id is null and direction = 'in' and kind in ('image', 'video', 'document', 'audio');

-- recibos e comprovantes no Drive
alter table payments add column if not exists receipt_drive_url text;
alter table payments add column if not exists asaas_drive_url text;
alter table payments add column if not exists drive_tries int not null default 0;

-- quem já pagou entra na Produção
update leads set production_status = 'fila', doc_dirty = true where stage = 'pago' and production_status is null;
