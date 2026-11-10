/** Textos do quiz (teste). Blocos prontos por signo e por tema, sem IA, sem promessas. */
export type Lang = 'pt' | 'es'
export type Tema = 'amor' | 'dinheiro' | 'saude' | 'familia' | 'proposito'

export const SIGNOS = ['aries', 'touro', 'gemeos', 'cancer', 'leao', 'virgem', 'libra', 'escorpiao', 'sagitario', 'capricornio', 'aquario', 'peixes'] as const
export type Signo = (typeof SIGNOS)[number]

// [mês, dia] de início de cada signo
const INI: [number, number, Signo][] = [
  [1, 20, 'aquario'], [2, 19, 'peixes'], [3, 21, 'aries'], [4, 20, 'touro'], [5, 21, 'gemeos'], [6, 21, 'cancer'], [7, 23, 'leao'], [8, 23, 'virgem'], [9, 23, 'libra'], [10, 23, 'escorpiao'], [11, 22, 'sagitario'], [12, 22, 'capricornio'],
]
export function signoDe(dia: number, mes: number): Signo {
  let s: Signo = 'capricornio' // 01/01 a 19/01
  for (const [m, d, sg] of INI) if (mes > m || (mes === m && dia >= d)) s = sg
  return s
}

export const NOME_SIGNO: Record<Lang, Record<Signo, string>> = {
  pt: { aries: 'Áries', touro: 'Touro', gemeos: 'Gêmeos', cancer: 'Câncer', leao: 'Leão', virgem: 'Virgem', libra: 'Libra', escorpiao: 'Escorpião', sagitario: 'Sagitário', capricornio: 'Capricórnio', aquario: 'Aquário', peixes: 'Peixes' },
  es: { aries: 'Aries', touro: 'Tauro', gemeos: 'Géminis', cancer: 'Cáncer', leao: 'Leo', virgem: 'Virgo', libra: 'Libra', escorpiao: 'Escorpio', sagitario: 'Sagitario', capricornio: 'Capricornio', aquario: 'Acuario', peixes: 'Piscis' },
}

/** Traços do signo solar: 2 frases curtas. */
export const TRACOS: Record<Lang, Record<Signo, [string, string]>> = {
  pt: {
    aries: ['Você costuma agir primeiro e pensar depois, com coragem para começar.', 'O desafio está em dar ritmo à pressa e terminar o que começa.'],
    touro: ['Você valoriza estabilidade, conforto e coisas que duram.', 'O desafio está em lidar com mudanças e soltar o que já não serve.'],
    gemeos: ['Você é curioso, comunicativo e aprende rápido.', 'O desafio está em manter o foco quando surgem muitas ideias ao mesmo tempo.'],
    cancer: ['Você sente tudo com profundidade e cuida de quem ama.', 'O desafio está em se proteger sem se fechar.'],
    leao: ['Você tem presença, calor e vontade de ser reconhecido pelo que faz.', 'O desafio está em pedir apoio sem sentir que perde força.'],
    virgem: ['Você é cuidadoso, observador e gosta de fazer bem feito.', 'O desafio está em ser menos duro consigo mesmo.'],
    libra: ['Você busca equilíbrio, harmonia e relações justas.', 'O desafio está em decidir sem esperar a aprovação de todos.'],
    escorpiao: ['Você vive com intensidade e percebe o que está por trás das aparências.', 'O desafio está em confiar sem precisar controlar.'],
    sagitario: ['Você é otimista, livre e movido por sentido e aventura.', 'O desafio está em sustentar compromissos quando a rotina pesa.'],
    capricornio: ['Você é disciplinado, responsável e pensa a longo prazo.', 'O desafio está em se permitir descansar e sentir prazer no caminho.'],
    aquario: ['Você é original, independente e pensa diferente da maioria.', 'O desafio está em se aproximar emocionalmente sem perder a liberdade.'],
    peixes: ['Você é sensível, intuitivo e absorve o clima ao redor.', 'O desafio está em colocar limites para não carregar o que não é seu.'],
  },
  es: {
    aries: ['Sueles actuar primero y pensar después, con coraje para empezar.', 'El reto está en darle ritmo a la prisa y terminar lo que empiezas.'],
    touro: ['Valoras la estabilidad, la comodidad y lo que dura.', 'El reto está en vivir los cambios y soltar lo que ya no sirve.'],
    gemeos: ['Eres curioso/a, comunicativo/a y aprendes rápido.', 'El reto está en mantener el foco cuando aparecen muchas ideas a la vez.'],
    cancer: ['Sientes todo con profundidad y cuidas a quienes amas.', 'El reto está en protegerte sin cerrarte.'],
    leao: ['Tienes presencia, calidez y ganas de ser reconocido/a por lo que haces.', 'El reto está en pedir apoyo sin sentir que pierdes fuerza.'],
    virgem: ['Eres cuidadoso/a, observador/a y te gusta hacer bien las cosas.', 'El reto está en ser menos duro/a contigo.'],
    libra: ['Buscas equilibrio, armonía y relaciones justas.', 'El reto está en decidir sin esperar la aprobación de todos.'],
    escorpiao: ['Vives con intensidad y notas lo que hay detrás de las apariencias.', 'El reto está en confiar sin necesidad de controlar.'],
    sagitario: ['Eres optimista, libre y te mueven el sentido y la aventura.', 'El reto está en sostener compromisos cuando la rutina pesa.'],
    capricornio: ['Eres disciplinado/a, responsable y piensas a largo plazo.', 'El reto está en permitirte descansar y disfrutar el camino.'],
    aquario: ['Eres original, independiente y piensas distinto a la mayoría.', 'El reto está en acercarte emocionalmente sin perder tu libertad.'],
    peixes: ['Eres sensible, intuitivo/a y absorbes el ambiente que te rodea.', 'El reto está en poner límites para no cargar lo que no es tuyo.'],
  },
}

