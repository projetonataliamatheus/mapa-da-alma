-- 021: prévia sai alguns minutos depois do pedido (fila no próprio lead)
alter table leads add column if not exists preview_due_at timestamptz;
alter table leads add column if not exists preview_job jsonb;
create index if not exists leads_preview_due_idx on leads (preview_due_at) where preview_due_at is not null;
