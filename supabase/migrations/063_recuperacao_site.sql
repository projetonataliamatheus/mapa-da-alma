-- Recuperação de vendas do site pelo WhatsApp: quem fez o teste grátis e não comprou.
alter table site_leads add column if not exists whatsapp text;
alter table site_leads add column if not exists site text;            -- 'br' (português) ou 'es' (espanhol)
alter table site_leads add column if not exists recup_status text;    -- null = ainda não; enviado | sem_whatsapp | ja_cliente | bloqueado | falhou
alter table site_leads add column if not exists recup_at timestamptz;
alter table site_leads add column if not exists recup_lead_id uuid references leads(id) on delete set null;
create index if not exists site_leads_recup on site_leads(recup_status, created_at);
update site_leads set site = case when idioma = 'pt' then 'br' else 'es' end where site is null;

-- Chip fixo de "Recuperação": só ele chama quem fez o teste e não comprou.
alter table whatsapp_numbers add column if not exists recuperacao boolean not null default false;
create unique index if not exists whatsapp_numbers_recuperacao_um on whatsapp_numbers(recuperacao) where recuperacao;