export interface TemaTxt { nome: string; previa: string; leitura: string }
/** Por tema: nome curto, frase da prévia (usa {n} = nome) e parágrafo da leitura. */
export const TEMAS: Record<Lang, Record<Tema, TemaTxt>> = {
  pt: {
    amor: { nome: 'amor e relações', previa: '{n}, há um padrão no seu mapa ligado a amor e relações: algo que tende a se repetir de formas diferentes.', leitura: 'Em relações, muita gente repete a mesma dinâmica com pessoas diferentes. O mapa ajuda a enxergar qual é o seu padrão, o que ele protege e que passos pequenos podem mudá-lo.' },
    dinheiro: { nome: 'dinheiro e trabalho', previa: '{n}, há um padrão no seu mapa ligado a dinheiro e trabalho: um ciclo de esforço e retorno que vale olhar de perto.', leitura: 'Quando o dinheiro entra e sai, quase sempre há um ciclo por trás: hábitos, crenças e momentos. O mapa mostra os seus ciclos e onde pequenas decisões pesam mais.' },
    saude: { nome: 'saúde e energia', previa: '{n}, há um padrão no seu mapa ligado a energia e bem-estar: um ritmo seu que merece atenção.', leitura: 'Cansaço e falta de energia muitas vezes têm a ver com ritmo e com o que carregamos. O mapa é uma ferramenta de autoconhecimento para perceber os seus ritmos. Não substitui cuidado médico.' },
    familia: { nome: 'família', previa: '{n}, há um padrão no seu mapa ligado à família: papéis e expectativas que vêm de longe.', leitura: 'Na família, cada um assume um papel sem perceber. O mapa ajuda a entender o seu e a pensar como se relacionar com mais clareza e menos peso.' },
    proposito: { nome: 'propósito', previa: '{n}, há um padrão no seu mapa ligado a propósito: uma busca por sentido que aparece nos seus números.', leitura: 'Sentir que falta direção é comum em fases de mudança. O mapa mostra tendências do seu nome e da sua data para você refletir sobre o que faz sentido agora.' },
  },
  es: {
    amor: { nome: 'amor y relaciones', previa: '{n}, hay un patrón en tu mapa ligado al amor y las relaciones: algo que tiende a repetirse de formas distintas.', leitura: 'En las relaciones, mucha gente repite la misma dinámica con personas diferentes. El mapa ayuda a ver cuál es tu patrón, qué protege y qué pasos pequeños pueden cambiarlo.' },
    dinheiro: { nome: 'dinero y trabajo', previa: '{n}, hay un patrón en tu mapa ligado al dinero y al trabajo: un ciclo de esfuerzo y retorno que vale la pena mirar de cerca.', leitura: 'Cuando el dinero entra y se va, casi siempre hay un ciclo detrás: hábitos, creencias y momentos. El mapa muestra tus ciclos y dónde pesan más las decisiones pequeñas.' },
    saude: { nome: 'salud y energía', previa: '{n}, hay un patrón en tu mapa ligado a la energía y el bienestar: un ritmo tuyo que merece atención.', leitura: 'El cansancio y la falta de energía muchas veces tienen que ver con el ritmo y con lo que cargamos. El mapa es una herramienta de autoconocimiento para notar tus ritmos. No reemplaza la atención médica.' },
    familia: { nome: 'familia', previa: '{n}, hay un patrón en tu mapa ligado a la familia: roles y expectativas que vienen de lejos.', leitura: 'En la familia cada uno asume un rol sin darse cuenta. El mapa ayuda a entender el tuyo y a pensar cómo relacionarte con más claridad y menos peso.' },
    proposito: { nome: 'propósito', previa: '{n}, hay un patrón en tu mapa ligado al propósito: una búsqueda de sentido que aparece en tus números.', leitura: 'Sentir que falta dirección es común en etapas de cambio. El mapa muestra tendencias de tu nombre y de tu fecha para que reflexiones sobre lo que tiene sentido ahora.' },
  },
}

