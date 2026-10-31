-- Mapa da Alma — banco de dados inicial.
-- Rode este arquivo inteiro no Supabase: SQL Editor → New query → colar → Run.

create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  criado_em timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  whatsapp text unique,                 -- só números, com 55
  nome text,                            -- como aparece no WhatsApp
  nome_completo text,                   -- nome de nascimento (para o mapa)
  nascimento date,
  cpf text,
  email text,
  etapa text not null default 'novo',   -- novo, conversando, dados, pix, pago, entregue, sem_interesse
  resumo text,                          -- resumo da conversa feito pela IA
  memoria jsonb not null default '[]',  -- fatos importantes que a IA lembra
  ia_pausada boolean not null default false,
  precisa_humano boolean not null default false,
  origem text,                          -- ex.: anúncio, indicação
  ultima_msg_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists mensagens (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references clientes(id) on delete cascade,
  autor text not null check (autor in ('cliente','ia','humano','sistema')),
  texto text not null,
  wa_id text,
  criado_em timestamptz not null default now()
);
create index if not exists mensagens_cliente on mensagens(cliente_id, criado_em);
create unique index if not exists mensagens_wa on mensagens(wa_id) where wa_id is not null;

create table if not exists produtos (
  slug text primary key,
  nome text not null,
  descricao text not null default '',
  preco numeric(10,2) not null,
  ativo boolean not null default true,
  ordem int not null default 0
);

create table if not exists mapas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,            -- usado no link ao vivo /m/<slug>
  cliente_id uuid references clientes(id) on delete set null,
  tipo text not null default 'pessoal' check (tipo in ('pessoal','casal')),
  nome text not null,
  nascimento date not null,
  nome2 text,
  nascimento2 date,
  pdf_path text,
  status text not null default 'gerado' check (status in ('gerado','enviado')),
  enviado_em timestamptz,
  visualizacoes int not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  produto text references produtos(slug),
  valor numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado','estornado')),
  asaas_id text unique,
  pix_copia_cola text,
  link text,
  mapa_id uuid references mapas(id) on delete set null,
  dados jsonb not null default '{}',    -- nomes e datas do(s) mapa(s) a gerar
  pago_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null default 'geral', -- tráfego, ferramentas, servidor, outros
  valor numeric(10,2) not null,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

create table if not exists textos (
  categoria text not null,
  numero text not null,
  conteudo text not null,
  atualizado_em timestamptz not null default now(),
  primary key (categoria, numero)
);

create table if not exists aprendizados (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  origem text not null default 'venda',  -- venda, manual, perda
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists config (
  chave text primary key,
  valor jsonb not null
);

create table if not exists uso_ia (
  id bigint generated always as identity primary key,
  tarefa text, modelo text, entrada int, saida int,
  cliente_id uuid references clientes(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Segurança: só o servidor (service role) acessa as tabelas.
alter table admins enable row level security;
alter table clientes enable row level security;
alter table mensagens enable row level security;
alter table produtos enable row level security;
alter table mapas enable row level security;
alter table pagamentos enable row level security;
alter table despesas enable row level security;
alter table textos enable row level security;
alter table aprendizados enable row level security;
alter table config enable row level security;
alter table uso_ia enable row level security;

-- Conta a visualização do link ao vivo.
create or replace function contar_visualizacao(p_slug text) returns void language sql as $$
  update mapas set visualizacoes = visualizacoes + 1 where slug = p_slug;
$$;

-- Produtos iniciais (preços editáveis no painel).
insert into produtos (slug, nome, descricao, preco, ordem) values
  ('pessoal', 'Mapa da Alma Pessoal', 'Estudo completo de numerologia cabalística + signo solar, com PDF e link ao vivo.', 47.00, 1),
  ('casal', 'Mapa da Alma do Casal', 'Mapa de compatibilidade amorosa do casal + o resumo do mapa de cada um, com PDF e link ao vivo.', 77.00, 2)
on conflict (slug) do nothing;

-- Bucket privado para os PDFs.
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false) on conflict (id) do nothing;
