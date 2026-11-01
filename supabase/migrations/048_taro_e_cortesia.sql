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