export interface Opcao { t: string; pts: number; tema?: Tema }
export interface Pergunta { q: string; ops: Opcao[] }
export const PERGUNTAS: Record<Lang, Pergunta[]> = {
  pt: [
    { q: 'Qual área da sua vida pede mais atenção agora?', ops: [
      { t: 'Amor e relações', pts: 3, tema: 'amor' }, { t: 'Dinheiro e trabalho', pts: 3, tema: 'dinheiro' }, { t: 'Saúde e energia', pts: 2, tema: 'saude' }, { t: 'Família', pts: 2, tema: 'familia' }, { t: 'Propósito e direção', pts: 1, tema: 'proposito' } ] },
    { q: 'Há quanto tempo isso aparece para você?', ops: [
      { t: 'Faz pouco tempo', pts: 1 }, { t: 'Alguns meses', pts: 2 }, { t: 'Anos, e se repete', pts: 3 } ] },
    { q: 'O que você mais quer de uma leitura como esta?', ops: [
      { t: 'Só conhecer mais sobre mim', pts: 1 }, { t: 'Entender por que as coisas se repetem', pts: 2 }, { t: 'Ter passos claros para agir', pts: 3 } ] },
  ],
  es: [
    { q: '¿Qué área de tu vida pide más atención ahora?', ops: [
      { t: 'Amor y relaciones', pts: 3, tema: 'amor' }, { t: 'Dinero y trabajo', pts: 3, tema: 'dinheiro' }, { t: 'Salud y energía', pts: 2, tema: 'saude' }, { t: 'Familia', pts: 2, tema: 'familia' }, { t: 'Propósito y dirección', pts: 1, tema: 'proposito' } ] },
    { q: '¿Hace cuánto tiempo aparece esto en tu vida?', ops: [
      { t: 'Hace poco', pts: 1 }, { t: 'Hace algunos meses', pts: 2 }, { t: 'Hace años, y se repite', pts: 3 } ] },
    { q: '¿Qué quieres de una lectura como esta?', ops: [
      { t: 'Solo conocerme más', pts: 1 }, { t: 'Entender por qué las cosas se repiten', pts: 2 }, { t: 'Tener pasos claros para actuar', pts: 3 } ] },
  ],
}

