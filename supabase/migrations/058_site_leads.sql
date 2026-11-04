-- Teste gratuito na página de vendas (mapadelalma.site): guarda quem testou, o código de rastreio (ref) e o que clicou.
create table if not exists site_leads (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  nome text not null,
  nome_chave text not null,
  nascimento date not null,
  mapa_slug text,
  idioma text default 'es',
  utm jsonb default '{}'::jsonb,
  fbp text, fbc text, ua text, pais text,
  cliques jsonb default '[]'::jsonb,
  wa_click_at timestamptz,
  checkout_click_at timestamptz,
  lead_id uuid references leads(id) on delete set null,
  pago boolean default false,
  matched_by text,
  created_at timestamptz default now()
);
create index if not exists site_leads_chave on site_leads(nome_chave, nascimento);
create index if not exists site_leads_lead on site_leads(lead_id);
alter table site_leads enable row level security;
