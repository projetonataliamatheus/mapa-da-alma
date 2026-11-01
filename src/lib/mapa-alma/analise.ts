// Análise do mapa para a EQUIPE (painel): números organizados por tema, cada um com o detalhe completo,
// e os 4 triângulos com o arcano de cada um e os bloqueios explicados.
import { montarConteudo, type Conteudo, type Bloco, type Overrides } from './mapa/conteudo.ts'
import { letrasDoNome, reduzir } from './numerologia/motor.ts'
import { HARMONICOS, HARMONIA_CONJUGAL, diasFavoraveis } from './numerologia/tabelas.ts'
import { CORES } from './textos/essencias.ts'
import { ARCANOS, arcanoBase } from './textos/biblioteca/arcanos.ts'
import { texto } from './textos/biblioteca/index.ts'
import { SIGNOS_INFO } from './textos/biblioteca/signos.ts'

export interface DetalheItem { titulo: string; classico?: string; numero: string; intro?: string; blocos: Bloco[] }
export interface ItemAnalise { id: string; valor: string; rotulo: string; sub?: string; detalhe: DetalheItem }
export interface GrupoAnalise { id: string; titulo: string; icone: string; subgrupos: { titulo?: string; itens: ItemAnalise[] }[] }
export interface TrianguloAnalise {
  id: string; nome: string; sobre: string
  letras: { l: string; v: number }[]; linhas: number[][]; marcas: string[]
  arcano: { pos: number; numero: number; base: number; nome: string; texto: string; periodo: string }
  sequencias: { digito: number; codigo: string; texto: string }[]
}
export interface Analise {
  nome: string; nascimento: string; nascimentoTxt: string; signo: string
  grupos: GrupoAnalise[]; triangulos: TrianguloAnalise[]
  arcano: { quantidade: number; duracao: string; dominante: number; atual: number; numero: number; inicio: string; fim: string }
  destaques: { rotulo: string; valor: string }[]
}

const fmt = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const lista = (a: number[]) => (a.length ? a.join(' - ') : '—')
const n2 = (b: number, v: number) => (b !== v ? `${b} › ${v}` : String(v))
function duracao(meses: number) {
  const a = Math.floor(meses / 12), m = Math.floor(meses % 12 + 1e-9), d = Math.round((meses - Math.floor(meses + 1e-9)) * 30.4375)
  return `${a} ano(s) ${m} mês(es)${d ? ` e ${d} dia(s)` : ''}`
}

