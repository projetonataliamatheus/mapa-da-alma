// Mapa da Alma — servidor HTTP (Node puro, sem dependências).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { db, salvarConfig, config } from './lib/db.ts'
import { hashSenha, conferirSenha, criarSessao, lerSessao, cookieSessao, cookieSair } from './lib/auth.ts'
import { whatsapp, cpfValido } from './lib/integracoes.ts'
import { criarMapa, paginaAoVivo, pdfDoMapa, enviarMapa, nomeArquivo, type MapaRow } from './lib/mapas.ts'
import { receberMensagem, pagamentoConfirmado, responder } from './lib/atendimento.ts'
import * as P from './painel/paginas.ts'
import { paginaSimples, esc } from './painel/ui.ts'

type Req = IncomingMessage & { body?: Record<string, any>; query: URLSearchParams; adminId?: string | null }

/* ---------------- utilidades ---------------- */
function lerCorpo(req: IncomingMessage, limite = 15 * 1024 * 1024): Promise<string> {
  return new Promise((ok, erro) => {
    let tam = 0; const partes: Buffer[] = []
    req.on('data', (c: Buffer) => { tam += c.length; if (tam > limite) { erro(new Error('Corpo muito grande')); req.destroy() } else partes.push(c) })
    req.on('end', () => ok(Buffer.concat(partes).toString('utf8')))
    req.on('error', erro)
  })
}
async function corpo(req: Req) {
  const raw = await lerCorpo(req)
  const tipo = req.headers['content-type'] || ''
  if (tipo.includes('application/json')) { try { return JSON.parse(raw || '{}') } catch { return {} } }
  const p = new URLSearchParams(raw), o: Record<string, any> = {}
  for (const [k, v] of p) o[k] = k in o ? [].concat(o[k], v as any) : v
  return o
}
const html = (res: ServerResponse, s: string, status = 200) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(s) }
const jsonRes = (res: ServerResponse, o: any, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }
const ir = (res: ServerResponse, url: string, cookie?: string) => { res.writeHead(303, { Location: url, ...(cookie ? { 'Set-Cookie': cookie } : {}) }); res.end() }
const msg = (url: string, tipo: 'ok' | 'erro', texto: string) => `${url}${url.includes('?') ? '&' : '?'}${tipo}=${encodeURIComponent(texto)}`
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const naoEncontrado = (res: ServerResponse) => html(res, paginaSimples('Não encontrado', '<h2>Página não encontrada</h2><p class="suave">Confira o link e tente de novo.</p>'), 404)
const soNumeros = (s: string) => { let n = String(s || '').replace(/\D/g, ''); if (n && !n.startsWith('55') && n.length <= 11) n = '55' + n; return n }

/* ---------------- rotas ---------------- */
type Handler = (req: Req, res: ServerResponse, p: string[]) => Promise<void>
const rotas: { metodo: string; padrao: RegExp; h: Handler; auth?: boolean }[] = []
const rota = (metodo: string, padrao: RegExp, h: Handler, auth = false) => rotas.push({ metodo, padrao, h, auth })

rota('GET', /^\/$/, async (_q, res) => ir(res, '/painel'))
rota('GET', /^\/saude$/, async (_q, res) => jsonRes(res, { ok: true }))

/* login e primeiro acesso */
rota('GET', /^\/login$/, async (req, res) => {
  if ((await db.count('admins')) === 0) return ir(res, '/primeiro-acesso')
  html(res, paginaSimples('Entrar', `${req.query.get('erro') ? `<p class="erro">${esc(req.query.get('erro'))}</p>` : ''}<form method="post"><label>E-mail</label><input name="email" type="email" required autofocus><label>Senha</label><input name="senha" type="password" required><p><button style="width:100%">Entrar</button></p></form>`))
})
rota('POST', /^\/login$/, async (req, res) => {
  const b = req.body!
  const a = await db.one('admins', { email: `eq.${String(b.email || '').toLowerCase().trim()}` })
  if (!a || !conferirSenha(String(b.senha || ''), a.senha_hash)) return ir(res, '/login?erro=' + encodeURIComponent('E-mail ou senha incorretos'))
  ir(res, '/painel', cookieSessao(criarSessao(a.id)))
})
rota('GET', /^\/logout$/, async (_q, res) => ir(res, '/login', cookieSair))
rota('GET', /^\/primeiro-acesso$/, async (_q, res) => {
  if ((await db.count('admins')) > 0) return ir(res, '/login')
  html(res, paginaSimples('Primeiro acesso', `<h2>Criar o primeiro acesso</h2><form method="post"><label>Seu nome</label><input name="nome" required><label>E-mail</label><input name="email" type="email" required><label>Senha (mínimo 8)</label><input name="senha" type="password" minlength="8" required><p><button style="width:100%">Criar e entrar</button></p></form>`))
})
rota('POST', /^\/primeiro-acesso$/, async (req, res) => {
  if ((await db.count('admins')) > 0) return ir(res, '/login')
  const b = req.body!
  if (String(b.senha || '').length < 8) return ir(res, '/primeiro-acesso')
  const a = await db.insert('admins', { nome: b.nome, email: String(b.email).toLowerCase().trim(), senha_hash: hashSenha(String(b.senha)) })
  ir(res, '/painel', cookieSessao(criarSessao(a.id)))
})

