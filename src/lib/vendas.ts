// Regras de leitura dos pagamentos para o painel: método, moeda e país (só Dólar e Reais nos totais).
import { paisDoLeadRow } from './ddi'

export type Pg = { id: string; amount: number | null; status: string; provider: string | null; method: string | null; moeda: string | null; valor_local: number | null; paid_at: string | null; created_at: string; service: string | null; provider_id?: string | null; receipt_number?: number | null; asaas_receipt_url?: string | null; receipt_drive_url?: string | null; ticket_url?: string | null; leads?: any }

export const metodoDe = (p: Pick<Pg, 'provider' | 'method'>): string => {
  const pr = String(p.provider || '').toLowerCase(), m = String(p.method || '').toLowerCase()
  if (pr === 'cortesia') return 'Cortesia'
  if (pr === 'kiwify') return 'Kiwify'
  if (pr === 'stripe') return 'Cartão (Stripe)'
  if (/card|credit|cart/.test(m)) return 'Cartão de crédito'
  if (/pix/.test(m) || pr === 'asaas' || pr === 'mercadopago') return 'Pix'
  return 'Manual'
}
export const moedaDe = (p: Pick<Pg, 'moeda'>) => String(p.moeda || 'BRL').toUpperCase()
/** Valor realmente recebido, por moeda: dólar (USD) e reais (BRL). Outras moedas ficam só no log. */
export const usdDe = (p: Pg) => (moedaDe(p) === 'USD' ? Number(p.valor_local || 0) : 0)
export const brlDe = (p: Pg) => (moedaDe(p) === 'BRL' ? Number(p.amount || 0) : 0)
export const paisDoPg = (p: Pg) => paisDoLeadRow(Array.isArray(p.leads) ? p.leads[0] : p.leads) || (moedaDe(p) === 'BRL' ? 'BR' : null)
export const usd = (v: number) => 'US$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
