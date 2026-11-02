-- Mapa da Alma: menu Fluxo (sequência de mensagens/áudios/imagens com esperas, antes da IA assumir)
-- e menu Campanhas (de onde o contato veio: Meta, Google, indicação; mensagem padrão do anúncio; fluxo de abertura).
-- Seguro para rodar de novo.
create table if not exists fluxos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean not null default false,
  padrao boolean not null default false, -- o fluxo de abertura usado quando a campanha não define outro
  passos jsonb not null default '[]'::jsonb,
  iniciados int not null default 0,
  concluidos int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table fluxos enable row level security;
drop policy if exists fluxos_equipe on fluxos;
create policy fluxos_equipe on fluxos for all to authenticated using (true) with check (true);

create table if not exists campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  origem text not null default 'meta', -- meta | instagram | facebook | google | indicacao | site | outro
  mensagem text,                        -- texto pronto que o anúncio coloca no WhatsApp (para reconhecer)
  palavras text,                        -- palavras-chave extras (uma por linha)
  inicio date,
  fim date,
  ativo boolean not null default true,
  fluxo_id uuid references fluxos(id) on delete set null,
  verba numeric,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table campanhas enable row level security;
drop policy if exists campanhas_equipe on campanhas;
create policy campanhas_equipe on campanhas for all to authenticated using (true) with check (true);
alter table leads add column if not exists campanha_id uuid;
create index if not exists leads_campanha_id on leads(campanha_id);

-- fluxos prontos (só entram se ainda não existe nenhum)
insert into fluxos (nome, descricao, ativo, padrao, passos)
select * from (values
  ('Abertura em 3 mensagens', 'Saudação + atendimento corrido + nome e como ajudar. A IA assume 3 a 5 min depois da resposta.', true, true,
   '[{"id":"a1","tipo":"texto","texto":"{saudacao}! Meu nome é {atendente} 😊","atraso":[1,2]},
     {"id":"a2","tipo":"texto","texto":"O atendimento aqui hoje tá bem corrido, não desperdice a sua vez!","atraso":[3,5]},
     {"id":"a3","tipo":"texto","texto":"Me diz qual é o seu nome e como eu posso te ajudar hoje?","atraso":[3,5]},
     {"id":"a4","tipo":"ia","apos_resposta":[3,5]}]'::jsonb),
  ('Abertura com áudios (Náti)', 'Áudio 1 → espera a resposta (4 a 6 min) ou segue depois de 8 min → áudio 2 → áudio 3 → IA. Suba os 3 áudios antes de ligar.', false, false,
   '[{"id":"b1","tipo":"audio","url":"","nome_arquivo":"","transcricao":"Olá meu anjo... Tudo bem? Muito prazer em falar com você.. Meu nome é Natália Teixeira.. mas pode me chamar de Náti, tá? Eu vou te explicar como funciona meu trabalho, mas antes me fala.. Qual é o seu nome?","atraso":[2,4]},
     {"id":"b2","tipo":"aguardar","apos_resposta":[4,6],"limite":8},
     {"id":"b3","tipo":"audio","url":"","nome_arquivo":"","transcricao":"Como funciona o meu trabalho? Sou especialista em orientação espiritual, mapa astral, energias, astrologia e signos... Trabalho ajudando pessoas a eliminar bloqueios, invejas, olho gordo, energias negativas... Também ajudo pessoas reconquistarem seus relacionamentos. Pessoas que passaram por dores e problemas... que talvez você também esteja passando... Como eu posso te ajudar hoje?","atraso":[1,2]},
     {"id":"b4","tipo":"audio","url":"","nome_arquivo":"","transcricao":"Qual desses é o que você está sofrendo mais? Dinheiro. Família. Saúde. Emprego. ou no Amor e Relacionamentos? Me fala uma só, a que mais tá te incomodando e eu vou te ajudar entender o que você precisa fazer pra resolver a situação.","atraso":[5,10]},
     {"id":"b5","tipo":"ia","apos_resposta":[3,5]}]'::jsonb)
) as v(nome, descricao, ativo, padrao, passos)
where not exists (select 1 from fluxos);

-- campanhas que já estavam em Configurações › Textos dos anúncios viram campanhas do menu
insert into campanhas (nome, origem, mensagem)
select trim(split_part(l, '=', 1)), 'meta', trim(substr(l, strpos(l, '=') + 1))
from (select unnest(string_to_array(coalesce((select data->>'ad_messages' from settings where id = 1), ''), E'\n')) as l) x
where strpos(l, '=') > 0 and length(trim(l)) > 8 and not exists (select 1 from campanhas);

-- quem já via Abordagens passa a ver Fluxo e Campanhas
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms || case when 'abordagens' = any(perms) then array['fluxo','campanhas'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');
notify pgrst, 'reload schema';