/* link ao vivo e PDF (públicos, pelo slug secreto) */
rota('GET', /^\/m\/([a-z0-9-]+)\.pdf$/, async (_q, res, [slug]) => {
  const m = await db.one<MapaRow>('mapas', { slug: `eq.${slug}` })
  if (!m) return naoEncontrado(res)
  const pdf = await pdfDoMapa(m)
  res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nomeArquivo(m))}` })
  res.end(pdf)
})
rota('GET', /^\/m\/([a-z0-9-]+)$/, async (req, res, [slug]) => {
  const m = await db.one<MapaRow>('mapas', { slug: `eq.${slug}` })
  if (!m) return naoEncontrado(res)
  if (!lerSessao(req.headers.cookie)) db.rpc('contar_visualizacao', { p_slug: slug }).catch(() => {})
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' })
  res.end(await paginaAoVivo(m))
})

/* webhooks */
rota('POST', /^\/api\/webhooks\/evolution$/, async (req, res) => {
  if (!igual(req.query.get('token') || '', process.env.WEBHOOK_SECRET || '¬')) return jsonRes(res, { ok: false }, 401)
  jsonRes(res, { ok: true })
  const b = req.body || {}
  const ev = String(b.event || '').toLowerCase().replace(/_/g, '.')
  if (ev === 'qrcode.updated') { const qr = b.data?.qrcode?.base64 || b.data?.base64; if (qr) ultimoQr = { qr, em: Date.now() }; return }
  if (ev !== 'messages.upsert') return
  const d = Array.isArray(b.data) ? b.data[0] : b.data
  const key = d?.key || {}
  if (!d || key.fromMe) return
  const jid = [key.remoteJid, key.remoteJidAlt, key.senderPn].find((x: any) => typeof x === 'string' && x.endsWith('@s.whatsapp.net'))
  if (!jid) return // grupos, status e contatos sem número
  const m = d.message || {}
  let texto = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || ''
  if (!texto && (m.audioMessage || m.pttMessage)) texto = '[áudio]'
  if (!texto && m.imageMessage) texto = '[imagem]'
  if (!texto && m.stickerMessage) texto = '[figurinha]'
  if (!texto && m.documentMessage) texto = '[documento]'
  if (!texto) return
  receberMensagem(jid.split('@')[0], texto, d.pushName || null, key.id || null).catch(e => console.error('[webhook evolution]', e))
})
let ultimoQr: { qr: string; em: number } | null = null

rota('POST', /^\/api\/webhooks\/asaas$/, async (req, res) => {
  const tok = String(req.headers['asaas-access-token'] || '')
  if (!process.env.ASAAS_WEBHOOK_TOKEN || !igual(tok, process.env.ASAAS_WEBHOOK_TOKEN)) return jsonRes(res, { ok: false }, 401)
  jsonRes(res, { ok: true })
  const b = req.body || {}
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(b.event) && b.payment?.id) pagamentoConfirmado(b.payment.id).catch(e => console.error('[webhook asaas]', e))
})

/* ---------------- painel ---------------- */
const pag = (f: (q: URLSearchParams) => Promise<string>): Handler => async (req, res) => html(res, await f(req.query))
rota('GET', /^\/painel$/, pag(P.visaoGeral), true)
rota('GET', /^\/painel\/conversas$/, pag(P.conversas), true)
rota('GET', /^\/painel\/clientes$/, pag(P.clientes), true)
rota('GET', /^\/painel\/mapas$/, pag(P.mapas), true)
rota('GET', /^\/painel\/financeiro$/, pag(P.financeiro), true)
rota('GET', /^\/painel\/ia$/, pag(P.ia), true)
rota('GET', /^\/painel\/textos$/, pag(P.textos), true)
rota('GET', /^\/painel\/config$/, pag(P.configuracoes), true)

rota('GET', /^\/painel\/conversas\/([0-9a-f-]{36})$/, async (req, res, [id]) => { const h = await P.conversa(id, req.query); h ? html(res, h) : naoEncontrado(res) }, true)
rota('GET', /^\/painel\/api\/mensagens\/([0-9a-f-]{36})$/, async (req, res, [id]) =>
  jsonRes(res, await db.select('mensagens', { cliente_id: `eq.${id}`, id: `gt.${Number(req.query.get('depois') || 0)}`, order: 'id.asc' })), true)
rota('POST', /^\/painel\/conversas\/([0-9a-f-]{36})\/enviar$/, async (req, res, [id]) => {
  const c = await db.one('clientes', { id: `eq.${id}` })
  const t = String(req.body?.texto || '').trim()
  if (!c || !t) return ir(res, `/painel/conversas/${id}`)
  try {
    await whatsapp.texto(c.whatsapp, t)
    await db.insert('mensagens', { cliente_id: id, autor: 'humano', texto: t })
    await db.update('clientes', { id: `eq.${id}` }, { ia_pausada: true })
    ir(res, `/painel/conversas/${id}`)
  } catch (e: any) { ir(res, msg(`/painel/conversas/${id}`, 'erro', e.message)) }
}, true)
rota('POST', /^\/painel\/conversas\/([0-9a-f-]{36})\/ia$/, async (req, res, [id]) => {
  const pausar = req.body?.pausar === '1'
  await db.update('clientes', { id: `eq.${id}` }, { ia_pausada: pausar, ...(pausar ? {} : { precisa_humano: false }) })
  if (!pausar) responder(id).catch(() => {})
  ir(res, msg(`/painel/conversas/${id}`, 'ok', pausar ? 'IA pausada: a conversa é sua.' : 'A IA voltou a atender.'))
}, true)
rota('POST', /^\/painel\/conversas\/([0-9a-f-]{36})\/resolvido$/, async (_q, res, [id]) => {
  await db.update('clientes', { id: `eq.${id}` }, { precisa_humano: false }); ir(res, `/painel/conversas/${id}`)
}, true)

rota('GET', /^\/painel\/clientes\/([0-9a-f-]{36})$/, async (req, res, [id]) => { const h = await P.cliente(id, req.query); h ? html(res, h) : naoEncontrado(res) }, true)
rota('POST', /^\/painel\/clientes\/([0-9a-f-]{36})$/, async (req, res, [id]) => {
  const b = req.body!
  await db.update('clientes', { id: `eq.${id}` }, {
    nome: b.nome || null, nome_completo: b.nome_completo || null, nascimento: b.nascimento || null, email: b.email || null, etapa: b.etapa,
    memoria: String(b.memoria || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
  })
  ir(res, msg(`/painel/clientes/${id}`, 'ok', 'Dados salvos.'))
}, true)

rota('POST', /^\/painel\/mapas$/, async (req, res) => {
  const b = req.body!
  const volta = b.cliente_id ? `/painel/clientes/${b.cliente_id}` : '/painel/mapas'
  if (!b.nome || !/^\d{4}-\d{2}-\d{2}$/.test(b.nascimento || '')) return ir(res, msg(volta, 'erro', 'Preencha nome completo e data de nascimento.'))
  if (b.tipo === 'casal' && (!b.nome2 || !b.nascimento2)) return ir(res, msg(volta, 'erro', 'No mapa do casal, preencha os dados das duas pessoas.'))
  const m = await criarMapa({ clienteId: b.cliente_id || null, tipo: b.tipo === 'casal' ? 'casal' : 'pessoal', nome: b.nome, nascimento: b.nascimento, nome2: b.nome2, nascimento2: b.nascimento2 })
  let numero = soNumeros(b.whatsapp || '')
  if (!numero && b.enviar && b.cliente_id) numero = (await db.one('clientes', { id: `eq.${b.cliente_id}` }))?.whatsapp || ''
  if (numero) {
    try { await enviarMapa(m, numero); return ir(res, msg(volta, 'ok', 'Mapa gerado e enviado no WhatsApp.')) }
    catch (e: any) { return ir(res, msg(volta, 'erro', 'Mapa gerado, mas não consegui enviar: ' + e.message)) }
  }
  ir(res, msg(volta, 'ok', `Mapa gerado! Link: /m/${m.slug}`))
}, true)
rota('POST', /^\/painel\/mapas\/([0-9a-f-]{36})\/pdf$/, async (_q, res, [id]) => {
  const m = await db.one<MapaRow>('mapas', { id: `eq.${id}` })
  if (!m) return naoEncontrado(res)
  try { await pdfDoMapa(m, true); ir(res, msg('/painel/mapas', 'ok', 'PDF gerado de novo.')) } catch (e: any) { ir(res, msg('/painel/mapas', 'erro', e.message)) }
}, true)

rota('POST', /^\/painel\/financeiro\/despesa$/, async (req, res) => {
  const b = req.body!
  const valor = Number(String(b.valor || '').replace(/\./g, '').replace(',', '.'))
  if (!b.descricao || !(valor > 0)) return ir(res, msg('/painel/financeiro', 'erro', 'Informe descrição e valor.'))
  await db.insert('despesas', { descricao: b.descricao, categoria: b.categoria || 'outros', valor, data: b.data || undefined })
  ir(res, msg('/painel/financeiro', 'ok', 'Gasto adicionado.'))
}, true)
rota('POST', /^\/painel\/financeiro\/despesa\/([0-9a-f-]{36})\/apagar$/, async (_q, res, [id]) => { await db.remove('despesas', { id: `eq.${id}` }); ir(res, '/painel/financeiro') }, true)
rota('POST', /^\/painel\/pagamentos\/([0-9a-f-]{36})\/conferir$/, async (_q, res, [id]) => {
  const p = await db.one('pagamentos', { id: `eq.${id}` })
  if (p?.asaas_id) await pagamentoConfirmado(p.asaas_id).catch(() => {})
  const depois = await db.one('pagamentos', { id: `eq.${id}` })
  ir(res, msg('/painel/financeiro', depois?.status === 'pago' ? 'ok' : 'erro', depois?.status === 'pago' ? 'Pagamento confirmado e mapa enviado.' : 'O Asaas ainda não confirmou esse pagamento.'))
}, true)

rota('POST', /^\/painel\/ia\/persona$/, async (req, res) => {
  const b = req.body!
  await salvarConfig('persona', { nome: b.nome, apresentacao: b.apresentacao, tom: b.tom, regras_extras: b.regras_extras || '' })
  await salvarConfig('espera_ms', Math.min(60, Math.max(2, Number(b.espera) || 9)) * 1000)
  ir(res, msg('/painel/ia', 'ok', 'Personalidade salva.'))
}, true)
rota('POST', /^\/painel\/ia\/aprendizado$/, async (req, res) => {
  if (req.body?.texto) await db.insert('aprendizados', { texto: String(req.body.texto).slice(0, 400), origem: 'manual' })
  ir(res, msg('/painel/ia', 'ok', 'Aprendizado adicionado.'))
}, true)
rota('POST', /^\/painel\/ia\/aprendizado\/([0-9a-f-]{36})$/, async (_q, res, [id]) => {
  const a = await db.one('aprendizados', { id: `eq.${id}` })
  if (a) await db.update('aprendizados', { id: `eq.${id}` }, { ativo: !a.ativo })
  ir(res, '/painel/ia')
}, true)
rota('POST', /^\/painel\/produtos$/, async (req, res) => {
  const b = req.body!
  const arr = (v: any) => ([] as any[]).concat(v ?? [])
  const slugs = arr(b.slug), nomes = arr(b.nome), precos = arr(b.preco), descs = arr(b.descricao)
  for (let i = 0; i < slugs.length; i++) {
    const preco = Number(String(precos[i]).replace(',', '.'))
    if (!(preco > 0)) continue
    await db.update('produtos', { slug: `eq.${slugs[i]}` }, { nome: nomes[i], preco, descricao: descs[i] || '', ativo: !!b[`ativo_${slugs[i]}`] })
  }
  ir(res, msg('/painel/ia', 'ok', 'Produtos salvos.'))
}, true)

rota('POST', /^\/painel\/textos$/, async (req, res) => {
  const b = req.body!
  const volta = `/painel/textos?categoria=${encodeURIComponent(b.categoria)}&numero=${encodeURIComponent(b.numero)}`
  const t = String(b.conteudo || '').trim()
  if (t) await db.upsert('textos', { categoria: b.categoria, numero: b.numero, conteudo: t, atualizado_em: new Date().toISOString() }, 'categoria,numero')
  else await db.remove('textos', { categoria: `eq.${b.categoria}`, numero: `eq.${b.numero}` })
  ir(res, msg(volta, 'ok', t ? 'Texto salvo. Vale para o link ao vivo e os próximos PDFs.' : 'Voltou para o texto padrão.'))
}, true)

rota('GET', /^\/painel\/whatsapp$/, async (req, res) => {
  let estado: any = null
  try { estado = await whatsapp.estado() } catch (e: any) { estado = { state: 'não configurado: ' + e.message.slice(0, 80) } }
  const qr = ultimoQr && Date.now() - ultimoQr.em < 60_000 ? ultimoQr.qr : null
  html(res, await P.paginaWhatsapp(req.query, estado, qr))
}, true)
rota('POST', /^\/painel\/whatsapp\/conectar$/, async (_q, res) => {
  try {
    try { await whatsapp.criar() } catch { /* já existe */ }
    await whatsapp.webhook()
    const c = await whatsapp.conectar()
    if (c?.base64) ultimoQr = { qr: c.base64, em: Date.now() }
    ir(res, msg('/painel/whatsapp', 'ok', c?.base64 ? 'Leia o QR Code abaixo.' : 'WhatsApp configurado.'))
  } catch (e: any) { ir(res, msg('/painel/whatsapp', 'erro', e.message)) }
}, true)
rota('POST', /^\/painel\/whatsapp\/sair$/, async (_q, res) => { await whatsapp.sair().catch(() => {}); ir(res, msg('/painel/whatsapp', 'ok', 'Desconectado.')) }, true)

rota('POST', /^\/painel\/config\/marca$/, async (req, res) => {
  const b = req.body!
  await salvarConfig('marca', { nome: b.nome, subtitulo: b.subtitulo, assinatura: b.assinatura })
  ir(res, msg('/painel/config', 'ok', 'Marca salva. Gere o PDF de novo nos mapas antigos para atualizar.'))
}, true)
rota('POST', /^\/painel\/config\/admin$/, async (req, res) => {
  const b = req.body!
  if (String(b.senha || '').length < 8) return ir(res, msg('/painel/config', 'erro', 'A senha precisa ter pelo menos 8 caracteres.'))
  try { await db.insert('admins', { nome: b.nome, email: String(b.email).toLowerCase().trim(), senha_hash: hashSenha(String(b.senha)) }) }
  catch { return ir(res, msg('/painel/config', 'erro', 'Esse e-mail já tem acesso.')) }
  ir(res, msg('/painel/config', 'ok', 'Acesso criado.'))
}, true)

/* ---------------- servidor ---------------- */
const servidor = createServer(async (rq, res) => {
  const req = rq as Req
  const u = new URL(req.url || '/', 'http://x')
  req.query = u.searchParams
  try {
    const r = rotas.find(x => x.metodo === req.method && x.padrao.test(u.pathname))
    if (!r) return naoEncontrado(res)
    if (r.auth) {
      req.adminId = lerSessao(req.headers.cookie)
      if (!req.adminId) return req.method === 'GET' ? ir(res, '/login') : jsonRes(res, { erro: 'não autenticado' }, 401)
    }
    if (req.method === 'POST') req.body = await corpo(req)
    await r.h(req, res, (u.pathname.match(r.padrao) || []).slice(1))
  } catch (e: any) {
    console.error('[erro]', req.method, u.pathname, e)
    if (!res.headersSent) html(res, paginaSimples('Erro', `<h2>Algo deu errado</h2><p class="erro">${esc(e.message)}</p><p><a href="javascript:history.back()">Voltar</a></p>`), 500)
  }
})

const porta = Number(process.env.PORT || 3000)
servidor.listen(porta, () => console.log(`Mapa da Alma rodando na porta ${porta}`))

// Rede de segurança: a cada 10 min confere Pix pendentes (caso algum webhook do Asaas se perca).
setInterval(async () => {
  try {
    if (!process.env.ASAAS_API_KEY) return
    const pend = await db.select('pagamentos', { status: 'eq.pendente', asaas_id: 'not.is.null', criado_em: `gte.${new Date(Date.now() - 3 * 864e5).toISOString()}`, limit: 30 })
    for (const p of pend) await pagamentoConfirmado(p.asaas_id).catch(() => {})
  } catch (e) { console.error('[conferência pix]', e) }
}, 10 * 60_000)

void config; void cpfValido
