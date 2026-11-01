// Textos autorais do Mapa da Alma — HORÓSCOPO: os 12 signos solares, decanatos e combinações com a numerologia.
export interface SignoInfo {
  periodo: string; elemento: 'Fogo' | 'Terra' | 'Ar' | 'Água'; modalidade: string; regente: string
  simbolo: string; glifo: string; pedra: string; cor: string; dia: string; compativeis: string[]
  personalidade: string; amor: string; carreira: string; dinheiro: string; bemEstar: string; sombra: string; conselho: string
  decanatos: [string, string, string]
}

export const SIGNOS_INFO: Record<string, SignoInfo> = {
  'Áries': {
    periodo: '21/03 a 19/04', elemento: 'Fogo', modalidade: 'Cardinal', regente: 'Marte', simbolo: 'Carneiro', glifo: '♈',
    pedra: 'Rubi e jaspe vermelho', cor: 'Vermelho', dia: 'Terça-feira', compativeis: ['Leão', 'Sagitário', 'Gêmeos', 'Aquário'],
    personalidade: 'Áries abre o zodíaco e carrega a energia do primeiro impulso. Você é corajoso(a), direto(a) e cheio(a) de iniciativa. Gosta de desafios, se entedia com a lentidão e tem uma sinceridade que às vezes assusta. Quando acredita em algo, vai até o fim.',
    amor: 'No amor, Áries é intenso e apaixonado. Você conquista com entusiasmo e gosta de sentir que está vivendo uma aventura a dois. Precisa de um(a) parceiro(a) que tenha personalidade própria e não se intimide com a sua franqueza. O desafio é cultivar a paciência depois que a paixão inicial passa.',
    carreira: 'Na carreira, você brilha onde há ação, liderança e desafio: empreendedorismo, vendas, esportes, gestão de crises, segurança, empresas em crescimento. Precisa de metas claras e de autonomia para decidir.',
    dinheiro: 'Com o dinheiro, você é rápido(a) para ganhar e para gastar. Decisões impulsivas são o seu ponto fraco. Uma reserva automática e um tempo de espera antes de compras grandes fazem muita diferença.',
    bemEstar: 'Para o bem-estar, Áries precisa gastar energia: atividades físicas intensas, artes marciais, corrida. A região da cabeça é sensível: atenção a dores de cabeça, estresse e ao excesso de pressa.',
    sombra: 'A sombra de Áries é a impaciência, a agressividade quando contrariado(a) e a dificuldade em terminar o que começou.',
    conselho: 'Use a sua coragem para abrir caminhos, mas aprenda a respirar antes de reagir. A sua força é maior quando vem acompanhada de estratégia.',
    decanatos: ['1º decanato (21/03 a 31/03), regido por Marte: a energia ariana em estado puro, muito ativa, competitiva e pioneira.', '2º decanato (01/04 a 10/04), com influência do Sol: mais carisma, criatividade e vontade de ser reconhecido(a).', '3º decanato (11/04 a 19/04), com influência de Júpiter: mais otimismo, espírito aventureiro e busca de sentido.'],
  },
  'Touro': {
    periodo: '20/04 a 20/05', elemento: 'Terra', modalidade: 'Fixo', regente: 'Vênus', simbolo: 'Touro', glifo: '♉',
    pedra: 'Esmeralda e quartzo rosa', cor: 'Verde e rosa', dia: 'Sexta-feira', compativeis: ['Virgem', 'Capricórnio', 'Câncer', 'Peixes'],
    personalidade: 'Touro é o signo da estabilidade e do prazer. Você é paciente, determinado(a), leal e aprecia as coisas boas da vida: conforto, boa comida, beleza, natureza. Quando decide algo, dificilmente volta atrás.',
    amor: 'No amor, Touro é fiel, sensual e protetor. Você demora a se entregar, mas quando ama, ama de verdade e para durar. Precisa de segurança, carinho físico e demonstrações concretas de afeto. O desafio é não ser possessivo(a).',
    carreira: 'Na carreira, você se destaca em finanças, administração, gastronomia, agricultura, artes, design, beleza e imóveis. Constrói com consistência e entrega trabalhos de qualidade.',
    dinheiro: 'Com o dinheiro, Touro tem talento natural para acumular e investir com segurança. Gosta de conforto, então precisa equilibrar o desejo de bem-estar com o planejamento.',
    bemEstar: 'Para o bem-estar, Touro precisa de contato com a natureza, alimentação equilibrada e prazeres simples. A garganta e o pescoço são regiões sensíveis.',
    sombra: 'A sombra de Touro é a teimosia, a resistência a mudanças, o apego e a acomodação.',
    conselho: 'Valorize a sua constância, mas permita-se mudar quando a vida pedir. Segurança verdadeira também vem da capacidade de se adaptar.',
    decanatos: ['1º decanato (20/04 a 30/04), regido por Vênus: muito sensível à beleza, ao conforto e às relações afetivas.', '2º decanato (01/05 a 10/05), com influência de Mercúrio: mais comunicativo(a), prático(a) e curioso(a).', '3º decanato (11/05 a 20/05), com influência de Saturno: mais disciplina, ambição e senso de responsabilidade.'],
  },
  'Gêmeos': {
    periodo: '21/05 a 20/06', elemento: 'Ar', modalidade: 'Mutável', regente: 'Mercúrio', simbolo: 'Gêmeos', glifo: '♊',
    pedra: 'Ágata e citrino', cor: 'Amarelo', dia: 'Quarta-feira', compativeis: ['Libra', 'Aquário', 'Áries', 'Leão'],
    personalidade: 'Gêmeos é o signo da comunicação e da curiosidade. Você é inteligente, versátil, bem-humorado(a) e tem sede de aprender. Conversa com qualquer pessoa, adapta-se a qualquer ambiente e sempre tem uma ideia nova.',
    amor: 'No amor, Gêmeos precisa de conversa, leveza e estímulo mental. Você se apaixona pela inteligência e pelo bom humor. Rotinas monótonas te afastam. O desafio é aprofundar os sentimentos e manter a constância.',
    carreira: 'Na carreira, você brilha em comunicação, jornalismo, marketing, vendas, ensino, tecnologia, escrita e redes sociais. Trabalhos com variedade e contato com pessoas são ideais.',
    dinheiro: 'Com o dinheiro, você tem várias fontes de ideias e de renda, mas pode se dispersar. Organizar os gastos e focar em poucos projetos rentáveis ajuda muito.',
    bemEstar: 'Para o bem-estar, Gêmeos precisa desacelerar a mente: respiração, leitura leve, pausas sem telas. Pulmões, braços e sistema nervoso pedem cuidado.',
    sombra: 'A sombra de Gêmeos é a dispersão, a ansiedade, a superficialidade e a inconstância.',
    conselho: 'Use a sua inteligência para conectar pessoas e ideias, mas escolha um foco e aprofunde-se nele. A sua mente rende mais quando tem direção.',
    decanatos: ['1º decanato (21/05 a 31/05), regido por Mercúrio: extremamente comunicativo(a), curioso(a) e rápido(a).', '2º decanato (01/06 a 10/06), com influência de Vênus: mais charme, sociabilidade e senso artístico.', '3º decanato (11/06 a 20/06), com influência de Urano: mais originalidade, independência e ideias à frente do tempo.'],
  },
  'Câncer': {
    periodo: '21/06 a 22/07', elemento: 'Água', modalidade: 'Cardinal', regente: 'Lua', simbolo: 'Caranguejo', glifo: '♋',
    pedra: 'Pedra da lua e pérola', cor: 'Prata e branco', dia: 'Segunda-feira', compativeis: ['Escorpião', 'Peixes', 'Touro', 'Virgem'],
    personalidade: 'Câncer é o signo do acolhimento e da memória afetiva. Você é sensível, intuitivo(a), protetor(a) e profundamente ligado(a) à família e ao lar. Sente tudo com intensidade e guarda as lembranças com carinho.',
    amor: 'No amor, Câncer é carinhoso, dedicado e romântico. Você busca segurança emocional e um porto seguro. Quando confia, se entrega por inteiro. O desafio é não se fechar na concha quando se sente magoado(a).',
    carreira: 'Na carreira, você se destaca em saúde, psicologia, educação, gastronomia, hotelaria, imóveis, recursos humanos e trabalhos ligados ao cuidado.',
    dinheiro: 'Com o dinheiro, Câncer é cauteloso e gosta de guardar para garantir a segurança da família. Às vezes, gasta por impulso emocional.',
    bemEstar: 'Para o bem-estar, Câncer precisa de um lar acolhedor, de momentos de recolhimento e de cuidado com as emoções. Estômago e digestão são sensíveis ao estresse emocional.',
    sombra: 'A sombra de Câncer é a mágoa guardada, a chantagem emocional, o apego ao passado e as oscilações de humor.',
    conselho: 'Acolha as suas emoções sem se afogar nelas. Cuide dos outros, mas ofereça a si mesmo(a) o mesmo colo que dá a todos.',
    decanatos: ['1º decanato (21/06 a 01/07), regido pela Lua: muito sensível, intuitivo(a) e ligado(a) à família.', '2º decanato (02/07 a 12/07), com influência de Plutão: mais intensidade, profundidade e poder de transformação.', '3º decanato (13/07 a 22/07), com influência de Netuno: mais imaginação, espiritualidade e compaixão.'],
  },
  'Leão': {
    periodo: '23/07 a 22/08', elemento: 'Fogo', modalidade: 'Fixo', regente: 'Sol', simbolo: 'Leão', glifo: '♌',
    pedra: 'Olho de tigre e topázio', cor: 'Dourado e laranja', dia: 'Domingo', compativeis: ['Áries', 'Sagitário', 'Gêmeos', 'Libra'],
    personalidade: 'Leão é o signo do brilho e da generosidade. Você é carismático(a), criativo(a), leal e tem uma presença que ilumina os ambientes. Gosta de ser admirado(a) e de admirar, e tem um coração enorme.',
    amor: 'No amor, Leão é apaixonado, generoso e romântico. Você gosta de cortejar, de surpreender e de ser valorizado(a). Precisa de admiração e de lealdade. O desafio é não deixar o orgulho atrapalhar as reconciliações.',
    carreira: 'Na carreira, você brilha em liderança, artes, entretenimento, comunicação, moda, educação e qualquer área em que possa se destacar e inspirar.',
    dinheiro: 'Com o dinheiro, Leão gosta de qualidade e de conforto, e pode gastar para manter a imagem. Planejamento garante que o brilho seja sustentável.',
    bemEstar: 'Para o bem-estar, Leão precisa de diversão, criatividade e atividades que tragam alegria. O coração e a coluna pedem atenção.',
    sombra: 'A sombra de Leão é o orgulho, a vaidade, a necessidade de aplauso e a dificuldade em aceitar críticas.',
    conselho: 'Brilhe sem precisar apagar ninguém. A sua luz é ainda mais bonita quando você a usa para fazer os outros brilharem também.',
    decanatos: ['1º decanato (23/07 a 01/08), regido pelo Sol: muito carismático(a), orgulhoso(a) e criativo(a).', '2º decanato (02/08 a 11/08), com influência de Júpiter: mais otimismo, generosidade e gosto por aventuras.', '3º decanato (12/08 a 22/08), com influência de Marte: mais energia, coragem e espírito de liderança.'],
  },
  'Virgem': {
    periodo: '23/08 a 22/09', elemento: 'Terra', modalidade: 'Mutável', regente: 'Mercúrio', simbolo: 'Virgem', glifo: '♍',
    pedra: 'Safira e amazonita', cor: 'Verde e azul-marinho', dia: 'Quarta-feira', compativeis: ['Touro', 'Capricórnio', 'Câncer', 'Escorpião'],
    personalidade: 'Virgem é o signo do cuidado com os detalhes e do serviço. Você é analítico(a), prestativo(a), organizado(a) e tem um senso crítico apurado. Gosta de ser útil e de ver as coisas funcionando bem.',
    amor: 'No amor, Virgem demonstra afeto com atitudes: cuidado, atenção aos detalhes, ajuda prática. Você é leal e discreto(a). O desafio é não ser crítico(a) demais com o(a) parceiro(a) e consigo.',
    carreira: 'Na carreira, você se destaca em saúde, nutrição, pesquisa, contabilidade, revisão, tecnologia, administração e qualquer área que exija precisão.',
    dinheiro: 'Com o dinheiro, Virgem é organizado e cuidadoso. Planilhas e controle de gastos são aliados naturais. Cuidado com a ansiedade financeira.',
    bemEstar: 'Para o bem-estar, Virgem precisa de rotina saudável, alimentação equilibrada e momentos sem cobrança. O intestino é sensível à ansiedade.',
    sombra: 'A sombra de Virgem é o perfeccionismo, a autocrítica, a preocupação excessiva e a dificuldade em relaxar.',
    conselho: 'O feito é melhor que o perfeito. Use o seu olhar atento para melhorar o mundo, mas trate a si mesmo(a) com a mesma gentileza que oferece aos outros.',
    decanatos: ['1º decanato (23/08 a 01/09), regido por Mercúrio: muito analítico(a), detalhista e comunicativo(a).', '2º decanato (02/09 a 11/09), com influência de Saturno: mais disciplina, seriedade e senso de dever.', '3º decanato (12/09 a 22/09), com influência de Vênus: mais delicadeza, senso estético e afeto.'],
  },
  'Libra': {
    periodo: '23/09 a 22/10', elemento: 'Ar', modalidade: 'Cardinal', regente: 'Vênus', simbolo: 'Balança', glifo: '♎',
    pedra: 'Opala e quartzo rosa', cor: 'Rosa e azul-claro', dia: 'Sexta-feira', compativeis: ['Gêmeos', 'Aquário', 'Leão', 'Sagitário'],
    personalidade: 'Libra é o signo da harmonia, da beleza e da justiça. Você é diplomático(a), elegante, sociável e busca equilíbrio em tudo. Tem talento para enxergar os dois lados de uma situação.',
    amor: 'No amor, Libra é romântico, gentil e valoriza muito a parceria. Você gosta de relações equilibradas, com respeito e delicadeza. O desafio é não evitar conflitos a ponto de engolir o que sente.',
    carreira: 'Na carreira, você brilha em direito, diplomacia, relações públicas, design, moda, artes, eventos e trabalhos de mediação.',
    dinheiro: 'Com o dinheiro, Libra aprecia o belo e pode gastar com estética e conforto. Parcerias financeiras tendem a ser favoráveis.',
    bemEstar: 'Para o bem-estar, Libra precisa de ambientes harmoniosos, arte e equilíbrio entre trabalho e lazer. Rins e região lombar pedem atenção.',
    sombra: 'A sombra de Libra é a indecisão, a dependência da aprovação dos outros e a fuga dos conflitos.',
    conselho: 'Equilíbrio não é agradar a todos. Posicione-se com elegância: a verdadeira harmonia inclui a sua voz.',
    decanatos: ['1º decanato (23/09 a 02/10), regido por Vênus: muito charmoso(a), artístico(a) e romântico(a).', '2º decanato (03/10 a 12/10), com influência de Urano: mais originalidade, independência e ideias inovadoras.', '3º decanato (13/10 a 22/10), com influência de Mercúrio: mais comunicação, inteligência e habilidade de negociação.'],
  },
  'Escorpião': {
    periodo: '23/10 a 21/11', elemento: 'Água', modalidade: 'Fixo', regente: 'Plutão e Marte', simbolo: 'Escorpião', glifo: '♏',
    pedra: 'Granada e obsidiana', cor: 'Vinho e preto', dia: 'Terça-feira', compativeis: ['Câncer', 'Peixes', 'Virgem', 'Capricórnio'],
    personalidade: 'Escorpião é o signo da intensidade e da transformação. Você é profundo(a), magnético(a), intuitivo(a) e não se contenta com superficialidades. Tem uma força interior capaz de renascer de qualquer situação.',
    amor: 'No amor, Escorpião é intenso, leal e apaixonado. Você se entrega por inteiro e espera o mesmo. A confiança é sagrada. O desafio é lidar com o ciúme e com a necessidade de controle.',
    carreira: 'Na carreira, você se destaca em psicologia, investigação, medicina, finanças, pesquisa, terapias e qualquer área que exija profundidade e estratégia.',
    dinheiro: 'Com o dinheiro, Escorpião é estratégico e reservado. Tem talento para investimentos e para lidar com recursos compartilhados.',
    bemEstar: 'Para o bem-estar, Escorpião precisa liberar as emoções: terapia, escrita, atividades físicas intensas. A região genital e o sistema excretor pedem atenção.',
    sombra: 'A sombra de Escorpião é o ciúme, o rancor, a desconfiança e a tendência a controlar.',
    conselho: 'Use a sua intensidade para transformar, não para destruir. Perdoar é o maior ato de poder que você pode praticar.',
    decanatos: ['1º decanato (23/10 a 01/11), regido por Plutão: muito intenso(a), misterioso(a) e transformador(a).', '2º decanato (02/11 a 11/11), com influência de Netuno: mais intuição, sensibilidade e espiritualidade.', '3º decanato (12/11 a 21/11), com influência da Lua: mais emoção, proteção e apego à família.'],
  },
  'Sagitário': {
    periodo: '22/11 a 21/12', elemento: 'Fogo', modalidade: 'Mutável', regente: 'Júpiter', simbolo: 'Centauro arqueiro', glifo: '♐',
    pedra: 'Turquesa e ametista', cor: 'Roxo e azul-turquesa', dia: 'Quinta-feira', compativeis: ['Áries', 'Leão', 'Libra', 'Aquário'],
    personalidade: 'Sagitário é o signo da expansão e da busca de sentido. Você é otimista, aventureiro(a), sincero(a) e ama a liberdade. Gosta de viajar, aprender e conhecer culturas e ideias diferentes.',
    amor: 'No amor, Sagitário é divertido, generoso e honesto. Você precisa de um(a) parceiro(a) que seja também amigo(a) e companheiro(a) de aventuras. O desafio é conciliar liberdade e compromisso.',
    carreira: 'Na carreira, você brilha em ensino, turismo, direito, comércio exterior, filosofia, comunicação, esportes e trabalhos com viagens.',
    dinheiro: 'Com o dinheiro, Sagitário costuma ter sorte, mas também é generoso e expansivo nos gastos. Planejamento evita surpresas.',
    bemEstar: 'Para o bem-estar, Sagitário precisa de movimento, ar livre e atividades que tragam sensação de liberdade. Fígado, quadris e coxas pedem atenção.',
    sombra: 'A sombra de Sagitário é o exagero, a impaciência com limites, a franqueza sem tato e a dificuldade com compromissos.',
    conselho: 'Mire alto, mas cuide do caminho. A sua fé na vida é um presente: compartilhe-a sem ignorar os detalhes práticos.',
    decanatos: ['1º decanato (22/11 a 01/12), regido por Júpiter: muito otimista, generoso(a) e aventureiro(a).', '2º decanato (02/12 a 11/12), com influência de Marte: mais energia, coragem e espírito competitivo.', '3º decanato (12/12 a 21/12), com influência do Sol: mais carisma, criatividade e desejo de reconhecimento.'],
  },
  'Capricórnio': {
    periodo: '22/12 a 19/01', elemento: 'Terra', modalidade: 'Cardinal', regente: 'Saturno', simbolo: 'Cabra-marinha', glifo: '♑',
    pedra: 'Ônix e granada', cor: 'Marrom e cinza', dia: 'Sábado', compativeis: ['Touro', 'Virgem', 'Escorpião', 'Peixes'],
    personalidade: 'Capricórnio é o signo da ambição e da responsabilidade. Você é disciplinado(a), persistente, maduro(a) e tem metas claras. Sobe a montanha devagar, mas chega ao topo.',
    amor: 'No amor, Capricórnio é sério, leal e comprometido. Você demonstra afeto com segurança, presença e planos para o futuro. O desafio é se permitir mostrar a vulnerabilidade.',
    carreira: 'Na carreira, você se destaca em gestão, finanças, engenharia, direito, política, administração pública e empresas sólidas. Tem perfil de liderança.',
    dinheiro: 'Com o dinheiro, Capricórnio é prudente e estratégico. Constrói patrimônio de forma sólida ao longo do tempo.',
    bemEstar: 'Para o bem-estar, Capricórnio precisa de pausas e de momentos de leveza. Ossos, joelhos, dentes e pele pedem cuidado.',
    sombra: 'A sombra de Capricórnio é a rigidez, o pessimismo, o excesso de trabalho e a frieza emocional.',
    conselho: 'O topo da montanha só faz sentido se você puder aproveitar a vista. Equilibre as metas com afeto, descanso e prazer.',
    decanatos: ['1º decanato (22/12 a 31/12), regido por Saturno: muito disciplinado(a), sério(a) e ambicioso(a).', '2º decanato (01/01 a 10/01), com influência de Vênus: mais sensibilidade, charme e gosto pela beleza.', '3º decanato (11/01 a 19/01), com influência de Mercúrio: mais comunicação, inteligência prática e senso de negócios.'],
  },
  'Aquário': {
    periodo: '20/01 a 18/02', elemento: 'Ar', modalidade: 'Fixo', regente: 'Urano e Saturno', simbolo: 'Aguadeiro', glifo: '♒',
    pedra: 'Ametista e água-marinha', cor: 'Azul-elétrico', dia: 'Sábado', compativeis: ['Gêmeos', 'Libra', 'Áries', 'Sagitário'],
    personalidade: 'Aquário é o signo da originalidade e do coletivo. Você é inovador(a), independente, humanitário(a) e pensa à frente do seu tempo. Valoriza a amizade e a liberdade acima de tudo.',
    amor: 'No amor, Aquário precisa de amizade, liberdade e conexão mental. Você é leal, mas não suporta ciúme e controle. O desafio é se permitir sentir e demonstrar as emoções.',
    carreira: 'Na carreira, você brilha em tecnologia, ciência, inovação, causas sociais, astrologia, comunicação digital e projetos coletivos.',
    dinheiro: 'Com o dinheiro, Aquário pode ser imprevisível. Investir em ideias inovadoras é natural, mas a constância garante a segurança.',
    bemEstar: 'Para o bem-estar, Aquário precisa de liberdade, grupos com afinidade e atividades diferentes. Circulação e tornozelos pedem atenção.',
    sombra: 'A sombra de Aquário é o distanciamento emocional, a rebeldia sem causa e a teimosia intelectual.',
    conselho: 'A sua visão pode mudar o mundo. Só não esqueça que o mundo é feito de pessoas: aproxime-se delas com o coração, e não só com as ideias.',
    decanatos: ['1º decanato (20/01 a 29/01), regido por Urano: muito original, independente e inovador(a).', '2º decanato (30/01 a 08/02), com influência de Mercúrio: mais comunicação, curiosidade e inteligência.', '3º decanato (09/02 a 18/02), com influência de Vênus: mais sensibilidade, charme e senso artístico.'],
  },
  'Peixes': {
    periodo: '19/02 a 20/03', elemento: 'Água', modalidade: 'Mutável', regente: 'Netuno e Júpiter', simbolo: 'Dois peixes', glifo: '♓',
    pedra: 'Água-marinha e ametista', cor: 'Lilás e verde-mar', dia: 'Quinta-feira', compativeis: ['Câncer', 'Escorpião', 'Touro', 'Capricórnio'],
    personalidade: 'Peixes é o signo da compaixão e da imaginação. Você é sensível, intuitivo(a), empático(a) e tem uma ligação forte com a espiritualidade e a arte. Sente o que os outros sentem.',
    amor: 'No amor, Peixes é romântico, dedicado e sonhador. Você se entrega de corpo e alma e busca uma conexão espiritual. O desafio é não idealizar o outro nem se perder na relação.',
    carreira: 'Na carreira, você se destaca em artes, música, terapias, saúde, espiritualidade, fotografia, cinema e trabalhos humanitários.',
    dinheiro: 'Com o dinheiro, Peixes pode ser desligado e generoso demais. Organização simples e ajuda de alguém prático fazem diferença.',
    bemEstar: 'Para o bem-estar, Peixes precisa de silêncio, contato com a água, meditação e proteção energética. Os pés e o sistema imunológico pedem atenção.',
    sombra: 'A sombra de Peixes é a fuga da realidade, a vitimização, a confusão e a dificuldade em colocar limites.',
    conselho: 'A sua sensibilidade é um dom. Proteja-a com limites claros e transforme a sua imaginação em arte, cuidado e fé.',
    decanatos: ['1º decanato (19/02 a 28/02), regido por Netuno: muito intuitivo(a), sonhador(a) e espiritual.', '2º decanato (01/03 a 10/03), com influência da Lua: mais emoção, proteção e sensibilidade familiar.', '3º decanato (11/03 a 20/03), com influência de Plutão: mais intensidade, profundidade e poder de transformação.'],
  },
}

