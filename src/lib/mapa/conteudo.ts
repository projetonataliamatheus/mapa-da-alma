// Monta o conteúdo do mapa (seções, números e textos), usado pelo link ao vivo e pelo PDF.
import { mapaPessoal, signoSolar, reduzir, type MapaPessoal } from '../numerologia/motor.ts'
import { HARMONIA_CONJUGAL, HARMONICOS, diasFavoraveis } from '../numerologia/tabelas.ts'
import { ESSENCIAS, SECOES, LICOES, DIVIDAS, SIGNOS, ANOS, CORES, type Essencia } from '../textos/essencias.ts'

/** Textos personalizados vindos do painel: chave "categoria:numero" (ex.: "motivacao:5"). */
export type Overrides = Record<string, string>

export interface Bloco {
  rotulo?: string
  numero?: string        // ex.: "59 › 5"
  texto?: string[]       // parágrafos
  luz?: string[]; sombra?: string[]; conselho?: string[]
  destaque?: string
  triangulo?: { nome: string; linhas: number[][]; marcas: string[] }
}
export interface Secao { id: string; titulo: string; intro: string; blocos: Bloco[] }
export interface Conteudo {
  nome: string; nascimento: string; signo: string
  resumo: { rotulo: string; valor: string }[]
  secoes: Secao[]
  mapa: MapaPessoal
}

const fmtData = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const n2 = (b: number, v: number) => (b !== v ? `${b} › ${v}` : String(v))
const lista = (a: number[]) => (a.length ? a.join(' - ') : '—')

function essencia(n: number): Essencia { return ESSENCIAS[n] || ESSENCIAS[reduzir(n)] }

/** Bloco padrão de um número: essência + luz/sombra/conselho, adaptado à seção. */
function blocoNumero(cat: string, n: number, ov: Overrides, rotulo?: string, numero?: string, foco?: string): Bloco {
  const e = essencia(n)
  const custom = ov[`${cat}:${n}`]
  return {
    rotulo, numero: numero ?? String(n),
    destaque: `${e.titulo} · ${e.palavras}`,
    texto: custom ? custom.split(/\n{2,}/) : [e.essencia, ...(foco ? [foco] : [])],
    luz: custom ? undefined : e.luz, sombra: custom ? undefined : e.sombra, conselho: custom ? undefined : e.conselho,
  }
}

function marcarSequencias(t: MapaPessoal['triangulos']['vida']) {
  const set = new Set<string>()
  for (const s of t.sequencias) for (let i = 0; i < s.tamanho; i++) set.add(`${s.linha}:${s.inicio + i}`)
  return [...set]
}

