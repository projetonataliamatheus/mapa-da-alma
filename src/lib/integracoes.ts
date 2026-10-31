// Integrações externas por fetch: Browserless (PDF), Evolution (WhatsApp), Asaas (Pix) e Claude (IA).
import { RODAPE_PDF } from './mapa/html.ts'

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
export { appUrl }

async function json(r: Response, origem: string) {
  const t = await r.text()
  let j: any
  try { j = t ? JSON.parse(t) : null } catch { j = { raw: t } }
  if (!r.ok) throw new Error(`${origem} ${r.status}: ${(j?.errors?.map?.((e: any) => e.description).join('; ')) || t.slice(0, 300)}`)
  return j
}

/* ---------------- PDF (Browserless) ---------------- */

export async function htmlParaPdf(html: string): Promise<Buffer> {
  const base = (process.env.BROWSERLESS_URL || '').replace(/\/$/, '')
  if (!base) throw new Error('PDF não configurado: falta BROWSERLESS_URL')
  const token = process.env.BROWSERLESS_TOKEN ? `?token=${encodeURIComponent(process.env.BROWSERLESS_TOKEN)}` : ''
  const r = await fetch(`${base}/pdf${token}`, {
    method: 'POST', signal: AbortSignal.timeout(120_000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: { format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: RODAPE_PDF },
      gotoOptions: { waitUntil: 'networkidle0', timeout: 60_000 },
    }),
  })
  if (!r.ok) throw new Error('Browserless ' + r.status + ': ' + (await r.text()).slice(0, 200))
  return Buffer.from(await r.arrayBuffer())
}

/* ---------------- WhatsApp (Evolution API) ---------------- */

const evoBase = () => {
  const u = process.env.EVOLUTION_API_URL
  if (!u) throw new Error('WhatsApp não configurado: falta EVOLUTION_API_URL')
  return u.replace(/\/$/, '')
}
export const instancia = () => process.env.EVOLUTION_INSTANCE || 'mapadaalma'

async function evo(path: string, method = 'GET', body?: any) {
  const r = await fetch(evoBase() + path, {
    method, signal: AbortSignal.timeout(60_000),
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY || '' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return json(r, 'WhatsApp')
}

export const webhookEvolution = () => `${appUrl()}/api/webhooks/evolution?token=${encodeURIComponent(process.env.WEBHOOK_SECRET || '')}`

export const whatsapp = {
  criar: () => evo('/instance/create', 'POST', {
    instanceName: instancia(), qrcode: true, integration: 'WHATSAPP-BAILEYS', groupsIgnore: true, rejectCall: false,
    webhook: { url: webhookEvolution(), byEvents: false, base64: true, events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'] },
  }),
  webhook: () => evo(`/webhook/set/${instancia()}`, 'POST', {
    webhook: { enabled: true, url: webhookEvolution(), byEvents: false, base64: true, events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'] },
  }),
  conectar: () => evo(`/instance/connect/${instancia()}`),
  estado: () => evo(`/instance/connectionState/${instancia()}`),
  sair: () => evo(`/instance/logout/${instancia()}`, 'DELETE'),
  texto: (numero: string, texto: string, delay = 0) => evo(`/message/sendText/${instancia()}`, 'POST', { number: numero, text: texto, delay }),
  pdf: (numero: string, base64: string, arquivo: string, legenda = '') =>
    evo(`/message/sendMedia/${instancia()}`, 'POST', { number: numero, mediatype: 'document', mimetype: 'application/pdf', media: base64, fileName: arquivo, caption: legenda }),
  midia: (id: string, remoteJid: string) => evo(`/chat/getBase64FromMediaMessage/${instancia()}`, 'POST', { message: { key: { id, remoteJid } }, convertToMp4: false }),
}

/** Tempo de "digitando…" proporcional ao tamanho, como uma pessoa calma. */
export const digitando = (t: string) => Math.round(Math.min(14000, Math.max(2000, 1500 + t.length * 55)))

/* ---------------- Pix (Asaas) ---------------- */

const asaasBase = () => process.env.ASAAS_BASE_URL || (process.env.ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3')
async function asaas(path: string, method = 'GET', body?: any) {
  const k = process.env.ASAAS_API_KEY
  if (!k) throw new Error('Pix não configurado: falta ASAAS_API_KEY')
  const r = await fetch(asaasBase() + path, {
    method, signal: AbortSignal.timeout(60_000),
    headers: { 'Content-Type': 'application/json', access_token: k, 'User-Agent': 'mapa-da-alma' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return json(r, 'Asaas')
}

export function cpfValido(v: string): string | null {
  const c = String(v || '').replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return null
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]) ? c : null
}

export const PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']

export async function cobrarPix(p: { clienteId: string; nome: string; cpf: string; whatsapp: string; valor: number; descricao: string; ref: string }) {
  const achado = await asaas(`/customers?cpfCnpj=${p.cpf}&limit=1`)
  let customer = achado?.data?.[0]?.id
  if (!customer) {
    let fone = p.whatsapp.replace(/\D/g, ''); if (fone.startsWith('55')) fone = fone.slice(2)
    customer = (await asaas('/customers', 'POST', { name: p.nome, cpfCnpj: p.cpf, mobilePhone: fone || undefined, externalReference: p.clienteId, notificationDisabled: true })).id
  }
  const venc = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)
  const pay = await asaas('/payments', 'POST', { customer, billingType: 'PIX', value: Math.round(p.valor * 100) / 100, dueDate: venc, description: p.descricao.slice(0, 400), externalReference: p.ref })
  const qr = await asaas(`/payments/${pay.id}/pixQrCode`)
  return { id: pay.id as string, copiaCola: qr.payload as string, link: pay.invoiceUrl as string }
}

export const consultarPagamento = (id: string) => asaas(`/payments/${encodeURIComponent(id)}`)

/* ---------------- IA (Claude, API de mensagens) ---------------- */

export async function claude(opts: { system: string; mensagens: { role: 'user' | 'assistant'; content: string }[]; ferramenta?: { nome: string; descricao: string; schema: any }; maxTokens?: number; modelo?: string }) {
  const k = process.env.ANTHROPIC_API_KEY
  if (!k) throw new Error('IA não configurada: falta ANTHROPIC_API_KEY')
  const body: any = {
    model: opts.modelo || process.env.AI_MODEL || 'claude-sonnet-5-5',
    max_tokens: opts.maxTokens || 1200,
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages: opts.mensagens,
  }
  if (opts.ferramenta) {
    body.tools = [{ name: opts.ferramenta.nome, description: opts.ferramenta.descricao, input_schema: opts.ferramenta.schema }]
    body.tool_choice = { type: 'tool', name: opts.ferramenta.nome }
  }
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(120_000),
    headers: { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
  const j = await json(r, 'IA')
  const uso = { entrada: j.usage?.input_tokens || 0, saida: j.usage?.output_tokens || 0, modelo: j.model }
  if (opts.ferramenta) {
    const b = (j.content || []).find((c: any) => c.type === 'tool_use')
    return { dados: b?.input ?? null, texto: '', uso }
  }
  return { dados: null, texto: (j.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n'), uso }
}