export function montarAnalise(nome: string, nascimento: string, ov: Overrides = {}, hoje?: string): Analise {
  const c: Conteudo = montarConteudo(nome, nascimento, ov, hoje)
  const m = c.mapa
  const secao = (id: string) => c.secoes.find(s => s.id === id)
  const det = (id: string, numero: string, blocos?: Bloco[]): DetalheItem => {
    const s = secao(id)
    return { titulo: s?.titulo || id, classico: s?.classico, numero, intro: s?.intro, blocos: blocos || s?.blocos || [] }
  }
  const item = (id: string, sec: string, valor: string, rotulo: string, blocos?: Bloco[], sub?: string): ItemAnalise =>
    ({ id, valor, rotulo, sub, detalhe: det(sec, valor, blocos) })

  const amor = HARMONIA_CONJUGAL[reduzir(m.missao.valor)]
  const harm = HARMONICOS[reduzir(m.diaNascimento)]
  const cor = m.expressao.valor === 11 || m.expressao.valor === 22 ? m.expressao.valor : reduzir(m.expressao.valor)
  const amorSec = secao('harmoniaConjugal')?.blocos || []
  const ciclos = secao('ciclos')?.blocos || [], momentos = secao('momentos')?.blocos || [], desafios = secao('desafios')?.blocos || []
  const si = SIGNOS_INFO[c.signo]

  const grupos: GrupoAnalise[] = [
    { id: 'auto', titulo: 'Autoconhecimento', icone: 'book', subgrupos: [{ itens: [
      item('nasc', 'diaNascimento', fmt(nascimento), 'Data de nascimento'),
      item('mot', 'motivacao', n2(m.motivacao.bruto, m.motivacao.valor), 'Desejo da Alma', undefined, 'Motivação'),
      item('exp', 'expressao', n2(m.expressao.bruto, m.expressao.valor), 'Talentos Naturais', undefined, 'Expressão'),
      item('imp', 'impressao', n2(m.impressao.bruto, m.impressao.valor), 'Imagem no Mundo', undefined, 'Impressão'),
      item('des', 'destino', n2(m.destino.bruto, m.destino.valor), 'Caminho de Vida', undefined, 'Destino'),
      item('mis', 'missao', n2(m.missao.bruto, m.missao.valor), 'Propósito da Alma', undefined, 'Missão'),
      item('tal', 'talentoOculto', String(m.talentoOculto.valor), 'Dom Adormecido', undefined, 'Talento oculto'),
      item('psi', 'numeroPsiquico', String(m.numeroPsiquico.valor), 'Eu Íntimo', undefined, 'Número psíquico'),
      item('res', 'respostaSubconsciente', String(m.respostaSubconsciente), 'Reação Instintiva', undefined, 'Resposta subconsciente'),
      item('ten', 'tendenciasOcultas', lista(m.tendenciasOcultas), 'Energias em Excesso', undefined, 'Tendências ocultas'),
    ] }] },
    { id: 'astro', titulo: 'Astrologia', icone: 'star', subgrupos: [{ itens: [
      item('signo', 'signo', `${si.glifo} ${c.signo}`, 'Signo solar', undefined, `${si.elemento} · regente ${si.regente}`),
      item('compat', 'compatSignos', si.compativeis.join(', '), 'Mais afinidade'),
      item('horo', 'horoscopo', `Ano ${m.anoPessoal}`, 'Horóscopo do ano'),
    ] }] },
    { id: 'amor', titulo: 'Amor e relacionamentos', icone: 'users', subgrupos: [{ itens: [
      item('vibra', 'harmoniaConjugal', lista(amor.vibra), 'Vibra com', amorSec),
      item('atrai', 'harmoniaConjugal', lista(amor.atrai), 'Atrai', amorSec),
      item('oposto', 'harmoniaConjugal', lista(amor.oposto), 'Oposto a', amorSec),
      item('muito', 'harmoniaConjugal', lista(amor.muitoOposto), 'Muito oposto a', amorSec),
      item('passivo', 'harmoniaConjugal', lista(amor.passivo), 'Passivo com', amorSec),
    ] }] },
    { id: 'fases', titulo: 'Fases da vida', icone: 'clock', subgrupos: [
      { itens: [
        item('ano', 'anoPessoal', String(m.anoPessoal), 'Energia do Ano', undefined, 'Ano pessoal'),
        item('mes', 'mesPessoal', String(m.mesPessoal), 'Energia do Mês', undefined, 'Mês pessoal'),
        item('dia', 'diaPessoal', String(m.diaPessoal), 'Energia do Dia', undefined, 'Dia pessoal'),
      ] },
      { titulo: 'Estações da Vida (ciclos)', itens: m.ciclos.map((x, i) => item(`ciclo${i}`, 'ciclos', String(x.numero), `${i + 1}ª estação`, ciclos[i] ? [ciclos[i]] : undefined, `${x.inicio} – ${x.fim ?? '∞'}`)) },
      { titulo: 'Portais da Vida (momentos decisivos)', itens: m.momentos.map((x, i) => item(`mom${i}`, 'momentos', String(x.numero), `${i + 1}º portal`, momentos[i] ? [momentos[i]] : undefined, `${x.inicio} – ${x.fim ?? '∞'}`)) },
    ] },
    { id: 'energias', titulo: 'Energias', icone: 'spark', subgrupos: [
      { itens: [
        item('dias', 'dias', diasFavoraveis(m.diaNascimento).join(' - '), 'Dias favoráveis'),
        item('cores', 'cores', `${cor} · ${CORES[cor]}`, 'Cores favoráveis'),
      ] },
      { titulo: 'Números harmônicos', itens: [
        item('harm', 'harmoniaConjugal', lista(harm.harmoniza), 'Harmoniza', amorSec.slice(1)),
        item('neutro', 'harmoniaConjugal', lista(harm.neutro), 'Neutro', amorSec.slice(1)),
        item('disso', 'harmoniaConjugal', lista(harm.dissonante), 'Dissonante', amorSec.slice(1)),
      ] },
      { titulo: 'Arcano', itens: [
        item('arcdur', 'arcanos', duracao(m.arcano.duracaoExata), 'Duração de cada arcano'),
        item('arcqtd', 'arcanosVida', String(m.arcano.quantidade), 'Arcanos do nome de batismo'),
        item('arcdom', 'arcanos', String(m.arcano.posicao), 'Arcano dominante'),
        item('arcatual', 'arcanos', `${m.arcano.atual}º arcano`, 'Arcano atual'),
        item('arcvib', 'arcanos', `${m.arcano.numeroAtual} · ${ARCANOS[arcanoBase(m.arcano.numeroAtual)].nome}`, 'Arcano vibrando agora', undefined, `${fmt(m.arcano.inicio)} – ${fmt(m.arcano.fim)}`),
      ] },
    ] },
    { id: 'desafios', titulo: 'Provas de Crescimento', icone: 'target', subgrupos: [{ itens: [
      item('d1', 'desafios', String(m.desafios.primeiro), '1ª prova', desafios[0] ? [desafios[0]] : undefined, 'Primeiro desafio'),
      item('d2', 'desafios', String(m.desafios.segundo), '2ª prova', desafios[1] ? [desafios[1]] : undefined, 'Segundo desafio'),
      item('d3', 'desafios', String(m.desafios.principal), 'Prova principal', desafios[2] ? [desafios[2]] : undefined, 'Desafio principal'),
    ] }] },
    { id: 'carma', titulo: 'Carmas', icone: 'link', subgrupos: [{ itens: [
      item('lic', 'licoesCarmicas', lista(m.licoesCarmicas), 'Aprendizados da Alma', undefined, 'Lições cármicas'),
      item('div', 'dividasCarmicas', lista(m.dividasCarmicas), 'Padrões a Curar', undefined, 'Dívidas cármicas'),
    ] }] },
  ]

  const letras = letrasDoNome(nome).map(l => ({ l: l.letra, v: l.valor }))
  const nomesT = { vida: 'Pirâmide da Vida', pessoal: 'Pirâmide Pessoal', social: 'Pirâmide Social', destino: 'Pirâmide do Destino' } as const
  const sobreT = { vida: 'A vida de forma geral: saúde, trabalho, relações e caminhos.', pessoal: 'A vida íntima: emoções, comportamentos e a relação consigo mesmo(a). (Soma o dia de nascimento.)', social: 'A relação com o mundo: amigos, colegas, clientes e vida social. (Soma o mês de nascimento.)', destino: 'O caminho do destino e as grandes escolhas. (Soma o dia e o mês de nascimento.)' } as const
  const triangulos: TrianguloAnalise[] = (['vida', 'pessoal', 'social', 'destino'] as const).map(k => {
    const t = m.triangulos[k], pos = Math.min(m.arcano.atual - 1, t.arcanos.length - 1), num = t.arcanos[pos], base = arcanoBase(num), a = ARCANOS[base]
    const marcas = new Set<string>()
    for (const s of t.sequencias) for (let i = 0; i < s.tamanho; i++) marcas.add(`${s.linha}:${s.inicio + i}`)
    const digs = [...new Set(t.sequencias.map(s => s.digito))]
    return {
      id: k, nome: nomesT[k], sobre: sobreT[k], letras, linhas: t.linhas, marcas: [...marcas],
      arcano: { pos, numero: num, base, nome: a.nome, texto: a.texto, periodo: a.periodo },
      sequencias: digs.map(d => ({ digito: d, codigo: String(d).repeat(3), texto: (texto('sequencia', d, ov)[0] || '') })),
    }
  })

  return {
    nome, nascimento, nascimentoTxt: fmt(nascimento), signo: c.signo, grupos, triangulos,
    arcano: { quantidade: m.arcano.quantidade, duracao: duracao(m.arcano.duracaoExata), dominante: m.arcano.posicao, atual: m.arcano.atual, numero: m.arcano.numeroAtual, inicio: fmt(m.arcano.inicio), fim: fmt(m.arcano.fim) },
    destaques: [
      { rotulo: 'Desejo da Alma', valor: n2(m.motivacao.bruto, m.motivacao.valor) },
      { rotulo: 'Talentos Naturais', valor: n2(m.expressao.bruto, m.expressao.valor) },
      { rotulo: 'Imagem no Mundo', valor: n2(m.impressao.bruto, m.impressao.valor) },
    ],
  }
}
