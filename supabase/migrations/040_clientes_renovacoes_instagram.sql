-- 040: Central do cliente, renovações automáticas, acompanhamento do Instagram, depoimentos e registro de acessos

-- cliente da agência (aparece no menu Clientes)
alter table leads add column if not exists is_client boolean not null default false;
alter table leads add column if not exists client_since timestamptz;
alter table leads add column if not exists testimonial_asked_at timestamptz;
update leads set is_client = true, client_since = coalesce(client_since, paid_at, updated_at)
 where not is_client and (stage = 'pago' or paid_at is not null or delivered_at is not null);

-- renovações: domínio, hospedagem, mensalidades (viram conta a receber e cobrança no WhatsApp)
create table if not exists renewals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads on delete cascade,
  title text not null,
  kind text not null default 'mensalidade',          -- dominio | hospedagem | mensalidade | outro
  amount numeric not null check (amount > 0),
  cycle text not null default 'mensal' check (cycle in ('mensal', 'anual')),
  next_due date not null,
  remind_days int not null default 5,                -- quantos dias antes manda a cobrança
  auto_charge boolean not null default true,         -- manda a cobrança no WhatsApp sozinho
  active boolean not null default true,
  notes text,
  last_link_id uuid,
  last_entry_id uuid,
  last_sent_at timestamptz,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists renewals_due_idx on renewals (active, next_due);
create index if not exists renewals_lead_idx on renewals (lead_id);
alter table renewals enable row level security;
alter table checkout_links add column if not exists renewal_id uuid references renewals on delete set null;
alter table fin_entries add column if not exists renewal_id uuid references renewals on delete set null;
alter table fin_entries add column if not exists payment_id uuid references payments on delete set null;

-- Instagram: perfis acompanhados e a foto do dia (números públicos, sem login)
create table if not exists ig_profiles (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads on delete cascade,
  username text not null,
  full_name text,
  pic_url text,
  active boolean not null default true,
  last_fetch_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create unique index if not exists ig_profiles_user_idx on ig_profiles (lower(username), lead_id);
create table if not exists ig_snapshots (
  profile_id uuid references ig_profiles on delete cascade,
  day date not null,
  followers int,
  following int,
  posts int,
  likes int,          -- soma das curtidas dos posts recentes
  comments int,       -- soma dos comentários dos posts recentes
  recent int,         -- quantos posts entraram na soma
  views int,
  source text not null default 'auto',
  created_at timestamptz not null default now(),
  primary key (profile_id, day)
);
alter table ig_profiles enable row level security;
alter table ig_snapshots enable row level security;

-- registro de acessos ao painel
create table if not exists access_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  name text,
  ip text,
  city text,
  device text,
  user_agent text,
  new_device boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists access_log_user_idx on access_log (user_id, created_at desc);
alter table access_log enable row level security;
