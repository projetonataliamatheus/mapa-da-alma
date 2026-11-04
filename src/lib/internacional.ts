/**
 * Atendimento internacional (espanhol): país e idioma pelo DDI e pelo texto, preço na moeda do cliente e link de pagamento por país.
 * Brasil (+55) = português. Países latino-americanos = espanhol. Anúncio/campanha em espanhol força o idioma.
 */
import { admin as db } from './supabase/admin'

export interface PaisCfg {
  codigo: string      // AR, CL...
  nome: string        // Argentina
  ddi: string         // 54
  moeda: string       // ARS
  nome_moeda: string  // pesos argentinos
  preco: number       // preço do Mapa completo na moeda local
  brl: number         // equivalente aproximado em R$ (só para relatórios e financeiro)
  link?: string       // link de pagamento manual deste país (Mercado Pago, Kiwify, PayPal...), usado quando o Stripe não está ligado
  ativo: boolean
}

// Preços iniciais APROXIMADOS (~US$ 10). Câmbio muda: revise em Países e preços.
export const PAISES_PADRAO: PaisCfg[] = [
  { codigo: 'PY', nome: 'Paraguay', ddi: '595', moeda: 'PYG', nome_moeda: 'guaraníes', preco: 75000, brl: 60, ativo: true },
  { codigo: 'AR', nome: 'Argentina', ddi: '54', moeda: 'ARS', nome_moeda: 'pesos argentinos', preco: 14000, brl: 60, ativo: true },
  { codigo: 'CL', nome: 'Chile', ddi: '56', moeda: 'CLP', nome_moeda: 'pesos chilenos', preco: 9500, brl: 60, ativo: true },
  { codigo: 'CO', nome: 'Colombia', ddi: '57', moeda: 'COP', nome_moeda: 'pesos colombianos', preco: 40000, brl: 60, ativo: true },
  { codigo: 'PE', nome: 'Perú', ddi: '51', moeda: 'PEN', nome_moeda: 'soles', preco: 36, brl: 60, ativo: true },
  { codigo: 'MX', nome: 'México', ddi: '52', moeda: 'MXN', nome_moeda: 'pesos mexicanos', preco: 190, brl: 60, ativo: true },
  { codigo: 'BO', nome: 'Bolivia', ddi: '591', moeda: 'BOB', nome_moeda: 'bolivianos', preco: 70, brl: 60, ativo: true },
  { codigo: 'UY', nome: 'Uruguay', ddi: '598', moeda: 'UYU', nome_moeda: 'pesos uruguayos', preco: 400, brl: 60, ativo: true },
  { codigo: 'EC', nome: 'Ecuador', ddi: '593', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
  { codigo: 'PA', nome: 'Panamá', ddi: '507', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
  { codigo: 'VE', nome: 'Venezuela', ddi: '58', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
  { codigo: 'CR', nome: 'Costa Rica', ddi: '506', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
  { codigo: 'GT', nome: 'Guatemala', ddi: '502', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
  { codigo: 'DO', nome: 'República Dominicana', ddi: '1809', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
  { codigo: 'XX', nome: 'Outros países (padrão)', ddi: '', moeda: 'USD', nome_moeda: 'dólares', preco: 10, brl: 60, ativo: true },
]

/** Moedas sem centavos (o Stripe quer o valor inteiro, sem ×100). */
const SEM_CENTAVOS = new Set(['CLP', 'PYG', 'JPY', 'KRW', 'VND', 'UGX', 'XAF', 'XOF', 'XPF', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF', 'MGA', 'VUV'])
export const centavos = (valor: number, moeda: string) => (SEM_CENTAVOS.has(moeda.toUpperCase()) ? Math.round(valor) : Math.round(valor * 100))

export async function paisesCfg(): Promise<PaisCfg[]> {
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle()
  const salvo = (data as any)?.data?.paises
  if (!Array.isArray(salvo) || !salvo.length) return PAISES_PADRAO
  const out: PaisCfg[] = salvo.map((p: any) => ({
    codigo: String(p.codigo || '').toUpperCase().slice(0, 4), nome: String(p.nome || ''), ddi: String(p.ddi || '').replace(/\D/g, ''), moeda: String(p.moeda || 'USD').toUpperCase().slice(0, 5),
    nome_moeda: String(p.nome_moeda || p.moeda || ''), preco: Number(p.preco) > 0 ? Number(p.preco) : 10, brl: Number(p.brl) > 0 ? Number(p.brl) : 60, link: p.link ? String(p.link).trim() : '', ativo: p.ativo !== false,
  }))
  return out
}

/** DDI → país (do mais específico para o menos). null = número brasileiro ou DDI desconhecido. */
export function ddiDoNumero(whatsapp: string, paises: PaisCfg[]): { brasil: boolean; pais: PaisCfg | null; ddi: string } {
  const d = String(whatsapp || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) return { brasil: true, pais: null, ddi: '55' }
  const ordenados = [...paises].filter((p) => p.ddi).sort((a, b) => b.ddi.length - a.ddi.length)
  const p = ordenados.find((x) => d.startsWith(x.ddi))
  return { brasil: false, pais: p || null, ddi: p?.ddi || '' }
}

const marcasES = /(\bhola\b|\bbuen[oa]s\b|\bquiero\b|\bquisiera\b|\bgracias\b|\bcu[áa]nto\b|\bprecio\b|\binformaci[óo]n\b|\bme interesa\b|\bnecesito\b|\bpor favor\b|\bmapa del alma\b|\bc[óo]mo\b|\bestoy\b|\btengo\b|\bqu[ée] tal\b|[¿¡ñ])/gi
const marcasPT = /(\bol[áa]\b|\boi\b|\bquero\b|\bobrigad[oa]\b|\bquanto\b|\bpre[çc]o\b|\bvoc[êe]\b|\bn[ãa]o\b|\bpreciso\b|\bpor favor\b|\btudo bem\b|[ãõç])/gi
export const contaES = (t: string) => (t.match(marcasES) || []).length
export const contaPT = (t: string) => (t.match(marcasPT) || []).length

/** Idioma do contato: ajuste manual > campanha em espanhol > DDI > texto. */
export async function resolverIdioma(lead: any, history: any[]): Promise<{ idioma: 'pt' | 'es'; pais: string | null }> {
  const fixo = lead?.memory?.idioma_fixo
  const paises = await paisesCfg()
  const info = ddiDoNumero(lead?.whatsapp || lead?.number || '', paises)
  const pais = info.brasil ? 'BR' : info.pais?.codigo || null
  if (fixo === 'pt' || fixo === 'es') return { idioma: fixo, pais }
  if (lead?.campanha_id) {
    const { data: c } = await db().from('campanhas').select('idioma').eq('id', lead.campanha_id).maybeSingle()
    if (c?.idioma === 'es' || c?.idioma === 'pt') return { idioma: c.idioma, pais }
  }
  // REGRA: DDI +55 = português do Brasil; qualquer outro DDI = espanhol (só a equipe muda, pelo selo da conversa)
  return { idioma: info.brasil ? 'pt' : 'es', pais }
}

/** País cadastrado do contato (ou o padrão "Outros"). */
export async function paisDoLead(lead: any): Promise<PaisCfg> {
  const paises = await paisesCfg()
  const info = ddiDoNumero(lead?.whatsapp || '', paises)
  const cod = lead?.pais
  return (info.pais || paises.find((p) => p.codigo === cod) || paises.find((p) => p.codigo === 'XX') || PAISES_PADRAO[PAISES_PADRAO.length - 1])
}

export const fmtNum = (n: number) => Math.round(n).toLocaleString('de-DE')
/** "CLP 9.500 (pesos chilenos)" para a conversa. */
export const precoTexto = (p: PaisCfg, comNome = false) => `${p.moeda === 'USD' ? 'US$' : p.moeda} ${fmtNum(p.preco)}${comNome && p.moeda !== 'USD' ? ` (${p.nome_moeda})` : ''}`
