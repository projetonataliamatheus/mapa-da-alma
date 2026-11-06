-- Mapa da Alma: qualidade da correspondência do Meta + lista de clientes compradores.

-- 1) IP do visitante do site (teste gratuito), enviado ao Meta junto com o navegador
alter table site_leads add column if not exists ip text;

-- 2) Auditoria: cada evento enviado ao Meta (o que, quando, com quais dados, se o Meta aceitou)
create table if not exists meta_eventos (
  id bigint generated always as identity primary key,
  lead_id uuid references leads on delete set null,
  evento text not null,
  event_id text,
  ok boolean not null default true,
  resposta text,
  action_source text,
  campos text[] not null default '{}',
  valor numeric,
  moeda text,
  order_id text,
  teste boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists meta_eventos_lead_idx on meta_eventos (lead_id, created_at);
create index if not exists meta_eventos_evento_idx on meta_eventos (evento, created_at);
alter table meta_eventos enable row level security;
drop policy if exists equipe on meta_eventos;
create policy equipe on meta_eventos for all to authenticated using (public.is_team()) with check (public.is_team());

-- 3) CLIENTES COMPRADORES: uma linha por pagamento confirmado, com todos os dados do comprador.
--    No Supabase: Table Editor › Views › clientes_compradores
drop view if exists public.clientes_compradores;
create view public.clientes_compradores with (security_invoker = true) as
select
  p.paid_at                                                        as data_compra,
  coalesce(l.memory->>'mapa_nome_completo', l.memory->'cliente'->>'nome', l.name) as nome_completo,
  l.name                                                           as nome_no_whatsapp,
  l.whatsapp                                                       as whatsapp,
  coalesce(l.memory->'cliente'->>'email', l.memory->>'email')      as email,
  upper(coalesce(l.memory->'cliente'->>'pais', l.pais, 'br'))      as pais,
  l.idioma                                                         as idioma,
  l.memory->>'mapa_nascimento'                                     as nascimento,
  l.memory->>'signo'                                               as signo,
  l.gender                                                         as genero,
  l.memory->'cliente'->>'cidade'                                   as cidade,
  l.memory->'cliente'->>'estado'                                   as estado,
  l.memory->'cliente'->>'cep'                                      as cep,
  p.service                                                        as produto,
  coalesce(p.valor_local, p.amount)                                as valor_pago,
  coalesce(p.moeda, 'BRL')                                         as moeda,
  p.amount                                                         as valor_em_reais_registrado,
  p.provider                                                       as gateway,
  p.method                                                         as forma_pagamento,
  p.provider_id                                                    as pedido_id,
  p.status                                                         as status_pagamento,
  case when l.memory->'site'->>'ref' is not null then 'Site (teste gratuito)'
       when l.campanha_id is not null or l.memory->'ads'->>'ad_id' is not null or l.source = 'anuncio' then 'Anúncio (WhatsApp)'
       else coalesce(l.source, 'Orgânico') end                     as origem,
  l.campaign                                                       as campanha,
  l.memory->'ads'->>'ad_id'                                        as anuncio_id,
  l.memory->'site'->'utm'->>'utm_source'                           as utm_source,
  l.memory->'site'->'utm'->>'utm_campaign'                         as utm_campaign,
  coalesce((l.memory->'capi') @> '"Purchase"'::jsonb, false)        as purchase_enviado_ao_meta,
  l.is_client                                                      as e_cliente,
  l.client_since                                                   as cliente_desde,
  l.id                                                             as lead_id,
  p.id                                                             as pagamento_id
from payments p
join leads l on l.id = p.lead_id
where p.status = 'pago' and coalesce(l.cortesia, false) = false;
comment on view public.clientes_compradores is 'Mapa da Alma: clientes que pagaram (1 linha por pagamento). Base da lista de clientes compradores em Excel e dos públicos do Meta.';
