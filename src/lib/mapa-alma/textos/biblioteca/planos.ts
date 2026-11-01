// Mapa da Alma — "O QUE FAZER": planos de ação práticos por número (textos autorais).
export interface Plano {
  semana: string[]      // primeiros passos (próximos 7 dias)
  rotina: string[]      // hábitos para o dia a dia
  amor: string
  trabalho: string
  dinheiro: string
  armadilha: string     // o que evitar
  travar: string        // o que fazer quando travar
  frase: string         // frase para repetir
}

export const PLANOS: Record<number, Plano> = {
  1: {
    semana: ['Escolha UM projeto que está parado há meses e defina hoje qual é o primeiro passo concreto (uma ligação, um orçamento, uma inscrição).', 'Tome sozinho(a) três pequenas decisões que você costuma adiar ou pedir opinião, e observe como se sente.', 'Escreva em uma folha: "O que eu faria se ninguém fosse me julgar?" e marque a resposta que mais te anima.'],
    rotina: ['Comece o dia pela tarefa mais importante, antes de abrir mensagens.', 'Pratique ouvir até o fim antes de responder: conte mentalmente até três.', 'Faça atividade física que descarregue energia (corrida, luta, dança): o 1 acumula tensão no corpo.'],
    amor: 'Mostre que você admira a pessoa, e não só que precisa ser admirado(a). Combine decisões importantes a dois: liderar a relação não é decidir por ela.',
    trabalho: 'Busque funções com autonomia e metas claras. Se hoje você só executa ordens, proponha um projeto que seja seu e se ofereça para liderá-lo.',
    dinheiro: 'Você ganha mais quando confia nas próprias ideias. Separe uma pequena reserva mensal para investir em algo seu (curso, ferramenta, negócio).',
    armadilha: 'Querer fazer tudo sozinho(a) para provar que consegue. Isso leva ao cansaço e à solidão.',
    travar: 'Quando travar, diminua o tamanho do passo: em vez de "abrir a empresa", faça "pesquisar três concorrentes hoje". Ação pequena destrava a energia do 1.',
    frase: 'Eu confio na minha força e dou o primeiro passo, mesmo sem ver a escada inteira.',
  },
  2: {
    semana: ['Liste as pessoas com quem você mais convive e marque quem te soma e quem te drena.', 'Diga um "não" educado a algo que você aceitaria só para agradar.', 'Tenha uma conversa sincera com alguém importante sobre algo que você vem guardando.'],
    rotina: ['Antes de responder a um pedido, diga "vou pensar e te falo". Isso te dá tempo para escolher sem culpa.', 'Reserve 10 minutos por dia para silêncio e respiração: a sua sensibilidade precisa de pausa.', 'Anote três coisas que você fez bem no dia. Isso fortalece a autoestima.'],
    amor: 'Você ama cuidando, mas também precisa ser cuidado(a). Peça o que precisa com clareza: o outro não adivinha. Evite engolir mágoas: converse no mesmo dia.',
    trabalho: 'Você brilha em parcerias, atendimento e bastidores estratégicos. Cobre reconhecimento: mostre os resultados que você gerou, com números e exemplos.',
    dinheiro: 'Evite emprestar dinheiro por pena ou por medo de desagradar. Parcerias financeiras só com contrato e combinados claros.',
    armadilha: 'Se anular para evitar conflito e depois se sentir invisível e magoado(a).',
    travar: 'Quando travar por indecisão, escreva os prós e contras e escolha em 24 horas. A intuição do 2 já sabe a resposta; o medo é que atrasa.',
    frase: 'A minha voz importa. Eu posso ser gentil e firme ao mesmo tempo.',
  },
  3: {
    semana: ['Escolha um projeto criativo e defina um prazo realista para terminá-lo (mesmo que pequeno).', 'Poste, fale ou mostre algo seu: um trabalho, uma ideia, um talento.', 'Revise os gastos do mês e corte um gasto feito só por impulso.'],
    rotina: ['Use a técnica "uma coisa de cada vez": termine a tarefa antes de começar outra.', 'Escreva por 5 minutos todos os dias (diário, ideias, gratidão): isso organiza as emoções.', 'Cerque-se de pessoas que te inspiram e reduza o tempo com quem critica tudo.'],
    amor: 'Mantenha a leveza, mas aprofunde as conversas. Fale também sobre medos e sonhos, não só sobre o dia a dia. Cuidado com o ciúme quando se sentir sem atenção.',
    trabalho: 'Comunicação, vendas, ensino, criação de conteúdo e artes são o seu terreno. Construa um portfólio: o seu talento precisa ser visto para gerar oportunidades.',
    dinheiro: 'Crie uma regra simples: espere 48 horas antes de qualquer compra não essencial. Tenha uma conta separada para lazer.',
    armadilha: 'Começar mil coisas, se empolgar e abandonar no meio; buscar aplauso para preencher inseguranças.',
    travar: 'Quando travar, mude de ambiente: um café, uma caminhada, uma música. A criatividade do 3 volta com movimento e estímulo.',
    frase: 'Eu me expresso com verdade e termino o que começo.',
  },
  4: {
    semana: ['Organize um espaço que está bagunçado (gaveta, mesa, arquivos). Ordem externa acalma o 4.', 'Monte uma planilha simples com receitas, despesas e uma meta de reserva.', 'Marque um momento de lazer na agenda, com a mesma seriedade de um compromisso de trabalho.'],
    rotina: ['Planeje a semana no domingo, mas deixe 20% do tempo livre para imprevistos.', 'Faça pausas a cada 90 minutos de trabalho: alongue-se e beba água.', 'Experimente uma coisa nova por semana (um caminho, um prato, uma atividade) para treinar a flexibilidade.'],
    amor: 'Demonstre o afeto com palavras, e não só com atitudes. Surpreenda de vez em quando: a rotina segura é ótima, mas o amor também precisa de novidade.',
    trabalho: 'Você é a pessoa que faz funcionar. Valorize isso: peça promoções com base na sua confiabilidade e nos processos que você melhorou.',
    dinheiro: 'Você tem talento para construir patrimônio. Automatize o investimento mensal e pense no longo prazo, mas permita-se usufruir de parte do que conquista.',
    armadilha: 'A rigidez: insistir em um caminho que já não funciona só porque "sempre foi assim".',
    travar: 'Quando travar, divida o problema em partes pequenas e resolva a primeira. Se ainda assim travar, peça a opinião de alguém criativo.',
    frase: 'Eu construo com paciência e me permito descansar e mudar quando preciso.',
  },
  5: {
    semana: ['Escolha UMA mudança que você quer fazer e dê um passo concreto nela (pesquisar, agendar, conversar).', 'Revise os seus excessos (comida, bebida, compras, telas) e escolha um para reduzir pela metade.', 'Planeje uma pequena aventura ou viagem para o próximo mês.'],
    rotina: ['Antes de decisões importantes, durma uma noite sobre o assunto.', 'Varie a rotina com intenção: mude o trajeto, o horário do treino, o lugar de trabalho.', 'Pratique exercícios que exijam foco (yoga, pilates, natação) para equilibrar a inquietação.'],
    amor: 'Você precisa de liberdade, e o outro precisa de segurança. Combine acordos claros e cumpra-os: a confiança é o que te dá espaço. Traga novidades para a relação.',
    trabalho: 'Vendas, comunicação, turismo, eventos e tecnologia combinam com você. Se o trabalho atual é monótono, crie projetos paralelos ou peça funções com mais variedade.',
    dinheiro: 'Crie uma reserva de emergência antes de qualquer aventura. Use a regra 50/30/20 (necessidades, desejos, reserva).',
    armadilha: 'Fugir de responsabilidades em nome da liberdade e mudar tudo por impulso.',
    travar: 'Quando travar pela ansiedade, mexa o corpo: 20 minutos de caminhada mudam a sua energia e clareiam a mente.',
    frase: 'Eu escolho a liberdade com responsabilidade, e cada mudança me faz crescer.',
  },
  6: {
    semana: ['Faça uma lista de tudo o que você assumiu pelos outros e devolva uma responsabilidade que não é sua.', 'Reserve um momento só seu (um banho demorado, uma leitura, um passeio) sem culpa.', 'Embeleze um canto da casa: flores, organização, uma vela. O 6 se nutre de beleza.'],
    rotina: ['Pergunte "você quer ajuda?" antes de ajudar.', 'Cuide do seu corpo com a mesma atenção que dá aos outros: consultas, alimentação, sono.', 'Pratique aceitar as escolhas das pessoas, mesmo quando você faria diferente.'],
    amor: 'Ame sem cobrar. Diga o que espera da relação, em vez de esperar que o outro adivinhe. Cuide para não virar "pai ou mãe" do(a) parceiro(a).',
    trabalho: 'Saúde, educação, beleza, terapias, decoração e gastronomia combinam com você. Coloque limites de horário: quem cuida também precisa ser cuidado(a).',
    dinheiro: 'Estabeleça um teto para ajudar familiares financeiramente. Investir no lar é bom, mas sem comprometer a sua reserva.',
    armadilha: 'Controlar em nome do amor e se frustrar quando as pessoas não seguem os seus conselhos.',
    travar: 'Quando travar por excesso de responsabilidade, faça a pergunta: "isso é meu ou é do outro?". Fique só com o que é seu.',
    frase: 'Eu cuido com amor e também me permito ser cuidado(a).',
  },
  7: {
    semana: ['Escolha um tema que te fascina e reserve 30 minutos por dia para estudá-lo.', 'Compartilhe um sentimento com alguém de confiança, mesmo que pareça difícil.', 'Faça um dia de "detox digital" parcial: menos telas, mais silêncio e natureza.'],
    rotina: ['Medite, ore ou respire em silêncio por 10 minutos ao acordar.', 'Escreva as suas intuições: com o tempo você verá quantas se confirmam.', 'Marque encontros com pessoas próximas: o 7 precisa de conexão, mesmo que pouca.'],
    amor: 'Você sente muito, mas mostra pouco. Diga em palavras o que sente e permita que o outro conheça o seu mundo interior. Escolha alguém que respeite o seu tempo de silêncio.',
    trabalho: 'Pesquisa, tecnologia, análise, consultoria, terapias e espiritualidade são o seu terreno. Especialize-se: profundidade é o seu diferencial.',
    dinheiro: 'Analise antes de investir, mas não deixe a desconfiança te paralisar. Busque educação financeira: você aprende rápido quando estuda.',
    armadilha: 'Isolar-se, desconfiar de todos e achar que ninguém vai te entender.',
    travar: 'Quando travar no excesso de análise, defina um prazo para decidir. Depois do prazo, siga a sua intuição: ela é o seu maior dom.',
    frase: 'Eu confio na vida e compartilho a minha sabedoria com o mundo.',
  },
  8: {
    semana: ['Defina uma meta financeira clara para os próximos 12 meses e o primeiro passo para chegar lá.', 'Cobre o que te devem e reajuste o preço do seu trabalho, se estiver abaixo do valor.', 'Marque um momento de qualidade com a família ou com quem você ama, sem celular.'],
    rotina: ['Revise metas e números toda semana.', 'Reserve tempo para o corpo: o 8 tende a acumular estresse e tensão.', 'Pratique a generosidade: ajude alguém a crescer, compartilhe oportunidades.'],
    amor: 'Não leve a lógica do trabalho para a relação. Esteja presente de verdade, ouça sem querer resolver tudo e mostre vulnerabilidade.',
    trabalho: 'Gestão, negócios, finanças, direito e empreendedorismo são o seu caminho. Assuma posições de liderança e construa uma equipe de confiança.',
    dinheiro: 'Você tem grande potencial de prosperidade. Diversifique os investimentos, evite riscos por vaidade e mantenha a ética em todos os acordos.',
    armadilha: 'Medir o seu valor pelo dinheiro e pelo status, esquecendo a saúde e os afetos.',
    travar: 'Quando travar, revise a estratégia: o 8 trava quando força resultados sem planejamento. Recue um passo, planeje e volte com mais força.',
    frase: 'Eu prospero com ética e uso o meu poder para construir e ajudar.',
  },
  9: {
    semana: ['Liste três situações, pessoas ou objetos que já cumpriram o seu papel e comece a se desapegar de um deles.', 'Escreva uma carta (que não precisa ser enviada) perdoando alguém que te magoou.', 'Doe roupas ou objetos que você não usa há mais de um ano.'],
    rotina: ['Ajude alguém por dia, mas sem se esquecer de si.', 'Reserve tempo para arte, música ou natureza: elas recarregam a alma do 9.', 'Antes de dizer sim, pergunte: "eu tenho energia para isso agora?".'],
    amor: 'Não idealize o outro: ame a pessoa real, com defeitos e qualidades. Cuide para não se sacrificar demais na relação.',
    trabalho: 'Educação, saúde, artes, terapias, trabalho social e comunicação são o seu caminho. Trabalhos com propósito te trazem prosperidade e realização.',
    dinheiro: 'Ser generoso(a) é lindo, mas não comprometa o seu sustento. Defina um valor mensal para doações e respeite-o.',
    armadilha: 'Segurar o que já terminou e se decepcionar por esperar gratidão dos outros.',
    travar: 'Quando travar, pergunte: "o que eu preciso deixar ir?". O 9 só avança quando solta o que pesa.',
    frase: 'Eu deixo ir o que já cumpriu o seu papel e abro espaço para o novo.',
  },
  11: {
    semana: ['Reserve um momento diário de silêncio para ouvir a sua intuição e anote o que vier.', 'Identifique as fontes de ansiedade (notícias, pessoas, excesso de telas) e reduza uma delas.', 'Compartilhe uma ideia ou inspiração com alguém: o 11 cresce quando ilumina outras pessoas.'],
    rotina: ['Durma bem: o sistema nervoso do 11 é sensível.', 'Pratique meditação, oração ou respiração consciente.', 'Faça algo prático com as mãos (cozinhar, jardinagem, artesanato) para aterrar a energia.'],
    amor: 'Você busca uma conexão de alma. Seja paciente: ninguém é perfeito. Explique a sua sensibilidade ao outro, em vez de esperar que ele perceba.',
    trabalho: 'Ensino, espiritualidade, terapias, artes e liderança inspiradora são o seu caminho. Una o seu dom a uma habilidade prática para gerar renda.',
    dinheiro: 'Não despreze o dinheiro por ser "material": ele é energia que sustenta a sua missão. Organize as finanças com ajuda, se precisar.',
    armadilha: 'Ansiedade, autocobrança e sensação de não estar à altura do próprio potencial.',
    travar: 'Quando travar, volte ao básico: corpo, sono, natureza. A intuição do 11 só funciona com a mente calma.',
    frase: 'Eu confio na minha luz e caminho com serenidade.',
  },
  22: {
    semana: ['Escreva o seu grande sonho e quebre-o em etapas de 90 dias.', 'Identifique uma pessoa competente que possa te ajudar e converse com ela.', 'Escolha uma tarefa que você pode delegar e delegue.'],
    rotina: ['Revise o plano toda semana, celebrando o que avançou.', 'Equilibre a ambição com descanso e espiritualidade.', 'Cuide da saúde: projetos grandes exigem corpo forte.'],
    amor: 'Inclua quem você ama nos seus sonhos: o 22 constrói melhor acompanhado. Reserve tempo de qualidade, mesmo nas fases de muito trabalho.',
    trabalho: 'Grandes projetos, empreendimentos, instituições e iniciativas de impacto social são o seu caminho. Pense em legado.',
    dinheiro: 'Planeje com visão de longo prazo e construa patrimônio em etapas. Cerque-se de bons conselheiros.',
    armadilha: 'Paralisar diante do tamanho do sonho ou se cobrar perfeição.',
    travar: 'Quando travar, lembre que toda grande obra começa com um tijolo. Faça hoje a menor ação possível em direção ao sonho.',
    frase: 'Eu construo, passo a passo, uma obra que vai servir a muitas pessoas.',
  },
}

