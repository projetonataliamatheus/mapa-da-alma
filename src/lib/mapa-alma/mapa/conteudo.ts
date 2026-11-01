// Monta o conteúdo do mapa (seções, números e textos), usado pelo link ao vivo e pelo PDF.
import { mapaPessoal, signoSolar, reduzir, letrasDoNome, type MapaPessoal } from '../numerologia/motor.ts'
import { HARMONIA_CONJUGAL, HARMONICOS, diasFavoraveis } from '../numerologia/tabelas.ts'
import { ESSENCIAS, SECOES, CORES, type Essencia } from '../textos/essencias.ts'
import { texto } from '../textos/biblioteca/index.ts'
import { PLANOS, PLANOS_CARMA, type Plano } from '../textos/biblioteca/planos.ts'
import { CICLO_INFANCIA, CICLO_MATURIDADE } from '../textos/biblioteca/tempo.ts'
import { ARCANOS, arcanoBase } from '../textos/biblioteca/arcanos.ts'
import { SIGNOS_INFO, decanato, previsaoAno, signoENumeros } from '../textos/biblioteca/signos.ts'

/** Textos personalizados vindos do painel: chave "categoria:numero" (ex.: "motivacao:5"). */
export type Overrides = Record<string, string>

export interface Bloco {
  rotulo?: string
  numero?: string        // ex.: "59 › 5"
  texto?: string[]       // parágrafos
  luz?: string[]; sombra?: string[]; conselho?: string[]
  destaque?: string
  triangulo?: { nome: string; linhas: number[][]; marcas: string[] }
  novaPagina?: boolean   // (não usado no PDF atual)
  plano?: PlanoBloco     // O QUE FAZER: plano prático
}
export interface PlanoBloco { intro?: string; passos?: string[]; partes?: { titulo: string; itens?: string[]; texto?: string }[]; frase?: string }
export interface Secao { id: string; titulo: string; classico?: string; intro: string; blocos: Bloco[] }
export interface LinhaTabela { grupo: string; item: string; valor: string; sentido: string; aprendizado?: string }
export interface Conteudo {
  nome: string; nascimento: string; signo: string
  resumo: { rotulo: string; valor: string }[]
  secoes: Secao[]
  tabela: LinhaTabela[]
  mapa: MapaPessoal
}

const fmtData = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const n2 = (b: number, v: number) => (b !== v ? `${b} › ${v}` : String(v))
const lista = (a: number[]) => (a.length ? a.join(' - ') : '—')

function essencia(n: number): Essencia { return ESSENCIAS[n] || ESSENCIAS[reduzir(n)] }

type Parte = keyof Plano
const ROTULO_PARTE: Record<Parte, string> = {
  semana: 'Comece nos próximos 7 dias', rotina: 'No dia a dia', amor: 'No amor', trabalho: 'No trabalho', dinheiro: 'No dinheiro',
  armadilha: 'Evite esta armadilha', travar: 'Se você travar', frase: 'Frase para repetir',
}
/** Partes do plano que cada seção mostra (as já usadas em outra seção com o mesmo número são trocadas). */
const PARTES_SECAO: Record<string, Parte[]> = {
  motivacao: ['semana', 'rotina', 'armadilha', 'frase'], impressao: ['rotina', 'amor', 'armadilha'], expressao: ['trabalho', 'dinheiro', 'travar', 'semana'],
  diaNascimento: ['rotina', 'travar'], destino: ['semana', 'travar', 'trabalho', 'frase'], missao: ['trabalho', 'dinheiro', 'rotina', 'frase'],
  talentoOculto: ['semana', 'trabalho'], numeroPsiquico: ['amor', 'rotina'], anoPessoal: ['semana', 'rotina', 'dinheiro', 'travar'],
  ciclo: ['rotina', 'trabalho'], momento: ['semana', 'travar'], desafio: ['travar', 'rotina', 'armadilha'], harmoniaConjugal: ['amor', 'armadilha'],
}

function montarPlano(cat: string, n: number, usados: Set<string>, intro?: string): PlanoBloco | undefined {
  const pl = PLANOS[n] || PLANOS[reduzir(n)]
  if (!pl) return intro ? { intro } : undefined
  const desejadas = PARTES_SECAO[cat] || ['semana', 'rotina']
  const todas: Parte[] = ['semana', 'rotina', 'trabalho', 'amor', 'dinheiro', 'travar', 'armadilha']
  const escolha: Parte[] = []
  for (const p of [...desejadas, ...todas]) {
    if (escolha.length >= desejadas.length) break
    if (p === 'frase' || escolha.includes(p) || usados.has(`${n}:${p}`)) continue
    escolha.push(p)
  }
  escolha.forEach(p => usados.add(`${n}:${p}`))
  const partes = escolha.map(p => Array.isArray(pl[p]) ? { titulo: ROTULO_PARTE[p], itens: pl[p] as string[] } : { titulo: ROTULO_PARTE[p], texto: pl[p] as string })
  const frase = desejadas.includes('frase') && !usados.has(`${n}:frase`) ? (usados.add(`${n}:frase`), pl.frase) : undefined
  return { intro, partes, frase }
}

/** Separa o parágrafo "O QUE FAZER" do texto. */
function separarFazer(paras: string[]): { texto: string[]; fazer?: string } {
  const i = paras.findIndex(p => /^O QUE FAZER/i.test(p))
  if (i < 0) return { texto: paras }
  return { texto: paras.filter((_, k) => k !== i), fazer: paras[i].replace(/^O QUE FAZER:?\s*/i, '') }
}

/** Bloco de um número: texto da biblioteca (ou do painel) + pontos positivos/de atenção + plano prático. */
function blocoNumero(cat: string, n: number, ov: Overrides, usados: Set<string>, rotulo?: string, numero?: string, foco?: string): Bloco {
  const e = essencia(n)
  const custom = !!ov[`${cat}:${n}`]
  const { texto: paras, fazer } = separarFazer(texto(cat, n, ov, reduzir(n)))
  return {
    rotulo, numero: numero ?? String(n),
    destaque: `${e.titulo} · ${e.palavras}`,
    texto: [...(paras.length ? paras : [e.essencia]), ...(foco ? [foco] : [])],
    luz: custom ? undefined : e.luz, sombra: custom ? undefined : e.sombra,
    plano: montarPlano(cat, n, usados, fazer),
  }
}

