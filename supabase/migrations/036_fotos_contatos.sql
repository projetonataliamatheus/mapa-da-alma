-- Foto de perfil do WhatsApp de cada contato (cópia guardada; atualiza a cada 7 dias)
alter table leads add column if not exists photo_url text;
alter table leads add column if not exists photo_at timestamptz;
