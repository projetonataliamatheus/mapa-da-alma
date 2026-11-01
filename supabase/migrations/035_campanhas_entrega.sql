-- Origem/campanha do lead, entrega automática, combo e recuperação
alter table leads add column if not exists campaign text;               -- nome da campanha (texto do anúncio) quando veio de anúncio
alter table leads add column if not exists recovery_sent_at timestamptz; -- mensagem de recuperação (viu a prévia e sumiu)
alter table payments add column if not exists delivered_at timestamptz;  -- produtos entregues automaticamente
alter table checkout_links add column if not exists combo jsonb;         -- combo: [{slug, name, price}]
create index if not exists leads_campaign_idx on leads (campaign) where campaign is not null;
create index if not exists leads_source_idx on leads (source);
-- conversas antigas que começaram pelo texto do anúncio passam a contar como anúncio
update leads set source = 'anuncio'
where source = 'whatsapp' and id in (
  select distinct on (m.lead_id) m.lead_id from messages m
  where m.direction = 'in' and (m.body ilike '%posso ter mais informações%' or m.body ilike '%quero criar o meu site%')
  order by m.lead_id, m.created_at
);
