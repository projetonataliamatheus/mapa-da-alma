/**
 * Meta Conversions API (CAPI): devolve ao Meta o que aconteceu depois do clique no anúncio (conversa, dados, link, COMPRA),
 * para o pixel/conjunto de dados aprender quem compra. Sem biblioteca, só fetch. Nunca derruba o atendimento: erro só vai para o log.
 *
 * Variáveis (Easypanel): META_DATASET_ID (ID do pixel/conjunto de dados), META_CAPI_TOKEN (token de acesso do conjunto de dados),
 * opcionais: META_TEST_EVENT_CODE (aba "Testar eventos"), META_WABA_ID (só se usar a API OFICIAL do WhatsApp, com ctwa_clid).
 */
import { createHash } from 'crypto'
import { admin as db } from './supabase/admin'

export type EventoMeta = 'Contact' | 'Lead' | 'InitiateCheckout' | 'Purchase'
const sha = (v: string) => createHash('sha256').update(v).digest('hex')
const norm = (v?: string | null) => String(v || '').trim().toLowerCase()
export const capiLigado = () => !!process.env.META_DATASET_ID && !!process.env.META_CAPI_TOKEN

export async function montarEvento(lead: any, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null } = {}) {
  const tel = String(lead?.whatsapp || '').replace(/\D/g, '')
  const ads = lead?.memory?.ads || {}
  const partes = norm(lead?.name).split(/\s+/).filter(Boolean)
  const ud: any = { external_id: [sha(String(lead.id))] }
  if (tel) ud.ph = [sha(tel)]
  if (partes[0]) ud.fn = [sha(partes[0])]
  if (partes.length > 1) ud.ln = [sha(partes[partes.length - 1])]
  if (lead?.pais) ud.country = [sha(norm(lead.pais))]
  const oficial = !!(ads.ctwa_clid && process.env.META_WABA_ID)
  if (oficial) { ud.ctwa_clid = ads.ctwa_clid; ud.whatsapp_business_account_id = process.env.META_WABA_ID }
  const ev: any = {
    event_name: nome,
    event_time: Math.floor(Date.now() / 1000),
    event_id: `${nome}-${lead.id}`, // o mesmo evento nunca conta duas vezes
    action_source: oficial ? 'business_messaging' : 'chat',
    user_data: ud,
    custom_data: { content_name: 'Mapa da Alma', idioma: lead?.idioma || 'pt', campanha: lead?.campaign || undefined, ad_id: ads.ad_id || undefined },
  }
  if (oficial) ev.messaging_channel = 'whatsapp'
  if (nome === 'Purchase') { ev.custom_data.currency = (o.moeda || 'BRL').toUpperCase(); ev.custom_data.value = Number(o.valor) || 0 }
  else if (nome === 'InitiateCheckout' && o.valor) { ev.custom_data.currency = (o.moeda || 'BRL').toUpperCase(); ev.custom_data.value = Number(o.valor) || 0 }
  return ev
}

/** Envia um evento deste contato (uma vez só por tipo). Só conta quem veio de anúncio, salvo `forcar`. */
export async function enviarEvento(leadId: string, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; forcar?: boolean } = {}): Promise<boolean> {
  try {
    if (!capiLigado()) return false
    const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle()
    if (!lead) return false
    const veioDeAnuncio = !!(lead.campanha_id || lead.source === 'anuncio' || lead.memory?.ads?.ad_id || lead.memory?.ads?.ctwa_clid)
    if (!veioDeAnuncio && !o.forcar) return false
    const ja: string[] = Array.isArray(lead.memory?.capi) ? lead.memory.capi : []
    if (ja.includes(nome)) return false
    const ev = await montarEvento(lead, nome, o)
    const body: any = { data: [ev] }
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.META_DATASET_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN!)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j: any = await r.json().catch(() => ({}))
    if (!r.ok || j?.error) { console.error('[meta-capi]', nome, j?.error?.message || r.status); return false }
    await db().from('leads').update({ memory: { ...(lead.memory || {}), capi: [...ja, nome] } }).eq('id', leadId).then(() => {}, () => {})
    await db().from('lead_events').insert({ lead_id: leadId, type: 'meta_capi', channel: 'acc', text: `Meta recebeu o evento ${nome}${nome === 'Purchase' ? ` (${(o.moeda || 'BRL').toUpperCase()} ${o.valor})` : ''}`, meta: { evento: nome } }).then(() => {}, () => {})
    return true
  } catch (e: any) { console.error('[meta-capi]', e?.message || e); return false }
}