export function montarConteudo(nome: string, nascimento: string, ov: Overrides = {}, hoje?: string): Conteudo {
  const m = mapaPessoal(nome, nascimento, hoje)
  const signo = signoSolar(nascimento)
  const s = SIGNOS[signo]
  const amor = HARMONIA_CONJUGAL[reduzir(m.missao.valor)]
  const harm = HARMONICOS[reduzir(m.diaNascimento)]
  const dias = diasFavoraveis(m.diaNascimento)
  const cor = reduzir(m.expressao.valor)
  const sec = (id: string, blocos: Bloco[]): Secao => ({ id, titulo: SECOES[id].titulo, intro: SECOES[id].intro, blocos })

  const secoes: Secao[] = [
    sec('signo', [{ rotulo: `${signo} · ${s.elemento} · regente ${s.regente}`, texto: [ov[`signo:${signo}`] || s.texto,
      `Na sua numerologia, o Destino ${m.destino.valor} (${essencia(m.destino.valor).titulo}) caminha ao lado da energia de ${signo}: ${essencia(m.destino.valor).palavras} encontram o elemento ${s.elemento.toLowerCase()}.`] }]),
    sec('motivacao', [blocoNumero('motivacao', m.motivacao.valor, ov, 'Seu número de Motivação', n2(m.motivacao.bruto, m.motivacao.valor),
      'No campo dos desejos, isso significa que você se sente realizado(a) quando pode viver de acordo com essa energia, e se frustra quando a rotina te afasta dela.')]),
    sec('impressao', [blocoNumero('impressao', m.impressao.valor, ov, 'Seu número de Impressão', n2(m.impressao.bruto, m.impressao.valor),
      'É assim que as pessoas tendem a te enxergar no primeiro contato: com as qualidades e também com os exageros desse número.')]),
    sec('expressao', [blocoNumero('expressao', m.expressao.valor, ov, 'Seu número de Expressão', n2(m.expressao.bruto, m.expressao.valor),
      'Esses são os talentos que você trouxe para agir no mundo. Quanto mais você os usa, mais a vida flui a seu favor.')]),
    sec('diaNascimento', [blocoNumero('diaNascimento', reduzir(m.diaNascimento), ov, 'Seu dia de nascimento', String(m.diaNascimento))]),
    sec('destino', [blocoNumero('destino', m.destino.valor, ov, 'Seu número de Destino', n2(m.destino.bruto, m.destino.valor),
      'Esse é o caminho que a vida vai te apresentar repetidas vezes. Quando você o aceita, as portas se abrem com mais facilidade.')]),
    sec('missao', [blocoNumero('missao', m.missao.valor, ov, 'Seu número de Missão', n2(m.missao.bruto, m.missao.valor),
      'Esta é a sua vocação mais profunda. Ela costuma se revelar com mais força na maturidade.')]),
    sec('talentoOculto', [blocoNumero('talentoOculto', m.talentoOculto.valor, ov, 'Seu Talento Oculto', String(m.talentoOculto.valor))]),
    sec('numeroPsiquico', [blocoNumero('numeroPsiquico', m.numeroPsiquico.valor, ov, 'Seu Número Psíquico', String(m.numeroPsiquico.valor))]),
    sec('licoesCarmicas', m.licoesCarmicas.length
      ? [{ rotulo: 'Suas Lições Cármicas', numero: lista(m.licoesCarmicas), texto: m.licoesCarmicas.map(n => ov[`licoesCarmicas:${n}`] || LICOES[n]) }]
      : [{ rotulo: 'Suas Lições Cármicas', numero: '—', texto: ['Seu nome contém todos os números de 1 a 9: você não tem lições cármicas pendentes. Isso indica uma bagagem ampla de experiências.'] }]),
    sec('dividasCarmicas', m.dividasCarmicas.length
      ? [{ rotulo: 'Suas Dívidas Cármicas', numero: lista(m.dividasCarmicas), texto: m.dividasCarmicas.map(n => ov[`dividasCarmicas:${n}`] || DIVIDAS[n]) }]
      : [{ rotulo: 'Suas Dívidas Cármicas', numero: '—', texto: ['Nenhuma dívida cármica aparece nos seus números principais. Seu caminho está livre desses padrões repetitivos.'] }]),
    sec('tendenciasOcultas', [{ rotulo: 'Suas Tendências Ocultas', numero: lista(m.tendenciasOcultas),
      texto: m.tendenciasOcultas.length ? m.tendenciasOcultas.map(n => `${n} — ${essencia(n).titulo}: a energia de ${essencia(n).palavras} aparece com força. Cuidado com o excesso: ${essencia(n).sombra[0].toLowerCase()}.`)
        : ['Nenhum número aparece em excesso no seu nome: suas energias são bem distribuídas.'] }]),
    sec('respostaSubconsciente', [blocoNumero('respostaSubconsciente', m.respostaSubconsciente, ov, 'Sua Resposta Subconsciente', String(m.respostaSubconsciente))]),
    sec('cores', [{ rotulo: 'Suas cores favoráveis', numero: String(cor), texto: [`${ov[`cores:${cor}`] || CORES[cor]}.`] }]),
    sec('dias', [{ rotulo: 'Seus dias favoráveis', numero: dias.join(', '), texto: ['Use esses dias para assinar contratos, fazer entrevistas, iniciar projetos e tomar decisões importantes.'] }]),
    sec('anoPessoal', [{ rotulo: 'Seu Ano Pessoal', numero: String(m.anoPessoal), texto: [ov[`anoPessoal:${m.anoPessoal}`] || ANOS[m.anoPessoal]] }]),
    sec('mesPessoal', [{ rotulo: 'Seu Mês Pessoal', numero: String(m.mesPessoal), texto: [`Este mês vibra a energia de ${essencia(m.mesPessoal).palavras}.`] }]),
    sec('diaPessoal', [{ rotulo: 'Seu Dia Pessoal', numero: String(m.diaPessoal), texto: [`Hoje vibra a energia de ${essencia(m.diaPessoal).palavras}.`] }]),
    sec('ciclos', m.ciclos.map((c, i) => blocoNumero('ciclo', c.numero, ov, `${['Primeiro', 'Segundo', 'Terceiro'][i]} ciclo de vida · ${c.inicio}${c.fim ? ' a ' + c.fim : ' em diante'}`, String(c.numero)))),
    sec('desafios', [
      { rotulo: 'Primeiro desafio', numero: String(m.desafios.primeiro), texto: [textoDesafio(m.desafios.primeiro)] },
      { rotulo: 'Segundo desafio', numero: String(m.desafios.segundo), texto: [textoDesafio(m.desafios.segundo)] },
      { rotulo: 'Desafio principal', numero: String(m.desafios.principal), texto: [textoDesafio(m.desafios.principal)] },
    ]),
    sec('momentos', m.momentos.map((c, i) => blocoNumero('momento', c.numero, ov, `${['Primeiro', 'Segundo', 'Terceiro', 'Quarto'][i]} momento decisivo · ${c.inicio}${c.fim ? ' a ' + c.fim : ' em diante'}`, String(c.numero)))),
    sec('harmoniaConjugal', [{ rotulo: 'Seus números no amor', texto: [
      `Vibra com: ${lista(amor.vibra)} — paixão intensa, que precisa amadurecer em compreensão.`,
      `Atrai: ${lista(amor.atrai)} — as combinações mais harmoniosas, com afinidade natural.`,
      `Oposto a: ${lista(amor.oposto)} — diferenças que exigem diálogo e paciência.`,
      ...(amor.muitoOposto.length ? [`Muito oposto a: ${lista(amor.muitoOposto)} — relação desafiadora, de muito aprendizado.`] : []),
      `Passivo com: ${lista(amor.passivo)} — relações tranquilas, que dependem de esforço dos dois para não esfriar.`,
      `Números harmônicos para você: ${lista(harm.harmoniza)} · neutro: ${lista(harm.neutro)} · dissonante: ${lista(harm.dissonante)}.`,
    ] }]),
    sec('arcanos', [{ rotulo: `Arcano atual: ${m.arcano.numeroAtual} (${m.arcano.atual}º de ${m.arcano.quantidade})`, numero: String(m.arcano.numeroAtual),
      texto: [`Cada arcano do seu nome rege um período de ${Math.floor(m.arcano.duracaoMeses / 12)} ano(s) e ${m.arcano.duracaoMeses % 12} mês(es). O atual vai de ${fmtData(m.arcano.inicio)} a ${fmtData(m.arcano.fim)}.`,
        textoArcano(m.arcano.numeroAtual)] }]),
    sec('triangulos', (['vida', 'pessoal', 'social', 'destino'] as const).map(k => {
      const t = m.triangulos[k]
      const nomeT = { vida: 'Triângulo da Vida', pessoal: 'Triângulo Pessoal', social: 'Triângulo Social', destino: 'Triângulo do Destino' }[k]
      return {
        rotulo: nomeT, triangulo: { nome: nomeT, linhas: t.linhas, marcas: marcarSequencias(t) },
        texto: t.sequencias.length
          ? [`Sequências negativas encontradas: ${[...new Set(t.sequencias.map(x => `${String(x.digito).repeat(3)}`))].join(', ')}. ${textoSequencias(t.sequencias.map(x => x.digito))}`]
          : ['Nenhuma sequência negativa neste triângulo: energia fluindo bem nesta área.'],
      }
    })),
  ]

  return {
    nome, nascimento, signo,
    resumo: [
      { rotulo: 'Data de nascimento', valor: fmtData(nascimento) }, { rotulo: 'Signo', valor: signo },
      { rotulo: 'Motivação', valor: n2(m.motivacao.bruto, m.motivacao.valor) }, { rotulo: 'Impressão', valor: n2(m.impressao.bruto, m.impressao.valor) },
      { rotulo: 'Expressão', valor: n2(m.expressao.bruto, m.expressao.valor) }, { rotulo: 'Destino', valor: n2(m.destino.bruto, m.destino.valor) },
      { rotulo: 'Missão', valor: n2(m.missao.bruto, m.missao.valor) }, { rotulo: 'Talento oculto', valor: String(m.talentoOculto.valor) },
      { rotulo: 'Número psíquico', valor: String(m.numeroPsiquico.valor) }, { rotulo: 'Resposta subconsciente', valor: String(m.respostaSubconsciente) },
      { rotulo: 'Lições cármicas', valor: lista(m.licoesCarmicas) }, { rotulo: 'Dívidas cármicas', valor: lista(m.dividasCarmicas) },
      { rotulo: 'Tendências ocultas', valor: lista(m.tendenciasOcultas) }, { rotulo: 'Ano pessoal', valor: String(m.anoPessoal) },
      { rotulo: 'Dias favoráveis', valor: dias.join(' - ') }, { rotulo: 'Cores', valor: CORES[cor] },
    ],
    secoes, mapa: m,
  }
}

