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
