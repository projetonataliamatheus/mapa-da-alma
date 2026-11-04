/** Stripe Checkout (cobrança internacional): cria a sessão de pagamento e confere a assinatura do webhook. Sem biblioteca, só fetch. */
import { createHmac, timingSafeEqual } from 'crypto'

export const stripeLigado = () => !!process.env.STRIPE_SECRET_KEY

export async function criarCheckoutStripe(o: { valorMinimo: number; moeda: string; titulo: string; descricao?: string; leadId: string; pagamentoId: string; sucessoUrl: string; cancelaUrl: string; email?: string | null }): Promise<{ id: string; url: string }> {
  const f = new URLSearchParams()
  f.set('mode', 'payment')
  f.set('success_url', o.sucessoUrl)
  f.set('cancel_url', o.cancelaUrl)
  f.set('locale', 'es-419')
  f.set('line_items[0][quantity]', '1')
  f.set('line_items[0][price_data][currency]', o.moeda.toLowerCase())
  f.set('line_items[0][price_data][unit_amount]', String(o.valorMinimo))
  f.set('line_items[0][price_data][product_data][name]', o.titulo)
  if (o.descricao) f.set('line_items[0][price_data][product_data][description]', o.descricao)
  f.set('client_reference_id', o.pagamentoId)
  f.set('metadata[lead_id]', o.leadId)
  f.set('metadata[pagamento_id]', o.pagamentoId)
  f.set('payment_intent_data[metadata][pagamento_id]', o.pagamentoId)
  f.set('expires_at', String(Math.floor(Date.now() / 1000) + 23 * 3600))
  if (o.email) f.set('customer_email', o.email)
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: f,
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok || !j.url) throw new Error('Stripe: ' + (j?.error?.message || r.status))
  return { id: j.id, url: j.url }
}

/** Confere o cabeçalho Stripe-Signature (t=...,v1=...) com o segredo do webhook (whsec_...). */
export function assinaturaStripeValida(corpo: string, cabecalho: string | null, segredo: string, toleranciaS = 300): boolean {
  if (!cabecalho || !segredo) return false
  const partes = Object.fromEntries(cabecalho.split(',').map((p) => p.split('=') as [string, string]))
  const t = Number(partes.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranciaS) return false
  const esperado = createHmac('sha256', segredo).update(`${t}.${corpo}`).digest('hex')
  const recebidos = cabecalho.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  return recebidos.some((v) => v.length === esperado.length && timingSafeEqual(Buffer.from(v), Buffer.from(esperado)))
}
