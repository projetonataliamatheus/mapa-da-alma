-- Mapa da Alma: alertas de saldo (Claude, Browserless, ElevenLabs) no sininho, na aba Consumo e no menu Sistema.
alter table consumo_config add column if not exists limite_unidades numeric;   -- ex.: Browserless = 1000 PDFs/mês
create table if not exists consumo_alertas (
  id bigint generated always as identity primary key,
  chave text unique not null,            -- ex.: claude:<saldo_em>:3 · browserless:2026-11:400 · eleven:2026-11:2
  service text not null,
  nivel text not null default 'aviso',   -- aviso | critico
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists consumo_alertas_lida_idx on consumo_alertas (lida, created_at desc);
alter table consumo_alertas enable row level security;
drop policy if exists equipe on consumo_alertas;
create policy equipe on consumo_alertas for all to authenticated using (public.is_team()) with check (public.is_team());
update consumo_config set limite_unidades = 1000 where service = 'browserless' and limite_unidades is null;