export const UI = {
  pt: {
    ctaStart: 'Começar', ctaNext: 'Continuar', ctaConfirm: 'Está correto, continuar', ctaEdit: 'Corrigir',
    paisQ: 'Em que país você mora?', paisSub: 'Isso define o idioma e a forma de pagamento.', paisPh: 'Escolha seu país',
    t1: 'Sua leitura personalizada', t1s: 'Em poucas telas, veja o que o seu nome e a sua data mostram. Leva cerca de 2 minutos.',
    nomeL: 'Nome completo de nascimento', nomePh: 'Como está no seu registro', dataL: 'Data de nascimento', dataPh: 'dd/mm/aaaa',
    consent: 'Usamos seu nome e sua data só para gerar esta leitura. Não guardamos esses dados.',
    confirmT: 'Confira seus dados', errNome: 'Escreva seu nome completo (nome e sobrenome).', errData: 'Confira a data: use dd/mm/aaaa.', errIdade: 'Este conteúdo é para maiores de 18 anos.',
    fim18: 'Obrigado pelo interesse. Esta leitura é só para maiores de 18 anos. Cuide-se bem.',
    signoT: (n: string, s: string) => `${n}, seu signo solar é ${s}.`, signoS: 'Vamos ver o que mais aparece no seu mapa.',
    previaT: 'Um trecho do seu mapa', previaS: 'Na leitura completa, isto é explicado com os seus números e o que fazer a respeito.',
    leituraT: (n: string) => `Sua leitura, ${n}`, b1: 'Traços do seu signo', b2: 'O tema que mais pesa agora', b3: 'Para ir mais fundo',
    b3t: 'O mapa completo une a numerologia cabalística do seu nome com a astrologia da sua data. Mostra seus ciclos, seus pontos de atenção e passos práticos. É uma ferramenta de autoconhecimento, não uma previsão.',
    ofertaT: 'Seu Mapa da Alma completo', preco: 'R$ 49', precoS: 'pagamento único, via Pix',
    inclui: ['Seu número da alma e as pirâmides do seu nome', 'Seu signo e o dia do nascimento explicados', 'Pontos de atenção e passos práticos', 'Link pessoal e PDF para guardar'], pagar: 'Quero meu mapa completo', semLink: 'Link de pagamento ainda não configurado (teste)',
    volta: (n: string) => `${n}, sua leitura continua aqui. Se quiser aprofundar, o mapa completo está disponível quando você decidir.`, voltaCta: 'Ver o mapa completo',
    aviso: 'Conteúdo de autoconhecimento e entretenimento. Não faz previsões nem promete resultados.',
    progresso: (a: number, b: number) => `Passo ${a} de ${b}`,
  },
  es: {
    ctaStart: 'Empezar', ctaNext: 'Continuar', ctaConfirm: 'Es correcto, continuar', ctaEdit: 'Corregir',
    paisQ: '¿En qué país vives?', paisSub: 'Esto define el idioma y la forma de pago.', paisPh: 'Elige tu país',
    t1: 'Tu lectura personalizada', t1s: 'En pocas pantallas, mira lo que muestran tu nombre y tu fecha. Toma unos 2 minutos.',
    nomeL: 'Nombre completo de nacimiento', nomePh: 'Como figura en tu registro', dataL: 'Fecha de nacimiento', dataPh: 'dd/mm/aaaa',
    consent: 'Usamos tu nombre y tu fecha solo para generar esta lectura. No guardamos esos datos.',
    confirmT: 'Revisa tus datos', errNome: 'Escribe tu nombre completo (nombre y apellido).', errData: 'Revisa la fecha: usa dd/mm/aaaa.', errIdade: 'Este contenido es solo para mayores de 18 años.',
    fim18: 'Gracias por tu interés. Esta lectura es solo para mayores de 18 años. Cuídate mucho.',
    signoT: (n: string, s: string) => `${n}, tu signo solar es ${s}.`, signoS: 'Veamos qué más aparece en tu mapa.',
    previaT: 'Un fragmento de tu mapa', previaS: 'En la lectura completa, esto se explica con tus números y qué hacer al respecto.',
    leituraT: (n: string) => `Tu lectura, ${n}`, b1: 'Rasgos de tu signo', b2: 'El tema que más pesa ahora', b3: 'Para ir más profundo',
    b3t: 'El mapa completo une la numerología cabalística de tu nombre con la astrología de tu fecha. Muestra tus ciclos, tus puntos de atención y pasos prácticos. Es una herramienta de autoconocimiento, no una predicción.',
    ofertaT: 'Tu Mapa del Alma completo', preco: 'US$ 10', precoS: 'de US$ 19 a solo US$ 10 · pago único · para toda la vida',
    inclui: ['Tu número del alma y las pirámides de tu nombre', 'Tu signo y tu día de nacimiento explicados', 'Puntos de atención y pasos prácticos', 'Enlace personal y PDF para guardar'], pagar: 'Quiero mi mapa completo', semLink: 'Enlace de pago aún no configurado (prueba)',
    volta: (n: string) => `${n}, tu lectura sigue aquí. Si quieres profundizar, el mapa completo está disponible cuando decidas.`, voltaCta: 'Ver el mapa completo',
    aviso: 'Contenido de autoconocimiento y entretenimiento. No hace predicciones ni promete resultados.',
    progresso: (a: number, b: number) => `Paso ${a} de ${b}`,
  },
}

/** Países para a tela 1. BR = português; todos os outros = espanhol. */
export const PAISES: { c: string; n: string }[] = [
  { c: 'BR', n: 'Brasil' }, { c: 'MX', n: 'México' }, { c: 'ES', n: 'España' }, { c: 'AR', n: 'Argentina' }, { c: 'CO', n: 'Colombia' }, { c: 'CL', n: 'Chile' }, { c: 'PE', n: 'Perú' }, { c: 'EC', n: 'Ecuador' },
  { c: 'VE', n: 'Venezuela' }, { c: 'BO', n: 'Bolivia' }, { c: 'UY', n: 'Uruguay' }, { c: 'PY', n: 'Paraguay' }, { c: 'CR', n: 'Costa Rica' }, { c: 'PA', n: 'Panamá' }, { c: 'GT', n: 'Guatemala' },
  { c: 'HN', n: 'Honduras' }, { c: 'SV', n: 'El Salvador' }, { c: 'NI', n: 'Nicaragua' }, { c: 'DO', n: 'República Dominicana' }, { c: 'PR', n: 'Puerto Rico' }, { c: 'US', n: 'Estados Unidos' }, { c: 'XX', n: 'Otro país / Outro país' },
]
