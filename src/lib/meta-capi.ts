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
const soDigitos = (v?: string | null) => String(v || '').replace(/\D/g, '')
const letras = (v?: string | null) => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')

/** Dados reais do comprador (vindos da Kiwify ou do Asaas): e-mail, telefone, endereço e IP. Guardados no contato e usados no evento. */
export async function salvarCliente(leadId: string, d: { email?: string | null; telefone?: string | null; nome?: string | null; ip?: string | null; cidade?: string | null; estado?: string | null; cep?: string | null; pais?: string | null; fonte: string }) {
  try {
    if (!leadId) return
    const { data: lead } = await db().from('leads').select('memory').eq('id', leadId).maybeSingle()
    if (!lead) return
    const ant = (lead.memory as any)?.cliente || {}
    const novo: any = { ...ant }
    for (const [k, v] of Object.entries(d)) if (v != null && String(v).trim()) novo[k] = String(v).trim()
    novo.atualizado = new Date().toISOString()
    await db().from('leads').update({ memory: { ...(lead.memory as any || {}), cliente: novo } }).eq('id', leadId)
  } catch (e: any) { console.error('[meta-capi] salvarCliente', e?.message || e) }
}

/** E-mail escrito numa mensagem do cliente (primeiro que aparecer). */
export const emailDoTexto = (t: string) => (String(t || '').match(/[a-z0-9._%+\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)*\.[a-z]{2,}/i) || [''])[0].toLowerCase()
export const emailDoLead = (lead: any) => String(lead?.memory?.cliente?.email || lead?.memory?.email || '').trim()

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

