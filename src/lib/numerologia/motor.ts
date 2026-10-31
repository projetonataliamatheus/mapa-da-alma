// Mapa da Alma — motor de numerologia cabalística.
// Sem dependências: roda no painel, no robô e nos testes.
// Fórmulas conferidas contra um mapa real (ver tests/motor.test.ts).

/** Valor de cada letra na tabela cabalística. */
export const TABELA: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1, K: 2, L: 3, M: 4,
  N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4, U: 6, V: 6, W: 6, X: 6, Y: 1, Z: 7,
}

const VOGAIS = new Set(['A', 'E', 'I', 'O', 'U'])

/**
 * Ajuste dos acentos (regra cabalística mais comum). A CONFIRMAR com um mapa
 * de teste que tenha acentos — por isso fica configurável.
 */
export const ACENTOS_PADRAO = {
  agudo: (v: number) => v + 2,      // Á É Í Ó Ú
  til: (v: number) => v + 3,        // Ã Õ
  circunflexo: (v: number) => v + 7, // Â Ê Ô
  grave: (v: number) => v * 2,      // À
  trema: (v: number) => v * 2,      // Ü
  cedilha: 6,                       // Ç
}

export interface Letra { letra: string; base: string; valor: number; vogal: boolean }

/** Soma os dígitos até sobrar um (sem preservar 11/22). */
export function reduzir(n: number): number {
  n = Math.abs(n)
  while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0)
  return n
}

/** Igual a reduzir, mas mantém os números mestres 11 e 22. */
export function reduzirMestre(n: number): number {
  n = Math.abs(n)
  while (n > 9 && n !== 11 && n !== 22) n = String(n).split('').reduce((s, d) => s + Number(d), 0)
  return n
}

const somaDigitos = (s: string) => s.replace(/\D/g, '').split('').reduce((t, d) => t + Number(d), 0)

/** Converte o nome em letras com valor, aplicando acentos. */
export function letrasDoNome(nome: string, acentos = ACENTOS_PADRAO): Letra[] {
  const out: Letra[] = []
  for (const ch of nome.normalize('NFC').toUpperCase()) {
    if (ch === 'Ç') { out.push({ letra: ch, base: 'C', valor: acentos.cedilha, vogal: false }); continue }
    const decomposto = ch.normalize('NFD')
    const base = decomposto[0]
    if (!(base in TABELA)) continue
    let valor = TABELA[base]
    const marca = decomposto.slice(1)
    if (marca.includes('́')) valor = acentos.agudo(valor)
    else if (marca.includes('̃')) valor = acentos.til(valor)
    else if (marca.includes('̂')) valor = acentos.circunflexo(valor)
    else if (marca.includes('̀')) valor = acentos.grave(valor)
    else if (marca.includes('̈')) valor = acentos.trema(valor)
    out.push({ letra: ch, base, valor, vogal: VOGAIS.has(base) })
  }
  return out
}

/** Número com o valor "cheio" e o reduzido (ex.: 59 → 5). */
export interface Num { bruto: number; valor: number }
const num = (bruto: number, mestre = true): Num => ({ bruto, valor: mestre ? reduzirMestre(bruto) : reduzir(bruto) })

export interface Data { dia: number; mes: number; ano: number }
export function lerData(iso: string): Data {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return { dia, mes, ano }
}

/* ---------- Triângulo invertido ---------- */

export interface Triangulo {
  linhas: number[][]
  /** Sequências de 3+ dígitos iguais (energias negativas): linha, início, tamanho, dígito. */
  sequencias: { linha: number; inicio: number; tamanho: number; digito: number }[]
  /** Pares de dígitos da 1ª linha = arcanos (ex.: 1 e 4 → 14). */
  arcanos: number[]
}

