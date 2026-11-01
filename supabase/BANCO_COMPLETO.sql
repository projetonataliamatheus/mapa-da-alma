-- Mapa da Alma — banco completo (base do Radar). Rode inteiro no SQL Editor do Supabase do Mapa da Alma.
-- SEGURO PARA RODAR DE NOVO: este arquivo NÃO apaga dados (só cria o que falta e ajusta).
-- (A limpeza da versão antiga foi retirada em 01/11/2026: ela apagava a tabela "mapas".)


-- ===================== 001_inicial.sql =====================
-- =====================================================================
-- Radar de Vendas — banco de dados completo
-- Cole este arquivo inteiro no Supabase > SQL Editor > New query > Run
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- Equipe ----------
create table if not exists team_members (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  role text not null default 'vendedor' check (role in ('admin','vendedor','atendente')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- A primeira conta vira administradora. As demais só entram se forem criadas
  -- por um administrador no menu Equipe (marcadas em app_metadata, que o usuário não consegue alterar).
  if (select count(*) from public.team_members) = 0 then
    insert into public.team_members (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, 'admin')
    on conflict (id) do nothing;
  elsif coalesce(new.raw_app_meta_data->>'invited', '') = 'true' then
    insert into public.team_members (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email,
            coalesce(new.raw_app_meta_data->>'role', 'vendedor'))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where id = auth.uid())
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Configurações (uma linha só) ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------- Serviços e preços ----------
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  min_price numeric,
  max_price numeric,
  price_steps numeric[] not null default '{}',
  approval_from numeric,
  bonuses text[] not null default '{}',
  delivery text,
  billing text,
  includes text,
  active boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Abordagens (teste A/B) ----------
create table if not exists approaches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  opening_example text,
  followup_example text,
  active boolean not null default true,
  weight int not null default 25,
  sends int not null default 0,
  replies int not null default 0,
  sales int not null default 0
);

-- ---------- Buscas ----------
create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  city text not null,
  radius_km int not null,
  qty int not null,
  filters jsonb not null default '{}'::jsonb,
  center_lat float8,
  center_lng float8,
  found int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------- Números de WhatsApp ----------
create table if not exists whatsapp_numbers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  instance_name text unique not null,
  phone text,
  status text not null default 'desconectado',
  qr text,
  phase_started_at timestamptz not null default now(),
  paused_until timestamptz,
  pause_reason text,
  sent_today int not null default 0,
  sent_date date,
  next_send_at timestamptz not null default now(),
  sends_since_pause int not null default 0,
  health int not null default 100,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Leads ----------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references searches on delete set null,
  place_id text unique,
  source text not null default 'google',
  name text not null,
  niche text,
  city text,
  address text,
  lat float8,
  lng float8,
  distance_km numeric,
  phone text,
  whatsapp text,
  wa_key text,
  instagram text,
  website text,
  site_status text not null default 'nenhum',
  site_reasons text[] not null default '{}',
  rating numeric,
  reviews int not null default 0,
  photos int not null default 0,
  has_hours boolean not null default true,
  maps_url text,
  score int not null default 0,
  score_parts jsonb not null default '[]'::jsonb,
  stage text not null default 'novo',
  temperature int not null default 0,
  wa_status text not null default 'nao',
  ig_status text not null default 'nao',
  number_id uuid references whatsapp_numbers on delete set null,
  approach_slug text,
  summary text,
  next_step text,
  steps text[] not null default '{}',
  ai_enabled boolean not null default true,
  needs_human text,
  approved_price numeric,
  deal_service text,
  deal_price numeric,
  objections text[] not null default '{}',
  pains text[] not null default '{}',
  followups_sent int not null default 0,
  reply_due_at timestamptz,
  last_outbound_at timestamptz,
  last_inbound_at timestamptz,
  remarketing_at date,
  opted_out boolean not null default false,
  learn_pending boolean not null default false,
  paid_amount numeric,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_wa_status_idx on leads (wa_status);
create index if not exists leads_ig_status_idx on leads (ig_status);
create index if not exists leads_wa_key_idx on leads (wa_key);
create index if not exists leads_reply_due_idx on leads (reply_due_at) where reply_due_at is not null;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists leads_touch on leads;
create trigger leads_touch before update on leads for each row execute function public.touch_updated_at();

-- ---------- Linha do tempo / feed ao vivo ----------
create table if not exists lead_events (
  id bigserial primary key,
  lead_id uuid references leads on delete cascade,
  type text not null,
  channel text not null default 'sys',
  text text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lead_events_created_idx on lead_events (created_at desc);
create index if not exists lead_events_lead_idx on lead_events (lead_id, created_at);

-- ---------- Mensagens ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads on delete cascade,
  number_id uuid references whatsapp_numbers on delete set null,
  direction text not null check (direction in ('in','out')),
  author text not null check (author in ('lead','ai','human','system')),
  kind text not null default 'text',
  body text,
  transcript text,
  wa_message_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists messages_lead_idx on messages (lead_id, created_at);

-- ---------- Lista de exclusão (pediu para não receber) ----------
create table if not exists blocked_phones (
  wa_key text primary key,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------- Base de conhecimento ----------
create table if not exists knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'pdf',
  pages int,
  chunks int not null default 0,
  status text not null default 'processando',
  error text,
  created_at timestamptz not null default now()
);
create table if not exists knowledge_chunks (
  id bigserial primary key,
  doc_id uuid not null references knowledge_docs on delete cascade,
  content text not null,
  tsv tsvector generated always as (to_tsvector('portuguese', content)) stored
);
create index if not exists knowledge_chunks_tsv_idx on knowledge_chunks using gin (tsv);

create or replace function public.search_knowledge(q text, n int default 5)
returns table (content text, doc_name text, rank real)
language sql stable as $$
  select c.content, d.name, ts_rank(c.tsv, to_tsquery('portuguese', q)) as rank
  from knowledge_chunks c join knowledge_docs d on d.id = c.doc_id
  where c.tsv @@ to_tsquery('portuguese', q)
  order by rank desc
  limit n
$$;

-- ---------- Aprendizado ----------
create table if not exists objections (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  objection text not null,
  best_response text,
  tries int not null default 0,
  wins int not null default 0,
  updated_at timestamptz not null default now(),
  unique (niche, objection)
);
create table if not exists learnings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads on delete set null,
  niche text,
  service text,
  price numeric,
  approach_slug text,
  pains text[] not null default '{}',
  decisive_factor text,
  hook text,
  objections jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists playbooks (
  niche text primary key,
  content text,
  sales int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Pagamentos ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads on delete cascade,
  provider text not null default 'mercadopago',
  provider_id text unique,
  service text,
  amount numeric not null,
  status text not null default 'pendente',
  qr_code text,
  ticket_url text,
  expires_at timestamptz,
  reminded boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ---------- Segurança: só pessoas logadas da equipe ----------
do $$
declare t text;
begin
  foreach t in array array['team_members','settings','services','approaches','searches','whatsapp_numbers','leads',
    'lead_events','messages','blocked_phones','knowledge_docs','knowledge_chunks','objections','learnings','playbooks','payments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;

-- ---------- Tempo real no painel ----------
do $$
declare t text;
begin
  foreach t in array array['leads','lead_events','messages','whatsapp_numbers','settings']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- ---------- Dados iniciais ----------
insert into services (slug, name, description, min_price, max_price, price_steps, approval_from, bonuses, delivery, billing, includes, active, sort) values
 ('site','Criação de site profissional','Site profissional com botão de WhatsApp, pronto para aparecer no Google.',299,799,'{799,649,549,449,299}',449,
  '{"1 mês cuidando da ficha do Google","Botão de agendamento pelo WhatsApp","E-mail profissional com o domínio"}',
  'Até 48 horas','Pagamento único',
  'Domínio e hospedagem no nosso servidor, sem mensalidade. Se o cliente quiser levar para um servidor próprio, ele compra o servidor dele.',true,1),
 ('redes-sociais','Gestão de redes sociais','Planejamento e publicação nas redes sociais.',null,null,'{}',null,'{}','Mensal','Mensal',null,false,2),
 ('posts','Criação de postagens','Artes e textos para postagens.',null,null,'{}',null,'{}',null,'Pacote',null,false,3),
 ('trafego','Tráfego pago e anúncios','Anúncios no Instagram, Facebook e Google.',null,null,'{}',null,'{}','Mensal','Mensal',null,false,4),
 ('apps','Aplicativos e sistemas','Desenvolvimento de aplicativos e sistemas sob medida.',null,null,'{}',null,'{}','Sob orçamento','Projeto',null,false,5),
 ('automacoes','Automações e IA','Automações de atendimento e processos com inteligência artificial.',null,null,'{}',null,'{}','Sob orçamento','Projeto',null,false,6),
 ('consultoria','Consultoria de marketing','Diagnóstico e plano de marketing.',null,null,'{}',null,'{}',null,'Por sessão',null,false,7)
on conflict (slug) do nothing;

insert into approaches (slug, name, description, opening_example, followup_example, weight) values
 ('calma','Calma e consultiva','Conversa tranquila, faz perguntas para entender o negócio antes de oferecer qualquer coisa.',
  'Oi, Dra. Maria! Tudo bem? Posso te fazer uma pergunta rápida sobre sua ficha no Google?',
  'Conseguiu ver minha mensagem? É bem rapidinho, prometo!',25),
 ('direta','Direta (agressiva)','Vai direto ao ponto: aponta a falta do site e já oferece ver como ficaria.',
  'Dra. Maria, vi que você ainda não tem site. Quer ver como o seu ficaria, pronto em 48h?',
  'Posso te mandar a prévia agora mesmo, sem compromisso?',15),
 ('aida','AIDA','Atenção, interesse, desejo e ação: começa com um fato que prende a atenção.',
  'Sabia que quem pesquisa "fisioterapeuta em Limeira" vê primeiro quem tem site? Quer aparecer lá também?',
  'Quer que eu te mostre quem aparece na sua frente hoje?',25),
 ('pas','PAS (problema, agitação, solução)','Toca num problema real do nicho, aumenta a percepção da dor e então apresenta a solução.',
  'Muita gente procura fisio no Google e acaba ligando para outra clínica. Isso já aconteceu com você?',
  'Se seu nome aparecesse primeiro, quantos clientes a mais por mês você acha que viriam?',35)
on conflict (slug) do nothing;

-- ===================== 002_asaas_recibos.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 002: Pix pelo Asaas e recibos em PDF
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001).
-- =====================================================================
alter table leads add column if not exists cpf_cnpj text;
alter table leads add column if not exists asaas_customer_id text;
alter table leads add column if not exists accepted_offer jsonb;

alter table payments alter column provider set default 'asaas';
alter table payments add column if not exists receipt_number bigint generated always as identity;
alter table payments add column if not exists receipt_path text;
alter table payments add column if not exists receipt_sent_at timestamptz;
alter table payments add column if not exists receipt_attempts int not null default 0;
alter table payments add column if not exists receipt_error text;
alter table payments add column if not exists asaas_receipt_url text;

-- pasta privada para os PDFs dos recibos
insert into storage.buckets (id, name, public) values ('recibos', 'recibos', false)
on conflict (id) do nothing;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table payments';
  exception when others then null;
  end;
end $$;

-- ===================== 003_aprendizado_conversas.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 003: base de conhecimento que aprende
-- e conversas com probabilidade de compra.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 e 002).
-- =====================================================================

-- conversas
alter table leads add column if not exists close_probability int not null default 0;
alter table messages add column if not exists meta jsonb not null default '{}'::jsonb;

-- livros: progresso da leitura pela IA
alter table knowledge_docs add column if not exists sections int not null default 0;
alter table knowledge_docs add column if not exists sections_done int not null default 0;
alter table knowledge_docs add column if not exists insights int not null default 0;
alter table knowledge_docs add column if not exists chars int not null default 0;
alter table knowledge_docs add column if not exists updated_at timestamptz not null default now();

-- busca em português e inglês (livros podem estar nos dois idiomas)
drop index if exists knowledge_chunks_tsv_idx;
alter table knowledge_chunks drop column if exists tsv;
alter table knowledge_chunks add column tsv tsvector
  generated always as (to_tsvector('portuguese', content) || to_tsvector('english', content)) stored;
create index if not exists knowledge_chunks_tsv_idx on knowledge_chunks using gin (tsv);
create index if not exists knowledge_chunks_doc_idx on knowledge_chunks (doc_id, id);

-- técnicas extraídas dos livros
create table if not exists knowledge_insights (
  id bigserial primary key,
  doc_id uuid not null references knowledge_docs on delete cascade,
  kind text not null default 'tecnica',
  title text not null,
  content text not null,
  example text,
  tags text[] not null default '{}',
  used int not null default 0,
  wins int not null default 0,
  created_at timestamptz not null default now(),
  tsv tsvector
);

create or replace function public.knowledge_insights_tsv() returns trigger language plpgsql as $$
begin
  new.tsv := setweight(to_tsvector('portuguese', coalesce(new.title, '') || ' ' || array_to_string(new.tags, ' ')), 'A')
          || setweight(to_tsvector('portuguese', coalesce(new.content, '') || ' ' || coalesce(new.example, '')), 'B');
  return new;
end $$;
drop trigger if exists knowledge_insights_tsv on knowledge_insights;
create trigger knowledge_insights_tsv before insert or update of title, content, example, tags on knowledge_insights
  for each row execute function public.knowledge_insights_tsv();
create index if not exists knowledge_insights_tsv_idx on knowledge_insights using gin (tsv);
create index if not exists knowledge_insights_doc_idx on knowledge_insights (doc_id);

-- cérebro de vendas: o resumo de tudo o que foi aprendido, usado em toda conversa
create table if not exists knowledge_brain (
  id int primary key default 1 check (id = 1),
  content text,
  docs int not null default 0,
  insights int not null default 0,
  updated_at timestamptz not null default now()
);
insert into knowledge_brain (id) values (1) on conflict do nothing;

-- busca: técnicas mais relevantes (as que já ajudaram a vender sobem)
create or replace function public.search_insights(q text, n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable as $$
  select i.id, i.kind, i.title, i.content, i.example, d.name,
         (ts_rank(i.tsv, to_tsquery('portuguese', q)) * (1 + i.wins * 0.4 + least(i.used, 50) * 0.01))::real as score
  from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
  where i.tsv @@ to_tsquery('portuguese', q)
  order by score desc
  limit n
$$;

-- busca: trechos originais dos livros
create or replace function public.search_chunks(q text, n int default 3)
returns table (id bigint, content text, doc_name text, score real)
language sql stable as $$
  select c.id, c.content, d.name,
         ts_rank(c.tsv, to_tsquery('portuguese', q) || to_tsquery('english', q))::real as score
  from knowledge_chunks c join knowledge_docs d on d.id = c.doc_id
  where c.tsv @@ (to_tsquery('portuguese', q) || to_tsquery('english', q))
  order by score desc
  limit n
$$;

create or replace function public.bump_insights(ids bigint[], field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if field = 'wins' then
    update knowledge_insights set wins = wins + 1 where id = any(ids);
  else
    update knowledge_insights set used = used + 1 where id = any(ids);
  end if;
end $$;

drop function if exists public.search_knowledge(text, int);

-- segurança e tempo real
do $$
declare t text;
begin
  foreach t in array array['knowledge_insights','knowledge_brain'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
  foreach t in array array['knowledge_docs','knowledge_brain'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- livros enviados antes desta atualização: a IA lê de novo
update knowledge_docs set status = 'aprendendo', sections_done = 0 where status = 'processado' and insights = 0;

-- ===================== 004_links_pagamento.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 004: links de pagamento e checkout próprio
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001, 002 e 003).
-- =====================================================================

create table if not exists checkout_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  service_slug text,
  title text not null,
  description text,
  includes text,
  amount numeric not null check (amount > 0),
  billing text not null default 'unico' check (billing in ('unico', 'mensal')),
  max_installments int not null default 1,
  methods text[] not null default '{pix,card}',
  status text not null default 'ativo' check (status in ('ativo', 'pago', 'cancelado', 'expirado')),
  expires_at timestamptz,
  created_by text not null default 'equipe',
  created_by_user uuid,
  customer_name text,
  customer_document text,
  customer_phone text,
  customer_email text,
  asaas_customer_id text,
  asaas_payment_id text,
  asaas_subscription_id text,
  last_method text,
  attempts int not null default 0,
  views int not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkout_links_lead_idx on checkout_links (lead_id);
create index if not exists checkout_links_status_idx on checkout_links (status);
create index if not exists checkout_links_sub_idx on checkout_links (asaas_subscription_id);

drop trigger if exists checkout_links_touch on checkout_links;
create trigger checkout_links_touch before update on checkout_links for each row execute function public.touch_updated_at();

alter table payments add column if not exists checkout_id uuid references checkout_links on delete set null;
alter table payments add column if not exists method text;

-- só a equipe logada vê os links; o checkout público usa o servidor (chave de serviço)
alter table checkout_links enable row level security;
drop policy if exists equipe on checkout_links;
create policy equipe on checkout_links for all to authenticated using (public.is_team()) with check (public.is_team());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table checkout_links';
  exception when others then null;
  end;
end $$;

-- ===================== 005_custos_previas.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 005: controle de custos, modelos de site e prévias
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 004).
-- =====================================================================

-- Cada chamada paga (IA ou Google) fica registrada aqui para o painel de Custos
create table if not exists usage_log (
  id bigint generated always as identity primary key,
  kind text not null,              -- 'ai' | 'google_pro' | 'google_ent'
  task text,                       -- resposta, abertura, follow_up, previa, livro…
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  calls int not null default 1,
  cost_usd numeric not null default 0,
  lead_id uuid references leads on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists usage_log_created_idx on usage_log (created_at);
create index if not exists usage_log_kind_idx on usage_log (kind, created_at);

-- Soma do mês corrente (horário de São Paulo)
create or replace function public.usage_month()
returns table (kind text, task text, model text, calls bigint, input_tokens bigint, output_tokens bigint, cost_usd numeric)
language sql stable security definer set search_path = public as $$
  select kind, task, model, sum(calls)::bigint, sum(input_tokens)::bigint, sum(output_tokens)::bigint, sum(cost_usd)
  from usage_log
  where (auth.role() = 'service_role' or public.is_team())
    and created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
  group by kind, task, model;
$$;

-- Modelos de site por nicho (exemplos prontos + base da prévia)
create table if not exists site_templates (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  name text not null,
  example_url text,
  accent text not null default '#e8562a',
  style text not null default 'moderno',
  hero_image text,
  gallery text[] not null default '{}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists site_templates_touch on site_templates;
create trigger site_templates_touch before update on site_templates for each row execute function public.touch_updated_at();

-- Prévias geradas para leads
create table if not exists previews (
  slug text primary key,
  lead_id uuid references leads on delete cascade,
  template_id uuid references site_templates on delete set null,
  content jsonb not null,
  views int not null default 0,
  created_by text not null default 'ia',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists previews_lead_idx on previews (lead_id);
drop trigger if exists previews_touch on previews;
create trigger previews_touch before update on previews for each row execute function public.touch_updated_at();

alter table leads add column if not exists preview_slug text;
alter table leads add column if not exists example_sent boolean not null default false;

alter table usage_log enable row level security;
alter table site_templates enable row level security;
alter table previews enable row level security;
drop policy if exists equipe on usage_log;
create policy equipe on usage_log for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists equipe on site_templates;
create policy equipe on site_templates for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists equipe on previews;
create policy equipe on previews for all to authenticated using (public.is_team()) with check (public.is_team());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table previews';
  exception when others then null;
  end;
end $$;

-- ===================== 006_permissoes.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 006: Master, perfis e permissões por pessoa
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 005).
-- =====================================================================

alter table team_members drop constraint if exists team_members_role_check;
alter table team_members add column if not exists perms text[] not null default '{}';
alter table team_members add column if not exists created_by uuid;
alter table team_members add column if not exists active boolean not null default true;

-- o administrador mais antigo vira Master; outros administradores viram Gerente
update team_members set role = 'master'
 where id = (select id from team_members where role in ('admin','master') order by created_at limit 1)
   and not exists (select 1 from team_members where role = 'master');
update team_members set role = 'gerente' where role = 'admin';

alter table team_members add constraint team_members_role_check
  check (role in ('master','gerente','vendedor','atendente','personalizado'));

-- a primeira conta criada vira Master
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.team_members) = 0 then
    insert into public.team_members (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, 'master')
    on conflict (id) do nothing;
  elsif coalesce(new.raw_app_meta_data->>'invited', '') = 'true' then
    insert into public.team_members (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email,
            case when new.raw_app_meta_data->>'role' in ('gerente','vendedor','atendente','personalizado')
                 then new.raw_app_meta_data->>'role' else 'vendedor' end)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

-- membro desativado deixa de ser da equipe
create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where id = auth.uid() and active)
$$;

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where id = auth.uid() and active and role = 'master')
$$;

-- permissão efetiva (mesma regra do painel; perfis sem lista usam o padrão do perfil)
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members m
     where m.id = auth.uid() and m.active
       and (
         m.role = 'master'
         or (p not in ('config','checkout.editor','custos.tetos') and (
              p = any(m.perms)
              or (coalesce(array_length(m.perms, 1), 0) = 0 and (
                   m.role = 'gerente'
                   or (m.role = 'vendedor' and p = any(array['visao','prospeccao','leads','conversas','instagram','servicos','links','modelos','aprendizado','prospeccao.buscar','conversas.responder','leads.editar','previas.gerar','links.criar']))
                   or (m.role in ('atendente','personalizado') and p = any(array['visao','leads','conversas','instagram','conversas.responder','leads.editar']))
              ))
         ))
       )
  )
$$;

-- regras no banco: todos da equipe leem; só quem tem a permissão altera
create or replace function public._perm_policy(t text, p text) returns void
language plpgsql as $$
begin
  execute format('drop policy if exists equipe on %I', t);
  execute format('drop policy if exists ler on %I', t);
  execute format('drop policy if exists alterar on %I', t);
  execute format('create policy ler on %I for select to authenticated using (public.is_team())', t);
  execute format('create policy alterar on %I for all to authenticated using (public.has_perm(%L)) with check (public.has_perm(%L))', t, p, p);
end $$;

select public._perm_policy('services', 'servicos.editar');
select public._perm_policy('approaches', 'abordagens.editar');
select public._perm_policy('site_templates', 'modelos.editar');
select public._perm_policy('whatsapp_numbers', 'numeros.gerenciar');
select public._perm_policy('checkout_links', 'links.criar');
select public._perm_policy('knowledge_docs', 'conhecimento.enviar');
select public._perm_policy('settings', 'config');
select public._perm_policy('team_members', 'config');
select public._perm_policy('usage_log', 'config');

-- leads: todos atualizam (conversa, etapa), mas apagar exige permissão
drop policy if exists equipe on leads;
drop policy if exists ler on leads;
drop policy if exists alterar on leads;
drop policy if exists apagar on leads;
drop policy if exists inserir on leads;
create policy ler on leads for select to authenticated using (public.is_team());
create policy inserir on leads for insert to authenticated with check (public.is_team());
create policy alterar on leads for update to authenticated using (public.has_perm('leads.editar') or public.has_perm('conversas.responder')) with check (public.is_team());
create policy apagar on leads for delete to authenticated using (public.has_perm('leads.excluir'));

drop function public._perm_policy(text, text);

-- imagens públicas do checkout e das prévias (logo, fotos), enviadas pelo editor
do $$
begin
  begin
    insert into storage.buckets (id, name, public) values ('publico', 'publico', true) on conflict (id) do nothing;
    execute 'drop policy if exists publico_enviar on storage.objects';
    execute 'create policy publico_enviar on storage.objects for insert to authenticated with check (bucket_id = ''publico'' and (public.has_perm(''checkout.editor'') or public.has_perm(''modelos.editar'')))';
    execute 'drop policy if exists publico_apagar on storage.objects';
    execute 'create policy publico_apagar on storage.objects for delete to authenticated using (bucket_id = ''publico'' and public.is_master())';
  exception when others then raise notice 'storage: %', sqlerrm;
  end;
end $$;

-- ===================== 007_inteligencia.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 007: inteligência que aprende com as vendas
--  · Base 1 (livros): busca por significado (vetores) além da busca por palavras
--  · Base 2 (cenários reais): casos ganhos/perdidos e mensagens campeãs
--  · 👍/👎 da equipe nas mensagens da IA
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 006).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists vector with schema extensions;

