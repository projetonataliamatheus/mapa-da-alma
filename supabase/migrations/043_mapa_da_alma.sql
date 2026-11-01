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
update services set active = false where slug not in ('mapa-pessoal', 'mapa-casal');
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
on conflict (slug) do update set active = true;


-- Abordagens (teste A/B) no tom do Mapa da Alma
update approaches set
  description = 'Acolhe primeiro: escuta o que a pessoa está vivendo, valida e só depois mostra como o mapa ajuda.',
  opening_example = 'Oi, tudo bem? Aqui é a Clara, do Mapa da Alma ✨ Me conta: o que você sente vontade de entender melhor sobre você agora?',
  followup_example = 'Oi! Passando com carinho: ainda quer ver o que o seu Mapa da Alma revela sobre você? 💜'
where slug = 'calma';
update approaches set name = 'Direta e objetiva',
  description = 'Vai direto: pede nome completo e data e já oferece a prévia gratuita do mapa.',
  opening_example = 'Oi! Aqui é a Clara, do Mapa da Alma ✨ Me passa seu nome completo de nascimento e sua data que eu já te mostro a prévia do seu mapa?',
  followup_example = 'Ainda quer ver a prévia do seu mapa? É só me mandar seu nome completo e a data de nascimento ✨'
where slug = 'direta';
update approaches set
  description = 'Atenção, interesse, desejo e ação: começa com uma curiosidade sobre números e signos que prende a atenção.',
  opening_example = 'Sabia que o seu nome completo guarda um número que mostra o que move a sua alma? ✨ Quer descobrir o seu?',
  followup_example = 'Quer que eu te mostre qual é o número da sua missão de vida? 🌙'
where slug = 'aida';
update approaches set
  description = 'Problema, agitação e solução: toca num padrão que se repete na vida da pessoa e mostra o mapa como caminho de clareza.',
  opening_example = 'Sabe quando parece que a mesma situação se repete na sua vida? O seu mapa mostra de onde vêm esses padrões ✨ Isso já aconteceu com você?',
  followup_example = 'Se você entendesse de onde vem esse padrão, o que mudaria na sua vida hoje?'
where slug = 'pas';

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
where id = 1;
update settings set data = jsonb_set(data, '{voice,moments}', '{}'::jsonb, true) where id = 1 and data ? 'voice';
update settings set data = jsonb_set(data, '{checkout,accent}', '"#7a5af8"', true) where id = 1 and data ? 'checkout';

-- PDFs dos mapas (privado)
insert into storage.buckets (id, name, public) values ('mapas', 'mapas', false) on conflict (id) do nothing;

notify pgrst, 'reload schema';
