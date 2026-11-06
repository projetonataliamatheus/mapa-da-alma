-- Administradores pelo WhatsApp: números cadastrados podem pedir relatórios ao próprio chat (sem IA, sem custo).
create table if not exists admin_wa_config (id int primary key default 1, ativo boolean not null default false, updated_at timestamptz default now());
insert into admin_wa_config (id, ativo) values (1, false) on conflict (id) do nothing;
create table if not exists admin_wa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  wa_key text unique not null,
  ativo boolean not null default true,
  created_at timestamptz default now()
);
alter table admin_wa_config enable row level security;
alter table admin_wa enable row level security;
