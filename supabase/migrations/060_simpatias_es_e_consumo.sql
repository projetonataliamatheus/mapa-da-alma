-- Mapa da Alma: simpatias já traduzidas (espanhol pronto para envio) + consumo detalhado de todos os serviços.
alter table simpatias add column if not exists titulo_es text;
alter table simpatias add column if not exists texto_es text;

-- usage_log passa a guardar também serviços que não são IA (ElevenLabs, Browserless, Grok...), com unidade e detalhe.
alter table usage_log add column if not exists service text;      -- anthropic | elevenlabs | browserless | grok | google | outro
alter table usage_log add column if not exists units numeric;     -- caracteres, segundos, páginas, imagens...
alter table usage_log add column if not exists unit_kind text;    -- tokens | chars | pdf | imagem | chamada
alter table usage_log add column if not exists meta jsonb;
create index if not exists usage_log_service_idx on usage_log (service, created_at);
create index if not exists usage_log_lead_idx on usage_log (lead_id, created_at);

-- Configuração por serviço: limite mensal, saldo informado (com data) e custo por unidade
create table if not exists consumo_config (
  service text primary key,
  limite_usd numeric not null default 0,
  saldo_usd numeric,
  saldo_em timestamptz,
  custo_unidade numeric not null default 0,
  obs text,
  updated_at timestamptz not null default now()
);
alter table consumo_config enable row level security;
drop policy if exists equipe on consumo_config;
create policy equipe on consumo_config for all to authenticated using (public.is_team()) with check (public.is_team());
insert into consumo_config (service, limite_usd) values ('anthropic', 8), ('elevenlabs', 5), ('browserless', 0), ('grok', 0), ('google', 0)
on conflict (service) do nothing;