/** Bloco simples com texto da biblioteca e plano prático. */
function blocoTexto(cat: string, n: number, ov: Overrides, usados: Set<string>, b: Partial<Bloco>, comPlano = true): Bloco {
  const { texto: paras, fazer } = separarFazer(texto(cat, n, ov, reduzir(n)))
  return { ...b, texto: [...(b.texto || []), ...paras], plano: comPlano ? montarPlano(cat, n, usados, fazer) : fazer ? { intro: fazer } : undefined }
}

function marcarSequencias(t: MapaPessoal['triangulos']['vida']) {
  const set = new Set<string>()
  for (const s of t.sequencias) for (let i = 0; i < s.tamanho; i++) set.add(`${s.linha}:${s.inicio + i}`)
  return [...set]
}

const somaDig = (n: number) => String(n).split('').reduce((a, d) => a + Number(d), 0)
function addMeses(iso: string, meses: number): string {
  const [a, mm, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(a, mm - 1, d)); t.setUTCMonth(t.getUTCMonth() + meses); return t.toISOString().slice(0, 10)
}
function dataArc(iso: string, meses: number): string {
  const inteiros = Math.floor(meses + 1e-9), d = new Date(addMeses(iso, inteiros) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + Math.round((meses - inteiros) * 30.4375)); return d.toISOString().slice(0, 10)
}
function duracaoTxt(meses: number): string {
  const anos = Math.floor(meses / 12), m = Math.floor(meses % 12 + 1e-9), dias = Math.round((meses - Math.floor(meses + 1e-9)) * 30.4375)
  return `${anos} ano(s), ${m} mês(es)${dias ? ` e ${dias} dia(s)` : ''}`
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
function proximosMeses(m: MapaPessoal, hoje?: string) {
  const h = (hoje || new Date().toISOString()).slice(0, 10).split('-').map(Number)
  return Array.from({ length: 12 }, (_, i) => {
    const mes = ((h[1] - 1 + i) % 12) + 1, ano = h[0] + Math.floor((h[1] - 1 + i) / 12)
    const anoRef = mes > m.nascimento.mes || (mes === m.nascimento.mes) ? ano : ano - 1
    const ap = reduzir(m.nascimento.dia + m.nascimento.mes + somaDig(anoRef))
    return { rotulo: `${MESES[mes - 1]} de ${ano}`.replace(/^./, c => c.toUpperCase()), mes: reduzir(ap + mes) }
  })
}
const DICA_ELEMENTO: Record<string, string[]> = {
  Fogo: ['use o seu entusiasmo para dar o primeiro passo.', 'segure a pressa: o outro também precisa de tempo.', 'brilhe, mas não se espalhe em mil projetos.', 'transforme energia em disciplina.', 'aproveite a aventura sem perder o controle.', 'aqueça a casa e os laços com gestos de carinho.', 'desacelere: o fogo também precisa de silêncio.', 'aja com coragem e estratégia nos negócios.', 'queime o que já passou e abra espaço.'],
  Terra: ['plante uma semente concreta: um plano, uma meta, um curso.', 'construa parcerias sólidas e confiáveis.', 'permita-se leveza e prazer sem culpa.', 'organize finanças e rotina: é o seu terreno.', 'aceite mudanças, mesmo que tirem você da zona de conforto.', 'cuide do lar e do corpo com carinho.', 'reserve tempo para descanso e reflexão.', 'negocie com firmeza: o mês favorece ganhos.', 'desapegue do que pesa e não produz mais.'],
  Ar: ['coloque as ideias em prática, sem esperar a perfeição.', 'escute antes de opinar.', 'comunique-se: o mês favorece conversas e contatos.', 'tire os planos da cabeça e coloque no papel.', 'troque de ares, estude algo novo.', 'dedique atenção às pessoas, e não só às ideias.', 'silencie a mente: leitura, meditação, natureza.', 'use a sua inteligência para negociar bem.', 'encerre conversas pendentes e siga em frente.'],
  'Água': ['confie na intuição para começar algo novo.', 'proteja a sua sensibilidade e escolha bem as companhias.', 'expresse o que sente com leveza.', 'crie uma rotina que dê segurança emocional.', 'flua com as mudanças em vez de resistir.', 'acolha a família e também a si mesmo(a).', 'mergulhe no autoconhecimento: terapia, espiritualidade.', 'valorize o seu trabalho e cobre o justo.', 'chore o que precisa, perdoe e renove as águas.'],
}

function blocosLetras(nome: string): Bloco[] {
  const partes = nome.trim().split(/\s+/)
  const todas = letrasDoNome(nome)
  const prim = letrasDoNome(partes[0])
  const pedra = prim[0], vogal = prim.find(l => l.vogal) || prim[0], fecho = prim[prim.length - 1]
  const e = (n: number) => essencia(n)
  return [
    { rotulo: 'Valores do seu nome', texto: partes.map(p => { const ls = letrasDoNome(p); return `${p.toUpperCase()}: ${ls.map(l => `${l.letra}=${l.valor}`).join(' · ')} (soma ${ls.reduce((a, l) => a + l.valor, 0)})` }),
      destaque: `Vogais somam ${todas.filter(l => l.vogal).reduce((a, l) => a + l.valor, 0)} · consoantes somam ${todas.filter(l => !l.vogal).reduce((a, l) => a + l.valor, 0)} · total ${todas.reduce((a, l) => a + l.valor, 0)}` },
    { rotulo: `Pedra fundamental: ${pedra.letra}`, numero: String(pedra.valor), texto: [
      `A primeira letra do seu nome mostra como você começa as coisas e reage às novidades. Com valor ${pedra.valor}, você tende a iniciar projetos com ${e(pedra.valor).palavras}.`,
      `Ponto forte: ${e(pedra.valor).luz[0].toLowerCase()}. Ponto de atenção: ${e(pedra.valor).sombra[0].toLowerCase()}.`] },
    { rotulo: `Primeira vogal: ${vogal.letra}`, numero: String(vogal.valor), texto: [
      `A primeira vogal revela a reação espontânea da sua alma, aquilo que você sente antes de pensar. Com valor ${vogal.valor}, a sua primeira resposta interior é de ${e(vogal.valor).palavras}.`,
      `O QUE FAZER: ${e(vogal.valor).conselho[0]}.`] },
    { rotulo: `Letra de conclusão: ${fecho.letra}`, numero: String(fecho.valor), texto: [
      `A última letra do primeiro nome mostra como você conclui o que começa. Com valor ${fecho.valor}, você tende a finalizar com ${e(fecho.valor).palavras}.`,
      `Ponto de atenção ao terminar ciclos: ${e(fecho.valor).sombra[1].toLowerCase()}.`] },
    { rotulo: 'Frequência dos números no nome', novaPagina: true, texto: Array.from({ length: 9 }, (_, i) => {
      const n = i + 1, q = todas.filter(l => l.valor === n).length
      return `Número ${n} (${e(n).titulo}): ${q} vez(es) — ${q === 0 ? 'ausente (lição cármica)' : q >= 4 ? 'em excesso (tendência oculta)' : q === 1 ? 'presença discreta' : 'presença equilibrada'}.`
    }) },
  ]
}

const ORDEM_SIGNOS = ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes']
function relSigno(a: string, b: string): { tipo: string; texto: string } {
  const d = Math.abs(ORDEM_SIGNOS.indexOf(a) - ORDEM_SIGNOS.indexOf(b)), dist = Math.min(d, 12 - d)
  const ea = SIGNOS_INFO[a].elemento, eb = SIGNOS_INFO[b].elemento
  const T: Record<number, [string, string]> = {
    0: ['Espelho', `Duas pessoas de ${a} se reconhecem de imediato: mesmos desejos, mesmo ritmo. A afinidade é grande, mas os defeitos também se repetem; é preciso que cada um respeite o espaço do outro.`],
    1: ['Vizinhos', `${a} e ${b} são signos vizinhos, com energias bem diferentes (${ea} e ${eb}). Um aprende muito com o outro, desde que haja paciência com o jeito oposto de agir.`],
    2: ['Harmonia', `${a} (${ea}) e ${b} (${eb}) formam um sextil: elementos que se ajudam. A convivência tende a ser leve, estimulante e cheia de trocas.`],
    3: ['Desafio', `${a} (${ea}) e ${b} (${eb}) formam uma quadratura: atração com atrito. A relação pede diálogo e negociação, mas pode gerar muito crescimento.`],
    4: ['Grande afinidade', `${a} e ${b} são do mesmo elemento (${ea}): formam um trígono, uma das combinações mais naturais do zodíaco. Há entendimento quase sem palavras.`],
    5: ['Ajuste', `${a} (${ea}) e ${b} (${eb}) formam um quincúncio: energias que não se entendem com facilidade. Funciona quando ambos se esforçam para compreender as diferenças.`],
    6: ['Opostos complementares', `${a} e ${b} são opostos no zodíaco: o que falta em um sobra no outro. A atração costuma ser forte, e o equilíbrio vem quando cada um aceita aprender com o outro.`],
  }
  const [tipo, texto] = T[dist]
  return { tipo, texto }
}

const FASE_CICLO = [
  'Ciclo formativo (juventude): a fase em que você descobre quem é, sob forte influência da família e do ambiente.',
  'Ciclo produtivo (vida adulta): a fase de trabalho, conquistas e construção da sua vida.',
  'Ciclo da colheita (maturidade): a fase de colher o que plantou e de viver a sua sabedoria.',
]

export function montarConteudo(nome: string, nascimento: string, ov: Overrides = {}, hoje?: string): Conteudo {
  const m = mapaPessoal(nome, nascimento, hoje)
  const signo = signoSolar(nascimento)
  const si = SIGNOS_INFO[signo]
  const dec = decanato(signo, nascimento)
  const amor = HARMONIA_CONJUGAL[reduzir(m.missao.valor)]
  const harm = HARMONICOS[reduzir(m.diaNascimento)]
  const dias = diasFavoraveis(m.diaNascimento)
  const cor = m.expressao.valor === 11 || m.expressao.valor === 22 ? m.expressao.valor : reduzir(m.expressao.valor)
  const anoCal = Number((hoje || new Date().toISOString()).slice(0, 4))
  const pal = (n: number) => essencia(n).palavras
  const sec = (id: string, blocos: Bloco[], titulo?: string, intro?: string): Secao => ({ id, titulo: titulo || SECOES[id].titulo, classico: titulo ? undefined : SECOES[id]?.classico, intro: intro ?? SECOES[id].intro, blocos })
  const txt = (cat: string, n: number) => texto(cat, n, ov, reduzir(n))
  const U = new Set<string>()
  const periodo = (c: { inicio: number; fim: number | null }) => c.fim ? `${c.inicio} a ${c.fim} (dos ${c.inicio - m.nascimento.ano} aos ${c.fim - m.nascimento.ano} anos)` : `de ${c.inicio} em diante (a partir dos ${c.inicio - m.nascimento.ano} anos)`

  const secoes: Secao[] = [
    sec('signo', [
      { rotulo: `${si.glifo} ${signo} · ${si.periodo}`, numero: si.elemento, texto: [ov[`signo:${signo}`] || si.personalidade,
        `Elemento ${si.elemento} · modalidade ${si.modalidade} · regente ${si.regente} · símbolo: ${si.simbolo}.`] },
      { rotulo: 'Seu decanato', numero: `${dec + 1}º`, texto: [si.decanatos[dec]] },
      { rotulo: `${signo} no amor`, novaPagina: true, texto: [si.amor] },
      { rotulo: `${signo} na carreira`, novaPagina: true, texto: [si.carreira] },
      { rotulo: `${signo} e o dinheiro`, texto: [si.dinheiro] },
      { rotulo: 'Corpo e bem-estar', novaPagina: true, texto: [si.bemEstar] },
      { rotulo: 'Sombra e conselho do signo', texto: [si.sombra, `O QUE FAZER: ${si.conselho}`] },
      { rotulo: 'Seus amuletos', texto: [`Pedras: ${si.pedra}. Cor do signo: ${si.cor}. Dia da semana mais favorável: ${si.dia}. Signos com mais afinidade: ${si.compativeis.join(', ')}.`] },
      { rotulo: 'O seu signo e os seus números', novaPagina: true, texto: signoENumeros(signo, m.destino.valor, m.motivacao.valor, m.expressao.valor, pal) },
    ]),
    sec('compatSignos', Object.keys(SIGNOS_INFO).map((o, i) => ({ rotulo: `${si.glifo} ${signo} + ${SIGNOS_INFO[o].glifo} ${o}`, numero: relSigno(signo, o).tipo, texto: [relSigno(signo, o).texto], novaPagina: i === 6 })),
      `${signo} e os 12 signos`, `Como a energia de ${signo} costuma se combinar com cada signo do zodíaco, no amor, na amizade e no trabalho. Lembre-se: o mapa completo de cada pessoa sempre traz nuances.`),
    sec('motivacao', [blocoNumero('motivacao', m.motivacao.valor, ov, U, 'Seu Desejo da Alma (Motivação)', n2(m.motivacao.bruto, m.motivacao.valor))]),
    sec('impressao', [blocoNumero('impressao', m.impressao.valor, ov, U, 'Sua Imagem no Mundo (Impressão)', n2(m.impressao.bruto, m.impressao.valor))]),
    sec('expressao', [blocoNumero('expressao', m.expressao.valor, ov, U, 'Seus Talentos Naturais (Expressão)', n2(m.expressao.bruto, m.expressao.valor))]),
    sec('letras', blocosLetras(nome), 'O seu nome letra a letra', 'Cada letra do seu nome tem um valor na numerologia cabalística. Algumas posições têm um significado especial: a primeira letra (a pedra fundamental), a primeira vogal (a reação da alma) e a última letra do primeiro nome (a forma de concluir).'),
    sec('diaNascimento', [{ ...blocoNumero('diaNascimento', m.diaNascimento, ov, U, 'O dom do dia em que você nasceu', String(m.diaNascimento)), luz: undefined, sombra: undefined, conselho: undefined }]),
    sec('destino', [blocoNumero('destino', m.destino.valor, ov, U, 'Seu Caminho de Vida (Destino)', n2(m.destino.bruto, m.destino.valor),
      `Com o Sol em ${signo}, esse caminho ganha o tom do elemento ${si.elemento.toLowerCase()}: ${ELEMENTO_DESTINO[si.elemento]}`)]),
    sec('missao', [blocoNumero('missao', m.missao.valor, ov, U, 'Seu Propósito da Alma (Missão)', n2(m.missao.bruto, m.missao.valor))]),
    sec('talentoOculto', [{ ...blocoNumero('talentoOculto', m.talentoOculto.valor, ov, U, 'Seu Dom Adormecido (Talento Oculto)', String(m.talentoOculto.valor)), sombra: undefined }]),
    sec('numeroPsiquico', [{ ...blocoNumero('numeroPsiquico', m.numeroPsiquico.valor, ov, U, 'Seu Eu Íntimo (Número Psíquico)', String(m.numeroPsiquico.valor), `O número ${m.numeroPsiquico.valor} é o Eu Íntimo de quem nasce nos dias ${[1, 2, 3, 4].map(k => m.numeroPsiquico.valor + 9 * (k - 1)).filter(d => d <= 31).join(', ')} de qualquer mês. Pessoas que nasceram nesses dias costumam se reconhecer nessa forma de sentir.`), luz: undefined, sombra: undefined }]),
    sec('licoesCarmicas', m.licoesCarmicas.length
      ? m.licoesCarmicas.map(n => { const x = separarFazer(txt('licoesCarmicas', n)); return { rotulo: `Aprendizado da Alma ${n} (lição cármica)`, numero: String(n), texto: x.texto, plano: { intro: x.fazer, partes: [{ titulo: 'Exercícios práticos para esta lição', itens: PLANOS_CARMA[`licao:${n}`] }] } } })
      : [{ rotulo: 'Suas Lições Cármicas', numero: '—', texto: ['Seu nome contém todos os números de 1 a 9: você não tem lições cármicas pendentes. Isso indica uma bagagem ampla de experiências e facilidade para lidar com situações variadas.'] }]),
    sec('dividasCarmicas', m.dividasCarmicas.length
      ? m.dividasCarmicas.map(n => { const x = separarFazer(txt('dividasCarmicas', n)); return { rotulo: `Padrão a curar ${n} (dívida cármica)`, numero: String(n), texto: x.texto, plano: { intro: x.fazer, partes: [{ titulo: 'Como transformar este padrão', itens: PLANOS_CARMA[`divida:${n}`] }] } } })
      : [{ rotulo: 'Suas Dívidas Cármicas', numero: '—', texto: ['Nenhuma dívida cármica aparece nos seus números principais. Seu caminho está livre desses padrões repetitivos, o que facilita a evolução.'] }]),
    sec('tendenciasOcultas', m.tendenciasOcultas.length
      ? m.tendenciasOcultas.map((n, i) => ({ novaPagina: i > 0, rotulo: `Energia em excesso: número ${n}`, numero: `${m.frequencia[n] || ''}x`.replace(/^x$/, String(n)), texto: txt('tendenciasOcultas', n), plano: PLANOS[n] ? { partes: [{ titulo: 'Como equilibrar esta energia', itens: PLANOS[n].rotina }, { titulo: 'Se perceber o exagero', texto: PLANOS[n].travar }] } : undefined }))
      : [{ rotulo: 'Suas Tendências Ocultas', numero: '—', texto: ['Nenhum número aparece em excesso no seu nome: suas energias são bem distribuídas, sem tendências exageradas.'] }]),
    sec('respostaSubconsciente', [{ rotulo: 'Sua Reação Instintiva', numero: String(m.respostaSubconsciente), texto: txt('respostaSubconsciente', m.respostaSubconsciente), plano: { partes: [{ titulo: 'Quando algo inesperado acontecer', itens: ['Pare e respire fundo três vezes antes de responder ou decidir.', 'Pergunte a si mesmo(a): "o que eu sei de verdade sobre isso agora?".', 'Se puder, adie a decisão importante por algumas horas.', 'Converse com alguém de confiança antes de agir.'] }] } }]),
    sec('cores', [{ rotulo: 'Suas cores favoráveis', numero: String(cor), texto: [`${ov[`cores:${cor}`] || CORES[cor]}.`,
      `Use essas cores em roupas, acessórios, na decoração e na sua identidade visual. A cor do seu signo (${si.cor.toLowerCase()}) também reforça a sua energia natural.`] }]),
    sec('dias', [{ rotulo: 'Seus dias favoráveis', numero: dias.join(', '), texto: ['Use esses dias para assinar contratos, fazer entrevistas, iniciar projetos e tomar decisões importantes.',
      `Para ${signo}, o dia da semana mais favorável é ${si.dia.toLowerCase()}. Quando um dia favorável cair nesse dia da semana, a energia fica ainda mais forte.`] }]),
    sec('anoPessoal', [blocoTexto('anoPessoal', m.anoPessoal, ov, U, { rotulo: `Energia do seu ano (${anoCal})`, numero: String(m.anoPessoal) })]),
    sec('horoscopo', [{ rotulo: `${si.glifo} ${signo} em ${anoCal}`, numero: `Ano ${m.anoPessoal}`, texto: previsaoAno(signo, m.anoPessoal, anoCal) }],
      'Horóscopo do seu ano', 'A previsão do seu ano une o seu signo solar à energia do seu Ano Pessoal na numerologia.'),
    sec('proximosAnos', Array.from({ length: 9 }, (_, i) => {
      const ano = anoCal + i, ap = reduzir(m.nascimento.dia + m.nascimento.mes + somaDig(ano))
      return { rotulo: `${ano}${i === 0 ? ' (ano atual)' : ''} · a partir do aniversário`, numero: `Ano ${ap}`, texto: txt('anoPessoal', ap), novaPagina: i > 0 && i % 3 === 0 }
    }), 'Seus próximos 9 anos', 'O Ano Pessoal muda a cada aniversário e segue um ciclo de 9 anos. Conhecer a energia dos próximos anos ajuda a planejar mudanças, investimentos, relacionamentos e projetos no momento certo.'),
    sec('mesAMes', proximosMeses(m, hoje).map((x, i) => ({ rotulo: x.rotulo, numero: `Mês ${x.mes}`,
      texto: [...txt('mesPessoal', x.mes), `${si.glifo} Dica para ${signo}: ${DICA_ELEMENTO[si.elemento][x.mes - 1]}`], novaPagina: i > 0 && i % 6 === 0 })),
      'Previsão mês a mês', `A energia de cada mês dos próximos 12 meses, combinando o seu Mês Pessoal com o elemento do seu signo (${si.elemento}).`),
    sec('mesPessoal', [{ rotulo: 'Energia do seu mês', numero: String(m.mesPessoal), texto: txt('mesPessoal', m.mesPessoal) }]),
    sec('diaPessoal', [{ rotulo: 'Energia do dia (data do mapa)', numero: String(m.diaPessoal), texto: txt('diaPessoal', m.diaPessoal) }]),
    sec('ciclos', m.ciclos.map((c, i) => ({ rotulo: `${['Primeiro', 'Segundo', 'Terceiro'][i]} estação da vida · ${periodo(c)}`,
      numero: String(c.numero), destaque: FASE_CICLO[i], texto: [...txt('ciclo', c.numero), ...(i === 0 && CICLO_INFANCIA[c.numero] ? [CICLO_INFANCIA[c.numero]] : []), ...(i === 2 && CICLO_MATURIDADE[c.numero] ? [CICLO_MATURIDADE[c.numero]] : [])], plano: montarPlano('ciclo', c.numero, U) }))),
    sec('desafios', [
      { rotulo: 'Primeira prova (até a maturidade)', numero: String(m.desafios.primeiro), texto: txt('desafio', m.desafios.primeiro), plano: montarPlano('desafio', m.desafios.primeiro , U) },
      { novaPagina: true, rotulo: 'Segunda prova (da maturidade em diante)', numero: String(m.desafios.segundo), texto: txt('desafio', m.desafios.segundo), plano: montarPlano('desafio', m.desafios.segundo , U) },
      { novaPagina: true, rotulo: 'Prova principal (a vida toda)', numero: String(m.desafios.principal), texto: txt('desafio', m.desafios.principal), plano: montarPlano('desafio', m.desafios.principal , U) },
    ]),
    sec('momentos', m.momentos.map((c, i) => ({ rotulo: `${['Primeiro', 'Segundo', 'Terceiro', 'Quarto'][i]} portal da vida · ${periodo(c)}`,
      numero: String(c.numero), texto: txt('momento', c.numero), plano: montarPlano('momento', c.numero, U) }))),
    sec('harmoniaConjugal', [
      { rotulo: 'Você no amor', numero: String(reduzir(m.missao.valor)), texto: [...txt('harmoniaConjugal', reduzir(m.missao.valor)), `Pelo seu signo: ${si.amor}`], plano: montarPlano('harmoniaConjugal', reduzir(m.missao.valor), U) },
      { novaPagina: true, rotulo: 'Seus números no amor', texto: [
        `Vibra com: ${lista(amor.vibra)} — paixão intensa, que precisa amadurecer em compreensão.`,
        `Atrai: ${lista(amor.atrai)} — as combinações mais harmoniosas, com afinidade natural.`,
        `Oposto a: ${lista(amor.oposto)} — diferenças que exigem diálogo e paciência.`,
        ...(amor.muitoOposto.length ? [`Muito oposto a: ${lista(amor.muitoOposto)} — relação desafiadora, de muito aprendizado.`] : []),
        `Passivo com: ${lista(amor.passivo)} — relações tranquilas, que dependem de esforço dos dois para não esfriar.`,
        `Números harmônicos para você: ${lista(harm.harmoniza)} · neutro: ${lista(harm.neutro)} · dissonante: ${lista(harm.dissonante)}.`,
        `Para descobrir a combinação com alguém, compare o número de Missão dessa pessoa com a tabela acima. Signos com mais afinidade com ${signo}: ${si.compativeis.join(', ')}.`,
      ] },
    ]),
    sec('arcanos', [blocoArcano(m.arcano.numeroAtual, ov, { rotulo: `Arcano atual: ${m.arcano.numeroAtual} (${m.arcano.atual}º de ${m.arcano.quantidade})`, numero: String(m.arcano.numeroAtual),
      texto: [`Cada arcano do seu nome rege um período de ${duracaoTxt(m.arcano.duracaoExata)}. O atual vai de ${fmtData(m.arcano.inicio)} a ${fmtData(m.arcano.fim)}.`] })]),
    sec('arcanosVida', m.triangulos.vida.arcanos.map((n, i) => {
      const ini = dataArc(nascimento, i * m.arcano.duracaoExata), fim = dataArc(nascimento, (i + 1) * m.arcano.duracaoExata)
      return { rotulo: `${i + 1}º arcano · ${fmtData(ini)} a ${fmtData(fim)}${i + 1 === m.arcano.atual ? ' · ATUAL' : ''}`, numero: String(n),
        ...(i + 1 < m.arcano.atual ? { texto: ov[`arcano:${n}`] ? ov[`arcano:${n}`].split(/\n{2,}/) : [textoArcano(n)[0], ARCANOS[arcanoBase(n)].texto, `Esta fase já passou. Olhando para trás, ela costuma ter trazido: ${ARCANOS[arcanoBase(n)].periodo.split('. ')[0].toLowerCase()}.`] } : blocoArcano(n, ov, {})) }
    }), 'Seus arcanos ao longo da vida', `O seu nome forma ${m.arcano.quantidade} arcanos. Cada um rege um período de ${duracaoTxt(m.arcano.duracaoExata)} da sua vida, do nascimento até os 90 anos. Veja a energia de cada fase: as que já passaram ajudam a entender a sua história; as próximas mostram o que vem pela frente.`),
    sec('triangulos', (['vida', 'pessoal', 'social', 'destino'] as const).map(k => {
      const t = m.triangulos[k]
      const nomeT = { vida: 'Pirâmide da Vida', pessoal: 'Pirâmide Pessoal', social: 'Pirâmide Social', destino: 'Pirâmide do Destino' }[k]
      const sobre = { vida: 'Mostra a sua vida de forma geral: saúde, trabalho, relações e caminhos.', pessoal: 'Mostra a sua vida íntima: emoções, comportamentos e a relação consigo mesmo(a).', social: 'Mostra a sua relação com o mundo: amigos, colegas, clientes e a vida social.', destino: 'Mostra o caminho do seu destino e as grandes escolhas que moldam a sua jornada.' }[k]
      const digs = [...new Set(t.sequencias.map(x => x.digito))]
      return {
        rotulo: nomeT, novaPagina: k !== 'vida', triangulo: { nome: nomeT, linhas: t.linhas, marcas: marcarSequencias(t) },
        texto: [sobre, ...(digs.length ? digs.flatMap(d => texto('sequencia', d, ov)) : ['Nenhuma sequência negativa neste triângulo: a energia flui bem nesta área da sua vida.'])],
      }
    })),
  ]

  const frase1 = (cat: string, n: number) => {
    const p = separarFazer(texto(cat, n, ov, reduzir(n))).texto[0] || essencia(n).essencia
    const limpo = p.replace(/^\([^)]*\)\s*/, '').replace(/^(Ciclo|Momento) regido pelo \d+:\s*/, '')
    const fr = limpo.match(/[^.!?]+[.!?]/g) || [limpo]
    return (fr[0].length < 60 && fr[1] ? fr[0] + fr[1] : fr[0]).trim().replace(/^./, x => x.toUpperCase())
  }
  const apr = (n: number) => { const e = essencia(n); return `Cuidado com: ${e.sombra[0].toLowerCase()}. Caminho: ${e.conselho[0].charAt(0).toLowerCase() + e.conselho[0].slice(1)}.` }
  const L = (grupo: string, item: string, valor: string, cat: string, n: number): LinhaTabela => ({ grupo, item, valor, sentido: frase1(cat, n), aprendizado: apr(n) })
  const tabela: LinhaTabela[] = [
    { grupo: 'Astrologia', item: 'Signo solar', valor: `${signo} (${dec + 1}º decanato)`, sentido: si.personalidade.match(/^[^.]+\./)?.[0] || '', aprendizado: si.conselho },
    L('Números do nome', 'Desejo da Alma (Motivação)', n2(m.motivacao.bruto, m.motivacao.valor), 'motivacao', m.motivacao.valor),
    L('Números do nome', 'Imagem no Mundo (Impressão)', n2(m.impressao.bruto, m.impressao.valor), 'impressao', m.impressao.valor),
    L('Números do nome', 'Talentos Naturais (Expressão)', n2(m.expressao.bruto, m.expressao.valor), 'expressao', m.expressao.valor),
    L('Números da data', 'Dom do seu Dia (dia de nascimento)', String(m.diaNascimento), 'diaNascimento', m.diaNascimento),
    L('Números da data', 'Caminho de Vida (Destino)', n2(m.destino.bruto, m.destino.valor), 'destino', m.destino.valor),
    L('Números da data', 'Propósito da Alma (Missão)', n2(m.missao.bruto, m.missao.valor), 'missao', m.missao.valor),
    L('Interior', 'Eu Íntimo (número psíquico)', String(m.numeroPsiquico.valor), 'numeroPsiquico', m.numeroPsiquico.valor),
    L('Interior', 'Dom Adormecido (talento oculto)', String(m.talentoOculto.valor), 'talentoOculto', m.talentoOculto.valor),
    { grupo: 'Interior', item: 'Reação Instintiva', valor: String(m.respostaSubconsciente), sentido: frase1('respostaSubconsciente', m.respostaSubconsciente), aprendizado: 'Diante do inesperado, respire antes de agir: a primeira reação nem sempre é a melhor.' },
    ...(m.licoesCarmicas.length ? m.licoesCarmicas.map(n => ({ grupo: 'Carma', item: `Aprendizado da Alma ${n} (lição cármica)`, valor: String(n), sentido: frase1('licoesCarmicas', n).replace(/^Lição cármica \d \([^)]*\):\s*/, ''), aprendizado: PLANOS_CARMA[`licao:${n}`]?.[0] }))
      : [{ grupo: 'Carma', item: 'Lições cármicas', valor: '—', sentido: 'Seu nome tem todos os números: nenhuma lição pendente.', aprendizado: 'Use a sua bagagem ampla para ajudar outras pessoas.' }]),
    ...(m.dividasCarmicas.length ? m.dividasCarmicas.map(n => ({ grupo: 'Carma', item: `Padrão a curar ${n} (dívida cármica)`, valor: String(n), sentido: frase1('dividasCarmicas', n).replace(/^Dívida cármica \d+:\s*/, ''), aprendizado: PLANOS_CARMA[`divida:${n}`]?.[0] }))
      : [{ grupo: 'Carma', item: 'Dívidas cármicas', valor: '—', sentido: 'Nenhuma dívida cármica nos números principais.', aprendizado: 'Seu caminho está livre desses padrões: aproveite.' }]),
    ...m.tendenciasOcultas.map(n => ({ grupo: 'Carma', item: `Energia em excesso: número ${n}`, valor: `${m.frequencia[n] || ''}x`, sentido: frase1('tendenciasOcultas', n).replace(/^O número \d aparece em excesso no seu nome\.\s*/, ''), aprendizado: (texto('tendenciasOcultas', n, ov)[0] || '').match(/O caminho é [^.]+\./)?.[0] || apr(n) })),
    { ...L('Tempo', `Ano pessoal (${anoCal})`, String(m.anoPessoal), 'anoPessoal', m.anoPessoal), aprendizado: PLANOS[m.anoPessoal]?.semana[0] },
    { grupo: 'Tempo', item: 'Mês pessoal', valor: String(m.mesPessoal), sentido: frase1('mesPessoal', m.mesPessoal), aprendizado: (texto('mesPessoal', m.mesPessoal, ov)[0] || '').split('. ').slice(1).join('. ') },
    ...m.ciclos.map((c, i) => ({ ...L('Estações da Vida', `${i + 1}ª estação (${periodo(c)})`, String(c.numero), 'ciclo', c.numero), sentido: frase1('ciclo', c.numero).replace(/^Ciclo regido pelo \d+:\s*/, '') })),
    ...([['1ª prova', m.desafios.primeiro], ['2ª prova', m.desafios.segundo], ['Prova principal', m.desafios.principal]] as [string, number][]).map(([it, n]) => ({ grupo: 'Provas de Crescimento', item: it, valor: String(n), sentido: frase1('desafio', n).replace(/^Desafio \d:\s*/, ''), aprendizado: PLANOS[n]?.travar || 'Escolha um caminho e assuma a responsabilidade por ele.' })),
    ...m.momentos.map((c, i) => ({ ...L('Portais da Vida', `${i + 1}º portal (${periodo(c)})`, String(c.numero), 'momento', c.numero), sentido: frase1('momento', c.numero).replace(/^Momento regido pelo \d+:\s*/, '') })),
    { grupo: 'Numerologia do Amor', item: 'Combinações no amor', valor: `vibra ${lista(amor.vibra)} · atrai ${lista(amor.atrai)}`, sentido: `${frase1('harmoniaConjugal', reduzir(m.missao.valor))} Opostos: ${lista(amor.oposto)}. Passivos: ${lista(amor.passivo)}.`, aprendizado: PLANOS[reduzir(m.missao.valor)]?.amor },
    { grupo: 'Arcanos', item: 'Arcano atual', valor: String(m.arcano.numeroAtual), sentido: `${textoArcano(m.arcano.numeroAtual)[0]} ${ARCANOS[arcanoBase(m.arcano.numeroAtual)].periodo.split('. ')[0]}.`, aprendizado: `Vigora até ${fmtData(m.arcano.fim)}. ${textoArcano(m.arcano.numeroAtual)[3].replace(/^O QUE FAZER:\s*/, '')}` },
    { grupo: 'Pirâmides do Nome', item: 'Bloqueios do nome', valor: [...new Set((['vida', 'pessoal', 'social', 'destino'] as const).flatMap(k => m.triangulos[k].sequencias.map(x => String(x.digito).repeat(3))))].join(', ') || '—',
      sentido: (() => { const d = [...new Set((['vida', 'pessoal', 'social', 'destino'] as const).flatMap(k => m.triangulos[k].sequencias.map(x => x.digito)))]; return d.length ? d.map(x => (texto('sequencia', x, ov)[0] || '').split('.').slice(0, 2).join('.') + '.').join(' ') : 'Nenhum bloqueio: a energia flui bem.' })(),
      aprendizado: 'Leia a seção dos triângulos: ela mostra em qual área cada bloqueio aparece e como trabalhar.' },
    { grupo: 'Harmonia', item: 'Cores favoráveis', valor: String(cor), sentido: `${CORES[cor]}.`, aprendizado: 'Use em roupas, ambientes e na sua marca pessoal, principalmente em dias importantes.' },
    { grupo: 'Harmonia', item: 'Dias favoráveis', valor: dias.join(', '), sentido: 'Dias do mês que vibram a seu favor.', aprendizado: 'Marque contratos, entrevistas, viagens e começos nesses dias.' },
  ]

  return {
    nome, nascimento, signo,
    resumo: [
      { rotulo: 'Data de nascimento', valor: fmtData(nascimento) }, { rotulo: 'Signo', valor: `${si.glifo} ${signo}` },
      { rotulo: 'Motivação', valor: n2(m.motivacao.bruto, m.motivacao.valor) }, { rotulo: 'Impressão', valor: n2(m.impressao.bruto, m.impressao.valor) },
      { rotulo: 'Expressão', valor: n2(m.expressao.bruto, m.expressao.valor) }, { rotulo: 'Destino', valor: n2(m.destino.bruto, m.destino.valor) },
      { rotulo: 'Missão', valor: n2(m.missao.bruto, m.missao.valor) }, { rotulo: 'Talento oculto', valor: String(m.talentoOculto.valor) },
      { rotulo: 'Número psíquico', valor: String(m.numeroPsiquico.valor) }, { rotulo: 'Resposta subconsciente', valor: String(m.respostaSubconsciente) },
      { rotulo: 'Lições cármicas', valor: lista(m.licoesCarmicas) }, { rotulo: 'Dívidas cármicas', valor: lista(m.dividasCarmicas) },
      { rotulo: 'Tendências ocultas', valor: lista(m.tendenciasOcultas) }, { rotulo: 'Ano pessoal', valor: String(m.anoPessoal) },
      { rotulo: 'Dias favoráveis', valor: dias.join(' - ') }, { rotulo: 'Cores', valor: CORES[cor] },
    ],
    secoes, tabela, mapa: m,
  }
}

