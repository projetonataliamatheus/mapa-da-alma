// Câmbio rápido, preciso e barato: 1 consulta grátis (open.er-api.com, sem chave) a cada 3 horas, guardada na memória do servidor.
// Se a internet falhar, usa a última tabela conhecida ou valores aproximados de reserva. A IA recebe o valor pronto: não calcula nada.
export const MOEDAS: Record<string, { nome: string; pais?: string; reserva: number }> = {
  ARS: { nome: 'pesos argentinos', pais: 'AR', reserva: 1500 },
  MXN: { nome: 'pesos mexicanos', pais: 'MX', reserva: 18.5 },
  COP: { nome: 'pesos colombianos', pais: 'CO', reserva: 3900 },
  CLP: { nome: 'pesos chilenos', pais: 'CL', reserva: 950 },
  UYU: { nome: 'pesos uruguayos', pais: 'UY', reserva: 40 },
  DOP: { nome: 'pesos dominicanos', pais: 'DO', reserva: 60 },
  PEN: { nome: 'soles', pais: 'PE', reserva: 3.7 },
  BOB: { nome: 'bolivianos', pais: 'BO', reserva: 6.9 },
  PYG: { nome: 'guaraníes', pais: 'PY', reserva: 7800 },
  CRC: { nome: 'colones', pais: 'CR', reserva: 510 },
  GTQ: { nome: 'quetzales', pais: 'GT', reserva: 7.7 },
  EUR: { nome: 'euros', reserva: 0.92 },
  BRL: { nome: 'reales', reserva: 5.5 },
}
let cache: { t: number; taxas: Record<string, number>; ao_vivo: boolean } | null = null

export async function taxas(): Promise<{ taxas: Record<string, number>; ao_vivo: boolean }> {
  if (cache && Date.now() - cache.t < 3 * 3600_000) return cache
  try {
    const ctl = new AbortController()
    const to = setTimeout(() => ctl.abort(), 6000)
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: ctl.signal })
    clearTimeout(to)
    const j: any = await r.json()
    if (j?.result === 'success' && j.rates?.ARS) {
      cache = { t: Date.now(), taxas: j.rates, ao_vivo: true }
      return cache
    }
  } catch {}
  if (cache) return { taxas: cache.taxas, ao_vivo: cache.ao_vivo }
  const base: Record<string, number> = {}
  for (const [k, v] of Object.entries(MOEDAS)) base[k] = v.reserva
  return { taxas: base, ao_vivo: false }
}

/** Arredonda para um valor "de conversa" (15.455 → 15.500). */
const redondo = (n: number) => {
  const passo = n >= 100000 ? 1000 : n >= 10000 ? 100 : n >= 1000 ? 50 : n >= 100 ? 5 : n >= 20 ? 1 : 0.5
  return Math.round(n / passo) * passo
}
export const fmt = (n: number) => (n < 20 ? n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : Math.round(n).toLocaleString('de-DE'))

export async function converter(usd: number, moeda: string): Promise<{ moeda: string; nome: string; valor: number; texto: string; ao_vivo: boolean } | null> {
  const m = MOEDAS[moeda.toUpperCase()]
  if (!m) return null
  const t = await taxas()
  const taxa = t.taxas[moeda.toUpperCase()]
  if (!taxa) return null
  const valor = redondo(usd * taxa)
  return { moeda: moeda.toUpperCase(), nome: m.nome, valor, texto: `${fmt(valor)} ${m.nome}`, ao_vivo: t.ao_vivo }
}

export const moedaDoPais = (codigoPais?: string | null) => Object.entries(MOEDAS).find(([, v]) => v.pais === String(codigoPais || '').toUpperCase())?.[0] || null

/** Bloco para a IA: a moeda do cliente + tabela rápida das outras, tudo já calculado com o câmbio do dia. */
export async function blocoCambio(usd: number, codigoPais?: string | null): Promise<string> {
  const t = await taxas()
  const propria = moedaDoPais(codigoPais)
  const linhas: string[] = []
  for (const k of Object.keys(MOEDAS)) {
    const c = await converter(usd, k)
    if (c) linhas.push(`US$ ${usd} ≈ ${c.texto}`)
  }
  const suya = propria ? await converter(usd, propria) : null
  return `\n- CAMBIO DEL DÍA${t.ao_vivo ? '' : ' (aproximado)'}: ${suya ? `la moneda de esta persona son ${suya.nome}: US$ ${usd} ≈ ${suya.texto}. ` : ''}Tabla lista (no calcules nada tú, usa estos números): ${linhas.join(' · ')}. Si la persona pide el precio en SU moneda (o en pesos, soles, etc.), responde SIEMPRE con el número concreto en esa moneda, dilo aproximado según el cambio de hoy, escribe en su moneda con formato local (ej. "unos $ 15.500 pesos argentinos"), y aclara que el cobro es de US$ ${usd} una sola vez y que el enlace de pago (tarjeta de crédito o débito) muestra el valor convertido a su moneda. Nunca respondas "en pesos" sin dar la cifra.`
}
