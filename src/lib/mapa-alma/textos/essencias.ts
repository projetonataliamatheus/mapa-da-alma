// Mapa da Alma — biblioteca de textos autorais (padrão).
// Cada número tem uma "essência" que é adaptada a cada seção do mapa.
// No painel, qualquer texto pode ser sobrescrito (tabela `textos`).

export interface Essencia {
  titulo: string        // arquétipo
  palavras: string      // palavras-chave
  essencia: string      // parágrafo central
  luz: string[]         // pontos positivos
  sombra: string[]      // pontos negativos
  conselho: string[]    // o que fazer
}

export const ESSENCIAS: Record<number, Essencia> = {
  1: {
    titulo: 'O Pioneiro',
    palavras: 'início, coragem, liderança, independência',
    essencia: 'O 1 é a centelha que acende tudo. Ele carrega a energia do primeiro passo, da semente que rompe a terra sem pedir licença. Quem vibra nesse número nasceu para abrir caminhos, tomar decisões e transformar ideias em movimento. Existe dentro de você uma força que não gosta de esperar e que se sente viva quando está criando algo novo, do seu jeito.',
    luz: ['Iniciativa e coragem para começar do zero', 'Capacidade natural de liderar e inspirar', 'Criatividade original, com ideias à frente do seu tempo', 'Determinação para seguir mesmo quando ninguém acredita'],
    sombra: ['Impaciência com o ritmo dos outros', 'Tendência a querer controlar tudo sozinho', 'Orgulho que dificulta pedir ajuda', 'Pode se isolar ou se tornar autoritário quando contrariado'],
    conselho: ['Comece os projetos que estão parados: o seu número pede ação', 'Lidere pelo exemplo, não pela imposição', 'Aprenda a delegar e a confiar em quem caminha com você', 'Reserve tempo para ouvir antes de decidir'],
  },
  2: {
    titulo: 'O Diplomata',
    palavras: 'parceria, sensibilidade, cooperação, paz',
    essencia: 'O 2 é a energia do encontro. Ele sente o que está no ar antes de qualquer palavra ser dita. Quem vibra nesse número tem o dom de unir pessoas, acalmar conflitos e perceber detalhes que passam despercebidos para a maioria. Sua força não está em gritar, mas em acolher; não está em competir, mas em construir junto.',
    luz: ['Sensibilidade e intuição apuradas', 'Talento para mediar conflitos e criar harmonia', 'Lealdade e dedicação nas parcerias', 'Paciência e delicadeza no trato com as pessoas'],
    sombra: ['Dificuldade em dizer "não"', 'Insegurança e medo de rejeição', 'Tendência a se anular para agradar', 'Mágoas guardadas em silêncio'],
    conselho: ['Valorize a sua opinião tanto quanto valoriza a dos outros', 'Escolha parcerias que te respeitem e te somem', 'Coloque limites com carinho, mas com firmeza', 'Use sua intuição: ela raramente se engana'],
  },
  3: {
    titulo: 'O Comunicador',
    palavras: 'expressão, alegria, criatividade, sociabilidade',
    essencia: 'O 3 é a energia da expressão. Ele transforma sentimentos em palavras, cores, sorrisos e ideias. Quem vibra nesse número tem um brilho natural que atrai as pessoas, e uma criatividade que precisa de espaço para sair. Quando você se expressa com verdade, a vida flui; quando se cala, a energia trava.',
    luz: ['Comunicação envolvente e carismática', 'Criatividade e talento artístico', 'Otimismo e bom humor contagiantes', 'Facilidade em fazer amigos e criar conexões'],
    sombra: ['Dispersão: começa muitas coisas e termina poucas', 'Superficialidade quando foge dos próprios sentimentos', 'Gastos impulsivos', 'Sensibilidade às críticas e necessidade de aprovação'],
    conselho: ['Escolha um projeto criativo e leve até o fim', 'Use a sua voz: falar, ensinar, vender e criar são caminhos naturais para você', 'Organize as finanças para que a alegria de hoje não vire peso amanhã', 'Cerque-se de pessoas que celebram o seu brilho'],
  },
  4: {
    titulo: 'O Construtor',
    palavras: 'estrutura, trabalho, disciplina, segurança',
    essencia: 'O 4 é a energia dos alicerces. Ele constrói tijolo por tijolo aquilo que vai durar. Quem vibra nesse número é confiável, organizado e capaz de transformar sonhos em planos concretos. Seu poder está na constância: enquanto muitos desistem no meio do caminho, você continua.',
    luz: ['Responsabilidade e palavra firme', 'Organização e método', 'Persistência diante das dificuldades', 'Capacidade de criar segurança para si e para a família'],
    sombra: ['Rigidez e resistência a mudanças', 'Excesso de trabalho e dificuldade em descansar', 'Teimosia', 'Preocupação constante com o futuro'],
    conselho: ['Planeje, mas permita-se ajustar a rota', 'Inclua descanso e prazer na sua rotina como compromisso', 'Confie que o que você construiu já é sólido', 'Experimente algo novo de vez em quando: a flexibilidade também é força'],
  },
  5: {
    titulo: 'O Aventureiro',
    palavras: 'liberdade, mudança, movimento, versatilidade',
    essencia: 'O 5 é a energia do movimento. Ele é curioso, inquieto e apaixonado por experiências. Quem vibra nesse número aprende vivendo, viajando, conhecendo pessoas e se reinventando. Rotina demais te apaga; liberdade com propósito te faz brilhar.',
    luz: ['Versatilidade e rapidez de raciocínio', 'Coragem para mudar e recomeçar', 'Magnetismo e facilidade de comunicação', 'Adaptação a qualquer ambiente'],
    sombra: ['Impulsividade e ansiedade', 'Dificuldade em manter compromissos longos', 'Excessos (comida, compras, prazeres)', 'Inconstância nos relacionamentos e nos projetos'],
    conselho: ['Busque trabalhos e rotinas que te deem variedade', 'Antes de mudar tudo, pergunte: estou indo para algo ou fugindo de algo?', 'Cuide do corpo e dos limites: liberdade não é excesso', 'Transforme sua curiosidade em conhecimento profundo'],
  },
  6: {
    titulo: 'O Guardião',
    palavras: 'amor, família, responsabilidade, harmonia',
    essencia: 'O 6 é a energia do cuidado. Ele vibra no amor, no lar e na beleza. Quem vive esse número sente a necessidade de proteger, acolher e tornar o mundo ao redor mais bonito e justo. Você é o porto seguro de muita gente, e isso é um dom, desde que você também se coloque na lista de quem merece cuidado.',
    luz: ['Amor generoso e senso de família', 'Responsabilidade e confiabilidade', 'Senso estético e harmonia', 'Vocação para aconselhar, ensinar e curar'],
    sombra: ['Tendência a carregar o peso de todos', 'Perfeccionismo e cobrança excessiva', 'Ciúme e controle em nome do amor', 'Dificuldade em aceitar que cada um tem seu caminho'],
    conselho: ['Cuide de você com a mesma dedicação com que cuida dos outros', 'Ajude sem tentar controlar', 'Crie um ambiente bonito e acolhedor: sua casa recarrega sua energia', 'Profissões ligadas a cuidar, ensinar e embelezar são o seu terreno'],
  },
  7: {
    titulo: 'O Sábio',
    palavras: 'espiritualidade, estudo, introspecção, verdade',
    essencia: 'O 7 é a energia da busca. Ele quer entender o porquê de tudo. Quem vibra nesse número tem uma mente profunda, uma intuição refinada e uma ligação natural com o mistério da vida. Você precisa de silêncio para se ouvir, e é nesse silêncio que as melhores respostas aparecem.',
    luz: ['Inteligência analítica e profundidade', 'Intuição e sensibilidade espiritual', 'Busca pela verdade e pelo conhecimento', 'Discrição e senso crítico'],
    sombra: ['Isolamento e dificuldade em se abrir', 'Desconfiança excessiva', 'Melancolia e pessimismo', 'Frieza aparente que afasta as pessoas'],
    conselho: ['Reserve momentos de recolhimento, meditação ou oração', 'Compartilhe o que sabe: sua sabedoria ajuda outras pessoas', 'Confie mais, mesmo que aos poucos', 'Estude o que te fascina: especialização é o seu caminho de sucesso'],
  },
  8: {
    titulo: 'O Realizador',
    palavras: 'poder, prosperidade, justiça, conquista',
    essencia: 'O 8 é a energia da realização material. Ele sabe transformar esforço em resultado e visão em patrimônio. Quem vibra nesse número tem força, ambição saudável e talento para negócios e liderança. O 8 também é o número da justiça: o que você planta, colhe, e por isso a ética é a sua maior aliada.',
    luz: ['Visão estratégica e talento para negócios', 'Força de vontade e resistência', 'Capacidade de administrar e prosperar', 'Senso de justiça'],
    sombra: ['Materialismo e apego ao controle', 'Workaholismo', 'Autoritarismo', 'Altos e baixos financeiros quando age por impulso ou vaidade'],
    conselho: ['Pense grande e organize-se para chegar lá', 'Use o seu poder para servir, não para dominar', 'Equilibre ganhos materiais com cuidado emocional e espiritual', 'Seja correto(a) em tudo: para o 8, a ética multiplica a prosperidade'],
  },
  9: {
    titulo: 'O Humanitário',
    palavras: 'compaixão, sabedoria, doação, encerramento',
    essencia: 'O 9 é a energia da completude. Ele carrega um pouco de todos os números e por isso compreende as pessoas com profundidade. Quem vibra nesse número tem uma alma generosa, idealista e voltada para algo maior que si. Sua missão envolve servir, inspirar e saber deixar ir o que já cumpriu o seu papel.',
    luz: ['Compaixão e generosidade', 'Visão ampla e tolerância', 'Inspiração e talento artístico', 'Capacidade de perdoar e recomeçar'],
    sombra: ['Dificuldade em encerrar ciclos', 'Sacrifício excessivo e sensação de não ser reconhecido(a)', 'Dramatização das emoções', 'Idealismo que se frustra com a realidade'],
    conselho: ['Pratique o desapego: libere pessoas, objetos e mágoas que já passaram', 'Ajude, mas sem se esquecer de si', 'Envolva-se com causas e projetos que tenham propósito', 'Transforme suas experiências em ensinamento'],
  },
  11: {
    titulo: 'O Iluminado (número mestre)',
    palavras: 'intuição, inspiração, missão espiritual, sensibilidade',
    essencia: 'O 11 é um número mestre: carrega a sensibilidade do 2 elevada a outro patamar. Quem vibra nele é um canal de inspiração, com intuição fortíssima e uma missão de iluminar caminhos. É uma energia intensa, que pede equilíbrio emocional para não virar ansiedade.',
    luz: ['Intuição e percepção extraordinárias', 'Capacidade de inspirar e elevar as pessoas', 'Idealismo e espiritualidade', 'Criatividade visionária'],
    sombra: ['Ansiedade e nervosismo', 'Sensação de ser incompreendido(a)', 'Oscilação entre euforia e insegurança', 'Dificuldade em lidar com o lado prático da vida'],
    conselho: ['Cuide do emocional: terapia, meditação e natureza te equilibram', 'Confie na sua intuição e coloque-a em prática', 'Ensinar, aconselhar e criar são caminhos naturais', 'Mantenha os pés no chão enquanto sonha alto'],
  },
  22: {
    titulo: 'O Mestre Construtor (número mestre)',
    palavras: 'grandes obras, visão, legado, poder de realização',
    essencia: 'O 22 é o mais poderoso dos números mestres: une a visão do 11 à capacidade prática do 4. Quem vibra nele tem potencial para construir coisas grandes, que beneficiam muitas pessoas. Essa energia pede responsabilidade, porque o mesmo potencial que constrói impérios pode gerar muita pressão interna.',
    luz: ['Visão de longo prazo e grande capacidade de realização', 'Liderança prática e confiável', 'Disciplina para projetos grandiosos', 'Vocação para deixar um legado'],
    sombra: ['Pressão interna e medo de não estar à altura', 'Rigidez e controle', 'Esgotamento por excesso de responsabilidade', 'Frustração quando os planos não saem do papel'],
    conselho: ['Divida os grandes sonhos em etapas concretas', 'Construa com equipe: o 22 não foi feito para carregar tudo sozinho', 'Reserve tempo para descanso e espiritualidade', 'Pense no legado: o que você quer deixar para o mundo?'],
  },
}

