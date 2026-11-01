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

/** Introduções de cada seção (o que o número significa). Textos autorais. */
export const SECOES: Record<string, { titulo: string; intro: string }> = {
  motivacao: { titulo: 'Motivação', intro: 'A Motivação nasce das vogais do seu nome e revela o que move a sua alma por dentro: seus desejos mais íntimos, aquilo que te faz levantar da cama e o que você busca mesmo quando ninguém está olhando.' },
  impressao: { titulo: 'Impressão', intro: 'A Impressão vem das consoantes do seu nome e mostra a primeira imagem que as pessoas têm de você: a forma como o mundo te percebe antes de te conhecer de verdade.' },
  expressao: { titulo: 'Expressão', intro: 'A Expressão é a soma de todas as letras do seu nome. Ela revela seus talentos naturais, a forma como você age no mundo e as ferramentas que trouxe para realizar o seu caminho.' },
  diaNascimento: { titulo: 'Dia de Nascimento', intro: 'O Dia de Nascimento mostra os dons que você recebeu no momento em que chegou ao mundo: traços instintivos que aparecem de forma espontânea no seu jeito de ser.' },
  destino: { titulo: 'Destino — Propósito de Vida', intro: 'O Destino é calculado pela sua data de nascimento completa. Ele indica a estrada principal da sua vida: as lições, oportunidades e experiências que vão te encontrar, quer você procure por elas ou não.' },
  missao: { titulo: 'Missão de Vida', intro: 'A Missão une o seu nome (Expressão) ao seu Destino. Ela mostra a sua vocação mais profunda, aquilo que você veio aprender e compartilhar, e costuma ficar mais clara com a maturidade.' },
  talentoOculto: { titulo: 'Talento Oculto', intro: 'O Talento Oculto é um dom guardado que costuma despertar em momentos especiais da vida. Quando você o reconhece, ele se torna um diferencial poderoso.' },
  numeroPsiquico: { titulo: 'Número Psíquico', intro: 'O Número Psíquico vem do dia em que você nasceu e revela como você se enxerga por dentro: seus impulsos emocionais, suas reações e a forma como se relaciona consigo.' },
  respostaSubconsciente: { titulo: 'Resposta Subconsciente', intro: 'A Resposta Subconsciente mostra como você reage diante do inesperado: o seu "piloto automático" em momentos de crise ou de surpresa.' },
  anoPessoal: { titulo: 'Ano Pessoal', intro: 'O Ano Pessoal indica a energia que rege o seu ano atual, contado de aniversário a aniversário. Saber em que fase você está ajuda a escolher o momento certo para agir, plantar ou descansar.' },
  mesPessoal: { titulo: 'Mês Pessoal', intro: 'O Mês Pessoal refina a energia do ano e mostra o clima deste mês para a sua vida.' },
  diaPessoal: { titulo: 'Dia Pessoal', intro: 'O Dia Pessoal mostra a vibração do dia de hoje para você. É um bom guia para marcar compromissos importantes.' },
  ciclos: { titulo: 'Ciclos da Vida', intro: 'A vida acontece em três grandes ciclos: o formativo (juventude), o produtivo (vida adulta) e o da colheita (maturidade). Cada ciclo tem um número que define o tipo de experiência que vai marcar aquela fase.' },
  desafios: { titulo: 'Desafios', intro: 'Os Desafios mostram os pontos que a vida vai te pedir para fortalecer. Eles não são castigos: são os treinos que transformam você na sua melhor versão.' },
  momentos: { titulo: 'Momentos Decisivos', intro: 'Os Momentos Decisivos marcam quatro fases em que a vida te apresenta oportunidades e escolhas importantes. Conhecer cada uma ajuda a aproveitar a energia certa na hora certa.' },
  licoesCarmicas: { titulo: 'Lições Cármicas', intro: 'As Lições Cármicas aparecem a partir dos números que faltam no seu nome. Elas mostram aprendizados que a sua alma ainda precisa desenvolver nesta vida. A boa notícia: quando você toma consciência delas, a lição fica muito mais leve.' },
  dividasCarmicas: { titulo: 'Dívidas Cármicas', intro: 'As Dívidas Cármicas surgem quando os números 13, 14, 16 ou 19 aparecem nos cálculos principais. Elas indicam padrões que se repetem até serem compreendidos e transformados.' },
  tendenciasOcultas: { titulo: 'Tendências Ocultas', intro: 'As Tendências Ocultas são números que aparecem muitas vezes no seu nome. Elas mostram traços fortes, às vezes até em excesso, que influenciam suas escolhas sem que você perceba.' },
  harmoniaConjugal: { titulo: 'Harmonia Conjugal', intro: 'A Harmonia Conjugal compara números para mostrar com quais energias você vibra, se atrai, se completa ou entra em atrito nos relacionamentos. Nenhum número sozinho define uma relação, mas ele dá pistas valiosas.' },
  cores: { titulo: 'Cores Favoráveis', intro: 'Cada número vibra em sintonia com algumas cores. Usá-las em roupas, ambientes e na sua marca pessoal ajuda a fortalecer a sua energia natural.' },
  dias: { titulo: 'Dias Favoráveis', intro: 'Estes são os dias do mês que vibram a seu favor. Sempre que puder, use-os para decisões importantes: contratos, entrevistas, viagens e começos.' },
  arcanos: { titulo: 'Arcanos do Nome', intro: 'Cada par de letras do seu nome forma um arcano, e a sua vida é dividida em períodos iguais regidos por eles. O arcano atual mostra a energia que está vibrando na sua vida neste momento.' },
  triangulos: { titulo: 'Triângulos Invertidos', intro: 'O triângulo invertido é formado somando os números das letras do nome, linha a linha. Quando aparecem três ou mais números iguais em sequência, temos uma "sequência negativa", que aponta bloqueios e padrões repetitivos. Os quatro triângulos mostram a vida em geral, o lado pessoal, o social e o destino.' },
  signo: { titulo: 'O seu Signo Solar', intro: 'A numerologia revela a vibração do seu nome e da sua data; a astrologia mostra a energia do céu no dia em que você nasceu. Juntas, elas dão uma leitura ainda mais completa sobre quem você é.' },
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
