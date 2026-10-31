// Simuladores para teste: Supabase (PostgREST sobre Postgres real via psql), Evolution, Claude, Asaas, Browserless.
const http = require('http')
const { execFileSync } = require('child_process')
const { chromium } = require('playwright')

const PG = ['-h', '/tmp/pgmapa', '-p', '54329', '-U', 'postgres', '-t', '-A', '-q', '-v', 'ON_ERROR_STOP=1']
const sql = q => execFileSync('psql', [...PG, '-c', q], { encoding: 'utf8' }).trim()
const lit = v => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`
const ident = s => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('ident ' + s); return `"${s}"` }

function cond(col, expr) {
  const [op, ...rest] = expr.split('.'); const v = rest.join('.')
  const c = ident(col)
  if (op === 'not') { const [op2, ...r2] = v.split('.'); return `not (${cond(col, op2 + '.' + r2.join('.'))})` }
  if (op === 'is') return `${c} is ${v === 'null' ? 'null' : v}`
  if (op === 'in') return `${c}::text in (${v.replace(/^\(|\)$/g, '').split(',').map(lit).join(',')})`
  if (op === 'ilike') return `${c}::text ilike ${lit(v.replace(/\*/g, '%'))}`
  const m = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op]
  if (!m) throw new Error('op ' + op)
  return ['eq', 'neq'].includes(op) ? `${c}::text ${m} ${lit(v)}` : `${c} ${m} ${lit(v)}`
}
function grupo(s, junta) { // "(a.eq.1,b.gt.2)"
  const itens = s.replace(/^\(|\)$/g, '').split(',')
  return '(' + itens.map(i => { const [col, ...r] = i.split('.'); return cond(col, r.join('.')) }).join(junta) + ')'
}
function where(params) {
  const w = []
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue
    if (k === 'and') w.push(grupo(v, ' and '))
    else if (k === 'or') w.push(grupo(v, ' or '))
    else w.push(cond(k, v))
  }
  return w.length ? ' where ' + w.join(' and ') : ''
}
function selectList(t, sel) {
  const partes = []; let buf = '', d = 0
  for (const ch of sel) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { partes.push(buf); buf = '' } else buf += ch }
  if (buf) partes.push(buf)
  return partes.map(p => {
    const m = /^(\w+)\(([^)]*)\)$/.exec(p)
    if (m) return `(select row_to_json(x) from (select ${m[2].split(',').map(ident).join(',')} from ${ident(m[1])} where ${ident(m[1])}.id = t.cliente_id) x) as ${ident(m[1])}`
    return p === '*' ? 't.*' : 't.' + ident(p)
  }).join(',')
}
const storage = new Map()

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks); const body = raw.toString('utf8')
  try {
    if (u.pathname.startsWith('/storage/v1/object/pdfs/')) {
      const k = u.pathname.slice('/storage/v1/object/pdfs/'.length)
      if (req.method === 'POST') { storage.set(k, raw); res.end('{}'); return }
      if (!storage.has(k)) { res.writeHead(404); res.end(); return }
      res.end(storage.get(k)); return
    }
    if (u.pathname.startsWith('/rest/v1/rpc/')) { const fn = u.pathname.split('/').pop(); const a = JSON.parse(body || '{}'); sql(`select ${ident(fn)}(${Object.entries(a).map(([k, v]) => `${ident(k)} => ${lit(v)}`).join(',')})`); res.end('null'); return }
    const t = ident(u.pathname.split('/').pop()); const p = u.searchParams
    const ret = rows => { res.setHeader('content-type', 'application/json'); res.end(rows || '[]') }
    if (req.method === 'GET') {
      if ((req.headers.prefer || '').includes('count=exact')) { const n = sql(`select count(*) from ${t} t${where(p)}`); res.setHeader('content-range', `0-0/${n}`); return ret('[]') }
      let q = `select ${selectList(t, p.get('select') || '*')} from ${t} t${where(p)}`
      if (p.get('order')) q += ' order by ' + p.get('order').split(',').map(o => { const [c, dir, nl] = o.split('.'); return `${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}${nl === 'nullslast' ? ' nulls last' : ''}` }).join(',')
      if (p.get('limit')) q += ' limit ' + Number(p.get('limit'))
      return ret(sql(`select coalesce(json_agg(r),'[]') from (${q}) r`))
    }
    if (req.method === 'POST') {
      const rows = [].concat(JSON.parse(body)); const out = []
      for (const r of rows) {
        const cols = Object.keys(r).map(ident).join(',')
        const j = lit(JSON.stringify(r))
        let q = `insert into ${t} (${cols}) select ${Object.keys(r).map(ident).join(',')} from json_populate_record(null::${t}, ${j}::json)`
        if (p.get('on_conflict')) q += ` on conflict (${p.get('on_conflict').split(',').map(ident).join(',')}) do update set ${Object.keys(r).map(k => `${ident(k)}=excluded.${ident(k)}`).join(',')}`
        out.push(sql(`with ins as (${q} returning *) select row_to_json(ins) from ins`))
      }
      return ret('[' + out.join(',') + ']')
    }
    if (req.method === 'PATCH') {
      const r = JSON.parse(body); const j = lit(JSON.stringify(r))
      const sets = Object.keys(r).map(k => `${ident(k)} = (json_populate_record(null::${t}, ${j}::json)).${ident(k)}`).join(',')
      return ret(sql(`with up as (update ${t} t set ${sets}${where(p)} returning *) select coalesce(json_agg(up),'[]') from up`))
    }
    if (req.method === 'DELETE') { sql(`delete from ${t} t${where(p)}`); return ret('[]') }
  } catch (e) { console.error('[supabase mock]', e.message); res.writeHead(400); res.end(JSON.stringify({ message: e.message })) }
}).listen(7001)

// Evolution
global.enviados = []
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c
  const u = req.url
  res.setHeader('content-type', 'application/json')
  if (u.startsWith('/__enviados')) return res.end(JSON.stringify(global.enviados))
  if (u.startsWith('/instance/connectionState')) return res.end(JSON.stringify({ instance: { state: 'open' } }))
  if (u.startsWith('/message/')) { const b = JSON.parse(body); global.enviados.push({ tipo: u.split('/')[2], numero: b.number, texto: b.text || b.fileName, bytes: b.media ? b.media.length : 0 }); return res.end('{"key":{"id":"x"}}') }
  res.end('{}')
}).listen(7002)

// Claude: responde conforme a última mensagem do cliente
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c
  const b = JSON.parse(body); const ultima = b.messages[b.messages.length - 1].content
  let input
  if (b.tools[0].name === 'aprendizados') input = { itens: ['Explicar que o nome completo de nascimento muda o mapa gerou confiança.'] }
  else if (/CPF/i.test(ultima) && /529\.982\.247-25/.test(ultima)) input = { mensagens: ['Perfeito, Natalia! Dados conferidos 💜 Vou gerar o seu Pix agora.'], etapa: 'pix', acao: 'gerar_pix', resumo: 'Cliente quer o mapa pessoal; dados e CPF informados.', memoria_nova: ['é de Áries'], dados: { produto: 'pessoal', nome_completo: 'Natalia Dantas Teixeira', nascimento: '1996-04-15', cpf: '529.982.247-25' } }
  else input = { mensagens: ['Oi! Que bom ter você aqui ✨ Eu sou a Clara, do Mapa da Alma.', 'Você quer conhecer o seu mapa pessoal ou o mapa do casal?'], etapa: 'conversando', acao: 'nenhuma', resumo: 'Cliente chegou interessada no mapa.', memoria_nova: [] }
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ model: 'mock', usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: 'tool_use', name: b.tools[0].name, input }] }))
}).listen(7003)

// Browserless: gera o PDF de verdade com o Chromium local
let browser
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c
  const b = JSON.parse(body)
  browser = browser || await chromium.launch()
  const pg = await browser.newPage()
  await pg.setContent(b.html, { waitUntil: 'load' })
  const pdf = await pg.pdf({ ...b.options })
  await pg.close()
  res.setHeader('content-type', 'application/pdf'); res.end(pdf)
}).listen(7004)

// Asaas
const pagos = new Set()
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c
  const u = req.url; res.setHeader('content-type', 'application/json')
  if (u.startsWith('/__pagar/')) { pagos.add(u.split('/')[2]); return res.end('{}') }
  if (u.startsWith('/customers?')) return res.end('{"data":[]}')
  if (u === '/customers') return res.end('{"id":"cus_1"}')
  if (u === '/payments') return res.end('{"id":"pay_1","invoiceUrl":"https://asaas/i/pay_1"}')
  if (u.endsWith('/pixQrCode')) return res.end('{"payload":"00020126PIXCOPIAECOLA","expirationDate":"2026-11-02 23:59:59"}')
  if (u.startsWith('/payments/')) { const id = u.split('/')[2]; return res.end(JSON.stringify({ id, status: pagos.has(id) ? 'RECEIVED' : 'PENDING' })) }
  res.end('{}')
}).listen(7005)

console.log('mocks prontos')