const ELEMENTO_DESTINO: Record<string, string> = {
  Fogo: 'você tende a viver o seu destino com entusiasmo, coragem e vontade de agir rápido.',
  Terra: 'você tende a viver o seu destino de forma prática, construindo passo a passo e com os pés no chão.',
  Ar: 'você tende a viver o seu destino pela mente, pelas ideias, pelos estudos e pelas conexões com pessoas.',
  'Água': 'você tende a viver o seu destino pelo coração, guiado(a) pela intuição e pelas emoções.',
}

function textoArcano(n: number): string[] {
  const base = arcanoBase(n), a = ARCANOS[base]
  return [
    `${n > 22 ? `O arcano ${n} se reduz a ${base} (${String(n).split('').join(' + ')} = ${base}): ` : `O arcano ${n} é `}${a.nome}, ${a.simbolo}.`,
    a.texto,
    a.periodo,
    `O QUE FAZER: ${a.fazer.join(' ')}`,
  ]
}

function blocoArcano(n: number, ov: Overrides, extra: Partial<Bloco>): Bloco {
  if (ov[`arcano:${n}`]) return { ...extra, texto: [...(extra.texto || []), ...ov[`arcano:${n}`].split(/\n{2,}/)] }
  const base = arcanoBase(n), a = ARCANOS[base], t = textoArcano(n)
  return { ...extra, destaque: `${a.nome} · ${a.simbolo}`, texto: [...(extra.texto || []), t[0], a.texto, a.periodo], plano: { partes: [{ titulo: 'Como aproveitar este arcano', itens: a.fazer }] } }
}