-- vetores de significado (modelo multilingual-e5-small, 384 dimensões, roda grátis na VPS)
alter table knowledge_insights add column if not exists embedding extensions.vector(384);
alter table knowledge_chunks add column if not exists embedding extensions.vector(384);

-- cada mensagem enviada é medida uma vez (respondeu? esquentou? vendeu?)
alter table messages add column if not exists scored boolean not null default false;
create index if not exists messages_unscored_idx on messages (created_at) where scored = false and direction = 'out';

-- 👍/👎 da equipe
alter table messages add column if not exists feedback int check (feedback in (-1, 1));
alter table messages add column if not exists feedback_note text;
alter table messages add column if not exists feedback_by uuid;

-- segunda camada do cérebro: o que funciona com os NOSSOS clientes
alter table knowledge_brain add column if not exists real_content text;
alter table knowledge_brain add column if not exists real_cases int not null default 0;
alter table knowledge_brain add column if not exists real_updated_at timestamptz;

alter table leads add column if not exists case_done boolean not null default false;

-- ---------- Base 2: casos reais ----------
create table if not exists sales_cases (
  id bigserial primary key,
  lead_id uuid unique references leads on delete set null,
  outcome text not null check (outcome in ('ganho', 'perdido')),
  niche text,
  channel text,
  approach_slug text,
  service text,
  price numeric,
  days_to_close numeric,
  messages int not null default 0,
  pains text[] not null default '{}',
  objections jsonb not null default '[]'::jsonb,
  turning_point text,
  lost_reason text,
  lesson text not null,
  summary text not null,
  tags text[] not null default '{}',
  used int not null default 0,
  wins int not null default 0,
  embedding extensions.vector(384),
  tsv tsvector,
  created_at timestamptz not null default now()
);
create index if not exists sales_cases_niche_idx on sales_cases (niche, outcome);
create index if not exists sales_cases_tsv_idx on sales_cases using gin (tsv);

create or replace function public.sales_cases_tsv() returns trigger language plpgsql as $$
begin
  new.tsv := to_tsvector('portuguese',
    coalesce(new.niche, '') || ' ' || coalesce(new.summary, '') || ' ' || coalesce(new.lesson, '') || ' ' ||
    coalesce(new.turning_point, '') || ' ' || coalesce(new.lost_reason, '') || ' ' ||
    array_to_string(new.pains, ' ') || ' ' || array_to_string(new.tags, ' ') || ' ' || coalesce(new.objections::text, ''));
  return new;
end $$;
drop trigger if exists sales_cases_tsv_t on sales_cases;
create trigger sales_cases_tsv_t before insert or update of niche, summary, lesson, turning_point, lost_reason, pains, tags, objections
  on sales_cases for each row execute function public.sales_cases_tsv();

