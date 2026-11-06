/**
 * Meta Conversions API (CAPI): devolve ao Meta o que aconteceu depois do clique no anúncio (conversa, dados, link, COMPRA),
 * para o pixel/conjunto de dados aprender quem compra. Sem biblioteca, só fetch. Nunca derruba o atendimento: erro só vai para o log.
 *
 * Variáveis (Easypanel): META_DATASET_ID (ID do pixel/conjunto de dados), META_CAPI_TOKEN (token de acesso do conjunto de dados),
 * opcionais: META_TEST_EVENT_CODE (aba "Testar eventos"), META_WABA_ID (só se usar a API OFICIAL do WhatsApp, com ctwa_clid).
 */
import { createHash } from 'crypto'
import { admin as db } from './supabase/admin'

export type EventoMeta = 'Contact' | 'Lead' | 'ViewContent' | 'InitiateCheckout' | 'Purchase' | 'LeadQualificado' | 'ChegouAoFimSemCompra'
/** Rótulos para o painel. Os 4 primeiros são eventos padrão do Meta; os dois últimos são personalizados (viram público e conversão personalizada). */
export const EVENTOS_META: { id: EventoMeta; rotulo: string; dica: string }[] = [
  { id: 'LeadQualificado', rotulo: 'Lead qualificado', dica: 'Deu nome e data, leu o mapa e engajou: perfil de quem compra' },
  { id: 'ChegouAoFimSemCompra', rotulo: 'Chegou ao fim e não pagou', dica: 'Recebeu a oferta e o link, mas não fechou' },
  { id: 'InitiateCheckout', rotulo: 'Link de pagamento enviado', dica: 'Iniciou a finalização da compra' },
  { id: 'Purchase', rotulo: 'Comprou', dica: 'Pagamento confirmado (normalmente automático)' },
]
const sha = (v: string) => createHash('sha256').update(v).digest('hex')
const norm = (v?: string | null) => String(v || '').trim().toLowerCase()
export const capiLigado = () => !!process.env.META_DATASET_ID && !!process.env.META_CAPI_TOKEN

/** Data de nascimento informada pelo cliente (DD/MM/AAAA) → { iso, idade }. */
export function nascimentoDe(lead: any): { aaaammdd: string; idade: number } | null {
  const m = String(lead?.memory?.mapa_nascimento || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = +m[1], mes = +m[2], a = +m[3]
  if (!d || !mes || a < 1900 || a > new Date().getFullYear()) return null
  const hoje = new Date(Date.now() - 3 * 3600_000)
  let idade = hoje.getUTCFullYear() - a
  if (hoje.getUTCMonth() + 1 < mes || (hoje.getUTCMonth() + 1 === mes && hoje.getUTCDate() < d)) idade--
  if (idade < 13 || idade > 110) return null
  return { aaaammdd: `${a}${String(mes).padStart(2, '0')}${String(d).padStart(2, '0')}`, idade }
}
export const faixaEtaria = (i: number) => (i < 25 ? '18-24' : i < 35 ? '25-34' : i < 45 ? '35-44' : i < 55 ? '45-54' : i < 65 ? '55-64' : '65+')

export async function montarEvento(lead: any, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; refazer?: boolean } = {}) {
  const tel = String(lead?.whatsapp || '').replace(/\D/g, '')
  const ads = lead?.memory?.ads || {}
  // nome completo que a própria pessoa informou para o mapa (melhor que o nome do WhatsApp)
  const completo = norm(lead?.memory?.mapa_nome_completo) || norm(lead?.name)
  const partes = completo.split(/\s+/).filter(Boolean)
  const ud: any = { external_id: [sha(String(lead.id))] }
  if (tel) ud.ph = [sha(tel)]
  if (partes[0]) ud.fn = [sha(partes[0])]
  if (partes.length > 1) ud.ln = [sha(partes[partes.length - 1])]
  if (lead?.pais) ud.country = [sha(norm(lead.pais))]
  const nasc = nascimentoDe(lead)
  if (nasc) ud.db = [sha(nasc.aaaammdd)]
  const g = norm(lead?.gender || lead?.memory?.genero_cliente)
  if (g === 'masculino' || g === 'feminino') ud.ge = [sha(g === 'masculino' ? 'm' : 'f')]
  const oficial = !!(ads.ctwa_clid && process.env.META_WABA_ID)
  if (oficial) { ud.ctwa_clid = ads.ctwa_clid; ud.whatsapp_business_account_id = process.env.META_WABA_ID }
  const brasil = !lead?.pais || String(lead.pais).toUpperCase() === 'BR'
  const ev: any = {
    event_name: nome,
    event_time: Math.floor(Date.now() / 1000),
    event_id: o.refazer ? `${nome}-${lead.id}-${Date.now()}` : `${nome}-${lead.id}`, // o mesmo evento nunca conta duas vezes
    action_source: oficial ? 'business_messaging' : 'chat',
    user_data: ud,
    custom_data: {
      content_name: 'Mapa da Alma',
      idioma: lead?.idioma || 'pt',
      pais: lead?.pais || undefined,
      idade: nasc?.idade,
      faixa_etaria: nasc ? faixaEtaria(nasc.idade) : undefined,
      genero: g === 'masculino' || g === 'feminino' ? g : undefined,
      signo: lead?.memory?.signo || undefined,
      etapa: lead?.stage || undefined,
      temperatura: lead?.temperature ?? undefined,
      pagamento_via: brasil ? 'asaas' : 'kiwify',
      campanha: lead?.campaign || undefined,
      ad_id: ads.ad_id || undefined,
    },
  }
  if (oficial) ev.messaging_channel = 'whatsapp'
  const comValor = nome === 'Purchase' || nome === 'InitiateCheckout' || nome === 'ChegouAoFimSemCompra' || nome === 'LeadQualificado'
  if (comValor && (o.valor || nome === 'Purchase')) { ev.custom_data.currency = (o.moeda || 'BRL').toUpperCase(); ev.custom_data.value = Number(o.valor) || 0 }
  return ev
}