export async function montarEvento(lead: any, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; refazer?: boolean; pagamentoId?: string | null } = {}) {
  const cli = lead?.memory?.cliente || {}
  const tel = soDigitos(lead?.whatsapp)
  const tel2 = soDigitos(cli.telefone)
  const ads = lead?.memory?.ads || {}
  // origem no site (teste gratuito): navegador, IP e cliques do anúncio
  let site: any = null
  try { site = (await db().from('site_leads').select('fbp,fbc,ua,ip,utm,idioma,created_at').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1)).data?.[0] || null } catch {}
  // nome completo que a própria pessoa informou para o mapa (melhor que o nome do WhatsApp)
  const completo = norm(lead?.memory?.mapa_nome_completo) || norm(cli.nome) || norm(lead?.name)
  const partes = completo.split(/\s+/).filter(Boolean)
  const ud: any = { external_id: [...new Set([sha(String(lead.id)), ...(tel ? [sha(tel)] : [])])] }
  const fones = [...new Set([tel, tel2].filter((x) => x.length >= 8))]
  if (fones.length) ud.ph = fones.map(sha)
  const email = norm(cli.email || lead?.memory?.email)
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) ud.em = [sha(email)]
  if (partes[0]) ud.fn = [sha(partes[0])]
  if (partes.length > 1) ud.ln = [sha(partes[partes.length - 1])]
  const pais = norm(cli.pais || lead?.pais)
  if (pais) ud.country = [sha(pais.slice(0, 2))]
  if (letras(cli.cidade)) ud.ct = [sha(letras(cli.cidade))]
  if (letras(cli.estado)) ud.st = [sha(letras(cli.estado).slice(0, 2))]
  if (soDigitos(cli.cep)) ud.zp = [sha(soDigitos(cli.cep))]
  const nasc = nascimentoDe(lead)
  if (nasc) ud.db = [sha(nasc.aaaammdd)]
  const g = norm(lead?.gender || lead?.memory?.genero_cliente)
  if (g === 'masculino' || g === 'feminino') ud.ge = [sha(g === 'masculino' ? 'm' : 'f')]
  // sinais do navegador (não vão em hash): IP, navegador, cookie do Meta (fbp) e clique no anúncio (fbc)
  const ip = String(cli.ip || site?.ip || '').trim()
  const ua = String(site?.ua || '').trim()
  if (ip) ud.client_ip_address = ip
  if (ua) ud.client_user_agent = ua
  if (site?.fbp) ud.fbp = site.fbp
  const fbclid = site?.utm?.fbclid
  const fbc = site?.fbc || (fbclid ? `fb.1.${new Date(site.created_at || Date.now()).getTime()}.${fbclid}` : '')
  if (fbc) ud.fbc = fbc
  const oficial = !!(ads.ctwa_clid && process.env.META_WABA_ID)
  if (oficial) { ud.ctwa_clid = ads.ctwa_clid; ud.whatsapp_business_account_id = process.env.META_WABA_ID }
  const brasil = !lead?.pais || String(lead.pais).toUpperCase() === 'BR'
  const doSite = !!(ip && ua) // com IP e navegador o Meta pede "website" (e a página de origem)
  const idioma = lead?.idioma || site?.idioma || 'pt'
  let pg: any = null
  if (o.pagamentoId) pg = (await db().from('payments').select('provider,provider_id,method,service').eq('id', o.pagamentoId).maybeSingle()).data
  const ev: any = {
    event_name: nome,
    event_time: Math.floor(Date.now() / 1000),
    event_id: o.refazer ? `${nome}-${lead.id}-${Date.now()}` : `${nome}-${lead.id}`, // o mesmo evento nunca conta duas vezes
    action_source: oficial ? 'business_messaging' : doSite ? 'website' : 'chat',
    user_data: ud,
    custom_data: {
      content_name: 'Mapa da Alma',
      content_type: 'product',
      content_ids: ['mapa-da-alma-completo'],
      content_category: 'numerologia',
      num_items: 1,
      idioma,
      pais: lead?.pais || undefined,
      idade: nasc?.idade,
      faixa_etaria: nasc ? faixaEtaria(nasc.idade) : undefined,
      genero: g === 'masculino' || g === 'feminino' ? g : undefined,
      signo: lead?.memory?.signo || undefined,
      etapa: lead?.stage || undefined,
      temperatura: lead?.temperature ?? undefined,
      pagamento_via: pg?.provider || (brasil ? 'asaas' : 'kiwify'),
      forma_pagamento: pg?.method || undefined,
      order_id: pg?.provider_id || undefined,
      origem: site ? 'site' : (lead?.source === 'anuncio' || ads.ad_id ? 'anuncio_whatsapp' : lead?.source || undefined),
      campanha: lead?.campaign || undefined,
      ad_id: ads.ad_id || undefined,
    },
  }
  if (doSite) ev.event_source_url = idioma === 'pt' ? 'https://mapadaalma.site/' : 'https://mapadelalma.site/'
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
export async function enviar(leadId: string, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; forcar?: boolean; refazer?: boolean; manual?: boolean; pagamentoId?: string | null } = {}): Promise<{ ok: boolean; motivo?: string }> {
  try {
    if (!capiLigado()) return { ok: false, motivo: 'Faltam META_DATASET_ID e META_CAPI_TOKEN no Easypanel.' }
    const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle()
    if (!lead) return { ok: false, motivo: 'Contato não encontrado.' }
    const veioDeAnuncio = !!(lead.campanha_id || lead.source === 'anuncio' || lead.memory?.ads?.ad_id || lead.memory?.ads?.ctwa_clid)
    if (!veioDeAnuncio && !o.forcar) return { ok: false, motivo: 'Este contato não veio de anúncio.' }
    if (nome === 'InitiateCheckout' && !o.manual && !o.forcar && lead.pais && String(lead.pais).toUpperCase() !== 'BR') return { ok: false, motivo: 'Fora do Brasil o checkout é da Kiwify, que já envia este evento pelo Pixel dela (evita contar duas vezes).' }
    const ja: string[] = Array.isArray(lead.memory?.capi) ? lead.memory.capi : []
    if (ja.includes(nome) && !o.refazer) return { ok: false, motivo: 'Este evento já foi enviado ao Meta para este contato.' }
    if (o.valor == null && ['InitiateCheckout', 'ChegouAoFimSemCompra', 'LeadQualificado'].includes(nome)) { const v = await valorDoLead(lead); o = { ...o, valor: v.valor, moeda: v.moeda } }
    const ev = await montarEvento(lead, nome, o)
    const body: any = { data: [ev] }
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.META_DATASET_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN!)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j: any = await r.json().catch(() => ({}))
    const auditoria = (ok: boolean, resp: string) => db().from('meta_eventos').insert({ lead_id: leadId, evento: nome, event_id: ev.event_id, ok, resposta: resp.slice(0, 400), action_source: ev.action_source, campos: Object.keys(ev.user_data), valor: ev.custom_data?.value ?? null, moeda: ev.custom_data?.currency ?? null, order_id: ev.custom_data?.order_id ?? null, teste: !!process.env.META_TEST_EVENT_CODE }).then(() => {}, () => {})
    if (!r.ok || j?.error) { console.error('[meta-capi]', nome, j?.error?.message || r.status); await auditoria(false, String(j?.error?.message || r.status)); return { ok: false, motivo: 'O Meta recusou: ' + (j?.error?.message || r.status) } }
    await auditoria(true, `recebidos: ${j?.events_received ?? '?'} · fbtrace: ${j?.fbtrace_id || ''}`)
    const campos = Object.keys(ev.user_data).filter((k) => k !== 'external_id').join(', ')
    await db().from('leads').update({ memory: { ...(lead.memory || {}), capi: [...new Set([...ja, nome])] } }).eq('id', leadId).then(() => {}, () => {})
    await db().from('lead_events').insert({ lead_id: leadId, type: 'meta_capi', channel: 'acc', text: `Meta recebeu o evento ${nome}${o.valor ? ` (${(o.moeda || 'BRL').toUpperCase()} ${o.valor})` : ''}${o.manual ? ' · marcado pela equipe' : ''} · dados: ${campos}`, meta: { evento: nome, manual: !!o.manual } }).then(() => {}, () => {})
    return { ok: true }
  } catch (e: any) { console.error('[meta-capi]', e?.message || e); return { ok: false, motivo: e?.message || 'Erro inesperado' } }
}
export async function enviarEvento(leadId: string, nome: EventoMeta, o: { valor?: number | null; moeda?: string | null; forcar?: boolean; pagamentoId?: string | null } = {}): Promise<boolean> {
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
  n += await comprasPendentesMeta()
  const { data: quentes } = await db().from('leads').select('id,stage,temperature,memory').gte('last_inbound_at', limite).gte('temperature', 40).limit(300)
  for (const l of quentes || []) {
    const m: any = l.memory || {}
    const capi: string[] = Array.isArray(m.capi) ? m.capi : []
    if (capi.includes('LeadQualificado') || !m.mapa_nome_completo || !m.mapa_nascimento || !m.leitura_iniciada) continue
    if ((await enviar(l.id, 'LeadQualificado')).ok) n++
  }
  return n
}


