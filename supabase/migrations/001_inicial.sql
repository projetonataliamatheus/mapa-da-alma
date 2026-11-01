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