/** Valor e moeda do Mapa completo para este contato: R$ no Brasil (Asaas), o valor do país fora (Kiwify). */
export async function valorDoLead(lead: any): Promise<{ valor: number; moeda: string }> {
  const brasil = !lead?.pais || String(lead.pais).toUpperCase() === 'BR'
  if (brasil) return { valor: Number(lead?.deal_price) || 49, moeda: 'BRL' }
  try {
    const { paisDoLead } = await import('./internacional')
    const p = await paisDoLead(lead)
    return { valor: p.preco, moeda: p.moeda }
  } catch { return { valor: 10, moeda: 'USD' } }
}

/** Envia um evento deste contato (uma vez só por tipo, salvo `refazer`). Só conta quem veio de anúncio, salvo `forcar`. */
export async function enviar(leadId: string, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; forcar?: boolean; refazer?: boolean; manual?: boolean } = {}): Promise<{ ok: boolean; motivo?: string }> {
  try {
    if (!capiLigado()) return { ok: false, motivo: 'Faltam META_DATASET_ID e META_CAPI_TOKEN no Easypanel.' }
    const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle()
    if (!lead) return { ok: false, motivo: 'Contato não encontrado.' }
    const veioDeAnuncio = !!(lead.campanha_id || lead.source === 'anuncio' || lead.memory?.ads?.ad_id || lead.memory?.ads?.ctwa_clid)
    if (!veioDeAnuncio && !o.forcar) return { ok: false, motivo: 'Este contato não veio de anúncio.' }
    const ja: string[] = Array.isArray(lead.memory?.capi) ? lead.memory.capi : []
    if (ja.includes(nome) && !o.refazer) return { ok: false, motivo: 'Este evento já foi enviado ao Meta para este contato.' }
    if (o.valor == null && ['InitiateCheckout', 'ChegouAoFimSemCompra', 'LeadQualificado'].includes(nome)) { const v = await valorDoLead(lead); o = { ...o, valor: v.valor, moeda: v.moeda } }
    const ev = await montarEvento(lead, nome, o)
    const body: any = { data: [ev] }
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.META_DATASET_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN!)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j: any = await r.json().catch(() => ({}))
    if (!r.ok || j?.error) { console.error('[meta-capi]', nome, j?.error?.message || r.status); return { ok: false, motivo: 'O Meta recusou: ' + (j?.error?.message || r.status) } }
    const campos = Object.keys(ev.user_data).filter((k) => k !== 'external_id').join(', ')
    await db().from('leads').update({ memory: { ...(lead.memory || {}), capi: [...new Set([...ja, nome])] } }).eq('id', leadId).then(() => {}, () => {})
    await db().from('lead_events').insert({ lead_id: leadId, type: 'meta_capi', channel: 'acc', text: `Meta recebeu o evento ${nome}${o.valor ? ` (${(o.moeda || 'BRL').toUpperCase()} ${o.valor})` : ''}${o.manual ? ' · marcado pela equipe' : ''} · dados: ${campos}`, meta: { evento: nome, manual: !!o.manual } }).then(() => {}, () => {})
    return { ok: true }
  } catch (e: any) { console.error('[meta-capi]', e?.message || e); return { ok: false, motivo: e?.message || 'Erro inesperado' } }
}
export async function enviarEvento(leadId: string, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; forcar?: boolean } = {}): Promise<boolean> {
  return (await enviar(leadId, nome, o)).ok
}

/**
 * Marcação AUTOMÁTICA (roda no robô a cada 10 min):
 *  - "Chegou ao fim e não pagou": recebeu o link de pagamento há X horas (padrão 6) e não pagou.
 *  - "Lead qualificado": deu nome completo + nascimento, o mapa foi aberto e a conversa esquentou.
 */
export async function varreduraMeta(horasAbandono = 6): Promise<number> {
  if (!capiLigado()) return 0
  let n = 0
  const corte = new Date(Date.now() - horasAbandono * 3600_000).toISOString()
  const limite = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { data: links } = await db().from('lead_events').select('lead_id,created_at').eq('type', 'link_sent').lte('created_at', corte).gte('created_at', limite).limit(200)
  for (const e of links || []) {
    const { data: l } = await db().from('leads').select('id,stage,memory').eq('id', e.lead_id).maybeSingle()
    if (!l || l.stage === 'pago') continue
    const capi: string[] = Array.isArray(l.memory?.capi) ? l.memory.capi : []
    if (capi.includes('ChegouAoFimSemCompra') || capi.includes('Purchase')) continue
    const { count } = await db().from('payments').select('id', { count: 'exact', head: true }).eq('lead_id', l.id).eq('status', 'pago')
    if (count) continue
    if ((await enviar(l.id, 'ChegouAoFimSemCompra')).ok) n++
  }
  const { data: quentes } = await db().from('leads').select('id,stage,temperature,memory').gte('last_inbound_at', limite).gte('temperature', 40).limit(300)
  for (const l of quentes || []) {
    const m: any = l.memory || {}
    const capi: string[] = Array.isArray(m.capi) ? m.capi : []
    if (capi.includes('LeadQualificado') || !m.mapa_nome_completo || !m.mapa_nascimento || !m.leitura_iniciada) continue
    if ((await enviar(l.id, 'LeadQualificado')).ok) n++
  }
  return n
}