/** Títulos e explicações de cada seção (linguagem simples). "classico" aparece como subtítulo. Textos autorais. */
export const SECOES: Record<string, { titulo: string; classico?: string; intro: string }> = {
  motivacao: { titulo: 'Desejo da Alma', classico: 'Motivação', intro: 'Este número mostra o que você mais quer por dentro, aquilo que faz o seu coração bater mais forte. É como o motor de um carro: ninguém vê, mas é ele que faz tudo andar.\n\nEle é calculado somando as VOGAIS do seu nome (A, E, I, O, U). Quando você vive de acordo com este número, se sente feliz e cheio(a) de energia. Quando a vida te afasta dele, aparece a sensação de vazio ou de que algo está faltando.' },
  impressao: { titulo: 'Sua Imagem no Mundo', classico: 'Impressão', intro: 'Este número mostra a primeira impressão que você causa: como as pessoas te enxergam quando ainda não te conhecem direito, e também como você mesmo(a) se vê no espelho.\n\nEle vem da soma das CONSOANTES do seu nome (todas as letras que não são vogais). Pense nele como a "roupa" da sua personalidade: é o que aparece por fora.' },
  expressao: { titulo: 'Seus Talentos Naturais', classico: 'Expressão', intro: 'Este número mostra os seus talentos, aquilo que você faz bem quase sem esforço, e o jeito como você age no mundo: no trabalho, no amor, com a família e com o dinheiro.\n\nEle é a soma de TODAS as letras do seu nome. É como a caixa de ferramentas que você recebeu ao nascer: quanto mais você usa essas ferramentas, mais a vida flui a seu favor.' },
  diaNascimento: { titulo: 'O Dom do seu Dia', classico: 'Dia de Nascimento', intro: 'O dia do mês em que você nasceu (de 1 a 31) traz um presente especial: um dom que você carrega desde o primeiro dia de vida.\n\nEsse dom aparece de forma natural, no seu jeito espontâneo de ser, principalmente quando você não está pensando muito. É uma característica que as pessoas costumam notar em você desde criança.\n\nCada dia tem a sua própria energia. Mesmo duas pessoas com o mesmo signo podem ser bem diferentes por causa do dia em que nasceram.' },
  destino: { titulo: 'Caminho de Vida', classico: 'Destino', intro: 'Este é um dos números mais importantes do mapa. Ele mostra a estrada principal da sua vida: as experiências, oportunidades e lições que vão aparecer para você várias vezes, quer você queira ou não.\n\nEle é calculado somando todos os números da sua data de nascimento. Como a data nunca muda, este número acompanha você a vida inteira. Quando você aceita o seu caminho, as portas se abrem com mais facilidade.' },
  missao: { titulo: 'Propósito da Alma', classico: 'Missão', intro: 'Este número mostra para que você veio: a sua vocação mais profunda, aquilo que você veio aprender e ensinar nesta vida.\n\nEle junta o seu nome (Talentos Naturais) com a sua data (Caminho de Vida). Costuma ficar mais claro com a idade, quando você já viveu bastante e começa a entender o sentido de tudo.' },
  talentoOculto: { titulo: 'Dom Adormecido', classico: 'Talento Oculto', intro: 'Todo mundo tem um talento escondido, como um tesouro guardado num baú. Este número mostra qual é o seu.\n\nEle pode ficar "dormindo" por muitos anos e acordar de repente, principalmente entre os 21 e os 28 anos ou em momentos importantes da vida, como uma crise, uma mudança ou um novo desafio.\n\nQuando você descobre e usa este dom, ele vira um grande diferencial: algo que pouca gente tem e que pode mudar o rumo da sua vida.' },
  numeroPsiquico: { titulo: 'Seu Eu Íntimo', classico: 'Número Psíquico', intro: 'Este número mostra como você é por dentro, nas emoções: como você se sente, como reage e como cuida de si. É o seu lado mais íntimo, aquele que só as pessoas muito próximas conhecem.\n\nEle vem do dia em que você nasceu, reduzido a um número de 1 a 9.' },
  respostaSubconsciente: { titulo: 'Reação Instintiva', classico: 'Resposta Subconsciente', intro: 'Sabe quando acontece algo inesperado e você reage antes mesmo de pensar? Este número mostra como é essa reação automática, o seu "piloto automático" nas horas de susto, pressão ou surpresa.\n\nEle depende de quantos números diferentes existem no seu nome: quanto mais números, mais recursos você tem para reagir com calma.' },
  anoPessoal: { titulo: 'Energia do seu Ano', classico: 'Ano Pessoal', intro: 'A vida funciona em ciclos de 9 anos, como as estações do ano. Cada ano tem uma energia diferente: anos de plantar, de esperar, de crescer, de trabalhar, de mudar, de cuidar, de refletir, de colher e de encerrar.\n\nO seu Ano Pessoal mostra em qual dessas fases você está agora. Ele muda no dia do seu aniversário. Saber disso ajuda a fazer a coisa certa na hora certa.' },
  mesPessoal: { titulo: 'Energia do seu Mês', classico: 'Mês Pessoal', intro: 'Dentro de cada ano, cada mês também tem a sua energia. Este número mostra o "clima" deste mês para você: se é hora de agir, de esperar, de conversar ou de descansar.' },
  diaPessoal: { titulo: 'Energia do seu Dia', classico: 'Dia Pessoal', intro: 'Este número mostra a energia do dia em que o mapa foi feito. Você pode calcular o seu dia pessoal de qualquer data e usar como guia para marcar compromissos importantes.' },
  ciclos: { titulo: 'Estações da Vida', classico: 'Ciclos de Vida', intro: 'A sua vida é dividida em três grandes fases, como três capítulos de um livro: a juventude (quando você se forma), a vida adulta (quando você constrói) e a maturidade (quando você colhe).\n\nCada fase tem um número que mostra o tipo de experiência que vai marcar aquele período. Saber em qual fase você está ajuda a entender o que a vida está pedindo de você agora.' },
  desafios: { titulo: 'Provas de Crescimento', classico: 'Desafios', intro: 'Os desafios são como provas na escola da vida: situações difíceis que se repetem até você aprender a lição.\n\nEles não são castigos. São treinos que deixam você mais forte e mais sábio(a). Você tem três: um para a primeira metade da vida, um para a segunda e um principal, que acompanha você sempre.\n\nQuando você conhece os seus desafios, fica muito mais fácil enfrentá-los, porque você já sabe o que está acontecendo e o que fazer.' },
  momentos: { titulo: 'Portais da Vida', classico: 'Momentos Decisivos', intro: 'Ao longo da vida, você passa por quatro grandes "portais": períodos em que aparecem escolhas e oportunidades importantes, que podem mudar o rumo da sua história.\n\nCada portal tem um número que mostra a energia daquele período: o que vai aparecer, o que você vai precisar decidir e qual é a melhor atitude.\n\nPense nisso como um mapa de estrada que mostra as curvas antes de você chegar nelas. Assim você se prepara e aproveita cada fase.' },
  licoesCarmicas: { titulo: 'Aprendizados da Alma', classico: 'Lições Cármicas', intro: 'O seu nome tem letras, e cada letra tem um número de 1 a 9. Quando algum desses números NÃO aparece no seu nome, ele vira uma lição: algo que a sua alma veio aprender nesta vida.\n\nÉ como uma matéria da escola em que você ainda precisa estudar mais. No começo, essa área da vida pode parecer mais difícil. Mas, quando você percebe a lição e pratica, ela fica cada vez mais leve, até virar uma força.\n\nAbaixo você encontra cada lição do seu nome, explicada, e exercícios práticos para trabalhar cada uma.' },
  dividasCarmicas: { titulo: 'Padrões a Curar', classico: 'Dívidas Cármicas', intro: 'Alguns números especiais (13, 14, 16 e 19) mostram padrões que se repetem na vida, como um disco riscado que volta sempre na mesma parte da música.\n\nNa numerologia, eles são chamados de dívidas cármicas: comportamentos que a alma traz e que precisam ser transformados. Eles aparecem quando esses números surgem nas contas do seu nome ou da sua data.\n\nNão tenha medo: ter uma dívida cármica não significa que algo ruim vai acontecer. Significa que existe um aprendizado importante, e que, quando você entende o padrão, consegue mudar a música. Abaixo estão os seus padrões e o passo a passo para curar cada um.' },
  tendenciasOcultas: { titulo: 'Energias em Excesso', classico: 'Tendências Ocultas', intro: 'Quando um número aparece MUITAS vezes no seu nome (4 vezes ou mais), a energia dele fica muito forte, às vezes até demais.\n\nIsso é como colocar sal demais na comida: o sal é bom, mas em excesso atrapalha. Estas energias influenciam as suas escolhas sem você perceber. Conhecê-las ajuda a usar a força delas sem cair nos exageros.' },
  harmoniaConjugal: { titulo: 'Numerologia do Amor', classico: 'Harmonia Conjugal', intro: 'Esta parte mostra como você ama e com quais números você combina mais nos relacionamentos.\n\nFunciona assim: o seu número do amor (que vem do seu Propósito da Alma) se combina de jeitos diferentes com o número de outra pessoa. Com alguns números você vibra (muita paixão), com outros você se atrai (muita afinidade), com outros é oposto (diferenças que pedem diálogo) e com outros é passivo (calmo, mas pode esfriar).\n\nNenhum número decide sozinho se uma relação vai dar certo: o amor é construído todos os dias. Mas conhecer essas combinações ajuda muito a entender o outro e a si mesmo(a).' },
  cores: { titulo: 'Cores Favoráveis', intro: 'Cada número combina com algumas cores, como uma música combina com um ritmo. Usar as suas cores em roupas, acessórios, na decoração e até no celular ajuda a fortalecer a sua energia e o seu bem-estar.' },
  dias: { titulo: 'Dias Favoráveis', intro: 'Estes são os dias do mês que "jogam a seu favor". Sempre que puder, escolha um desses dias para coisas importantes: assinar um contrato, fazer uma entrevista, começar um projeto, fazer uma viagem ou ter uma conversa difícil.' },
  arcanos: { titulo: 'Arcano do Momento', classico: 'Arcanos', intro: 'As letras do seu nome, duas a duas, formam números chamados arcanos. A sua vida é dividida em partes iguais, e cada parte é regida por um arcano.\n\nO arcano atual mostra a energia que está "no comando" da sua vida agora: o que está sendo pedido de você e o que tende a acontecer neste período.' },
  triangulos: { titulo: 'Pirâmides do Nome', classico: 'Triângulos Invertidos', intro: 'Aqui os números das letras do seu nome são somados de dois em dois, linha por linha, até formar uma pirâmide de cabeça para baixo (um triângulo invertido).\n\nQuando aparecem TRÊS ou mais números iguais lado a lado (por exemplo 444), temos um "bloqueio do nome", também chamado de sequência negativa. Ele mostra uma área em que as coisas podem travar ou se repetir.\n\nSão quatro pirâmides: a da Vida (visão geral), a Pessoal (emoções e vida íntima), a Social (amigos, trabalho e relações) e a do Destino (grandes escolhas). Os números marcados em vermelho são os bloqueios. Logo abaixo de cada pirâmide você vê o que cada bloqueio significa e como trabalhar.' },
  signo: { titulo: 'O seu Signo Solar', classico: 'Astrologia', intro: 'O signo solar mostra onde o Sol estava no céu no dia em que você nasceu. Ele fala da sua essência, do seu brilho e do seu jeito natural de viver.\n\nA numerologia mostra a energia do seu nome e da sua data. A astrologia mostra a energia do céu. Juntas, elas formam uma leitura muito mais completa de quem você é.' },
}