function textoDesafio(n: number): string {
  const t: Record<number, string> = {
    0: 'Desafio 0: o desafio da escolha. Você tem acesso a todas as energias e precisa decidir qual caminho desenvolver, sem se perder em tantas possibilidades.',
    1: 'Desafio 1: afirmar a própria vontade sem atropelar os outros, e sem deixar que os outros decidam por você.',
    2: 'Desafio 2: lidar com a sensibilidade sem se magoar com tudo, e cooperar sem se anular.',
    3: 'Desafio 3: expressar sentimentos e talentos sem medo do julgamento, e sem dispersar energia.',
    4: 'Desafio 4: ter disciplina e constância sem se tornar rígido(a).',
    5: 'Desafio 5: usar a liberdade com responsabilidade, evitando excessos e mudanças por impulso.',
    6: 'Desafio 6: cuidar sem controlar, e aceitar que cada pessoa tem o seu tempo.',
    7: 'Desafio 7: confiar na vida e nas pessoas, sem se isolar.',
    8: 'Desafio 8: equilibrar ambição material e valores, usando o poder com ética.',
  }
  return t[n] || t[reduzir(n)]
}

function textoArcano(n: number): string {
  const a = Math.floor(n / 10), b = n % 10
  return `O arcano ${n} combina a energia do ${a} (${essencia(a).palavras}) com a do ${b} (${essencia(b).palavras}). Neste período, a vida te convida a unir essas duas forças: ${essencia(a).conselho[0].toLowerCase()}, e ${essencia(b).conselho[0].charAt(0).toLowerCase() + essencia(b).conselho[0].slice(1)}.`
}

