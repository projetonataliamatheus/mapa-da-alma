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
