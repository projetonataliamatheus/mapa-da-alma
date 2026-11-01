-- 020: modelos masculino/feminino (público), cópias do mesmo modelo (família) e gênero do cliente
alter table premium_templates add column if not exists audience text;   -- 'masculino' | 'feminino' | null (todos)
alter table premium_templates add column if not exists family text;     -- modelo de origem das cópias
alter table premium_templates add column if not exists edited_at timestamptz;

alter table leads add column if not exists gender text;                  -- 'masculino' | 'feminino' | null

-- nomes já consultados (IBGE): consulta grátis, uma vez por nome
create table if not exists name_gender (
  name text primary key,
  gender text,
  prob numeric,
  source text,
  created_at timestamptz not null default now()
);
alter table name_gender enable row level security;
