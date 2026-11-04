-- Mapa da Alma em espanhol: idioma/país do contato, cache de traduções, fluxos e áudios por idioma, cobrança internacional.
-- Seguro para rodar de novo.
alter table leads add column if not exists idioma text not null default 'pt';   -- pt | es
alter table leads add column if not exists pais text;                           -- código do país (BR, AR, CL, ...)
alter table mapas add column if not exists idioma text not null default 'pt';
alter table campanhas add column if not exists idioma text;                     -- anúncio em espanhol → força o idioma
alter table fluxos add column if not exists idioma text not null default 'pt';  -- pt | es
alter table audios add column if not exists idioma text not null default 'pt';
alter table payments add column if not exists moeda text;                       -- ARS, CLP, USD...
alter table payments add column if not exists valor_local numeric;              -- valor na moeda do cliente

-- cache das traduções (cada trecho é traduzido uma única vez)
create table if not exists traducoes (
  hash text primary key,
  idioma text not null default 'es',
  original text not null,
  traducao text not null,
  created_at timestamptz not null default now()
);
alter table traducoes enable row level security;
drop policy if exists traducoes_equipe on traducoes;
create policy traducoes_equipe on traducoes for all to authenticated using (true) with check (true);

-- fluxo de abertura em espanhol (desligado até você revisar; os áudios em espanhol entram pelo menu Fluxo)
insert into fluxos (nome, descricao, ativo, padrao, idioma, passos)
select 'Apertura en 3 mensajes (ES)', 'Fluxo de abertura em espanhol: saudação + atendimento corrido + nome e como ajudar.', false, true, 'es',
 '[{"id":"e1","tipo":"texto","texto":"¡{saludo}! Mi nombre es {atendente} 😊","atraso":[1,2]},
   {"id":"e2","tipo":"texto","texto":"La atención aquí hoy está muy movida, ¡no desaproveches tu turno!","atraso":[3,5]},
   {"id":"e3","tipo":"texto","texto":"Dime, ¿cuál es tu nombre y en qué puedo ayudarte hoy?","atraso":[3,5]},
   {"id":"e4","tipo":"ia","apos_resposta":[3,5]}]'::jsonb
where not exists (select 1 from fluxos where idioma = 'es');
-- o fluxo padrão em português continua sendo só para português (um padrão por idioma)
update fluxos set idioma = 'pt' where idioma is null;

-- quem já via Fluxo passa a ver Países e preços
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms || case when 'fluxo' = any(perms) then array['internacional'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');
notify pgrst, 'reload schema';