/**
 * Compra de um contato: valor e moeda do pagamento confirmado → evento Purchase ao Meta (uma vez só).
 * `espera`: se o e-mail ainda não chegou (nem do gateway nem da conversa), aguarda até 15 min depois do pagamento,
 * porque o e-mail sobe a qualidade da correspondência e o Meta não aceita corrigir um evento já enviado.
 */
export async function enviarCompraDoLead(leadId: string, o: { paymentId?: string | null; espera?: boolean } = {}): Promise<{ ok: boolean; motivo?: string }> {
  try {
    const { data: lead } = await db().from('leads').select('id,memory').eq('id', leadId).maybeSingle()
    if (!lead) return { ok: false, motivo: 'Contato não encontrado.' }
    const capi: string[] = Array.isArray((lead.memory as any)?.capi) ? (lead.memory as any).capi : []
    if (capi.includes('Purchase') || (lead.memory as any)?.capi_purchase_skip) return { ok: false, motivo: 'Já tratado.' }
    let q = db().from('payments').select('id,amount,moeda,valor_local,paid_at').eq('lead_id', leadId).eq('status', 'pago')
    q = o.paymentId ? q.eq('id', o.paymentId) : q.order('paid_at', { ascending: false }).limit(1)
    const pg: any = (await q).data?.[0]
    if (!pg) return { ok: false, motivo: 'Sem pagamento confirmado.' }
    const idadeMin = (Date.now() - new Date(pg.paid_at || Date.now()).getTime()) / 60000
    if (o.espera && !emailDoLead(lead) && idadeMin < 15) return { ok: false, motivo: 'Aguardando o e-mail do cliente.' }
    const r = await enviar(leadId, 'Purchase', { ...(pg.valor_local ? { valor: Number(pg.valor_local), moeda: pg.moeda } : { valor: Number(pg.amount), moeda: 'BRL' }), pagamentoId: pg.id })
    if (!r.ok && /não veio de anúncio/i.test(r.motivo || '')) await db().from('leads').update({ memory: { ...(lead.memory as any || {}), capi_purchase_skip: true } }).eq('id', leadId).then(() => {}, () => {})
    return r
  } catch (e: any) { return { ok: false, motivo: e?.message || 'Erro' } }
}

/** Compras confirmadas que ainda não foram ao Meta (esperando o e-mail ou com falha): o robô tenta de novo por até 3 dias. */
export async function comprasPendentesMeta(): Promise<number> {
  if (!capiLigado()) return 0
  let n = 0
  const desde = new Date(Date.now() - 3 * 86400_000).toISOString()
  const { data: pgs } = await db().from('payments').select('lead_id,paid_at').eq('status', 'pago').gte('paid_at', desde).limit(200)
  for (const lid of [...new Set((pgs || []).map((p: any) => p.lead_id).filter(Boolean))] as string[]) {
    if ((await enviarCompraDoLead(lid, { espera: true })).ok) n++
  }
  return n
}