-- ---------- Base 2: mensagens medidas (as campeãs sobem) ----------
create table if not exists msg_snippets (
  id bigserial primary key,
  message_id uuid unique references messages on delete cascade,
  lead_id uuid references leads on delete cascade,
  author text not null default 'ai',
  niche text,
  stage text,
  kind text not null default 'resposta', -- abertura | follow_up | resposta | objecao | fechamento
  situation text,                         -- o que o cliente tinha dito antes
  text text not null,
  got_reply boolean,
  temp_delta int,
  advanced boolean not null default false,
  won boolean not null default false,
  feedback int,
  score numeric not null default 0,
  used int not null default 0,
  wins int not null default 0,
  embedding extensions.vector(384),
  tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists msg_snippets_rank_idx on msg_snippets (kind, niche, score desc);
create index if not exists msg_snippets_lead_idx on msg_snippets (lead_id);
create index if not exists msg_snippets_tsv_idx on msg_snippets using gin (tsv);

create or replace function public.msg_snippets_tsv() returns trigger language plpgsql as $$
begin
  new.tsv := to_tsvector('portuguese', coalesce(new.situation, '') || ' ' || coalesce(new.text, '') || ' ' || coalesce(new.niche, ''));
  -- pontuação: respondeu, esquentou, avançou de etapa, virou venda, 👍/👎 da equipe e quantas vezes inspirou vendas
  new.score := (case when new.got_reply then 1 when new.got_reply = false then -0.5 else 0 end)
             + greatest(-1, least(2, coalesce(new.temp_delta, 0) / 15.0))
             + (case when new.advanced then 1 else 0 end)
             + (case when new.won then 3 else 0 end)
             + coalesce(new.feedback, 0) * 2.5
             + least(new.wins, 10) * 0.5;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists msg_snippets_tsv_t on msg_snippets;
create trigger msg_snippets_tsv_t before insert or update on msg_snippets for each row execute function public.msg_snippets_tsv();

-- ---------- busca híbrida (significado + palavras) ----------
-- q: termos para busca por palavras (pode ser vazio) · emb: vetor da pergunta (pode ser nulo)

create or replace function public.match_insights(q text, emb extensions.vector(384), n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select i.*, d.name as doc_name,
           case when emb is not null and i.embedding is not null then 1 - (i.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(i.tsv, to_tsquery('portuguese', q)) else 0 end as kw
    from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
    where (emb is not null and i.embedding is not null)
       or (coalesce(q, '') <> '' and i.tsv @@ to_tsquery('portuguese', q))
  )
  select id, kind, title, content, example, doc_name,
         ((sim * 2 + least(kw, 0.5)) * (1 + wins * 0.4 + least(used, 50) * 0.01))::real as score
  from c
  where sim > 0 or kw > 0
  order by score desc
  limit n
$$;

create or replace function public.match_chunks(q text, emb extensions.vector(384), n int default 3)
returns table (id bigint, content text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select ch.id, ch.content, d.name as doc_name,
           case when emb is not null and ch.embedding is not null then 1 - (ch.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(ch.tsv, to_tsquery('portuguese', q) || to_tsquery('english', q)) else 0 end as kw
    from knowledge_chunks ch join knowledge_docs d on d.id = ch.doc_id
    where (emb is not null and ch.embedding is not null)
       or (coalesce(q, '') <> '' and ch.tsv @@ (to_tsquery('portuguese', q) || to_tsquery('english', q)))
  )
  select id, content, doc_name, (sim * 2 + least(kw, 0.5))::real as score
  from c where sim > 0.86 or kw > 0
  order by score desc
  limit n
$$;

create or replace function public.match_cases(q text, emb extensions.vector(384), p_niche text, p_outcome text, n int default 2)
returns table (id bigint, outcome text, niche text, summary text, lesson text, turning_point text, lost_reason text, objections jsonb, price numeric, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select s.*,
           case when emb is not null and s.embedding is not null then 1 - (s.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(s.tsv, to_tsquery('portuguese', q)) else 0 end as kw,
           case when p_niche is not null and lower(s.niche) = lower(p_niche) then 0.35 else 0 end as same
    from sales_cases s
    where (p_outcome is null or s.outcome = p_outcome)
  )
  select id, outcome, niche, summary, lesson, turning_point, lost_reason, objections, price,
         ((sim * 2 + least(kw, 0.5) + same) * (1 + least(wins, 10) * 0.15))::real as score
  from c
  where sim > 0.86 or kw > 0 or (same > 0 and emb is null)
  order by score desc
  limit n
$$;

create or replace function public.match_snippets(q text, emb extensions.vector(384), p_niche text, p_kinds text[], n int default 3)
returns table (id bigint, kind text, niche text, situation text, text text, score real, total numeric)
language sql stable set search_path = public, extensions as $$
  with c as (
    select s.*,
           case when emb is not null and s.embedding is not null then 1 - (s.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(s.tsv, to_tsquery('portuguese', q)) else 0 end as kw,
           case when p_niche is not null and lower(s.niche) = lower(p_niche) then 0.3 else 0 end as same
    from msg_snippets s
    where s.score >= 1.5 and coalesce(s.feedback, 0) >= 0
      and (p_kinds is null or s.kind = any(p_kinds))
  )
  select c.id, c.kind, c.niche, c.situation, c.text, (c.sim * 1.5 + least(c.kw, 0.5) + c.same)::real as score, c.score as total
  from c
  where c.sim > 0.85 or c.kw > 0 or emb is null
  order by (c.sim * 1.5 + least(c.kw, 0.5) + c.same) * (1 + c.score / 4) desc
  limit n
$$;

create or replace function public.bump_cases(ids bigint[], field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if field = 'wins' then update sales_cases set wins = wins + 1 where id = any(ids);
  else update sales_cases set used = used + 1 where id = any(ids); end if;
end $$;

create or replace function public.bump_snippets(ids bigint[], field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if field = 'wins' then update msg_snippets set wins = wins + 1 where id = any(ids);
  else update msg_snippets set used = used + 1 where id = any(ids); end if;
end $$;

-- ---------- acesso ----------
alter table sales_cases enable row level security;
alter table msg_snippets enable row level security;
drop policy if exists ler on sales_cases;
drop policy if exists ler on msg_snippets;
create policy ler on sales_cases for select to authenticated using (public.is_team());
create policy ler on msg_snippets for select to authenticated using (public.is_team());
-- alterações passam pelo servidor (que confere a permissão)

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table sales_cases';
  exception when others then null;
  end;
end $$;

-- ===================== 008_robo_status.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 008: sinal de vida do robô
-- O robô grava a cada ciclo; o painel avisa se ele parar.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 007).
-- =====================================================================
create table if not exists worker_status (
  id int primary key default 1 check (id = 1),
  beat_at timestamptz not null default now(),
  started_at timestamptz,
  info jsonb not null default '{}'::jsonb
);
insert into worker_status (id) values (1) on conflict do nothing;
alter table worker_status enable row level security;
drop policy if exists ler on worker_status;
create policy ler on worker_status for select to authenticated using (public.is_team());
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table worker_status';
  exception when others then null;
  end;
end $$;

-- ===================== 009_avaliacao_tecnicas.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 009: nota de qualidade das técnicas
-- A IA dá nota de 0 a 10 para cada técnica; abaixo de 4 não é usada.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 008).
-- =====================================================================
alter table knowledge_insights add column if not exists quality int check (quality between 0 and 10);
alter table knowledge_insights add column if not exists quality_note text;
create index if not exists knowledge_insights_quality_idx on knowledge_insights (quality);

-- busca: ignora as técnicas fracas e dá mais peso às de nota alta
create or replace function public.match_insights(q text, emb extensions.vector(384), n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select i.*, d.name as doc_name,
           case when emb is not null and i.embedding is not null then 1 - (i.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(i.tsv, to_tsquery('portuguese', q)) else 0 end as kw
    from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
    where (i.quality is null or i.quality >= 4)
      and ((emb is not null and i.embedding is not null)
       or (coalesce(q, '') <> '' and i.tsv @@ to_tsquery('portuguese', q)))
  )
  select id, kind, title, content, example, doc_name,
         ((sim * 2 + least(kw, 0.5)) * (1 + wins * 0.4 + least(used, 50) * 0.01) * (0.6 + coalesce(quality, 6) / 15.0))::real as score
  from c
  where sim > 0 or kw > 0
  order by score desc
  limit n
$$;

create or replace function public.search_insights(q text, n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, score real)
language sql stable as $$
  select i.id, i.kind, i.title, i.content, i.example, d.name,
         (ts_rank(i.tsv, to_tsquery('portuguese', q)) * (1 + i.wins * 0.4 + least(i.used, 50) * 0.01) * (0.6 + coalesce(i.quality, 6) / 15.0))::real as score
  from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
  where i.tsv @@ to_tsquery('portuguese', q) and (i.quality is null or i.quality >= 4)
  order by score desc
  limit n
$$;

-- ===================== 010_memoria_conversa.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 010: memória de cada conversa
-- O que já se sabe do cliente, o que já foi dito e oferecido (para não repetir nem pular etapas).
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 009).
-- =====================================================================
alter table leads add column if not exists memory jsonb not null default '{}'::jsonb;

-- ===================== 011_trava_resposta.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 011: uma resposta por vez em cada conversa
-- Evita duas respostas ao mesmo tempo para o mesmo cliente.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 010).
-- =====================================================================
alter table leads add column if not exists reply_lock_until timestamptz;

-- ===================== 012_pausa_definitiva.sql =====================
-- Pausa definitiva da IA por conversa: só volta quando alguém da equipe reativar manualmente.
alter table leads add column if not exists ai_locked boolean not null default false;
alter table leads add column if not exists ai_locked_at timestamptz;
alter table leads add column if not exists ai_locked_by text;

-- Garantia no próprio banco: enquanto a conversa estiver pausada, nada no sistema consegue
-- religar a IA nem agendar resposta. Para reativar, a mesma atualização precisa tirar a pausa (ai_locked = false).
create or replace function public.leads_ai_lock_guard()
returns trigger language plpgsql as $$
begin
  if new.ai_locked then
    new.ai_enabled := false;
    new.reply_due_at := null;
  end if;
  return new;
end $$;

drop trigger if exists leads_ai_lock_guard on leads;
create trigger leads_ai_lock_guard before insert or update on leads
  for each row execute function public.leads_ai_lock_guard();

-- ===================== 013_base_ativa.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 013: base ativa, prioridade dos livros e Prompt Master
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 012).
-- =====================================================================

-- 1) prioridade do material: primário (base principal) ou secundário (apoio)
alter table knowledge_docs add column if not exists priority text not null default 'secundario';
do $$ begin
  alter table knowledge_docs add constraint knowledge_docs_priority_chk check (priority in ('primario', 'secundario'));
exception when duplicate_object then null; end $$;

-- 2) Prompt Master: diretriz fixa da agência. Fica numa tabela própria,
--    então a atualização do Cérebro de vendas nunca encosta nela.
create table if not exists prompt_master (
  id int primary key default 1 check (id = 1),
  content text,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into prompt_master (id) values (1) on conflict do nothing;
alter table prompt_master enable row level security;
drop policy if exists equipe_ler on prompt_master;
create policy equipe_ler on prompt_master for select to authenticated using (public.is_team());
drop policy if exists master_grava on prompt_master;
create policy master_grava on prompt_master for all to authenticated using (public.is_master()) with check (public.is_master());

-- 3) limpeza da base: apaga técnicas e trechos sem livro (órfãos) e devolve quantos saíram
create or replace function public.kb_sync_orphans()
returns table (insights bigint, chunks bigint)
language plpgsql security definer set search_path = public as $$
declare a bigint; b bigint;
begin
  delete from knowledge_insights i where not exists (select 1 from knowledge_docs d where d.id = i.doc_id);
  get diagnostics a = row_count;
  delete from knowledge_chunks c where not exists (select 1 from knowledge_docs d where d.id = c.doc_id);
  get diagnostics b = row_count;
  update knowledge_docs d set insights = (select count(*) from knowledge_insights i where i.doc_id = d.id);
  return query select a, b;
end $$;

-- 4) busca de técnicas com a prioridade do livro (primário pesa mais)
create or replace function public.match_insights_v2(q text, emb extensions.vector(384), n int default 6)
returns table (id bigint, kind text, title text, content text, example text, doc_name text, priority text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select i.*, d.name as doc_name, d.priority as doc_priority,
           case when emb is not null and i.embedding is not null then 1 - (i.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(i.tsv, to_tsquery('portuguese', q)) else 0 end as kw
    from knowledge_insights i join knowledge_docs d on d.id = i.doc_id
    where (i.quality is null or i.quality >= 4)
      and ((emb is not null and i.embedding is not null)
       or (coalesce(q, '') <> '' and i.tsv @@ to_tsquery('portuguese', q)))
  )
  select id, kind, title, content, example, doc_name, doc_priority,
         ((sim * 2 + least(kw, 0.5)) * (1 + wins * 0.4 + least(used, 50) * 0.01) * (0.6 + coalesce(quality, 6) / 15.0)
           * case when doc_priority = 'primario' then 1.0 else 0.43 end)::real as score
  from c
  where sim > 0 or kw > 0
  order by score desc
  limit n
$$;

-- trechos dos livros: os do primário também pesam mais
create or replace function public.match_chunks(q text, emb extensions.vector(384), n int default 3)
returns table (id bigint, content text, doc_name text, score real)
language sql stable set search_path = public, extensions as $$
  with c as (
    select ch.id, ch.content, d.name as doc_name, d.priority as doc_priority,
           case when emb is not null and ch.embedding is not null then 1 - (ch.embedding <=> emb) else 0 end as sim,
           case when coalesce(q, '') <> '' then ts_rank(ch.tsv, to_tsquery('portuguese', q) || to_tsquery('english', q)) else 0 end as kw
    from knowledge_chunks ch join knowledge_docs d on d.id = ch.doc_id
    where (emb is not null and ch.embedding is not null)
       or (coalesce(q, '') <> '' and ch.tsv @@ (to_tsquery('portuguese', q) || to_tsquery('english', q)))
  )
  select id, content, doc_name, ((sim * 2 + least(kw, 0.5)) * case when doc_priority = 'primario' then 1.0 else 0.6 end)::real as score
  from c where sim > 0.86 or kw > 0
  order by score desc
  limit n
$$;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table prompt_master';
  exception when others then null;
  end;
end $$;

-- ===================== 014_cliente_digitando.sql =====================
-- Cliente digitando: a IA espera ele terminar antes de ler e responder (sem gastar IA à toa).
alter table leads add column if not exists typing_until timestamptz;

-- ===================== 015_vozes.sql =====================
-- Vozes da equipe (clonadas na ElevenLabs) para respostas em áudio.
create table if not exists voices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  member text,
  provider text not null default 'elevenlabs',
  voice_id text not null,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);
alter table voices enable row level security;
drop policy if exists equipe_ler on voices;
create policy equipe_ler on voices for select to authenticated using (public.is_team());
drop policy if exists master_grava on voices;
create policy master_grava on voices for all to authenticated using (public.is_master()) with check (public.is_master());

-- a voz fica fixa na conversa: do primeiro ao último áudio, o cliente ouve sempre a mesma pessoa
alter table leads add column if not exists voice_id uuid references voices on delete set null;

-- ===================== 016_producao_drive.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 016: Produção + backup no Google Drive
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 015).
-- =====================================================================

-- integrações com segredo (token do Google Drive): só o servidor lê (sem política para o painel)
create table if not exists integrations (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table integrations enable row level security;

-- pasta do cliente no Drive + produção
alter table leads add column if not exists drive_folder_id text;
alter table leads add column if not exists drive_folder_url text;
alter table leads add column if not exists drive_subfolders jsonb;
alter table leads add column if not exists drive_doc_id text;
alter table leads add column if not exists drive_doc_url text;
alter table leads add column if not exists drive_error text;
alter table leads add column if not exists doc_dirty boolean not null default false;
alter table leads add column if not exists project_summary text;
alter table leads add column if not exists project_tasks jsonb;
alter table leads add column if not exists project_summary_at timestamptz;
alter table leads add column if not exists production_status text;
alter table leads add column if not exists production_owner text;
alter table leads add column if not exists production_due date;
alter table leads add column if not exists production_notes text;
alter table leads add column if not exists production_started_at timestamptz;
alter table leads add column if not exists delivered_at timestamptz;
do $$ begin
  alter table leads add constraint leads_production_status_chk
    check (production_status is null or production_status in ('fila', 'materiais', 'producao', 'revisao', 'entregue', 'pausado'));
exception when duplicate_object then null; end $$;
create index if not exists leads_production_idx on leads (production_status) where production_status is not null;

-- arquivos que o cliente mandou: cópia no Drive
alter table messages add column if not exists drive_file_id text;
alter table messages add column if not exists drive_url text;
alter table messages add column if not exists drive_tries int not null default 0;
create index if not exists messages_drive_pending_idx on messages (created_at)
  where drive_file_id is null and direction = 'in' and kind in ('image', 'video', 'document', 'audio');

-- recibos e comprovantes no Drive
alter table payments add column if not exists receipt_drive_url text;
alter table payments add column if not exists asaas_drive_url text;
alter table payments add column if not exists drive_tries int not null default 0;

-- quem já pagou entra na Produção
update leads set production_status = 'fila', doc_dirty = true where stage = 'pago' and production_status is null;

-- ===================== 017_modelos_premium.sql =====================
-- =====================================================================
-- Radar de Vendas — atualização 017: modelos premium (GitHub) e mensagens não lidas
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 016).
-- =====================================================================

-- modelos premium (cópia do que está na pasta Modelos do GitHub)
create table if not exists premium_templates (
  slug text primary key,
  name text not null,
  niche text,
  niches text[] not null default '{}',
  keywords text[] not null default '{}',
  style text,
  description text,
  hash text,
  build_ok boolean not null default false,
  build_error text,
  thumb_url text,
  html_path text,
  content jsonb,
  embedding jsonb,
  status text not null default 'pronto',
  active boolean not null default true,
  uses int not null default 0,
  updated_at timestamptz not null default now()
);
alter table premium_templates enable row level security;
drop policy if exists equipe on premium_templates;
create policy equipe on premium_templates for select to authenticated using (public.is_team());

-- modelo escolhido para o cliente
alter table leads add column if not exists premium_template text;
-- mensagens do cliente ainda não vistas pela equipe (bolinha vermelha em Conversas)
alter table leads add column if not exists team_unread int not null default 0;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table premium_templates';
  exception when others then null;
  end;
end $$;

-- ===================== 018_dominios.sql =====================
-- Domínios próprios (painel, checkout e prévias). O sistema mostra o DNS e confere sozinho.
create table if not exists domains (
  host text primary key,
  roles text[] not null default '{}',
  dns_ok boolean not null default false,
  https_ok boolean not null default false,
  dns_found text,
  last_check timestamptz,
  error text,
  created_at timestamptz not null default now()
);
alter table domains enable row level security;
drop policy if exists equipe on domains;
create policy equipe on domains for select to authenticated using (public.is_team());

-- ===================== 019_numeros_cores_vozes.sql =====================
-- 019: cada número de WhatsApp com cor (etiqueta), voz própria e conversas separadas por número
alter table whatsapp_numbers add column if not exists color text;
alter table whatsapp_numbers add column if not exists voice_id uuid references voices on delete set null;
alter table whatsapp_numbers add column if not exists voice_enabled boolean not null default true;

-- o mesmo cliente pode falar com mais de um número: cada número tem a sua conversa (lead),
-- ligadas entre si para a equipe ver que é a mesma pessoa
alter table leads add column if not exists related_lead_id uuid references leads on delete set null;
create index if not exists leads_wa_key_number_idx on leads (wa_key, number_id);

-- conversas que já ficaram misturadas (o mesmo cliente falou com dois números e tudo caiu numa conversa só):
-- as mensagens de cada número vão para uma conversa própria daquele número
do $$
declare
  r record;
  novo uuid;
begin
  for r in
    select distinct m.lead_id, m.number_id
    from messages m
    join leads l on l.id = m.lead_id
    where m.number_id is not null and l.number_id is not null and m.number_id <> l.number_id
  loop
    select id into novo from leads
      where wa_key = (select wa_key from leads where id = r.lead_id) and number_id = r.number_id
      limit 1;
    if novo is null then
      insert into leads (name, source, whatsapp, wa_key, niche, city, instagram, number_id, related_lead_id,
                         stage, wa_status, temperature, ai_enabled, summary, next_step, last_inbound_at, last_outbound_at)
      select l.name, l.source, l.whatsapp, l.wa_key, l.niche, l.city, l.instagram, r.number_id, l.id,
             'respondeu', 'conversa', 30, l.ai_enabled, 'Conversa separada por número (o cliente falou com dois números).', 'Continuar o atendimento por este número.',
             (select max(created_at) from messages where lead_id = r.lead_id and number_id = r.number_id and direction = 'in'),
             (select max(created_at) from messages where lead_id = r.lead_id and number_id = r.number_id and direction = 'out')
      from leads l where l.id = r.lead_id
      returning id into novo;
    end if;
    update messages set lead_id = novo where lead_id = r.lead_id and number_id = r.number_id;
    update leads set related_lead_id = coalesce(related_lead_id, novo) where id = r.lead_id;
    novo := null;
  end loop;
end $$;

-- ===================== 020_publico_editor.sql =====================
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

-- ===================== 021_previa_agendada.sql =====================
-- 021: prévia sai alguns minutos depois do pedido (fila no próprio lead)
alter table leads add column if not exists preview_due_at timestamptz;
alter table leads add column if not exists preview_job jsonb;
create index if not exists leads_preview_due_idx on leads (preview_due_at) where preview_due_at is not null;

-- ===================== 022_arquivar_contatos_salvos.sql =====================
-- 022: arquivar conversa e contato salvo no celular (IA desligada por padrão)
alter table leads add column if not exists archived_at timestamptz;
alter table leads add column if not exists saved_contact boolean not null default false;

-- ===================== 023_nome_atendente.sql =====================
-- 023: nome de quem atende em cada número (a IA se apresenta com ele)
alter table whatsapp_numbers add column if not exists agent_name text;

-- ===================== 024_equipe_controle.sql =====================
-- 024: controle da equipe — quem fez cada ação, responsável pela conversa e notas internas
alter table lead_events add column if not exists actor_id uuid;
alter table lead_events add column if not exists actor_name text;
create index if not exists lead_events_actor_idx on lead_events (actor_id, created_at desc);

alter table leads add column if not exists assigned_to uuid;
alter table leads add column if not exists assigned_name text;

