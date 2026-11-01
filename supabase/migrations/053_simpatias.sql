-- Mapa da Alma: menu Simpatias (simpatias e orações por tema). A IA pode oferecer uma como carinho e a equipe manda pela conversa.
-- Seguro para rodar de novo: a biblioteca inicial só entra se a tabela estiver vazia.
create table if not exists simpatias (
  id uuid primary key default gen_random_uuid(),
  codigo serial,
  tema text not null default 'amor',
  tipo text not null default 'simpatia', -- simpatia | oracao
  titulo text not null,
  texto text not null,
  ativo boolean not null default true,
  envios int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists simpatias_tema on simpatias(tema);
alter table simpatias enable row level security;
drop policy if exists simpatias_equipe on simpatias;
create policy simpatias_equipe on simpatias for all to authenticated using (true) with check (true);

insert into simpatias (tema, tipo, titulo, texto)
select * from (values
  ('amor', 'simpatia', 'Mel e canela para adoçar a relação',
   E'Numa sexta-feira à noite, coloque uma colher de mel num pires branco e polvilhe canela por cima. Escreva num papel o seu nome e o da pessoa amada, dobre e deixe embaixo do pires.\n\nAcenda uma vela rosa ao lado e diga com calma: "Que entre nós exista carinho, paciência e verdade."\n\nQuando a vela terminar, enterre o mel num vaso de planta. Repita uma vez por mês, sempre com o coração tranquilo.'),
  ('amor', 'oracao', 'Oração para atrair um amor tranquilo',
   E'"Que eu aprenda a me amar primeiro,\npara reconhecer quem chega com respeito.\nQue o meu coração se abra sem medo\ne se feche para o que me machuca.\nQue venha um amor leve, recíproco e verdadeiro,\nno tempo certo. Assim seja."\n\nReze ao acordar, por sete dias seguidos, de preferência olhando para o céu.'),
  ('amor', 'simpatia', 'Banho de rosas para a autoestima',
   E'Ferva 1 litro de água, desligue o fogo e coloque as pétalas de 3 rosas (vermelhas ou cor-de-rosa). Tampe e deixe amornar.\n\nDepois do banho normal, jogue a água do pescoço para baixo, pensando em tudo que você tem de bonito. Não enxágue: seque com leveza.\n\nIdeal numa sexta-feira, quando você sentir que está se colocando em último lugar.'),
  ('dinheiro', 'simpatia', 'Moedas no pote para o dinheiro circular',
   E'No primeiro dia do mês, separe um pote de vidro limpo. Coloque 7 moedas de qualquer valor, uma folha de louro e três grãos de arroz.\n\nTampe e deixe num lugar alto da casa, perto da porta de entrada, dizendo: "Que o dinheiro entre, circule e fique."\n\nToda vez que receber um valor, coloque uma moeda a mais. No fim do ano, doe as moedas para quem precisa.'),
  ('dinheiro', 'simpatia', 'Louro na carteira',
   E'Pegue uma folha de louro seca e escreva nela, com caneta, o valor que você precisa organizar este mês.\n\nGuarde a folha dentro da carteira, junto das notas, e não gaste a última nota que estiver ali até o fim do mês.\n\nO louro lembra você de cuidar do que entra e do que sai.'),
  ('dinheiro', 'oracao', 'Oração para a prosperidade',
   E'"Agradeço por tudo o que já tenho.\nQue eu tenha sabedoria para cuidar do meu dinheiro,\ncoragem para cobrar o meu valor\ne calma para não decidir no impulso.\nQue as portas certas se abram\ne que eu esteja pronto(a) para atravessá-las. Assim seja."\n\nReze antes de abrir as contas do mês.'),
  ('trabalho', 'simpatia', 'Arruda e sal grosso no ambiente de trabalho',
   E'Coloque um copo com água, uma colher de sal grosso e um raminho de arruda num canto discreto da sua mesa ou do seu espaço de trabalho.\n\nTroque a água toda segunda-feira, jogando a antiga em água corrente.\n\nA intenção é afastar o peso do ambiente e trazer clareza para as decisões.'),
  ('trabalho', 'oracao', 'Oração antes de uma entrevista ou reunião importante',
   E'"Que as minhas palavras saiam claras,\nque eu mostre quem eu sou sem medo\ne que as pessoas certas reconheçam o meu valor.\nSe essa porta for minha, que se abra.\nSe não for, que eu tenha paz para seguir. Assim seja."\n\nReze em voz baixa antes de sair de casa.'),
  ('trabalho', 'simpatia', 'Canela na porta para novas oportunidades',
   E'No primeiro dia do mês, pela manhã, fique na porta de casa com um pouco de canela em pó na palma da mão.\n\nSopre a canela para dentro de casa, dizendo: "Que entrem as oportunidades e o reconhecimento."\n\nNão varra a canela no mesmo dia.'),
  ('saude', 'oracao', 'Oração para atravessar um tratamento com força',
   E'"Que eu tenha força para cuidar do meu corpo\ne paciência com o meu tempo de melhora.\nQue as mãos que cuidam de mim sejam firmes e sábias.\nQue a minha mente descanse e a minha fé me sustente. Assim seja."\n\nIMPORTANTE: oração e simpatia são um apoio para o coração. Nunca substituem o médico, o tratamento ou os remédios receitados.'),
  ('saude', 'simpatia', 'Chá da noite para acalmar a mente',
   E'Antes de dormir, prepare um chá de camomila ou erva-cidreira. Enquanto ele esfria, segure a xícara com as duas mãos e respire fundo três vezes.\n\nPense em uma coisa boa que aconteceu no seu dia e agradeça por ela. Beba devagar, sem celular por perto.\n\nÉ um ritual para acalmar e descansar. Se a insônia ou a ansiedade forem frequentes, procure um médico.'),
  ('saude', 'simpatia', 'Banho de alecrim para renovar a energia',
   E'Ferva 1 litro de água, desligue o fogo e coloque um punhado de alecrim. Tampe e deixe amornar.\n\nDepois do banho normal, jogue do pescoço para baixo, pedindo disposição e leveza para os próximos dias.\n\nUm carinho para quando o cansaço pesa. Não substitui acompanhamento médico.'),
  ('familia', 'simpatia', 'Vela branca para a paz no lar',
   E'Num domingo, acenda uma vela branca na sala, num pires com um pouco de água.\n\nCom a família reunida (ou sozinho(a), pensando em cada um), diga: "Que nesta casa exista respeito, diálogo e paz."\n\nDeixe a vela queimar até o fim em segurança. Repita sempre que o clima em casa estiver pesado.'),
  ('familia', 'oracao', 'Oração pelos filhos',
   E'"Que os meus filhos sejam protegidos em cada caminho,\nque encontrem pessoas boas,\nque tenham coragem para as escolhas difíceis\ne que nunca esqueçam que têm para onde voltar. Assim seja."\n\nReze à noite, de preferência perto de onde eles dormem.'),
  ('familia', 'simpatia', 'Sal grosso nos cantos da casa',
   E'Coloque um pouco de sal grosso em quatro potinhos e deixe um em cada canto da sala por sete dias.\n\nNo oitavo dia, jogue o sal em água corrente e lave os potinhos.\n\nA intenção é limpar o peso das discussões e deixar a casa mais leve.'),
  ('protecao', 'oracao', 'Oração de proteção para o dia',
   E'"Que eu saia de casa protegido(a)\ne volte em paz.\nQue o que é ruim não me alcance,\nque o que é bom me encontre\ne que eu saiba reconhecer a diferença. Assim seja."\n\nReze ao sair de casa, com a mão no peito.'),
  ('protecao', 'simpatia', 'Copo d''água atrás da porta',
   E'Encha um copo transparente com água e coloque uma pitada de sal grosso. Deixe atrás da porta de entrada por três dias.\n\nNo quarto dia, jogue a água no ralo ou na terra e lave o copo.\n\nUm ritual simples para quando você sente a energia da casa pesada ou recebeu visitas que deixaram um clima ruim.'),
  ('protecao', 'simpatia', 'Arruda atrás da orelha',
   E'Quando for a um lugar cheio ou a um encontro que te deixa ansioso(a), coloque um raminho de arruda atrás da orelha ou no bolso.\n\nAo voltar para casa, jogue o raminho fora em água corrente, agradecendo a proteção.')
) as v(tema, tipo, titulo, texto)
where not exists (select 1 from simpatias);

-- quem já via o Tarô passa a ver as Simpatias
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms || case when 'taro' = any(perms) then array['simpatias'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');
notify pgrst, 'reload schema';