/** Decanato (0, 1, 2) a partir do dia e mês de nascimento. */
export function decanato(signo: string, nascimento: string): number {
  const [, mes, dia] = nascimento.split('-').map(Number)
  const ini = SIGNOS_INFO[signo].periodo.split(' a ')[0].split('/').map(Number) // [dia, mês]
  const inicio = new Date(Date.UTC(2001, ini[1] - 1, ini[0]))
  let d = new Date(Date.UTC(2001, mes - 1, dia))
  if (d < inicio) d = new Date(Date.UTC(2002, mes - 1, dia))
  const dias = Math.round((+d - +inicio) / 86400000)
  return Math.min(2, Math.floor(dias / 10))
}

const ELEMENTO_ANO: Record<string, string> = {
  Fogo: 'Como signo de Fogo, você sente essa energia com pressa de agir: canalize o entusiasmo em metas concretas.',
  Terra: 'Como signo de Terra, você vive essa energia de forma prática: transforme as intenções em planos e resultados visíveis.',
  Ar: 'Como signo de Ar, você processa essa energia pela mente e pelas conversas: troque ideias, estude e conecte-se com pessoas.',
  'Água': 'Como signo de Água, você sente essa energia pelas emoções: confie na intuição e cuide do coração.',
}

const ANO_FOCO: Record<number, string> = {
  1: 'novos começos, coragem e decisões', 2: 'parcerias, paciência e sensibilidade', 3: 'comunicação, criatividade e vida social',
  4: 'trabalho, organização e bases sólidas', 5: 'mudanças, liberdade e novidades', 6: 'família, amor e responsabilidades',
  7: 'autoconhecimento, estudo e espiritualidade', 8: 'conquistas materiais, carreira e prosperidade', 9: 'encerramentos, desapego e renovação',
  11: 'intuição, inspiração e despertar', 22: 'grandes projetos e construção duradoura',
}