create table if not exists lead_notes (
  id bigserial primary key,
  lead_id uuid not null references leads on delete cascade,
  author_id uuid,
  author_name text,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_idx on lead_notes (lead_id, created_at);
alter table lead_notes enable row level security;
drop policy if exists equipe on lead_notes;
create policy equipe on lead_notes for select to authenticated using (public.is_team());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table lead_notes';
  exception when others then null;
  end;
end $$;

-- ===================== 025_desarquivar_ao_receber.sql =====================
-- 025: conversa arquivada volta para a caixa de entrada quando chega qualquer mensagem nela
-- (cliente escreveu, equipe respondeu pelo celular, recibo, etc.) — vale para todos os caminhos de entrada.
create or replace function public.desarquivar_ao_receber() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update leads set archived_at = null, updated_at = now()
   where id = new.lead_id and archived_at is not null;
  return new;
end $$;

drop trigger if exists messages_desarquivar on messages;
create trigger messages_desarquivar after insert on messages
for each row execute function public.desarquivar_ao_receber();

-- ===================== 026_acessos.sql =====================
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

-- ===================== 027_link_bio.sql =====================
-- 027: Link na bio (olinks.com.br/empresa)
-- Cada página tem um endereço (slug), os dados (jsonb) e um link secreto para o próprio cliente editar.
create table if not exists bio_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'previa', 'publicado', 'pausado')),
  data jsonb not null default '{}'::jsonb,
  edit_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  views int not null default 0,
  clicks int not null default 0,
  created_by_name text,
  published_at timestamptz,
  client_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bio_pages_lead_idx on bio_pages (lead_id);
alter table bio_pages enable row level security;
drop policy if exists ler on bio_pages;
create policy ler on bio_pages for select to authenticated using (public.is_team());

-- visitas e cliques por dia (um registro por página/dia/botão, só soma)
create table if not exists bio_stats (
  page_id uuid references bio_pages on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  kind text not null,
  target text not null default '',
  n int not null default 0,
  primary key (page_id, day, kind, target)
);
alter table bio_stats enable row level security;
drop policy if exists ler on bio_stats;
create policy ler on bio_stats for select to authenticated using (public.is_team());

create or replace function public.bio_hit(p_page uuid, p_kind text, p_target text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into bio_stats (page_id, kind, target, n) values (p_page, p_kind, coalesce(left(p_target, 60), ''), 1)
  on conflict (page_id, day, kind, target) do update set n = bio_stats.n + 1;
  if p_kind = 'view' then update bio_pages set views = views + 1 where id = p_page;
  else update bio_pages set clicks = clicks + 1 where id = p_page; end if;
end $$;

-- novo menu com permissão própria: quem já via Modelos passa a ver Link na bio
update team_members set perms = array_append(perms, 'bio')
 where 'modelos' = any(perms) and not ('bio' = any(perms));

-- ===================== 028_servicos_planos.sql =====================
-- 028: Serviços com plano mensal, custos (margem), nichos indicados e instruções para a IA
-- + os novos produtos (Link na bio, Pack Canva, Catálogo digital), desligados até você revisar os preços.
alter table services add column if not exists monthly_price numeric;
alter table services add column if not exists monthly_min numeric;
alter table services add column if not exists cost_once numeric;
alter table services add column if not exists cost_monthly numeric;
alter table services add column if not exists niches text;
alter table services add column if not exists ai_notes text;
alter table services add column if not exists addon boolean not null default false;
alter table services add column if not exists created_at timestamptz default now();

insert into services (slug, name, description, min_price, max_price, price_steps, approval_from, bonuses, delivery, billing, includes, active, sort, addon, niches, ai_notes) values
 ('link-na-bio', 'Link na bio (olinks)',
  'Página de links profissional para a bio do Instagram, no endereço olinks.com.br/nome-da-empresa: WhatsApp, agenda, endereço, redes sociais e fotos.',
  null, null, '{}', null, '{}', 'Até 24 horas', 'Pagamento único',
  'Página pronta no olinks.com.br, ícones do nicho, botões ilimitados de contato, link para o próprio cliente editar quando quiser.',
  false, 20, true, 'todos',
  'Ofereça como complemento depois que o cliente gostar da prévia do site, ou para quem só quer algo rápido para o Instagram.'),
 ('pack-canva', 'Pack de artes no Canva',
  'Pack de posts e stories prontos para o nicho do cliente, editáveis no Canva pelo celular ou computador.',
  null, null, '{}', null, '{}', 'Na hora (link do Canva)', 'Pagamento único',
  'Artes prontas do nicho, link de cópia do Canva para editar à vontade, sem mensalidade.',
  false, 21, true, 'todos',
  'Mande a prévia do pack do nicho dele. Bom para quem reclama que não tem tempo de postar.'),
 ('catalogo-digital', 'Catálogo digital (cardápio com QR Code)',
  'Cardápio/catálogo online com QR Code para as mesas: categorias, produtos com até 3 fotos, preços, ingredientes, horário, WhatsApp e Instagram. O dono atualiza sozinho pelo painel.',
  499, 599, '{599,549,499}', null, '{}', 'Até 48 horas', 'Pagamento único ou mensal',
  'Painel para o dono editar produtos e preços, QR Code pronto para imprimir, até 100 produtos com 3 fotos cada, categorias, logo, cores e tema.',
  false, 22, true, 'restaurantes, lanchonetes, bares, padarias, cafeterias, pizzarias, hamburguerias, docerias, açaí, sorveterias, food trucks',
  'Ofereça para estabelecimentos de comida e bebida. Explique que não é para vender online: o cliente escaneia o QR Code na mesa, vê fotos e preços, e o garçom anota o pedido.')
on conflict (slug) do nothing;

update services set monthly_price = 89 where slug = 'catalogo-digital' and monthly_price is null;

-- ===================== 029_catalogo.sql =====================
-- 029: Catálogo digital (cardápio com QR Code)
-- Loja, categorias e produtos ficam num só registro (jsonb): carrega a página com uma consulta só.
-- O dono edita pelo link secreto (sem login), igual ao Link na bio.
create table if not exists catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'previa', 'publicado', 'pausado')),
  plan text not null default 'unico' check (plan in ('unico', 'mensal')),
  data jsonb not null default '{}'::jsonb,
  edit_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  views int not null default 0,
  opens int not null default 0,
  created_by_name text,
  published_at timestamptz,
  client_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalogs_lead_idx on catalogs (lead_id);
alter table catalogs enable row level security;
drop policy if exists ler on catalogs;
create policy ler on catalogs for select to authenticated using (public.is_team());

create table if not exists catalog_stats (
  catalog_id uuid references catalogs on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  kind text not null,
  target text not null default '',
  n int not null default 0,
  primary key (catalog_id, day, kind, target)
);
alter table catalog_stats enable row level security;
drop policy if exists ler on catalog_stats;
create policy ler on catalog_stats for select to authenticated using (public.is_team());

create or replace function public.catalog_hit(p_id uuid, p_kind text, p_target text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into catalog_stats (catalog_id, kind, target, n) values (p_id, p_kind, coalesce(left(p_target, 60), ''), 1)
  on conflict (catalog_id, day, kind, target) do update set n = catalog_stats.n + 1;
  if p_kind = 'view' then update catalogs set views = views + 1 where id = p_id;
  elsif p_kind = 'open' then update catalogs set opens = opens + 1 where id = p_id; end if;
end $$;

update team_members set perms = array_append(perms, 'catalogo')
 where 'bio' = any(perms) and not ('catalogo' = any(perms));

-- ===================== 030_busca_modelos.sql =====================
-- 030: ficha de busca dos modelos (texto completo + versão do vetor) para indicar só os modelos que fazem sentido
alter table premium_templates add column if not exists search_text text;
alter table premium_templates add column if not exists embed_v smallint;

-- ===================== 031_bio_automatico.sql =====================
-- 031: link na bio automático depois da prévia do site (agendado alguns minutos depois)
alter table leads add column if not exists bio_due_at timestamptz;
create index if not exists leads_bio_due_idx on leads (bio_due_at) where bio_due_at is not null;

-- ===================== 032_servicos_tres_planos.sql =====================
-- 032: cada serviço com três planos (Vitalício = pagamento único, Anual, Mensal), cada um liga/desliga para a IA
alter table services add column if not exists annual_price numeric;
alter table services add column if not exists annual_min numeric;
alter table services add column if not exists plan_once boolean not null default true;
alter table services add column if not exists plan_annual boolean not null default false;
alter table services add column if not exists plan_monthly boolean not null default false;
update services set plan_monthly = true where monthly_price is not null and plan_monthly = false;

-- ===================== 033_prospeccao_manual.sql =====================
-- Prospecção manual: lista de selecionados, rascunho revisável antes de enviar e motivo da recusa
alter table leads add column if not exists prospect text;          -- 'selecionado' (na lista, ainda não iniciado)
alter table leads add column if not exists draft jsonb;            -- { parts: [...], number_id, number_label, agent }
alter table leads add column if not exists draft_at timestamptz;   -- quando o rascunho sai sozinho
alter table leads add column if not exists draft_hold boolean not null default false; -- equipe segurou para editar
alter table leads add column if not exists lost_reason text;
alter table leads add column if not exists lost_at timestamptz;
create index if not exists leads_prospect_idx on leads (prospect) where prospect is not null;
create index if not exists leads_draft_idx on leads (draft_at) where wa_status = 'rascunho';
alter table whatsapp_numbers add column if not exists prospect_today int not null default 0;
alter table whatsapp_numbers add column if not exists prospect_date text;
alter table whatsapp_numbers add column if not exists prospect_next_at timestamptz;

-- ===================== 034_packs_canva.sql =====================
-- Packs de artes no Canva: galeria pública de prévia por nicho + link de entrega (Canva) depois do pagamento
create table if not exists canva_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  niche text,                       -- nicho principal (ex.: "estética", "pizzaria")
  keywords text,                    -- outras palavras do nicho, separadas por vírgula
  description text,
  cover text,                       -- imagem de capa
  images jsonb not null default '[]'::jsonb, -- prévias (urls)
  items int,                        -- quantas artes vêm no pack
  canva_url text,                   -- link do modelo no Canva (só a equipe vê; vai para o cliente depois do pagamento)
  price numeric,                    -- preço (opcional; se vazio usa o do serviço "Pack de artes no Canva")
  active boolean not null default true,
  views int not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table canva_packs enable row level security;
drop policy if exists canva_packs_team on canva_packs;
create policy canva_packs_team on canva_packs for all using (is_team()) with check (is_team());
create index if not exists canva_packs_niche_idx on canva_packs (niche);
-- quem edita packs também pode enviar as imagens de prévia
drop policy if exists publico_enviar on storage.objects;
create policy publico_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'publico' and (public.has_perm('checkout.editor') or public.has_perm('modelos.editar') or public.has_perm('packs.editar') or public.is_master()));

-- ===================== 035_campanhas_entrega.sql =====================
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

-- ===================== 036_fotos_contatos.sql =====================
-- Foto de perfil do WhatsApp de cada contato (cópia guardada; atualiza a cada 7 dias)
alter table leads add column if not exists photo_url text;
alter table leads add column if not exists photo_at timestamptz;

-- ===================== 037_area_cliente_visibilidade.sql =====================
-- 037: Segurança (parte 1)
-- 1) Área do cliente: usuário e senha para editar Link na bio e Catálogo (o link de edição sozinho não basta mais)
-- 2) Mostrar/ocultar prévias, links na bio e catálogos para o cliente

create table if not exists client_accounts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads on delete set null,
  name text not null default '',
  username text unique not null,
  pass_hash text not null,
  pass_ver int not null default 1,
  active boolean not null default true,
  failed int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_accounts_lead_idx on client_accounts (lead_id);
-- sem políticas: só o servidor (chave de serviço) lê e grava; a senha nunca chega ao navegador
alter table client_accounts enable row level security;

alter table bio_pages add column if not exists account_id uuid references client_accounts on delete set null;
alter table bio_pages add column if not exists visible boolean not null default true;
alter table catalogs add column if not exists account_id uuid references client_accounts on delete set null;
alter table catalogs add column if not exists visible boolean not null default true;
alter table previews add column if not exists visible boolean not null default true;

-- derruba as sessões de uma pessoa (usado ao redefinir a verificação em 2 etapas)
create or replace function public.signout_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.sessions where user_id = p_user;
end $$;
revoke all on function public.signout_user(uuid) from public, anon, authenticated;
grant execute on function public.signout_user(uuid) to service_role;

-- ===================== 038_2fa_no_banco.sql =====================
-- 038: Verificação em 2 etapas obrigatória também no banco: dados da equipe só para sessões com código (aal2)
-- Rodar depois que o painel com a tela de 2 etapas estiver no ar.

-- 2 etapas: a sessão precisa ter passado pelo código do autenticador
create or replace function public.aal2() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select public.aal2() and exists (select 1 from public.team_members where id = auth.uid() and active)
$$;

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select public.aal2() and exists (select 1 from public.team_members where id = auth.uid() and active and role = 'master')
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.has_perm(text)'::regprocedure);
  if position('public.aal2()' in d) = 0 then
    d := replace(d, 'where m.id = auth.uid() and m.active', 'where public.aal2() and m.id = auth.uid() and m.active');
    execute d;
  end if;
end $$;


-- ===================== 039_financeiro.sql =====================
-- 039: Financeiro
-- Contas a pagar (despesas) e lançamentos de receita manuais. Os pagamentos do Asaas/Pix (tabela payments) entram
-- direto nos recebimentos, sem duplicar. Comprovantes (imagem/PDF) ficam na pasta privada "financeiro".

create table if not exists fin_entries (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  kind text not null default 'despesa' check (kind in ('despesa', 'receita')),
  description text not null,
  category text not null default 'Outros',
  amount numeric not null check (amount >= 0),
  recurrence text not null default 'unico' check (recurrence in ('unico', 'mensal', 'anual')),
  due_date date,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  paid_at timestamptz,
  method text,
  supplier text,
  notes text,
  lead_id uuid references leads on delete set null,
  service text,
  parent_id uuid references fin_entries on delete set null,
  archived boolean not null default false,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fin_entries_due_idx on fin_entries (kind, status, due_date);
create index if not exists fin_entries_lead_idx on fin_entries (lead_id);

-- comprovantes e comentários de qualquer lançamento (despesa, receita manual ou pagamento do Asaas)
create table if not exists fin_files (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references fin_entries on delete cascade,
  payment_id uuid references payments on delete cascade,
  path text not null,
  name text not null,
  mime text,
  size int,
  created_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists fin_files_entry_idx on fin_files (entry_id);
create index if not exists fin_files_payment_idx on fin_files (payment_id);

create table if not exists fin_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references fin_entries on delete cascade,
  payment_id uuid references payments on delete cascade,
  text text not null,
  author text,
  created_at timestamptz not null default now()
);

-- observações em pagamentos do Asaas
alter table payments add column if not exists notes text;

-- só o servidor lê e grava (a API confere a permissão "financeiro")
alter table fin_entries enable row level security;
alter table fin_files enable row level security;
alter table fin_comments enable row level security;

do $$
begin
  begin
    insert into storage.buckets (id, name, public) values ('financeiro', 'financeiro', false) on conflict (id) do nothing;
  exception when others then raise notice 'storage: %', sqlerrm;
  end;
end $$;

-- ===================== 040_clientes_renovacoes_instagram.sql =====================
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

-- ===================== 041_orcamentos_relatorios.sql =====================
-- 041: Orçamentos e Relatórios de tráfego (estrutura trazida do sistema feito no Lovable)
-- Criado uma vez só (as tabelas e colunas são as mesmas do sistema original, para o código funcionar igual).
do $lv$
begin
if to_regclass('public.quote_templates') is null then
if to_regtype('public.client_status') is null then
  create type public.client_status as enum ('orcamento', 'negociacao', 'ativo', 'pausado', 'cancelado');
end if;
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_business_type TEXT NOT NULL,
  city TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  color_theme TEXT NOT NULL DEFAULT 'gold-dark',
  plan1_total TEXT NOT NULL DEFAULT 'R$ 2.000',
  plan1_labor TEXT NOT NULL DEFAULT 'R$ 1.100,00',
  plan1_ads TEXT NOT NULL DEFAULT 'R$ 900,00 (R$ 30/dia)',
  plan1_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan2_total TEXT NOT NULL DEFAULT 'R$ 3.000',
  plan2_labor TEXT NOT NULL DEFAULT 'R$ 1.500,00',
  plan2_ads TEXT NOT NULL DEFAULT 'R$ 1.500,00 (R$ 50/dia)',
  plan2_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  status client_status NOT NULL DEFAULT 'orcamento',
  monthly_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 10,
  notes TEXT DEFAULT '',
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE public.quote_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT DEFAULT ''
);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS password TEXT DEFAULT NULL;

CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  professional_name text NOT NULL DEFAULT 'Matheus Rangel',
  professional_photo_url text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 5,
  star_color text NOT NULL DEFAULT '#3b82f6',
  services jsonb NOT NULL DEFAULT '["Web Designer","Gestor de Tráfego Pago","Anúncios","Programação & Desenvolvimento","Automações e IA''s"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;

ALTER TABLE public.quotes ADD COLUMN available_colors jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.quotes ADD COLUMN layout_type text NOT NULL DEFAULT 'simple';

ALTER TABLE public.site_settings ADD COLUMN star_animation text NOT NULL DEFAULT 'none';

CREATE TABLE public.traffic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  period_start date,
  period_end date,
  access_password text,
  access_token text NOT NULL DEFAULT gen_random_uuid()::text,
  layout_theme integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  strategy_notes text DEFAULT '',
  investment_tip text DEFAULT '',
  contact_whatsapp text DEFAULT '',
  contact_email text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_traffic_reports_token ON public.traffic_reports(access_token);

CREATE TABLE public.traffic_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  metric_key text NOT NULL DEFAULT '',
  metric_value numeric NOT NULL DEFAULT 0,
  metric_label text NOT NULL DEFAULT '',
  metric_icon text DEFAULT '',
  metric_color text DEFAULT '',
  metric_category text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.traffic_report_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  current_investment numeric NOT NULL DEFAULT 0,
  simulated_investment numeric NOT NULL DEFAULT 0,
  projected_clicks numeric NOT NULL DEFAULT 0,
  projected_leads numeric NOT NULL DEFAULT 0,
  projected_messages numeric NOT NULL DEFAULT 0,
  projected_reach numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS allow_layout_switch boolean NOT NULL DEFAULT true;

ALTER TABLE public.traffic_reports 
  ADD COLUMN IF NOT EXISTS goal_target numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goal_reference numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strategy_type text DEFAULT '';

CREATE TABLE public.traffic_report_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL DEFAULT '',
  caption TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reviewer_name text NOT NULL DEFAULT '',
  reviewer_photo_url text DEFAULT '',
  review_text text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  review_date date DEFAULT CURRENT_DATE,
  reviewer_location text DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  review_layout text NOT NULL DEFAULT 'carousel',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  slug text NOT NULL DEFAULT 'simple',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  hero_image_url text DEFAULT '/images/hero-bg.jpg',
  hero_emoji text DEFAULT '🦷',
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  show_on_simple BOOLEAN NOT NULL DEFAULT false,
  show_on_detailed BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_page_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

UPDATE sales_page_config 
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            config::jsonb,
            '{aboutTitle2}', '"Sou o especialista que cuida do seu negócio pessoalmente."'
          ),
          '{aboutSubtitle}', '""'
        ),
        '{aboutBio1}', '"Me chamo Matheus Rangel. Há mais de 10 anos ajudo donos de negócio a conseguir mais clientes usando a internet — sem complicação, sem enrolação."'
      ),
      '{aboutBio2}', '"Quando você me contrata, fala direto comigo. Eu mesmo crio os anúncios, acompanho os resultados e te explico tudo de forma simples, sem termos técnicos difíceis.\n\nNão importa se você tem uma clínica, um salão, uma loja ou qualquer outro negócio — se você quer mais clientes, eu sei como fazer isso acontecer."'
    ),
    '{aboutBio3}', '"Traga seu problema. Eu entrego a solução."'
  ),
  '{aboutBadges}', '[]'
),
updated_at = now()
WHERE id = 'default';

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS traffic_reports_slug_unique ON public.traffic_reports (slug) WHERE slug IS NOT NULL;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cnpj text DEFAULT '';

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS copyright_text text DEFAULT '';

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

ALTER TABLE public.traffic_reports
ADD COLUMN IF NOT EXISTS client_company_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS client_contact_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS client_logo_url text DEFAULT '';

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS header_padding integer DEFAULT 40;

ALTER TABLE public.traffic_reports 
  ADD COLUMN IF NOT EXISTS matrix_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS matrix_effect text DEFAULT 'converge',
  ADD COLUMN IF NOT EXISTS matrix_duration integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS matrix_color text DEFAULT '#00ff41',
  ADD COLUMN IF NOT EXISTS matrix_text text DEFAULT '';

ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS matrix_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS matrix_effect text DEFAULT 'converge',
  ADD COLUMN IF NOT EXISTS matrix_duration integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS matrix_color text DEFAULT '#00ff41',
  ADD COLUMN IF NOT EXISTS matrix_text text DEFAULT '';

ALTER TABLE public.traffic_reports 
  ADD COLUMN IF NOT EXISTS whatsapp_widget_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS whatsapp_widget_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.traffic_reports
  ADD COLUMN IF NOT EXISTS header_bg_type text NOT NULL DEFAULT 'theme',
  ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS header_bg_gradient text DEFAULT 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  ADD COLUMN IF NOT EXISTS header_bg_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS header_matrix_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS header_matrix_color text DEFAULT '#00ff41',
  ADD COLUMN IF NOT EXISTS header_matrix_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS header_matrix_speed integer NOT NULL DEFAULT 30;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT '';

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS website_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS website_label text DEFAULT 'Visite o meu site',
ADD COLUMN IF NOT EXISTS website_visible boolean DEFAULT true;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS website_position integer DEFAULT 3;

ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tab_title_prefix text DEFAULT 'Admin - Matheus Rangel',
  ADD COLUMN IF NOT EXISTS tab_title_show_menu boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tab_title_menu_position text DEFAULT 'after';

CREATE TABLE public.traffic_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  upload_label TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS allowed_layouts jsonb DEFAULT '["default","analytics","marketing","corporate","modern","funnel","performance","datatable","executive","dashboard"]'::jsonb;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS plans_config jsonb DEFAULT '[]'::jsonb;

UPDATE public.quote_templates
SET sections = jsonb_set(
  jsonb_set(
    jsonb_set(
      sections::jsonb,
      '{strategy_tip}',
      '"Com um investimento inicial acessível, apenas 1 nova venda por dia já cobre todo o custo dos anúncios. O lucro real virá com a recorrência e o aumento do ticket médio. Essa é a Estratégia de Crescimento Sustentável!"'::jsonb
    ),
    '{strategy_items}',
    '[{"emoji": "🎯", "title": "Atração Inteligente", "desc": "Atraímos novos clientes com ofertas estratégicas e depois fidelizamos para aumentar o ticket médio."}, {"emoji": "whatsapp", "title": "WhatsApp Humanizado", "desc": "Atendimento rápido e profissional no X1, transformando cada contato em uma venda confirmada."}, {"emoji": "instagram", "title": "Instagram Estratégico", "desc": "Construímos seu perfil com conteúdo que gera seguidores qualificados e engajamento real."}, {"emoji": "📍", "title": "Tráfego Local Direcionado", "desc": "Anúncios segmentados para o público certo na sua região, maximizando conversão."}]'::jsonb
  ),
  '{metrics_tables}',
  '[{"title": "💰 Expectativa Realista com R$ 30/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "4 a 8 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "1 a 2"], ["Novos Clientes/Mês", "10 a 30"]]}, {"title": "💰 Expectativa Realista com R$ 50/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "7 a 14 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "2 a 3"], ["Novos Clientes/Mês", "20 a 50"]]}]'::jsonb
)
WHERE slug = 'simple';

UPDATE public.quote_templates
SET sections = jsonb_set(
  jsonb_set(
    jsonb_set(
      sections::jsonb,
      '{strategy_tip}',
      '"Com um investimento inicial acessível, apenas 1 nova venda por dia já cobre todo o custo dos anúncios. O lucro real virá com a recorrência e o aumento do ticket médio. Essa é a Estratégia de Crescimento Sustentável!"'::jsonb
    ),
    '{strategy_items}',
    '[{"emoji": "🎯", "title": "Atração Inteligente", "desc": "Atraímos novos clientes com ofertas estratégicas e depois fidelizamos para aumentar o ticket médio."}, {"emoji": "whatsapp", "title": "WhatsApp Humanizado", "desc": "Atendimento rápido e profissional no X1, transformando cada contato em uma venda confirmada."}, {"emoji": "instagram", "title": "Instagram Estratégico", "desc": "Construímos seu perfil com conteúdo que gera seguidores qualificados e engajamento real."}, {"emoji": "📍", "title": "Tráfego Local Direcionado", "desc": "Anúncios segmentados para o público certo na sua região, maximizando conversão."}]'::jsonb
  ),
  '{metrics_tables}',
  '[{"title": "💰 Expectativa Realista com R$ 30/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "4 a 8 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "1 a 2"], ["Novos Clientes/Mês", "10 a 30"]]}, {"title": "💰 Expectativa Realista com R$ 50/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "7 a 14 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "2 a 3"], ["Novos Clientes/Mês", "20 a 50"]]}]'::jsonb
)
WHERE slug = 'detailed';

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS hidden_plan_indexes jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS instagram_personal text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_business text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT '';

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT 'Matheus Rangel — Marketing Digital',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT 'Especialista em marketing digital com mais de 10 anos de experiência.',
  ADD COLUMN IF NOT EXISTS seo_og_image_url text,
  ADD COLUMN IF NOT EXISTS seo_site_url text DEFAULT 'https://www.matheusrangel.com.br';

ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'masculino',
  ADD COLUMN IF NOT EXISTS ticket_medio text;

ALTER TABLE public.quote_views ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS quote_views_quote_device_unique ON public.quote_views(quote_id, device_id) WHERE device_id IS NOT NULL;

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections::jsonb,
  '{strategy_items,3,emoji}',
  '"gps-pin"'::jsonb
)
WHERE slug IN ('simple','detailed')
  AND sections::jsonb -> 'strategy_items' -> 3 IS NOT NULL;

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections::jsonb,
  '{metrics_tables}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (t->>'title') LIKE '💰%'
          THEN jsonb_set(t, '{title}', to_jsonb('money-float ' || regexp_replace(t->>'title','^💰\s*','')))
        ELSE t
      END
    )
    FROM jsonb_array_elements(sections::jsonb -> 'metrics_tables') AS t
  )
)
WHERE slug IN ('simple','detailed')
  AND jsonb_typeof(sections::jsonb -> 'metrics_tables') = 'array';

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{strategy_items}',
  (
    SELECT jsonb_agg(
      CASE WHEN item->>'emoji' = '📍' THEN jsonb_set(item, '{emoji}', '"gps-pin"') ELSE item END
    )
    FROM jsonb_array_elements(sections->'strategy_items') item
  )
)
WHERE sections ? 'strategy_items'
  AND sections->'strategy_items' @> '[{"emoji":"📍"}]'::jsonb;

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{metrics_tables}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN tbl->>'title' LIKE '💰 %'
          THEN jsonb_set(tbl, '{title}', to_jsonb('money-float ' || substring(tbl->>'title' from 3)))
        ELSE tbl
      END
    )
    FROM jsonb_array_elements(sections->'metrics_tables') tbl
  )
)
WHERE sections ? 'metrics_tables'
  AND sections::text LIKE '%💰 %';

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{howwework_title}',
  to_jsonb(regexp_replace(sections->>'howwework_title', '^🤝\s*', ''))
)
WHERE sections ? 'howwework_title'
  AND sections->>'howwework_title' LIKE '🤝%';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'masculino',
  ADD COLUMN IF NOT EXISTS ticket_medio text;

UPDATE public.quote_templates
SET sections = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          sections,
          '{strategy_items}',
          COALESCE((
            SELECT jsonb_agg(
              CASE
                WHEN item->>'emoji' = '📍' THEN jsonb_set(item, '{emoji}', '"gps-pin"'::jsonb)
                WHEN item->>'emoji' = '🤝' THEN jsonb_set(item, '{emoji}', '"handshake"'::jsonb)
                ELSE item
              END
              ORDER BY ord
            )
            FROM jsonb_array_elements(COALESCE(sections->'strategy_items', '[]'::jsonb)) WITH ORDINALITY AS arr(item, ord)
          ), sections->'strategy_items', '[]'::jsonb)
        ),
        '{howwework_icon}',
        '"handshake"'::jsonb,
        true
      ),
      '{timeline_icon}',
      '"calendar-modern"'::jsonb,
      true
    ),
    '{metrics_icon}',
    '"money-float"'::jsonb,
    true
  ),
  '{metrics_growth_icon}',
  '"rocket-growth"'::jsonb,
  true
)
WHERE slug IN ('simple', 'detailed');

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{metrics_tables}',
  COALESCE((
    SELECT jsonb_agg(
      jsonb_set(
        table_item,
        '{title}',
        to_jsonb(
          regexp_replace(
            regexp_replace(
              regexp_replace(table_item->>'title', '^\s*💰\s*', 'money-float ', 'g'),
              '^\s*money-float\s+', 'money-float ', 'g'
            ),
            '\s*🚀\s*$', '', 'g'
          )
        )
      )
      ORDER BY ord
    )
    FROM jsonb_array_elements(COALESCE(sections->'metrics_tables', '[]'::jsonb)) WITH ORDINALITY AS arr(table_item, ord)
  ), sections->'metrics_tables', '[]'::jsonb)
)
WHERE slug IN ('simple', 'detailed')
  AND jsonb_typeof(sections->'metrics_tables') = 'array';

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{section_order}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN section_item->>'id' = 'timeline' THEN jsonb_set(section_item, '{icon}', '"calendar-modern"'::jsonb)
        WHEN section_item->>'id' = 'metrics' THEN jsonb_set(section_item, '{icon}', '"money-float"'::jsonb)
        WHEN section_item->>'id' = 'howwework' THEN jsonb_set(section_item, '{icon}', '"handshake"'::jsonb)
        ELSE section_item
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(COALESCE(sections->'section_order', '[]'::jsonb)) WITH ORDINALITY AS arr(section_item, ord)
  ), sections->'section_order', '[]'::jsonb)
)
WHERE slug IN ('simple', 'detailed')
  AND jsonb_typeof(sections->'section_order') = 'array';

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS niche TEXT,
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;

ALTER TABLE public.traffic_metrics 
DROP CONSTRAINT IF EXISTS traffic_metrics_report_id_fkey,
ADD CONSTRAINT traffic_metrics_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.traffic_report_snapshots 
DROP CONSTRAINT IF EXISTS traffic_report_snapshots_report_id_fkey,
ADD CONSTRAINT traffic_report_snapshots_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.traffic_report_creatives 
DROP CONSTRAINT IF EXISTS traffic_report_creatives_report_id_fkey,
ADD CONSTRAINT traffic_report_creatives_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.traffic_report_simulations 
DROP CONSTRAINT IF EXISTS traffic_report_simulations_report_id_fkey,
ADD CONSTRAINT traffic_report_simulations_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_since DATE;

UPDATE public.clients SET client_since = created_at::DATE WHERE client_since IS NULL;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj TEXT;

ALTER TABLE public.traffic_report_snapshots ADD COLUMN campaign_name TEXT;

ALTER TABLE public.traffic_metrics ADD COLUMN campaign_name TEXT;

CREATE INDEX idx_traffic_report_snapshots_campaign ON public.traffic_report_snapshots(report_id, campaign_name);

CREATE INDEX idx_traffic_metrics_campaign ON public.traffic_metrics(report_id, campaign_name);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS best_plan_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

ALTER TABLE public.traffic_metrics
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.traffic_metrics
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.traffic_metrics
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS best_plan_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS _schema_sync_temp boolean;

ALTER TABLE public.quotes DROP COLUMN IF EXISTS _schema_sync_temp;

ALTER TABLE public.clients ALTER COLUMN business_type DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN city DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN business_type SET DEFAULT '';

ALTER TABLE public.clients ALTER COLUMN city SET DEFAULT '';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS observation TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS due_day TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_type TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS monthly_value NUMERIC;

ALTER TABLE public.clients ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN address DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN observation DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN due_day DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN city DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN state DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN business_type DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN monthly_value DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN status SET DEFAULT 'orcamento';

ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '["Gestor de Tráfego Pago","Especialista em Anúncios","Marketing Digital","Criação de Anúncios","Tráfego para WhatsApp","Criação de Loja Virtual","Criação de Sites","Criação de Landing Page","Web Designer Profissional","Web Designer","Anúncios no Google","Anúncios no Instagram","Anúncios no Facebook","Gestor de Tráfego Limeira","Marketing Digital Limeira","Consultoria em Marketing","SEO","Otimização para Google","Especialista Meta Ads","Especialista Google Ads"]'::jsonb;