export function triangulo(valores: number[], soma = 0): Triangulo {
  const primeira = valores.map(v => reduzir(v + soma))
  const linhas = [primeira]
  while (linhas[linhas.length - 1].length > 1) {
    const p = linhas[linhas.length - 1]
    linhas.push(p.slice(1).map((v, i) => reduzir(p[i] + v)))
  }
  const sequencias: Triangulo['sequencias'] = []
  linhas.forEach((l, li) => {
    let i = 0
    while (i < l.length) {
      let j = i
      while (j + 1 < l.length && l[j + 1] === l[i]) j++
      if (j - i + 1 >= 3) sequencias.push({ linha: li, inicio: i, tamanho: j - i + 1, digito: l[i] })
      i = j + 1
    }
  })
  const arcanos = primeira.slice(0, -1).map((v, i) => v * 10 + primeira[i + 1])
  return { linhas, sequencias, arcanos }
}

/* ---------- Mapa pessoal ---------- */

export interface MapaPessoal {
  nome: string
  nascimento: Data
  motivacao: Num; impressao: Num; expressao: Num
  destino: Num; missao: Num
  talentoOculto: Num; numeroPsiquico: Num; diaNascimento: number
  licoesCarmicas: number[]; tendenciasOcultas: number[]; respostaSubconsciente: number
  dividasCarmicas: number[]
  anoPessoal: number; mesPessoal: number; diaPessoal: number
  ciclos: { numero: number; inicio: number; fim: number | null }[]
  momentos: { numero: number; inicio: number; fim: number | null }[]
  desafios: { primeiro: number; segundo: number; principal: number }
  arcano: {
    quantidade: number; duracaoMeses: number; posicao: number
    atual: number; numeroAtual: number; inicio: string; fim: string
  }
  triangulos: { vida: Triangulo; pessoal: Triangulo; social: Triangulo; destino: Triangulo }
  frequencia: Record<number, number>
}

const DIVIDAS = new Set([13, 14, 16, 19])

function addMeses(d: Data, meses: number): string {
  const t = new Date(Date.UTC(d.ano, d.mes - 1, d.dia))
  t.setUTCMonth(t.getUTCMonth() + meses)
  return t.toISOString().slice(0, 10)
}