/** Lições cármicas: o aprendizado de cada número que falta no nome. */
export const LICOES: Record<number, string> = {
  1: 'Falta do 1: aprender a ter iniciativa, a confiar nas próprias decisões e a não depender da aprovação dos outros para agir.',
  2: 'Falta do 2: aprender a cooperar, a ter paciência e a valorizar os detalhes e as parcerias.',
  3: 'Falta do 3: aprender a se expressar, a mostrar os sentimentos e a permitir que a alegria faça parte da rotina.',
  4: 'Falta do 4: aprender disciplina, organização e constância, terminando aquilo que começa.',
  5: 'Falta do 5: aprender a lidar com mudanças, a sair da zona de conforto e a aproveitar as oportunidades sem medo.',
  6: 'Falta do 6: aprender a assumir responsabilidades afetivas e familiares e a cultivar o amor no dia a dia.',
  7: 'Falta do 7: aprender a olhar para dentro, a estudar com profundidade e a confiar na espiritualidade.',
  8: 'Falta do 8: aprender a lidar com dinheiro, com autoridade e com o próprio poder de forma equilibrada.',
  9: 'Falta do 9: aprender a perdoar, a desapegar e a enxergar a vida com mais compaixão e visão ampla.',
}

/** Dívidas cármicas. */
export const DIVIDAS: Record<number, string> = {
  13: 'Dívida 13: ligada ao trabalho e à disciplina. A vida pede esforço constante, foco e paciência; atalhos costumam não funcionar. Quando você se compromete de verdade, as recompensas chegam de forma sólida.',
  14: 'Dívida 14: ligada à liberdade e ao uso dos recursos. Pode trazer instabilidade (mudanças de emprego, de casa, perdas materiais) até que se aprenda moderação, responsabilidade com o dinheiro e respeito aos compromissos.',
  16: 'Dívida 16: ligada ao ego e às relações. Pode trazer quedas repentinas que obrigam a reconstruir a vida em bases mais humildes e verdadeiras. A lição é a sinceridade, a fidelidade e a espiritualidade.',
  19: 'Dívida 19: ligada ao uso do poder. A vida ensina a pedir e aceitar ajuda e a usar a força pessoal a serviço dos outros, não apenas de si. O aprendizado é a interdependência.',
}