/** Horóscopo do ano: o signo solar combinado com o ano pessoal da numerologia. */
export function previsaoAno(signo: string, ano: number, anoCalendario: number): string[] {
  const s = SIGNOS_INFO[signo]
  return [
    `Para ${signo}, ${anoCalendario} é um ano pessoal ${ano} na numerologia: um período de ${ANO_FOCO[ano] || ANO_FOCO[ano % 9 || 9]}.`,
    ELEMENTO_ANO[s.elemento],
    `No amor: ${s.amor.split('. ').slice(-1)[0].replace(/^O desafio é/, 'o seu desafio neste ano é')} Na carreira, as áreas que mais combinam com você (${s.carreira.split(': ')[1]?.replace(/\.$/, '') || 'as que valorizam seus talentos'}) ganham força quando alinhadas à energia do ano ${ano}.`,
    `Conselho dos astros para este ano: ${s.conselho}`,
  ]
}

/** O signo conversando com os números principais. */
export function signoENumeros(signo: string, destino: number, motivacao: number, expressao: number, palavras: (n: number) => string): string[] {
  const s = SIGNOS_INFO[signo]
  return [
    `Seu Sol em ${signo} (${s.elemento}, ${s.modalidade.toLowerCase()}, regido por ${s.regente}) mostra a sua forma natural de brilhar. A numerologia completa esse retrato: o seu Destino ${destino} fala de ${palavras(destino)}, a sua Motivação ${motivacao} fala de ${palavras(motivacao)} e a sua Expressão ${expressao} fala de ${palavras(expressao)}.`,
    `Quando a energia de ${signo} e a dos seus números caminham juntas, você se sente inteiro(a). Quando parecem puxar para lados diferentes, é um convite para equilibrar: ${s.sombra.replace('A sombra de ' + signo + ' é ', '').replace(/\.$/, '')} são os pontos de atenção do seu signo, e os seus números mostram o caminho para superá-los.`,
  ]
}