ALTER TABLE public.traffic_reports
ADD COLUMN IF NOT EXISTS update_info_config jsonb NOT NULL DEFAULT jsonb_build_object(
  'iconName', 'CalendarCheck',
  'iconSize', 18,
  'iconColor', '#00ff41',
  'labelText', 'Data da Última Atualização de Dados:',
  'labelSize', 12,
  'labelColor', '',
  'dateColor', '#00ff41',
  'dateBold', true,
  'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
  'subtitleColor', '#fb923c',
  'subtitleSize', 12,
  'subtitleBold', true
);

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS niche text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cpf text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cnpj text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_personal text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_business text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_since date,
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS observation text;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT 'Matheus Rangel — Marketing Digital',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT 'Especialista em marketing digital com mais de 10 anos de experiência.',
  ADD COLUMN IF NOT EXISTS seo_og_image_url text,
  ADD COLUMN IF NOT EXISTS seo_site_url text DEFAULT 'https://www.matheusrangel.com.br',
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '';

INSERT INTO public.site_settings (id, seo_keywords)
VALUES (
  'main',
  '["Gestor de Tráfego Pago","Especialista em Anúncios","Marketing Digital","Criação de Anúncios","Tráfego para WhatsApp","Criação de Loja Virtual","Criação de Sites","Criação de Landing Page","Web Designer Profissional","Web Designer","Anúncios no Google","Anúncios no Instagram","Anúncios no Facebook","Gestor de Tráfego Limeira","Marketing Digital Limeira","Consultoria em Marketing","SEO","Otimização para Google","Especialista Meta Ads","Especialista Google Ads"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = now();

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT 'Matheus Rangel — Marketing Digital',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT 'Especialista em marketing digital com mais de 10 anos de experiência.',
  ADD COLUMN IF NOT EXISTS seo_og_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_site_url text DEFAULT 'https://www.matheusrangel.com.br',
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tab_title_prefix text DEFAULT 'Admin - Matheus Rangel',
  ADD COLUMN IF NOT EXISTS tab_title_show_menu boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tab_title_menu_position text DEFAULT 'after';

UPDATE public.site_settings
SET
  seo_title = COALESCE(NULLIF(seo_title, ''), 'Matheus Rangel — Marketing Digital'),
  seo_description = COALESCE(NULLIF(seo_description, ''), 'Especialista em marketing digital com mais de 10 anos de experiência.'),
  seo_og_image_url = COALESCE(seo_og_image_url, ''),
  seo_site_url = COALESCE(NULLIF(seo_site_url, ''), 'https://www.matheusrangel.com.br'),
  seo_keywords = CASE
    WHEN seo_keywords IS NULL OR jsonb_array_length(seo_keywords) = 0 THEN '["Gestor de Tráfego Pago", "Especialista em Anúncios", "Marketing Digital", "Criação de Anúncios", "Tráfego para WhatsApp", "Criação de Loja Virtual", "Criação de Sites", "Criação de Landing Page", "Web Designer Profissional", "Web Designer", "Anúncios no Google", "Anúncios no Instagram", "Anúncios no Facebook", "Gestor de Tráfego Limeira", "Marketing Digital Limeira", "Consultoria em Marketing", "SEO", "Otimização para Google", "Especialista Meta Ads", "Especialista Google Ads"]'::jsonb
    ELSE seo_keywords
  END,
  favicon_url = COALESCE(favicon_url, ''),
  tab_title_prefix = COALESCE(NULLIF(tab_title_prefix, ''), 'Admin - Matheus Rangel'),
  tab_title_show_menu = COALESCE(tab_title_show_menu, true),
  tab_title_menu_position = COALESCE(NULLIF(tab_title_menu_position, ''), 'after')
WHERE id = 'main';

INSERT INTO public.site_settings (id, seo_keywords)
VALUES ('main', '["Gestor de Tráfego Pago", "Especialista em Anúncios", "Marketing Digital", "Criação de Anúncios", "Tráfego para WhatsApp", "Criação de Loja Virtual", "Criação de Sites", "Criação de Landing Page", "Web Designer Profissional", "Web Designer", "Anúncios no Google", "Anúncios no Instagram", "Anúncios no Facebook", "Gestor de Tráfego Limeira", "Marketing Digital Limeira", "Consultoria em Marketing", "SEO", "Otimização para Google", "Especialista Meta Ads", "Especialista Google Ads"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.traffic_reports
ADD COLUMN IF NOT EXISTS update_info_config jsonb NOT NULL DEFAULT jsonb_build_object(
  'iconName', 'CalendarCheck',
  'iconSize', 18,
  'iconColor', '#00ff41',
  'labelText', 'Data da Última Atualização de Dados:',
  'labelSize', 12,
  'labelColor', '',
  'dateColor', '#00ff41',
  'dateBold', true,
  'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
  'subtitleColor', '#fb923c',
  'subtitleSize', 12,
  'subtitleBold', true
);

ALTER TABLE public.traffic_reports
ALTER COLUMN update_info_config SET DEFAULT jsonb_build_object(
  'iconName', 'CalendarCheck',
  'iconSize', 18,
  'iconColor', '#00ff41',
  'labelText', 'Data da Última Atualização de Dados:',
  'labelSize', 12,
  'labelColor', '',
  'dateColor', '#00ff41',
  'dateBold', true,
  'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
  'subtitleColor', '#fb923c',
  'subtitleSize', 12,
  'subtitleBold', true
);

ALTER TABLE public.traffic_reports
  ADD COLUMN IF NOT EXISTS update_info_config jsonb;

ALTER TABLE public.traffic_reports
  ALTER COLUMN update_info_config SET DEFAULT jsonb_build_object(
    'iconName', 'CalendarCheck',
    'iconSize', 18,
    'iconColor', '#00ff41',
    'labelText', 'Data da Última Atualização de Dados:',
    'labelSize', 12,
    'labelColor', '',
    'dateColor', '#00ff41',
    'dateBold', true,
    'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
    'subtitleColor', '#fb923c',
    'subtitleSize', 12,
    'subtitleBold', true
  );

UPDATE public.traffic_reports
SET update_info_config = COALESCE(
  update_info_config,
  jsonb_build_object(
    'iconName', 'CalendarCheck',
    'iconSize', 18,
    'iconColor', '#00ff41',
    'labelText', 'Data da Última Atualização de Dados:',
    'labelSize', 12,
    'labelColor', '',
    'dateColor', '#00ff41',
    'dateBold', true,
    'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
    'subtitleColor', '#fb923c',
    'subtitleSize', 12,
    'subtitleBold', true
  )
);

ALTER TABLE public.traffic_reports
  ALTER COLUMN update_info_config SET NOT NULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

UPDATE public.quotes q
SET last_viewed_at = sub.max_viewed
FROM (
  SELECT quote_id, MAX(viewed_at) AS max_viewed
  FROM public.quote_views
  GROUP BY quote_id
) sub
WHERE sub.quote_id = q.id AND q.last_viewed_at IS NULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

ALTER TABLE public.quote_templates ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

CREATE INDEX IF NOT EXISTS quote_templates_user_service_idx ON public.quote_templates(user_id, service_type);

CREATE INDEX IF NOT EXISTS quotes_service_type_idx ON public.quotes(service_type);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.quote_templates
ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

ALTER TABLE public.quote_templates
DROP CONSTRAINT IF EXISTS quote_templates_service_type_check;

ALTER TABLE public.quote_templates
ADD CONSTRAINT quote_templates_service_type_check
CHECK (service_type IN ('trafego_pago', 'sites_paginas', 'loja_virtual', 'sistemas_app'));

UPDATE public.quote_templates
SET service_type = 'trafego_pago'
WHERE service_type IS NULL OR service_type = '';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep text, ADD COLUMN IF NOT EXISTS neighborhood text, ADD COLUMN IF NOT EXISTS street text, ADD COLUMN IF NOT EXISTS address_number text, ADD COLUMN IF NOT EXISTS complement text;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS internal_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_internal_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_external_viewed_at timestamptz;

ALTER TABLE public.traffic_reports
  ADD COLUMN IF NOT EXISTS internal_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_internal_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_external_viewed_at timestamptz;

ALTER TABLE public.quotes REPLICA IDENTITY FULL;

ALTER TABLE public.traffic_reports REPLICA IDENTITY FULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

UPDATE public.sales_page_config
SET config = config - 'audioLoadingUrl' - 'audioClickUrl',
    updated_at = now()
WHERE id = 'default'
  AND (config->>'audioLoadingUrl' LIKE '%mykczkuxhxziivcfwjfk%'
    OR config->>'audioClickUrl' LIKE '%mykczkuxhxziivcfwjfk%');


end if;
end $lv$;

-- ligação com a central de clientes
alter table clients add column if not exists lead_id uuid references leads on delete set null;
insert into site_settings (id) values ('main') on conflict do nothing;
insert into sales_page_config (id) values ('default') on conflict do nothing;

-- segurança: só a equipe (com 2 etapas) mexe; as páginas públicas leem pelo servidor
do $$
declare t text;
begin
  foreach t in array array['quotes','quote_templates','quote_faq_items','quote_views','site_settings','sales_page_config','google_reviews','traffic_metrics','traffic_report_creatives','traffic_report_simulations','traffic_report_snapshots','traffic_reports','clients']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;

-- função usada pela tela de relatórios
create or replace function public.update_traffic_snapshot_campaign(_snapshot_id uuid, _campaign_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_report_id uuid; v_file_name text; v_clean text; v_n integer;
begin
  if not public.is_team() then return jsonb_build_object('success', false, 'error', 'Sem permissão para alterar campanha'); end if;
  select report_id, file_name into v_report_id, v_file_name from traffic_report_snapshots where id = _snapshot_id;
  if v_report_id is null then return jsonb_build_object('success', false, 'error', 'Upload não encontrado'); end if;
  v_clean := nullif(trim(coalesce(_campaign_name, '')), '');
  update traffic_report_snapshots set campaign_name = v_clean, upload_label = coalesce(v_clean, upload_label)
   where report_id = v_report_id and (id = _snapshot_id or (v_file_name is not null and file_name = v_file_name));
  get diagnostics v_n = row_count;
  return jsonb_build_object('success', true, 'updated_count', v_n);
end $$;

create or replace function public.can_manage_admin_data(_user_id uuid default null) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_team() $$;

-- imagens enviadas pelos editores de orçamento
do $$
begin
  begin
    insert into storage.buckets (id, name, public) values ('site-assets', 'site-assets', true) on conflict (id) do nothing;
    execute 'drop policy if exists site_assets_enviar on storage.objects';
    execute 'create policy site_assets_enviar on storage.objects for insert to authenticated with check (bucket_id = ''site-assets'' and public.is_team())';
    execute 'drop policy if exists site_assets_trocar on storage.objects';
    execute 'create policy site_assets_trocar on storage.objects for update to authenticated using (bucket_id = ''site-assets'' and public.is_team())';
  exception when others then raise notice 'storage: %', sqlerrm;
  end;
end $$;

-- ===================== 042_contratos_recibos.sql =====================
-- 042: Contratos com assinatura e Recibos manuais (estrutura do sistema feito no Lovable)
do $lv$
begin
if to_regclass('public.contracts') is null then
CREATE TABLE public.receipt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  payer_name text NOT NULL,
  payer_document text,
  payer_state text,
  beneficiary_name text,
  beneficiary_document text,
  beneficiary_email text,
  payment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  body text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  template_key text NOT NULL,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,

  
  service_value numeric(12,2),
  payment_terms text,
  service_scope text,
  duration_months int,

  
  contractor_name text NOT NULL DEFAULT 'Matheus Rangel',
  contractor_document text,
  contractor_email text,
  client_name text NOT NULL,
  client_document text,
  client_email text,
  client_phone text,
  client_address text,

  
  status text NOT NULL DEFAULT 'rascunho', 
  sent_at timestamptz,

  
  client_signature text,           
  client_signed_at timestamptz,
  client_ip text,
  client_user_agent text,

  
  provider_signature text,         
  provider_signed_at timestamptz,
  provider_ip text,
  provider_user_agent text,

  
  document_hash text,

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_token ON public.contracts(token);

CREATE INDEX idx_contracts_client ON public.contracts(client_id);

CREATE INDEX idx_contracts_status ON public.contracts(status);

INSERT INTO public.contract_templates (key, title, description, sort_order, body) VALUES
('trafego_pago', 'Gestão de Tráfego Pago', 'Contrato de prestação de serviços de gestão de anúncios (Meta Ads / Google Ads).', 1,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE TRÁFEGO PAGO

CONTRATANTE: {{cliente.nome}}, inscrito(a) no CPF/CNPJ {{cliente.documento}}, com endereço em {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, inscrito no CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
O CONTRATADO prestará ao CONTRATANTE serviços de gestão profissional de tráfego pago nas plataformas Meta Ads (Facebook e Instagram) e/ou Google Ads, incluindo: criação e otimização de campanhas, segmentação de público, análise de métricas, ajustes de lances e orçamento, criação de conjuntos de anúncios e relatórios periódicos de desempenho.

CLÁUSULA 2 — VALOR E FORMA DE PAGAMENTO
O CONTRATANTE pagará ao CONTRATADO o valor mensal de R$ {{servico.valor}}, referente exclusivamente à gestão dos anúncios. Os valores investidos nas plataformas (verba de anúncios) são de responsabilidade exclusiva do CONTRATANTE e cobrados diretamente pelo Facebook/Google no cartão de crédito cadastrado. Forma de pagamento: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO
O contrato tem duração de {{servico.duracao}} meses, renovável automaticamente por iguais períodos salvo manifestação em contrário com 30 dias de antecedência.

CLÁUSULA 4 — OBRIGAÇÕES DO CONTRATANTE
a) Fornecer acessos necessários (BM, conta de anúncio, Instagram, site, pixel).
b) Manter cartão de crédito válido cadastrado nas plataformas.
c) Fornecer materiais (fotos, vídeos, textos) quando solicitado.
d) Responder solicitações de aprovação em prazo hábil.

CLÁUSULA 5 — OBRIGAÇÕES DO CONTRATADO
a) Executar as campanhas com técnica e boas práticas de mercado.
b) Enviar relatórios de desempenho no período contratado.
c) Manter sigilo sobre dados e estratégias do CONTRATANTE.

CLÁUSULA 6 — LIMITAÇÃO DE RESULTADOS
O CONTRATADO se compromete com a execução técnica dos serviços, não sendo possível garantir números específicos de vendas, leads ou faturamento, uma vez que o desempenho depende também de fatores externos (produto, atendimento, preço, sazonalidade e comportamento do público).

CLÁUSULA 7 — RESCISÃO
Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 dias, sem multa, desde que quitados os valores em aberto até a data da rescisão.

CLÁUSULA 8 — ESCOPO ADICIONAL
{{servico.escopo}}

CLÁUSULA 9 — FORO
Fica eleito o foro da comarca do CONTRATADO para dirimir dúvidas oriundas deste contrato.

E por estarem justos e contratados, assinam eletronicamente o presente instrumento.

Data: {{data.hoje}}$$),