/** Signos solares — texto autoral resumido. */
export const SIGNOS: Record<string, { elemento: string; regente: string; texto: string }> = {
  'Áries': { elemento: 'Fogo', regente: 'Marte', texto: 'Ariano(a) tem energia de começo: é corajoso(a), direto(a) e cheio(a) de iniciativa. Gosta de desafios e se entedia com a rotina. O aprendizado é desenvolver paciência e pensar antes de agir.' },
  'Touro': { elemento: 'Terra', regente: 'Vênus', texto: 'Taurino(a) busca segurança, conforto e prazer. É leal, persistente e tem ótimo senso para finanças e beleza. O aprendizado é aceitar mudanças e soltar o apego.' },
  'Gêmeos': { elemento: 'Ar', regente: 'Mercúrio', texto: 'Geminiano(a) é curioso(a), comunicativo(a) e versátil. Aprende rápido e se conecta com todo tipo de pessoa. O aprendizado é aprofundar e concluir o que começa.' },
  'Câncer': { elemento: 'Água', regente: 'Lua', texto: 'Canceriano(a) é sensível, protetor(a) e muito ligado(a) à família e às memórias. Acolhe como ninguém. O aprendizado é não se fechar na concha quando se sente ferido(a).' },
  'Leão': { elemento: 'Fogo', regente: 'Sol', texto: 'Leonino(a) tem brilho próprio, generosidade e talento para liderar e inspirar. Gosta de reconhecimento. O aprendizado é brilhar sem precisar diminuir ninguém.' },
  'Virgem': { elemento: 'Terra', regente: 'Mercúrio', texto: 'Virginiano(a) é detalhista, prático(a) e prestativo(a). Tem um olhar crítico que melhora tudo o que toca. O aprendizado é ser menos exigente consigo mesmo(a).' },
  'Libra': { elemento: 'Ar', regente: 'Vênus', texto: 'Libriano(a) busca equilíbrio, beleza e justiça. É diplomático(a) e encantador(a). O aprendizado é tomar decisões sem medo de desagradar.' },
  'Escorpião': { elemento: 'Água', regente: 'Plutão', texto: 'Escorpiano(a) é intenso(a), magnético(a) e transformador(a). Vive tudo com profundidade. O aprendizado é confiar e perdoar, transformando a intensidade em força.' },
  'Sagitário': { elemento: 'Fogo', regente: 'Júpiter', texto: 'Sagitariano(a) é otimista, aventureiro(a) e busca sentido em tudo. Ama liberdade, viagens e conhecimento. O aprendizado é ter constância e cumprir promessas.' },
  'Capricórnio': { elemento: 'Terra', regente: 'Saturno', texto: 'Capricorniano(a) é ambicioso(a), responsável e persistente. Constrói devagar e chega longe. O aprendizado é se permitir leveza e demonstrar afeto.' },
  'Aquário': { elemento: 'Ar', regente: 'Urano', texto: 'Aquariano(a) é original, independente e pensa no coletivo. Tem ideias à frente do seu tempo. O aprendizado é se conectar emocionalmente sem perder a liberdade.' },
  'Peixes': { elemento: 'Água', regente: 'Netuno', texto: 'Pisciano(a) é sensível, intuitivo(a) e compassivo(a). Tem uma imaginação rica e forte ligação espiritual. O aprendizado é cuidar dos próprios limites e não absorver a dor alheia.' },
}