/* ---------------- Mapa do casal ---------------- */

const ELEMENTO_COMBINA: Record<string, string[]> = { Fogo: ['Fogo', 'Ar'], Ar: ['Ar', 'Fogo'], Terra: ['Terra', 'Água'], 'Água': ['Água', 'Terra'] }

export function relacaoAmor(a: number, b: number): { tipo: string; texto: string } {
  const t = HARMONIA_CONJUGAL[reduzir(a)]
  const rb = reduzir(b)
  if (t.vibra.includes(rb)) return { tipo: 'Vibração', texto: 'Vocês vibram juntos: atração forte e paixão intensa. O desafio é transformar essa chama em parceria madura, cuidando do ciúme e da impulsividade.' }
  if (t.atrai.includes(rb)) return { tipo: 'Atração', texto: 'Vocês se atraem naturalmente: é uma das combinações mais harmoniosas, com afinidade, carinho e facilidade de entendimento.' }
  if (t.muitoOposto.includes(rb)) return { tipo: 'Muito opostos', texto: 'Energias muito diferentes: a relação pede muito diálogo, respeito e vontade dos dois. Quando funciona, é uma escola de crescimento.' }
  if (t.oposto.includes(rb)) return { tipo: 'Opostos', texto: 'Vocês têm ritmos e prioridades diferentes. Isso gera atritos, mas também complementaridade, se houver paciência e conversa.' }
  if (t.passivo.includes(rb)) return { tipo: 'Passiva', texto: 'Relação tranquila e estável, que pode esfriar se cair na rotina. Surpresas, projetos em comum e atenção mantêm a chama acesa.' }
  return { tipo: 'Neutra', texto: 'Uma combinação neutra: o sucesso depende mais das escolhas do casal do que dos números.' }
}