export function mapaPessoal(nome: string, nascimentoIso: string, hojeIso = new Date().toISOString().slice(0, 10)): MapaPessoal {
  const L = letrasDoNome(nome)
  const nasc = lerData(nascimentoIso)
  const hoje = lerData(hojeIso)
  const soma = (f: (l: Letra) => boolean) => L.filter(f).reduce((s, l) => s + l.valor, 0)

  const motivacao = num(soma(l => l.vogal))
  const impressao = num(soma(l => !l.vogal))
  const expressao = num(soma(() => true))
  const destino = num(somaDigitos(nascimentoIso))
  const missao = num(reduzirMestre(expressao.valor) + reduzirMestre(destino.valor))
  const talentoOculto = num(motivacao.valor + expressao.valor)
  const numeroPsiquico = num(nasc.dia, false)

  // Frequência dos valores de 1 a 9 no nome (valores sem acento, só a letra base).
  const frequencia: Record<number, number> = {}
  for (let n = 1; n <= 9; n++) frequencia[n] = 0
  for (const l of L) frequencia[TABELA[l.base]]++
  const licoesCarmicas = Object.entries(frequencia).filter(([, c]) => c === 0).map(([n]) => Number(n))
  const tendenciasOcultas = Object.entries(frequencia).filter(([, c]) => c >= 4).map(([n]) => Number(n))
  const respostaSubconsciente = 9 - licoesCarmicas.length

  // Dívidas cármicas: 13/14/16/19 no dia ou nos passos de redução de motivação,
  // impressão, expressão e destino (ex.: expressão 59 → 14 → 5 gera a dívida 14).
  // A missão NÃO entra (no mapa real, missão 13 não gerou dívida 13).
  const candidatos = [nasc.dia, motivacao.bruto, impressao.bruto, expressao.bruto, destino.bruto]
  const dividasCarmicas = [...new Set(candidatos.flatMap(c => {
    const passos: number[] = []
    let x = c
    while (x > 9) { passos.push(x); x = somaDigitos(String(x)) }
    return passos.filter(p => DIVIDAS.has(p))
  }))].sort((a, b) => a - b)

  // Ciclos e tempo.
  const d = reduzir(nasc.dia), m = reduzir(nasc.mes), a = reduzir(nasc.ano)
  const anoRef = (hoje.mes > nasc.mes || (hoje.mes === nasc.mes && hoje.dia >= nasc.dia)) ? hoje.ano : hoje.ano - 1
  const anoPessoal = reduzir(nasc.dia + nasc.mes + somaDigitos(String(anoRef)))
  const mesPessoal = reduzir(anoPessoal + hoje.mes)
  const diaPessoal = reduzir(mesPessoal + hoje.dia)

  const fim1 = nasc.ano + 37 - reduzir(destino.valor)
  const ciclos = [
    { numero: reduzirMestre(nasc.mes), inicio: nasc.ano, fim: fim1 },
    { numero: reduzirMestre(nasc.dia), inicio: fim1, fim: fim1 + 27 },
    { numero: reduzirMestre(somaDigitos(String(nasc.ano))), inicio: fim1 + 27, fim: null },
  ]
  const m1 = reduzirMestre(d + m), m2 = reduzirMestre(d + a), m3 = reduzirMestre(m1 + m2), m4 = reduzirMestre(m + a)
  const momentos = [
    { numero: m1, inicio: nasc.ano, fim: fim1 },
    { numero: m2, inicio: fim1, fim: fim1 + 9 },
    { numero: m3, inicio: fim1 + 9, fim: fim1 + 18 },
    { numero: m4, inicio: fim1 + 18, fim: null },
  ]
  const p1 = Math.abs(m - d), p2 = Math.abs(a - d)
  const desafios = { primeiro: p1, segundo: p2, principal: Math.abs(p1 - p2) }

  // Arcanos: 90 anos divididos pelos pares de letras do nome.
  const vida = triangulo(L.map(l => TABELA[l.base]))
  const quantidade = vida.arcanos.length
  const duracaoMeses = Math.round((90 * 12) / quantidade)
  const idadeMeses = (hoje.ano - nasc.ano) * 12 + (hoje.mes - nasc.mes) + (hoje.dia >= nasc.dia ? 0 : -1)
  const idadeAnos = (Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia) - Date.UTC(nasc.ano, nasc.mes - 1, nasc.dia)) / (365.25 * 864e5)
  const posicao = Math.round((idadeAnos / (90 / quantidade)) * 100) / 100
  const idx = Math.min(Math.floor(idadeMeses / duracaoMeses), quantidade - 1)

  return {
    nome, nascimento: nasc,
    motivacao, impressao, expressao, destino, missao,
    talentoOculto, numeroPsiquico, diaNascimento: nasc.dia,
    licoesCarmicas, tendenciasOcultas, respostaSubconsciente, dividasCarmicas,
    anoPessoal, mesPessoal, diaPessoal, ciclos, momentos, desafios,
    arcano: {
      quantidade, duracaoMeses, posicao, atual: idx + 1, numeroAtual: vida.arcanos[idx],
      inicio: addMeses(nasc, idx * duracaoMeses), fim: addMeses(nasc, (idx + 1) * duracaoMeses),
    },
    triangulos: {
      vida,
      pessoal: triangulo(L.map(l => TABELA[l.base]), nasc.dia),
      social: triangulo(L.map(l => TABELA[l.base]), nasc.mes),
      destino: triangulo(L.map(l => TABELA[l.base]), nasc.dia + nasc.mes),
    },
    frequencia,
  }
}

/* ---------- Signo solar (horóscopo) ---------- */

const SIGNOS: [string, number, number][] = [
  ['Capricórnio', 1, 19], ['Aquário', 2, 18], ['Peixes', 3, 20], ['Áries', 4, 20], ['Touro', 5, 20],
  ['Gêmeos', 6, 20], ['Câncer', 7, 22], ['Leão', 8, 22], ['Virgem', 9, 22], ['Libra', 10, 22],
  ['Escorpião', 11, 21], ['Sagitário', 12, 21], ['Capricórnio', 12, 31],
]
export function signoSolar(iso: string): string {
  const { dia, mes } = lerData(iso)
  for (const [nome, m, ultimo] of SIGNOS) if (mes < m || (mes === m && dia <= ultimo)) return nome
  return 'Capricórnio'
}