/** Ano pessoal: tema de cada ano do ciclo de 9. */
export const ANOS: Record<number, string> = {
  1: 'Ano de plantar. Hora de começar projetos, tomar a frente e fazer escolhas novas: tudo o que nascer agora dá o tom dos próximos nove anos.',
  2: 'Ano de cultivar. As sementes precisam de paciência. Bom momento para parcerias, relacionamentos e para cuidar dos detalhes.',
  3: 'Ano de florescer. Energia de expressão, criatividade e vida social. Divulgue seu trabalho, comunique-se e celebre.',
  4: 'Ano de estruturar. Trabalho, organização e disciplina. O que for construído com cuidado agora vira base sólida.',
  5: 'Ano de mudanças. Movimento, viagens, novidades e liberdade. Aproveite as oportunidades, mas evite decisões por impulso.',
  6: 'Ano do lar e do amor. Família, relacionamentos e responsabilidades afetivas ganham destaque. Bom para casar, mudar de casa e cuidar de quem ama.',
  7: 'Ano de introspecção. Estudo, autoconhecimento e espiritualidade. Menos correria, mais reflexão.',
  8: 'Ano da colheita material. Energia de conquistas, negócios e reconhecimento. Ótimo para crescer financeiramente com ética.',
  9: 'Ano de encerramento. Fim de ciclo: hora de concluir, desapegar e abrir espaço para o novo ciclo que vem aí.',
}

/** Cores por número (tabela tradicional; a do 5 confere com o mapa de referência). */
export const CORES: Record<number, string> = {
  1: 'tons de amarelo, laranja e dourado',
  2: 'tons de verde, creme e branco',
  3: 'tons de violeta, lilás e azul',
  4: 'tons de azul, cinza e verde',
  5: 'cores claras, cinza e prata',
  6: 'tons de azul, rosa e verde-claro',
  7: 'tons de verde, amarelo e branco',
  8: 'tons de roxo, cinza-escuro e azul-escuro',
  9: 'tons de vermelho, rosa e coral',
}
