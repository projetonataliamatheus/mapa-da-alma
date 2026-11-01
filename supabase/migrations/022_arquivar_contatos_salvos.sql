-- 022: arquivar conversa e contato salvo no celular (IA desligada por padrão)
alter table leads add column if not exists archived_at timestamptz;
alter table leads add column if not exists saved_contact boolean not null default false;