function textoSequencias(digitos: number[]): string {
  const uniq = [...new Set(digitos)]
  return uniq.map(d => `A repetição do ${d} indica excesso da energia de ${essencia(d).palavras}, o que pode gerar ${essencia(d).sombra[0].toLowerCase()}.`).join(' ')
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
  const sa = SIGNOS[A.signo], sb = SIGNOS[B.signo]
  const relMissao = relacaoAmor(ma.missao.valor, mb.missao.valor)
  const relDestino = relacaoAmor(ma.destino.valor, mb.destino.valor)
  const elementos = ELEMENTO_COMBINA[sa.elemento].includes(sb.elemento)
    ? `${A.signo} (${sa.elemento}) e ${B.signo} (${sb.elemento}) são elementos que se alimentam: há entendimento natural no jeito de sentir e agir.`
    : `${A.signo} (${sa.elemento}) e ${B.signo} (${sb.elemento}) são elementos diferentes: um ensina ao outro o que falta, desde que haja respeito ao ritmo de cada um.`
  const pa = nomeA.split(' ')[0], pb = nomeB.split(' ')[0]
  const pessoa = (c: Conteudo, quem: string): Secao => ({
    id: 'pessoa-' + quem.toLowerCase(), titulo: `O mapa de ${quem}`, intro: `Os números principais de ${c.nome}, nascido(a) em ${c.resumo[0].valor} (${c.signo}).`,
    blocos: c.secoes.filter(s => ['motivacao', 'expressao', 'destino', 'missao'].includes(s.id)).map(s => ({ ...s.blocos[0], rotulo: s.titulo })),
  })
  const secoes: Secao[] = [
    { id: 'compatibilidade', titulo: 'A compatibilidade de vocês', intro: SECOES.harmoniaConjugal.intro, blocos: [
      { rotulo: `Harmonia conjugal (Missão ${ma.missao.valor} × ${mb.missao.valor})`, numero: relMissao.tipo, texto: [relMissao.texto] },
      { rotulo: `Caminhos de vida (Destino ${ma.destino.valor} × ${mb.destino.valor})`, numero: relDestino.tipo, texto: [relDestino.texto] },
      { rotulo: 'O que move cada um (Motivação)', numero: `${ma.motivacao.valor} × ${mb.motivacao.valor}`, texto: [
        `${pa} é movido(a) por ${essencia(ma.motivacao.valor).palavras}; ${pb}, por ${essencia(mb.motivacao.valor).palavras}. Entender o que é importante para o outro evita muitos desencontros.`] },
      { rotulo: 'Os signos', numero: `${A.signo} × ${B.signo}`, texto: [elementos] },
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
    secoes, mapa: ma,
  }
}