export function montarCasal(nomeA: string, nascA: string, nomeB: string, nascB: string, ov: Overrides = {}, hoje?: string): Conteudo {
  const A = montarConteudo(nomeA, nascA, ov, hoje), B = montarConteudo(nomeB, nascB, ov, hoje)
  const ma = A.mapa, mb = B.mapa
  const sa = SIGNOS_INFO[A.signo], sb = SIGNOS_INFO[B.signo]
  const relMissao = relacaoAmor(ma.missao.valor, mb.missao.valor)
  const relDestino = relacaoAmor(ma.destino.valor, mb.destino.valor)
  const elementos = ELEMENTO_COMBINA[sa.elemento].includes(sb.elemento)
    ? `${A.signo} (${sa.elemento}) e ${B.signo} (${sb.elemento}) são elementos que se alimentam: há entendimento natural no jeito de sentir e agir.`
    : `${A.signo} (${sa.elemento}) e ${B.signo} (${sb.elemento}) são elementos diferentes: um ensina ao outro o que falta, desde que haja respeito ao ritmo de cada um.`
  const pa = nomeA.split(' ')[0], pb = nomeB.split(' ')[0]
  const pessoa = (c: Conteudo, quem: string): Secao => ({
    id: 'pessoa-' + quem.toLowerCase(), titulo: `O mapa de ${quem}`, intro: `Os números principais de ${c.nome}, nascido(a) em ${c.resumo[0].valor} (${c.signo}).`,
    blocos: c.secoes.filter(s => ['signo', 'motivacao', 'impressao', 'expressao', 'diaNascimento', 'destino', 'missao', 'licoesCarmicas', 'harmoniaConjugal', 'anoPessoal', 'horoscopo'].includes(s.id)).map((s, i) => ({ ...s.blocos[0], rotulo: s.titulo, novaPagina: i > 0 && i % 2 === 0 })),
  })
  const secoes: Secao[] = [
    { id: 'compatibilidade', titulo: 'A compatibilidade de vocês', intro: SECOES.harmoniaConjugal.intro, blocos: [
      { rotulo: `Harmonia conjugal (Missão ${ma.missao.valor} × ${mb.missao.valor})`, numero: relMissao.tipo, texto: [relMissao.texto] },
      { rotulo: `Caminhos de vida (Destino ${ma.destino.valor} × ${mb.destino.valor})`, numero: relDestino.tipo, texto: [relDestino.texto] },
      { rotulo: 'O que move cada um (Motivação)', numero: `${ma.motivacao.valor} × ${mb.motivacao.valor}`, texto: [
        `${pa} é movido(a) por ${essencia(ma.motivacao.valor).palavras}; ${pb}, por ${essencia(mb.motivacao.valor).palavras}. Entender o que é importante para o outro evita muitos desencontros.`] },
      { rotulo: 'Os signos', numero: `${A.signo} × ${B.signo}`, texto: [elementos,
        sa.compativeis.includes(B.signo) ? `${B.signo} está entre os signos de maior afinidade com ${A.signo}.` : `${B.signo} não está entre os signos de afinidade natural de ${A.signo}, o que pede mais paciência e escuta.`,
        `${pa} ama assim: ${sa.amor}`, `${pb} ama assim: ${sb.amor}`] },
      { rotulo: `O amor de ${pa} (Harmonia ${reduzir(ma.missao.valor)})`, texto: texto('harmoniaConjugal', reduzir(ma.missao.valor), ov) },
      { rotulo: `O amor de ${pb} (Harmonia ${reduzir(mb.missao.valor)})`, texto: texto('harmoniaConjugal', reduzir(mb.missao.valor), ov) },
      { rotulo: 'O momento de cada um (Ano pessoal)', numero: `${ma.anoPessoal} × ${mb.anoPessoal}`, texto: [
        `${pa} vive um ano pessoal ${ma.anoPessoal} (${essencia(ma.anoPessoal).palavras}); ${pb} vive um ano pessoal ${mb.anoPessoal} (${essencia(mb.anoPessoal).palavras}). Respeitar o momento do outro evita cobranças e desencontros.`] },
      { rotulo: 'Conselho para o casal', texto: [
        `${pa}: ${essencia(ma.expressao.valor).conselho[0]}. ${pb}: ${essencia(mb.expressao.valor).conselho[0]}.`,
        'Nenhum número define sozinho o destino de uma relação: o amor é construído nas escolhas de cada dia.'] },
    ] },
    pessoa(A, pa), pessoa(B, pb),
  ]
  return {
    nome: `${nomeA} & ${nomeB}`, nascimento: nascA, signo: `${A.signo} & ${B.signo}`,
    resumo: [
      { rotulo: 'Datas', valor: `${A.resumo[0].valor} · ${B.resumo[0].valor}` },
      { rotulo: 'Signos', valor: `${A.signo} & ${B.signo}` },
      { rotulo: 'Harmonia conjugal', valor: relMissao.tipo }, { rotulo: 'Destinos', valor: relDestino.tipo },
      { rotulo: `Missão de ${pa}`, valor: String(ma.missao.valor) }, { rotulo: `Missão de ${pb}`, valor: String(mb.missao.valor) },
    ],
    secoes, tabela: [...A.tabela.map(l => ({ ...l, grupo: pa + ' · ' + l.grupo })), ...B.tabela.map(l => ({ ...l, grupo: pb + ' · ' + l.grupo }))], mapa: ma,
  }
}
