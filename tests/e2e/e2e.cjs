// Teste ponta a ponta do Mapa da Alma contra os simuladores.
const { spawn } = require('child_process')
const assert = require('assert')
const BASE = 'http://localhost:3999'
const env = { ...process.env, PORT: '3999', APP_URL: BASE, SUPABASE_URL: 'http://localhost:7001', SUPABASE_SERVICE_ROLE_KEY: 'x',
  WEBHOOK_SECRET: 'wh', EVOLUTION_API_URL: 'http://localhost:7002', EVOLUTION_API_KEY: 'k',
  ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: 'http://localhost:7003', BROWSERLESS_URL: 'http://localhost:7004', ASAAS_API_KEY: 'k', ASAAS_BASE_URL: 'http://localhost:7005', ASAAS_WEBHOOK_TOKEN: 'asaas' }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const ok = []; const passo = (n) => { ok.push(n); console.log('✔', n) }
;(async () => {
  const app = spawn('node', ['--experimental-strip-types', '--no-warnings', 'src/server.ts'], { cwd: require('path').resolve(__dirname, '../..'), env })
  let log = ''; app.stdout.on('data', d => log += d); app.stderr.on('data', d => log += d)
  await sleep(1500)
  try {
    let r = await fetch(BASE + '/login', { redirect: 'manual' }); assert.equal(r.headers.get('location'), '/primeiro-acesso'); passo('sem admin → primeiro acesso')
    r = await fetch(BASE + '/primeiro-acesso', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'nome=Matheus&email=m%40x.com&senha=senha1234' })
    const cookie = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; '); assert(cookie.includes('sb_access=')); passo('admin criado no Supabase Auth e logado')
    r = await fetch(BASE + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=m%40x.com&senha=errada' }); assert(r.headers.get('location').includes('erro')); passo('senha errada é recusada')
    r = await fetch(BASE + '/painel', { headers: { cookie: 'sb_refresh=r-u0-0000-0000-0000-000000000000' }, redirect: 'manual' }); assert.equal(r.status, 200); passo('sessão renova sozinha pelo refresh token')
    const g = (p) => fetch(BASE + p, { headers: { cookie }, redirect: 'manual' })
    const post = (p, b) => fetch(BASE + p, { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b).toString(), redirect: 'manual' })
    assert.equal((await fetch(BASE + '/painel', { redirect: 'manual' })).status, 303); passo('painel bloqueado sem login')
    for (const p of ['/painel', '/painel/conversas', '/painel/clientes', '/painel/mapas', '/painel/financeiro', '/painel/ia', '/painel/textos', '/painel/textos?categoria=signo', '/painel/whatsapp', '/painel/config']) {
      r = await g(p); const t = await r.text(); assert.equal(r.status, 200, p + ' ' + t.slice(0, 300))
    }
    passo('todas as telas do painel abrem')
    r = await post('/painel/mapas', { tipo: 'pessoal', nome: 'Natalia Dantas Teixeira', nascimento: '1996-04-15' })
    const slug = decodeURIComponent(r.headers.get('location')).match(/\/m\/([a-z0-9-]+)/)[1]; passo('mapa criado pelo painel: ' + slug)
    r = await fetch(BASE + '/m/' + slug); let t = await r.text(); assert(t.includes('Natalia Dantas Teixeira') && t.includes('59 › 5')); passo('link ao vivo abre com os números certos')
    r = await fetch(BASE + '/m/' + slug + '.pdf'); const pdf = Buffer.from(await r.arrayBuffer()); assert(pdf.slice(0, 4).toString() === '%PDF' && pdf.length > 50000); passo(`PDF gerado (${Math.round(pdf.length / 1024)} KB)`)
    require('fs').writeFileSync(__dirname + '/teste.pdf', pdf)
    r = await post('/painel/mapas', { tipo: 'casal', nome: 'Natalia Dantas Teixeira', nascimento: '1996-04-15', nome2: 'Matheus Rangel', nascimento2: '1990-07-20' })
    const slug2 = decodeURIComponent(r.headers.get('location')).match(/\/m\/([a-z0-9-]+)/)[1]
    t = await (await fetch(BASE + '/m/' + slug2)).text(); assert(t.includes('A compatibilidade de vocês')); passo('mapa do casal ao vivo')
    r = await post('/painel/textos', { categoria: 'motivacao', numero: '1', conteudo: 'Texto personalizado de teste.' })
    t = await (await fetch(BASE + '/m/' + slug)).text(); assert(t.includes('Texto personalizado de teste.')); passo('texto editado no painel aparece no mapa')
    // WhatsApp: cliente chega
    const wh = (texto, id) => fetch(BASE + '/api/webhooks/evolution?token=wh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: 'messages.upsert', data: { key: { remoteJid: '5511988887777@s.whatsapp.net', fromMe: false, id }, pushName: 'Nati', message: { conversation: texto } } }) })
    assert.equal((await fetch(BASE + '/api/webhooks/evolution?token=errado', { method: 'POST', body: '{}' })).status, 401); passo('webhook recusa token errado')
    await post('/painel/ia/persona', { nome: 'Clara', apresentacao: 'consultora', tom: 'calmo', regras_extras: '', espera: '2' })
    await wh('Oi, vi o anúncio do mapa', 'm1'); await wh('Oi, vi o anúncio do mapa', 'm1')
    await sleep(25000)
    let env1 = await (await fetch('http://localhost:7002/__enviados')).json()
    assert(env1.some(e => e.texto.includes('Clara')), JSON.stringify(env1) + log.slice(-2000)); passo('IA respondeu no WhatsApp (e ignorou mensagem duplicada)')
    await wh('Quero o pessoal. Natalia Dantas Teixeira, 15/04/1996, CPF 529.982.247-25', 'm2')
    await sleep(25000)
    env1 = await (await fetch('http://localhost:7002/__enviados')).json()
    assert(env1.some(e => e.texto === '00020126PIXCOPIAECOLA'), JSON.stringify(env1) + log.slice(-2000)); passo('Pix copia e cola enviado')
    // pagamento
    assert.equal((await fetch(BASE + '/api/webhooks/asaas', { method: 'POST', headers: { 'content-type': 'application/json', 'asaas-access-token': 'errado' }, body: '{}' })).status, 401)
    await fetch('http://localhost:7005/__pagar/pay_1')
    await fetch(BASE + '/api/webhooks/asaas', { method: 'POST', headers: { 'content-type': 'application/json', 'asaas-access-token': 'asaas' }, body: JSON.stringify({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1' } }) })
    await sleep(15000)
    env1 = await (await fetch('http://localhost:7002/__enviados')).json()
    const doc = env1.find(e => e.tipo === 'sendMedia'); assert(doc && doc.bytes > 50000, JSON.stringify(env1) + log.slice(-2000)); passo('pagamento confirmado → mapa gerado e PDF enviado no WhatsApp: ' + doc.texto)
    assert(env1.some(e => /\/m\/natalia-dantas-teixeira-/.test(e.texto))); passo('link ao vivo enviado junto')
    for (const p of ['/painel', '/painel/conversas', '/painel/clientes', '/painel/financeiro', '/painel/ia']) { r = await g(p); assert.equal(r.status, 200, p) }
    t = await (await g('/painel/financeiro')).text(); assert(t.includes('R$ 47,00')); passo('financeiro mostra a venda')
    t = await (await g('/painel/ia')).text(); assert(t.includes('nome completo de nascimento muda o mapa')); passo('IA guardou aprendizado da venda')
    t = await (await g('/painel/conversas')).text(); const cid = t.match(/\/painel\/conversas\/([0-9a-f-]{36})/)[1]
    t = await (await g('/painel/conversas/' + cid)).text(); assert(t.includes('Mapa enviado')); passo('conversa completa no painel')
    console.log(`\n${ok.length} etapas OK`)
  } catch (e) { console.error('FALHOU:', e.message.slice(0, 3000)); console.error(log.slice(-3000)); process.exitCode = 1 }
  app.kill()
})()