('desenvolvimento_site', 'Desenvolvimento de Site', 'Contrato para criação de site institucional / landing page / página de vendas.', 2,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SITE

CONTRATANTE: {{cliente.nome}}, CPF/CNPJ {{cliente.documento}}, endereço {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
Desenvolvimento de site conforme escopo abaixo: {{servico.escopo}}

CLÁUSULA 2 — VALOR E PAGAMENTO
Valor total: R$ {{servico.valor}}. Condições: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO DE ENTREGA
O prazo de entrega é de {{servico.duracao}} dias úteis a partir do recebimento de todo o material (textos, imagens, logo, acessos) por parte do CONTRATANTE.

CLÁUSULA 4 — REVISÕES
Estão inclusas até 3 rodadas de revisão de layout. Alterações adicionais serão cobradas separadamente.

CLÁUSULA 5 — HOSPEDAGEM E DOMÍNIO
Domínio e hospedagem são de responsabilidade e custeio do CONTRATANTE. O CONTRATADO fará a publicação no ambiente indicado.

CLÁUSULA 6 — PROPRIEDADE
Após o pagamento integral, o site será de propriedade do CONTRATANTE, incluindo códigos-fonte e credenciais.

CLÁUSULA 7 — SUPORTE PÓS-ENTREGA
Serão prestados 30 dias de suporte gratuito para correção de erros técnicos. Novas funcionalidades e alterações de conteúdo após esse período serão orçadas separadamente.

CLÁUSULA 8 — RESCISÃO
Em caso de desistência do CONTRATANTE, os valores já pagos não serão devolvidos, ficando o CONTRATADO desobrigado de entregar o projeto.

CLÁUSULA 9 — FORO
Fica eleito o foro da comarca do CONTRATADO.

Data: {{data.hoje}}$$),

('loja_virtual', 'Desenvolvimento de Loja Virtual', 'Contrato para criação de e-commerce completo.', 3,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE LOJA VIRTUAL

CONTRATANTE: {{cliente.nome}}, CPF/CNPJ {{cliente.documento}}, endereço {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
Desenvolvimento de loja virtual (e-commerce) com catálogo de produtos, carrinho, checkout, integração de pagamento e cálculo de frete. Escopo detalhado: {{servico.escopo}}

CLÁUSULA 2 — VALOR E PAGAMENTO
Valor total: R$ {{servico.valor}}. Forma de pagamento: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO
Prazo estimado de {{servico.duracao}} dias úteis contados a partir da entrega completa dos materiais e acessos pelo CONTRATANTE.

CLÁUSULA 4 — GATEWAYS E INTEGRAÇÕES
As contas nos gateways de pagamento (Mercado Pago, PagSeguro, Asaas, InfinitePay etc.) e nas transportadoras são de responsabilidade e custeio do CONTRATANTE, incluindo taxas cobradas por esses serviços.

CLÁUSULA 5 — CADASTRO DE PRODUTOS
Está inclusa a estruturação da loja e o cadastro de até 20 produtos iniciais. Cadastros adicionais serão cobrados à parte, conforme volume.

CLÁUSULA 6 — SUPORTE PÓS-ENTREGA
30 dias de suporte gratuito para correção de erros técnicos após publicação.

CLÁUSULA 7 — MANUTENÇÃO MENSAL (OPCIONAL)
Manutenção contínua, atualizações e cadastros posteriores podem ser contratados em plano mensal separado.

CLÁUSULA 8 — PROPRIEDADE
Após pagamento integral, a loja e todo o conteúdo passam a ser de propriedade do CONTRATANTE.

CLÁUSULA 9 — RESCISÃO E FORO
Rescisão por qualquer das partes com aviso prévio de 15 dias. Fica eleito o foro da comarca do CONTRATADO.

Data: {{data.hoje}}$$),

('sistema_app', 'Desenvolvimento de Sistema e App PWA', 'Contrato para sistema web/PWA sob medida.', 4,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SISTEMA E APLICATIVO (PWA)

CONTRATANTE: {{cliente.nome}}, CPF/CNPJ {{cliente.documento}}, endereço {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
Desenvolvimento de sistema web personalizado e/ou aplicativo Progressive Web App (PWA) conforme escopo funcional aprovado: {{servico.escopo}}

CLÁUSULA 2 — VALOR E PAGAMENTO
Valor total do desenvolvimento: R$ {{servico.valor}}. Forma de pagamento: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO
Prazo estimado: {{servico.duracao}} dias úteis, dividido em entregas parciais (sprints) para validação do CONTRATANTE.

CLÁUSULA 4 — ESCOPO E ALTERAÇÕES
Alterações fora do escopo aprovado serão orçadas separadamente através de aditivo contratual.

CLÁUSULA 5 — INFRAESTRUTURA
Custos de servidores, banco de dados, domínios, APIs de terceiros e serviços externos são de responsabilidade do CONTRATANTE.

CLÁUSULA 6 — PROPRIEDADE INTELECTUAL
Após pagamento integral, os códigos-fonte, banco de dados e documentação passam à propriedade do CONTRATANTE, com direitos totais de uso e modificação.

CLÁUSULA 7 — GARANTIA
90 dias de garantia após entrega final para correção de bugs relacionados ao escopo entregue, sem custo.

CLÁUSULA 8 — MANUTENÇÃO EVOLUTIVA
Novas funcionalidades, evoluções e manutenção contínua podem ser contratadas em plano mensal separado.

CLÁUSULA 9 — SIGILO
Ambas as partes se comprometem a manter sigilo sobre informações confidenciais compartilhadas durante o projeto.

CLÁUSULA 10 — RESCISÃO E FORO
Rescisão mediante aviso prévio de 30 dias. Foro da comarca do CONTRATADO.

Data: {{data.hoje}}$$);

CREATE TABLE IF NOT EXISTS public.empresa_contratada_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social   text NOT NULL DEFAULT '',
  documento      text NOT NULL DEFAULT '',
  endereco       text NOT NULL DEFAULT '',
  cidade_uf      text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  whatsapp       text NOT NULL DEFAULT '',
  representante  text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.empresa_contratada_config (razao_social, documento, endereco, cidade_uf, email, whatsapp, representante)
SELECT '', '', '', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.empresa_contratada_config);

UPDATE public.contract_templates
SET
  title = 'Desenvolvimento de Sistemas e Aplicações PWA',
  body = $BODY$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SISTEMAS E APLICAÇÕES PWA

## CONTRATANTE

**Nome/Razão Social:** {{cliente_nome}}

**CPF/CNPJ:** {{cliente_documento}}

**Responsável:** {{cliente_responsavel}}

**E-mail:** {{cliente_email}}

**Telefone / WhatsApp:** {{cliente_whatsapp}}

**Endereço:** {{cliente_endereco}}

---

## CONTRATADA

**Nome/Razão Social:** {{empresa_nome}}

**CPF/CNPJ:** {{empresa_documento}}

**E-mail:** {{empresa_email}}

**Telefone / WhatsApp:** {{empresa_telefone}}

---

# CLÁUSULA 1 – OBJETO DO CONTRATO

O presente contrato tem por objeto a prestação de serviços de **desenvolvimento de sistemas personalizados e aplicações PWA (Progressive Web App)**, conforme o escopo definido entre as partes.

O serviço compreende o planejamento, desenvolvimento, configuração, testes, implantação e entrega do sistema contratado.

---

# CLÁUSULA 2 – DESCRIÇÃO DO PROJETO

O sistema será desenvolvido de acordo com as necessidades apresentadas pelo CONTRATANTE durante a contratação.

**Descrição do Projeto:**

{{descricao_projeto}}

As funcionalidades acima representam o escopo contratado e servirão como referência durante todo o desenvolvimento.

Qualquer funcionalidade, módulo, integração, tela, relatório ou recurso não descrito acima será considerado um **serviço adicional**, dependendo de novo orçamento e aprovação do CONTRATANTE.

---

# CLÁUSULA 3 – TIPO DO PROJETO

Tipo do projeto contratado:

**{{tipo_projeto}}**

---

# CLÁUSULA 4 – PRAZO DE DESENVOLVIMENTO

O prazo estimado para conclusão do projeto é de **30 (trinta) dias corridos**, contados a partir da confirmação do pagamento da primeira parcela e do recebimento de todas as informações, acessos e materiais necessários para execução dos serviços.

Em situações excepcionais, como atrasos no envio de informações, alterações solicitadas durante o desenvolvimento, indisponibilidade de plataformas de terceiros, integrações externas ou outros fatores alheios à vontade da CONTRATADA, o prazo poderá ser prorrogado por até **60 (sessenta) dias**, mediante comunicação ao CONTRATANTE.

---

# CLÁUSULA 5 – VALOR DO PROJETO E FORMA DE PAGAMENTO

Valor total do projeto:

**{{valor_total}}**

O pagamento será realizado em três etapas:

• **30%** na assinatura deste contrato e antes do início do desenvolvimento — **{{parcela_1}}**;

• **30%** quando aproximadamente 50% do projeto estiver concluído, correspondente à entrega da primeira versão funcional (esboço do sistema) — **{{parcela_2}}**;

• **40%** na conclusão do projeto, antes da entrega definitiva — **{{parcela_3}}**.

**Parágrafo Único.** O desenvolvimento somente será iniciado após a confirmação do pagamento da primeira parcela.

---

# CLÁUSULA 6 – DOMÍNIO, SERVIDOR E HOSPEDAGEM

Para funcionamento do sistema será necessária a contratação de serviços de terceiros, como domínio, hospedagem, servidor, banco de dados e demais recursos necessários para manter o sistema online.

Esses serviços **não fazem parte do valor do desenvolvimento** e serão contratados separadamente.

**Plano contratado:** {{plano_hospedagem}}

**Período:** {{periodo_hospedagem}}

**Valor:** {{valor_hospedagem}}

O CONTRATANTE declara estar ciente de que será responsável pelo pagamento da renovação desses serviços durante todo o período de utilização do sistema.

Os valores praticados são definidos exclusivamente pela empresa fornecedora da hospedagem e poderão sofrer reajustes futuros sem qualquer responsabilidade da CONTRATADA. O valor informado neste contrato corresponde ao preço vigente na data da contratação.

---

# CLÁUSULA 7 – ENTREGA E APROVAÇÃO

Após cada etapa do desenvolvimento, o CONTRATANTE poderá acompanhar a evolução do projeto.

Sempre que uma etapa for apresentada, o CONTRATANTE terá até **5 (cinco) dias úteis** para solicitar ajustes relacionados ao escopo contratado.

Caso não haja manifestação dentro desse prazo, a etapa será considerada **automaticamente aprovada**, permitindo o prosseguimento do desenvolvimento.

Ao término do projeto, o sistema será entregue para homologação final antes da publicação definitiva.

---

# CLÁUSULA 8 – GARANTIA, SUPORTE E MANUTENÇÃO

A CONTRATADA prestará **garantia de 6 (seis) meses** para correção de eventuais erros relacionados ao funcionamento do sistema desenvolvido.

Durante esse período também poderão ser realizados pequenos ajustes relacionados ao escopo originalmente contratado, sem custo adicional.

A garantia **não contempla** novas funcionalidades, alterações de layout, mudanças nas regras de negócio, integrações adicionais ou solicitações que não façam parte do escopo contratado.

Após o período de garantia, qualquer suporte, manutenção, atualização, melhoria ou alteração será considerado um serviço adicional.

O valor mínimo para atendimento será de **R$ 250,00** por solicitação, podendo sofrer alteração conforme a complexidade do serviço solicitado.

---

# CLÁUSULA 9 – RESPONSABILIDADES DA CONTRATADA

Compete à **CONTRATADA**: desenvolver o sistema conforme o escopo contratado, configurar as funcionalidades previstas, realizar testes antes da entrega, corrigir eventuais erros relacionados ao desenvolvimento durante o período de garantia, prestar suporte referente ao funcionamento do sistema e entregar o projeto nas condições estabelecidas neste contrato.

---

# CLÁUSULA 10 – RESPONSABILIDADES DO CONTRATANTE

Compete ao **CONTRATANTE**: fornecer todas as informações, documentos, acessos e materiais necessários para o desenvolvimento, responder às solicitações de aprovação dentro dos prazos estabelecidos, realizar os pagamentos conforme contratado, manter os pagamentos referentes à hospedagem, domínio e servidor em dia, realizar testes durante a homologação, comunicar eventuais inconsistências identificadas e responsabilizar-se integralmente pelos dados, conteúdos e informações inseridas no sistema.

---

# CLÁUSULA 11 – LIMITAÇÃO DE RESPONSABILIDADE

A CONTRATADA não poderá ser responsabilizada por atrasos ocasionados pelo não envio de informações pelo CONTRATANTE, alterações solicitadas durante o desenvolvimento, indisponibilidade de servidores, hospedagens, bancos de dados, APIs, gateways de pagamento, serviços de terceiros, alterações realizadas pelo próprio CONTRATANTE ou terceiros após a entrega do sistema, bem como mudanças nas políticas ou funcionamento de plataformas externas como Meta, Google, OpenAI, WhatsApp, Stripe, Mercado Pago, Evolution API, N8N ou qualquer outro serviço utilizado pelo projeto.

Também não será responsabilidade da CONTRATADA qualquer indisponibilidade causada pela empresa responsável pela hospedagem ou servidor.

---

# CLÁUSULA 12 – BACKUP

Após a entrega do sistema, a responsabilidade pela realização de backups periódicos dos dados será **exclusivamente do CONTRATANTE**, salvo quando contratado serviço específico de gerenciamento e manutenção.

---

# CLÁUSULA 13 – PROPRIEDADE DO PROJETO

Após a quitação integral do contrato, o CONTRATANTE terá direito de utilização do sistema desenvolvido.

Ferramentas, componentes reutilizáveis, bibliotecas, metodologias, estruturas de programação, funções genéricas e soluções previamente desenvolvidas pela CONTRATADA permanecerão sendo de sua propriedade intelectual, podendo ser utilizadas em outros projetos.

---

# CLÁUSULA 14 – CONFIDENCIALIDADE

As partes comprometem-se a manter absoluto sigilo sobre todas as informações comerciais, financeiras, estratégicas e técnicas compartilhadas durante a execução deste contrato.

---

# CLÁUSULA 15 – PROTEÇÃO DE DADOS

As partes comprometem-se a utilizar eventuais dados pessoais apenas para execução deste contrato, observando a legislação vigente.

---

# CLÁUSULA 16 – COMUNICAÇÃO

As comunicações entre as partes poderão ocorrer por **e-mail ou WhatsApp**, sendo ambos considerados meios oficiais para solicitações, aprovações e demais comunicações relacionadas ao projeto.

---

# CLÁUSULA 17 – FORO

Fica eleito o foro da Comarca de **{{empresa_cidade_uf}}** para dirimir quaisquer dúvidas oriundas deste contrato, renunciando as partes a qualquer outro foro, por mais privilegiado que seja.

---

## DADOS DO PROJETO

**Projeto:** {{nome_do_plano}}

**Tipo:** {{tipo_projeto}}

**Valor Total:** {{valor_total}}

**1ª Parcela (30%):** {{parcela_1}}

**2ª Parcela (30%):** {{parcela_2}}

**3ª Parcela (40%):** {{parcela_3}}

**Prazo Estimado:** 30 dias

**Prazo Máximo:** 60 dias

**Hospedagem / Servidor:** {{plano_hospedagem}}

**Período:** {{periodo_hospedagem}}

**Valor:** {{valor_hospedagem}}

**Garantia:** 6 meses

**Suporte Gratuito:** 6 meses

**Suporte após garantia:** R$ 250,00 por solicitação.
$BODY$,
  updated_at = now()
WHERE key = 'sistema_app';


end if;
end $lv$;

update empresa_contratada_config set razao_social = 'Agência Fênix Ads' where razao_social = '';

do $$
declare t text;
begin
  foreach t in array array['contracts','contract_templates','empresa_contratada_config','receipts','receipt_templates']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;

-- ===================== Mapa da Alma =====================
-- Quem já tinha criado o acesso no Supabase Auth antes deste banco vira Master.
insert into public.team_members (id, name, email, role)
select u.id, coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), u.email, 'master'
from auth.users u
where not exists (select 1 from public.team_members)
order by u.created_at
limit 1
on conflict (id) do nothing;

notify pgrst, 'reload schema';


-- ===== 043_mapa_da_alma.sql =====
-- Mapa da Alma: mapas gerados, produtos de mapa e textos personalizados.

create table if not exists mapas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  lead_id uuid references leads(id) on delete set null,
  tipo text not null default 'pessoal' check (tipo in ('pessoal', 'casal')),
  nome text not null,
  nascimento date not null,
  nome2 text,
  nascimento2 date,
  liberado boolean not null default false,   -- false = prévia (parte bloqueada); true = mapa completo + PDF
  liberado_em timestamptz,
  pdf_path text,
  views int not null default 0,
  sent_at timestamptz,
  created_by text not null default 'ia',      -- ia | equipe
  created_at timestamptz not null default now()
);
create index if not exists mapas_lead on mapas(lead_id, created_at desc);

-- textos personalizados do mapa (substituem o texto padrão): categoria + número
create table if not exists mapa_textos (
  categoria text not null,
  numero text not null,
  conteudo text not null,
  updated_at timestamptz not null default now(),
  primary key (categoria, numero)
);

alter table leads add column if not exists mapa_slug text;

alter table mapas enable row level security;
alter table mapa_textos enable row level security;
drop policy if exists equipe on mapas;
create policy equipe on mapas for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists equipe on mapa_textos;
create policy equipe on mapa_textos for all to authenticated using (public.is_team()) with check (public.is_team());

