-- Prospecção manual: lista de selecionados, rascunho revisável antes de enviar e motivo da recusa
alter table leads add column if not exists prospect text;          -- 'selecionado' (na lista, ainda não iniciado)
alter table leads add column if not exists draft jsonb;            -- { parts: [...], number_id, number_label, agent }
alter table leads add column if not exists draft_at timestamptz;   -- quando o rascunho sai sozinho
alter table leads add column if not exists draft_hold boolean not null default false; -- equipe segurou para editar
alter table leads add column if not exists lost_reason text;
alter table leads add column if not exists lost_at timestamptz;
create index if not exists leads_prospect_idx on leads (prospect) where prospect is not null;
create index if not exists leads_draft_idx on leads (draft_at) where wa_status = 'rascunho';
alter table whatsapp_numbers add column if not exists prospect_today int not null default 0;
alter table whatsapp_numbers add column if not exists prospect_date text;
alter table whatsapp_numbers add column if not exists prospect_next_at timestamptz;
