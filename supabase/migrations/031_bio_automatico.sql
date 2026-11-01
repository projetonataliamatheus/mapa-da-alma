-- 031: link na bio automático depois da prévia do site (agendado alguns minutos depois)
alter table leads add column if not exists bio_due_at timestamptz;
create index if not exists leads_bio_due_idx on leads (bio_due_at) where bio_due_at is not null;
