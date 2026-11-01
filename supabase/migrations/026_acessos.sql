-- 026: Acessos (banco de usuários e senhas da equipe) + permissões por menu
-- As senhas ficam criptografadas (AES-256-GCM) pelo servidor; o banco nunca guarda a senha aberta.
-- A tabela não tem política para o navegador: só a API do painel (com a permissão "acessos") lê e grava.
create table if not exists acessos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'Geral',
  url text,
  usuario text,
  senha_enc text,
  notas text,
  kid text,
  created_by uuid,
  created_by_name text,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table acessos enable row level security;
create index if not exists acessos_nome_idx on acessos (lower(nome));

-- quem viu ou copiou cada senha
create table if not exists acessos_log (
  id bigserial primary key,
  acesso_id uuid references acessos on delete cascade,
  actor_id uuid,
  actor_name text,
  action text not null,
  created_at timestamptz not null default now()
);
alter table acessos_log enable row level security;
create index if not exists acessos_log_idx on acessos_log (acesso_id, created_at desc);

-- menus que ganharam permissão própria: quem já via pela permissão antiga continua vendo
update team_members set perms = array_append(perms, 'inteligencia')
 where 'aprendizado' = any(perms) and not ('inteligencia' = any(perms));
update team_members set perms = array_append(perms, 'modelos_premium')
 where 'modelos' = any(perms) and not ('modelos_premium' = any(perms));