/** Planos específicos para lições e dívidas cármicas. */
export const PLANOS_CARMA: Record<string, string[]> = {
  'licao:1': ['Tome uma decisão por dia sem pedir opinião.', 'Comece um projeto só seu, mesmo que pequeno.', 'Pratique dizer "eu quero" e "eu decidi".', 'Assuma a liderança em uma situação simples (organizar um encontro, escolher o restaurante).'],
  'licao:2': ['Pratique ouvir sem interromper.', 'Trabalhe em equipe em um projeto e valorize a contribuição dos outros.', 'Cuide dos detalhes: revise o que faz antes de entregar.', 'Exercite a paciência: espere antes de reagir.'],
  'licao:3': ['Escreva um diário de sentimentos.', 'Participe de um curso de comunicação, teatro ou canto.', 'Fale em público em situações pequenas.', 'Expresse elogios e afetos em voz alta.'],
  'licao:4': ['Crie uma rotina matinal simples e cumpra-a por 21 dias.', 'Use agenda e listas de tarefas.', 'Organize as finanças com uma planilha.', 'Termine um projeto antes de começar outro.'],
  'licao:5': ['Experimente algo novo toda semana.', 'Viaje, mesmo que para perto.', 'Aceite convites que te tirem da zona de conforto.', 'Quando sentir medo da mudança, pergunte: "o que de bom pode vir disso?".'],
  'licao:6': ['Esteja presente nos compromissos familiares.', 'Assuma uma responsabilidade afetiva (cuidar de alguém, de uma planta, de um animal).', 'Cultive a harmonia em casa.', 'Pratique o perdão nas relações próximas.'],
  'licao:7': ['Reserve momentos diários de silêncio.', 'Leia livros que aprofundem o autoconhecimento.', 'Pratique meditação ou oração.', 'Estude um assunto a fundo, até dominá-lo.'],
  'licao:8': ['Faça um curso de educação financeira.', 'Cobre o valor justo pelo seu trabalho.', 'Anote todos os gastos por um mês.', 'Assuma uma função de responsabilidade e decisão.'],
  'licao:9': ['Pratique o perdão com quem te magoou.', 'Participe de um trabalho voluntário.', 'Desapegue de objetos e situações que já passaram.', 'Pratique ouvir pontos de vista diferentes sem julgar.'],
  'divida:13': ['Crie uma rotina de trabalho com horários fixos.', 'Use a técnica de blocos: 50 minutos de foco, 10 de pausa.', 'Termine o que começar, mesmo que devagar.', 'Troque a pergunta "qual o atalho?" por "qual o caminho certo?".'],
  'divida:14': ['Identifique o seu excesso principal e reduza-o com uma meta semanal.', 'Espere 24 horas antes de decisões impulsivas.', 'Cumpra os compromissos assumidos, mesmo os pequenos.', 'Busque prazeres saudáveis: esporte, arte, natureza.'],
  'divida:16': ['Pratique a humildade: peça desculpas quando errar.', 'Construa relações com base na verdade, não nas aparências.', 'Desenvolva uma prática espiritual regular.', 'Quando algo desmoronar, pergunte: "o que isso veio me ensinar?".'],
  'divida:19': ['Peça ajuda pelo menos uma vez por semana.', 'Compartilhe as suas conquistas com quem te apoiou.', 'Participe de projetos coletivos.', 'Pratique ouvir antes de impor a sua opinião.'],
}