-- Produtos: só mapas. Os serviços da agência ficam desligados.
update services set active = false where slug not in ('mapa-pessoal', 'mapa-casal', 'mapa-completo') and slug not like 'taro-%';
insert into services (slug, name, description, min_price, max_price, price_steps, bonuses, delivery, billing, includes, active, sort, plan_once, ai_notes)
values
  ('mapa-pessoal', 'Mapa da Alma Pessoal',
   'Estudo completo de numerologia cabalística unido ao seu signo solar: quem você é, seus talentos, missão, ciclos, carmas, ano pessoal e os 4 triângulos do nome.',
   37, 47, '{47,42,37}', '{"Mês pessoal e dias favoráveis explicados","Leitura do arcano que está vibrando agora"}',
   'Na hora, logo após o pagamento', 'unico',
   'Link para ler no celular + PDF completo para guardar · numerologia cabalística + signo solar · tabela-resumo com todos os números',
   true, 1, true,
   'Indique para quem quer se conhecer melhor, entender o momento de vida, propósito, carreira ou padrões que se repetem.'),
  ('mapa-casal', 'Mapa da Alma do Casal',
   'Compatibilidade amorosa do casal pela numerologia cabalística e pelos signos, com o resumo do mapa de cada um.',
   67, 77, '{77,72,67}', '{"Conselhos práticos para o casal","Dias favoráveis para os dois"}',
   'Na hora, logo após o pagamento', 'unico',
   'Link para ler no celular + PDF · harmonia conjugal, destinos, motivações e signos dos dois',
   true, 2, true,
   'Indique para quem quer entender o relacionamento atual ou a combinação com alguém especial. Precisa do nome completo e da data das duas pessoas.')
on conflict (slug) do nothing;


-- Abordagens (teste A/B) no tom do Mapa da Alma
update approaches set
  description = 'Acolhe primeiro: escuta o que a pessoa está vivendo, valida e só depois mostra como o mapa ajuda.',
  opening_example = 'Oi, tudo bem? Aqui é a Clara, do Mapa da Alma ✨ Me conta: o que você sente vontade de entender melhor sobre você agora?',
  followup_example = 'Oi! Passando com carinho: ainda quer ver o que o seu Mapa da Alma revela sobre você? 💜'
where slug = 'calma' and coalesce(opening_example, '') not ilike '%mapa%';
update approaches set name = 'Direta e objetiva',
  description = 'Vai direto: pede nome completo e data e já oferece a prévia gratuita do mapa.',
  opening_example = 'Oi! Aqui é a Clara, do Mapa da Alma ✨ Me passa seu nome completo de nascimento e sua data que eu já te mostro a prévia do seu mapa?',
  followup_example = 'Ainda quer ver a prévia do seu mapa? É só me mandar seu nome completo e a data de nascimento ✨'
where slug = 'direta' and coalesce(opening_example, '') not ilike '%mapa%';
update approaches set
  description = 'Atenção, interesse, desejo e ação: começa com uma curiosidade sobre números e signos que prende a atenção.',
  opening_example = 'Sabia que o seu nome completo guarda um número que mostra o que move a sua alma? ✨ Quer descobrir o seu?',
  followup_example = 'Quer que eu te mostre qual é o número da sua missão de vida? 🌙'
where slug = 'aida' and coalesce(opening_example, '') not ilike '%mapa%';
update approaches set
  description = 'Problema, agitação e solução: toca num padrão que se repete na vida da pessoa e mostra o mapa como caminho de clareza.',
  opening_example = 'Sabe quando parece que a mesma situação se repete na sua vida? O seu mapa mostra de onde vêm esses padrões ✨ Isso já aconteceu com você?',
  followup_example = 'Se você entendesse de onde vem esse padrão, o que mudaria na sua vida hoje?'
where slug = 'pas' and coalesce(opening_example, '') not ilike '%mapa%';

-- Prompt Master (identidade fixa da IA): editável em Base de conhecimento
update prompt_master set content = 'IDENTIDADE E MISSÃO DA IA:
Você é a consultora do Mapa da Alma, especialista em numerologia cabalística e astrologia (signo solar). Atende pelo WhatsApp pessoas que querem se conhecer melhor e vende exclusivamente mapas: o Mapa da Alma Pessoal e o Mapa da Alma do Casal.
Seu jeito é calmo, acolhedor e humano. Você escuta antes de oferecer, valida o que a pessoa sente e mostra como o mapa traz clareza sobre talentos, propósito, ciclos, amor e padrões que se repetem.
Você nunca promete cura, dinheiro, volta de relacionamento ou previsão absoluta: numerologia e astrologia são ferramentas de autoconhecimento.
O caminho da venda: entender o que a pessoa busca → pedir nome completo de nascimento e data → enviar a prévia gratuita do mapa → apresentar o mapa completo e o preço → fechar com leveza. Depois do pagamento o mapa completo chega sozinho, com link e PDF.', updated_at = now()
where id = 1 and (content is null or content = '' or content ilike '%site%' or content ilike '%agência%');

-- Configurações antigas da agência que não servem para o Mapa da Alma (voltam para o padrão do sistema)
update settings set data = (coalesce(data, '{}'::jsonb)
  - 'quick_replies' - 'ad_messages' - 'followup_texts' - 'previews' - 'bio_upsell' - 'testimonial' - 'ig_templates' - 'greeting')
  || jsonb_build_object('assistant_name', coalesce(nullif(data->>'assistant_name', 'Ana'), 'Clara'), 'company_name', 'Mapa da Alma')
where id = 1 and coalesce(data->>'mapa_alma_setup', '') = '';
update settings set data = jsonb_set(data, '{voice,moments}', '{}'::jsonb, true) where id = 1 and data ? 'voice' and coalesce(data->>'mapa_alma_setup', '') = '';
update settings set data = jsonb_set(data, '{checkout,accent}', '"#7a5af8"', true) where id = 1 and data ? 'checkout' and coalesce(data->>'mapa_alma_setup', '') = '';
-- marca que a configuração inicial já foi feita (rodar o arquivo de novo não volta nada ao padrão)
update settings set data = coalesce(data, '{}'::jsonb) || '{"mapa_alma_setup": "1"}'::jsonb where id = 1;

-- PDFs dos mapas (privado)
insert into storage.buckets (id, name, public) values ('mapas', 'mapas', false) on conflict (id) do nothing;

notify pgrst, 'reload schema';


-- ===== 044_so_mapas.sql =====
-- Mapa da Alma: remove os serviços herdados da agência. Ficam só os mapas.
delete from services where slug not in ('mapa-pessoal', 'mapa-casal', 'mapa-completo') and slug not like 'taro-%';
update services set active = true where slug in ('mapa-pessoal', 'mapa-casal');
notify pgrst, 'reload schema';


-- ===== 045_senha_e_aparencia.sql =====
-- Mapa da Alma: senha de acesso ao mapa completo (enviada ao cliente depois do pagamento)
alter table mapas add column if not exists senha text;
alter table mapas add column if not exists senha_em timestamptz;
notify pgrst, 'reload schema';
-- Mapa da Alma: REGRAS DE ATENDIMENTO gravadas no Prompt Master (topo absoluto do prompt da IA).
-- (Elas também estão fixas no código; aqui ficam visíveis e editáveis no painel.)
insert into prompt_master (id) values (1) on conflict do nothing;
update prompt_master
set content = trim(both from coalesce(content, '') || E'\n\n' || $regras$[REGRAS DE ATENDIMENTO — MAPA DA ALMA]
- Consulta tranquila, humana, carinhosa, delicada, amorosa e atenciosa. Nunca robótica.
- Respostas curtas com espaço entre elas; alguns segundos de "digitando" antes de cada balão.
- Antes de responder uma pergunta sobre a vida da pessoa, diga que vai consultar o mapa ("Vou consultar no seu mapa, só um minutinho...") com frases sempre diferentes; espere de 2 a 4 minutos.
- Ao voltar, traga algo curioso, marcante e persuasivo tirado do mapa: uma frase afirmativa sobre um padrão ou uma curiosidade do que costuma acontecer, e uma pergunta.
- Foque nos temas que mais doem: dinheiro e trabalho, amor e relacionamentos (traição, casamento), família e filhos, saúde e energia.
- Desabafos e áudios de reclamação: acolha primeiro, com calma e delicadeza, e responda dentro do contexto do que a pessoa disse.
- Saúde: acolha sem diagnosticar, sem prever doença e sem prometer cura; em casos sérios, sugira médico. Risco de vida: acolha e indique o CVV (188).
- De vez em quando (não sempre), diga com doçura que o atendimento está corrido, com bastante gente chamando.$regras$)
where id = 1 and coalesce(content, '') not like '%[REGRAS DE ATENDIMENTO — MAPA DA ALMA]%';
notify pgrst, 'reload schema';
-- Mapa da Alma: mapas privados do Master, troca de senha obrigatória no 1º acesso e permissões novas do menu.

-- 1) mapa privado: só quem marcou (privado_de) vê — também no banco (RLS), não só no painel
alter table mapas add column if not exists privado_de uuid references auth.users on delete set null;
create index if not exists mapas_privado on mapas(privado_de);
drop policy if exists equipe on mapas;
create policy equipe on mapas for all to authenticated
  using (public.is_team() and (privado_de is null or privado_de = auth.uid()))
  with check (public.is_team() and (privado_de is null or privado_de = auth.uid()));

-- 2) troca de senha obrigatória no primeiro acesso de quem foi cadastrado pela equipe
alter table team_members add column if not exists trocar_senha boolean not null default false;

-- 3) permissões novas (menu do Mapa da Alma): quem já via Leads passa a ver Gerador de mapas e Clientes;
--    quem via Financeiro passa a ver Recibos; quem mandava prévias passa a gerar e enviar mapas
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms
    || case when 'leads' = any(perms) then array['mapas','clientes','mapas.gerar'] else array[]::text[] end
    || case when 'financeiro' = any(perms) then array['recibos'] else array[]::text[] end
    || case when 'previas.gerar' = any(perms) then array['mapas.enviar'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');

notify pgrst, 'reload schema';
-- Mapa da Alma: tarô (produtos + tiragens) e conversa "Gratuito / Teste" (cortesia).

-- 1) produtos de tarô (preços editáveis em Vendas › Mapas e preços)
insert into services (slug, name, description, min_price, max_price, price_steps, bonuses, delivery, billing, includes, active, sort)
values
  ('taro-3-cartas', 'Tarô: Passado, Presente e Futuro',
   'Tiragem de 3 cartas para uma pergunta: o que trouxe você até aqui, a energia de agora e para onde o caminho aponta. Leitura ao vivo no WhatsApp + página com as cartas.',
   29, 29, '{29}', '{"Leitura das cartas no amor e no dinheiro"}', 'Na hora, logo após o pagamento', 'unico',
   'Leitura ao vivo na conversa + link com as 3 cartas explicadas', true, 10),
  ('taro-cruz-celta', 'Tarô: Cruz Celta',
   'A tiragem mais completa do tarô: 10 cartas que mostram a situação, o desafio, a raiz, o passado, o futuro próximo, você, as pessoas ao redor, esperanças e medos e o resultado provável.',
   59, 69, '{69,64,59}', '{"Leitura das cartas no amor e no dinheiro","Síntese final com o conselho principal"}', 'Na hora, logo após o pagamento', 'unico',
   'Leitura ao vivo na conversa + link com as 10 cartas explicadas', true, 11)
on conflict (slug) do nothing;

-- 2) tiragens sorteadas
create table if not exists tiragens (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  lead_id uuid references leads on delete set null,
  tipo text not null,
  pergunta text,
  nome text,
  cartas jsonb not null default '[]',
  liberado boolean not null default true,
  payment_id uuid,
  views int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tiragens_lead on tiragens(lead_id, created_at desc);
alter table tiragens enable row level security;
drop policy if exists equipe on tiragens;
create policy equipe on tiragens for all to authenticated using (public.is_team()) with check (public.is_team());

-- 3) conversa gratuita / teste: a IA atende normal, sem falar de preço, e entrega sem cobrar
alter table leads add column if not exists cortesia boolean not null default false;

notify pgrst, 'reload schema';
-- Mapa da Alma: versão do mapa (simples = só o mapa; completa = mapa + pirâmides do nome no mesmo link) e produto "completo".
alter table mapas add column if not exists versao text not null default 'completa';

insert into services (slug, name, description, min_price, max_price, price_steps, bonuses, delivery, billing, includes, active, sort)
values
  ('mapa-completo', 'Mapa da Alma Completo (mapa + pirâmides)',
   'Tudo do Mapa da Alma + as 4 pirâmides do nome (triângulos invertidos) com os bloqueios, o arcano que vibra agora e um resumo geral por tema: dinheiro, amor, família, saúde e emoções. Tudo no mesmo link e no mesmo PDF.',
   42, 49, '{49,45,42}', '{"Resumo geral das pirâmides por tema","Plano do que fazer agora"}', 'Na hora, logo após o pagamento', 'unico',
   'Link para ler no celular + PDF · mapa completo + 4 pirâmides do nome + resumo geral', true, 0)
on conflict (slug) do nothing;
-- o mapa pessoal vira a versão simples (só o nome muda se ainda estiver com o nome original)
update services set name = 'Mapa da Alma (versão simples)' where slug = 'mapa-pessoal' and name = 'Mapa da Alma Pessoal';

notify pgrst, 'reload schema';
-- Mapa da Alma: tira do banco os vestígios do Radar (agência) e ajusta a IA para a consulta ao vivo (sem "prévia").
-- Não mexe em nada do Radar: este banco é só do Mapa da Alma.

-- 1) Prompt Master: o caminho da venda é a CONSULTA, não a prévia
update prompt_master set content = replace(content,
  'enviar a prévia gratuita do mapa → apresentar o mapa completo e o preço',
  'fazer a consulta ao vivo na conversa (abrir o mapa e as pirâmides e explicar, em segunda pessoa, o que eles mostram sobre a dor da pessoa) → apresentar o mapa completo (primeiro a versão completa, com as pirâmides) e o preço')
where id = 1;
update prompt_master set content = replace(content,
  'vende exclusivamente mapas: o Mapa da Alma Pessoal e o Mapa da Alma do Casal.',
  'vende exclusivamente o Mapa da Alma (versão completa com as pirâmides do nome, versão simples e mapa do casal) e, depois do mapa, leituras de tarô.')
where id = 1;
update prompt_master set content = content || E'\n- NUNCA mande link do mapa nem fale em "prévia" antes do pagamento: a consulta acontece na conversa.\n- Explique o mapa com as suas palavras, em segunda pessoa ("o seu mapa mostra que você... e isso muito provavelmente acontece por causa de..."), nunca copiando o texto.'
where id = 1 and content not like '%NUNCA mande link do mapa%';

-- 2) Abordagens: sem "prévia gratuita"
update approaches set description = 'Vai direto: pede o nome completo de nascimento e a data e já abre o mapa da pessoa na conversa.',
  opening_example = 'Oi! Aqui é a Clara, do Mapa da Alma ✨ Me passa o seu nome completo de nascimento e a sua data que eu já abro o seu mapa aqui pra gente olhar juntas?',
  followup_example = 'Ainda quer que eu abra o seu mapa? É só me mandar o seu nome completo de nascimento e a data ✨'
where slug = 'direta';
update approaches set opening_example = replace(opening_example, 'prévia', 'leitura'), followup_example = replace(followup_example, 'prévia', 'leitura'), description = replace(description, 'prévia', 'leitura');

-- 3) prévias agendadas que ainda iam sair sozinhas: canceladas
update leads set preview_due_at = null where preview_due_at is not null;

-- 4) Base de conhecimento: as técnicas foram extraídas com o contexto do Radar (sites, agência, negócios).
--    Apaga as técnicas e o cérebro e manda os livros serem estudados de novo, agora no contexto do Mapa da Alma.
--    (só UMA vez: rodar o arquivo de novo não apaga o que já foi reestudado)
do $$
begin
  if coalesce((select data->>'kb_mapa_reset' from settings where id = 1), '') = '' then
    delete from knowledge_insights;
    update knowledge_docs set status = 'aprendendo', sections_done = 0, insights = 0 where status in ('processado', 'aprendendo', 'erro');
    update knowledge_brain set content = null, insights = 0 where id = 1;
    update settings set data = coalesce(data, '{}'::jsonb) || '{"kb_mapa_reset": "1"}'::jsonb where id = 1;
  end if;
end $$;

-- 5) etapas antigas do Radar que não existem no Mapa da Alma
update leads set steps = array(select x from unnest(steps) x where x not in ('maps', 'valid', 'ig', 'wa', 'preview')) where steps && array['maps','valid','ig','wa','preview'];

notify pgrst, 'reload schema';
-- Mapa da Alma: menu Tarô na barra lateral (quem já via o Gerador de mapas passa a ver o Tarô; quem gerava mapas pode tirar tarô).
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms
    || case when 'mapas' = any(perms) then array['taro'] else array[]::text[] end
    || case when 'mapas.gerar' = any(perms) then array['taro.gerar'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');
notify pgrst, 'reload schema';
