/* Testes das regras que não dependem de serviços externos. Rodar: npm test */
import assert from 'node:assert/strict';
import { toWhatsapp, waKey, formatPhone } from '../src/lib/phone';
import { computeScore } from '../src/lib/score';
import { deepMerge, DEFAULT_SETTINGS } from '../src/lib/settings';
import { inBusinessHours, haversineKm } from '../src/lib/util';
import { instagramFromUrl } from '../src/lib/website';
import { chunkText, buildQuery } from '../src/lib/knowledge';
import { floorFor } from '../src/lib/engine';
import { dailyLimit } from '../src/lib/limits';
import { cleanDocument, formatDocument } from '../src/lib/asaas';
import { extenso, receiptHtml } from '../src/lib/receipt';
import { explainGoogleError } from '../src/lib/places';
import { newSlug, isMonthly, checkoutBase } from '../src/lib/checkout';
import { aiCost } from '../src/lib/usage';
import { salesSystem } from '../src/lib/prompts';
import { bubbles, fixShape } from '../src/lib/ai';
import { cleanText } from '../src/lib/knowledge';

let ok = 0;
const pending: Promise<any>[] = [];
const t = (name: string, fn: () => any) => {
  const r = fn();
  if (r && typeof r.then === 'function') {
    pending.push(
      r.then(
        () => (ok++, console.log('ok -', name)),
        (e: any) => {
          console.error('FALHOU -', name, e);
          process.exit(1);
        },
      ),
    );
    return;
  }
  ok++;
  console.log('ok -', name);
};

t('celular vira número de WhatsApp', () => {
  assert.equal(toWhatsapp('(19) 99812-3456'), '5519998123456');
  assert.equal(toWhatsapp('+55 19 99812-3456'), '5519998123456');
  assert.equal(toWhatsapp('(19) 9812-3456'), '5519998123456'); // sem o nono dígito
  assert.equal(toWhatsapp('(19) 3451-2000'), null); // fixo
});

t('mesma chave com e sem nono dígito', () => {
  assert.equal(waKey('5519998123456@s.whatsapp.net'), waKey('551998123456@s.whatsapp.net'));
  assert.equal(formatPhone('5519998123456'), '(19) 99812-3456');
});

t('pontuação: sem site e canais = alta; bem avaliado sem site vale mais', () => {
  const r = computeScore({ site_status: 'nenhum', reviews: 4, rating: 4.9, photos: 2, has_hours: false, whatsapp: '55', instagram: '@x' });
  assert.equal(r.score, 80); // 35 sem site + 5 poucas avaliações + 10 fotos + 10 ficha + 10 + 10
  const r1 = computeScore({ site_status: 'nenhum', reviews: 4, rating: 3.9, photos: 2, has_hours: false, whatsapp: '55', instagram: '@x' });
  assert.equal(r1.score, 90);
  // negócio estabelecido (4,3+ e 30+ avaliações) sem site: prioridade
  const est = computeScore({ site_status: 'nenhum', reviews: 80, rating: 4.7, photos: 20, has_hours: true, whatsapp: '55', instagram: null });
  assert.equal(est.score, 70); // 35 + 25 + 10
  const r2 = computeScore({ site_status: 'ok', reviews: 120, rating: 4.8, photos: 20, has_hours: true, whatsapp: null, instagram: null });
  assert.equal(r2.score, 13); // só metade do bônus de bem avaliado
});

t('configurações mesclam com o padrão', () => {
  const s = deepMerge(DEFAULT_SETTINGS, { limits: { mature: 50 }, paused: true });
  assert.equal(s.limits.mature, 50);
  assert.equal(s.limits.week1, DEFAULT_SETTINGS.limits.week1);
  assert.equal(s.paused, true);
});

t('horário comercial em São Paulo', () => {
  const hours = { start: '08:00', end: '19:00', days: [1, 2, 3, 4, 5, 6] };
  assert.equal(inBusinessHours(hours, new Date('2026-10-23T12:00:00-03:00')), true); // sexta 12h
  assert.equal(inBusinessHours(hours, new Date('2026-10-23T20:00:00-03:00')), false); // sexta 20h
  assert.equal(inBusinessHours(hours, new Date('2026-10-25T12:00:00-03:00')), false); // domingo
});

t('distância entre Limeira e Americana', () => {
  const d = haversineKm({ lat: -22.564, lng: -47.401 }, { lat: -22.739, lng: -47.331 });
  assert.ok(d > 18 && d < 22);
});

t('Instagram encontrado no site', () => {
  assert.equal(instagramFromUrl('<a href="https://www.instagram.com/fisio.maria/">'), '@fisio.maria');
  assert.equal(instagramFromUrl('https://instagram.com/p/abc123'), null);
});

t('texto dividido em trechos', () => {
  const parts = chunkText(('Parágrafo de vendas com bastante conteúdo útil. '.repeat(30) + '\n\n').repeat(5));
  assert.ok(parts.length >= 5);
  assert.ok(parts.every((p) => p.length <= 1200));
});

t('piso de negociação respeita a aprovação', () => {
  const services = [{ slug: 'site', min_price: 299, max_price: 799, price_steps: [799, 649, 549, 449, 299], approval_from: 449 }];
  assert.equal(floorFor({}, services), 549);
  assert.equal(floorFor({ approved_price: 449 }, services), 449);
  assert.equal(floorFor({ approved_price: 100 }, services), 299);
});

t('limite diário por fase', () => {
  const limits = { week1: 20, week2: 40, mature: 70 };
  assert.equal(dailyLimit({ phase_started_at: new Date().toISOString() }, limits), 20);
  assert.equal(dailyLimit({ phase_started_at: new Date(Date.now() - 10 * 86400000).toISOString() }, limits), 40);
  assert.equal(dailyLimit({ phase_started_at: new Date(Date.now() - 40 * 86400000).toISOString() }, limits), 70);
});

t('CPF e CNPJ válidos e inválidos', () => {
  assert.equal(cleanDocument('529.982.247-25'), '52998224725');
  assert.equal(cleanDocument('111.111.111-11'), null);
  assert.equal(cleanDocument('529.982.247-24'), null);
  assert.equal(cleanDocument('11.222.333/0001-81'), '11222333000181');
  assert.equal(formatDocument('11222333000181'), '11.222.333/0001-81');
});

t('valor por extenso no recibo', () => {
  assert.equal(extenso(549), 'quinhentos e quarenta e nove reais');
  assert.equal(extenso(799.9), 'setecentos e noventa e nove reais e noventa centavos');
  assert.equal(extenso(1200), 'mil e duzentos reais');
  assert.equal(extenso(100), 'cem reais');
});

t('recibo traz cliente, documento e valor', () => {
  const html = receiptHtml({ number: '00012', date: '23 de outubro de 2026', company: { legal_name: 'Fênix Ads', city: 'Limeira/SP' }, companyName: 'x', client: { name: 'Dra. Maria <Souza>', document: '52998224725' }, service: 'Criação de site', amount: 549, paymentRef: 'pay_1' });
  assert.ok(html.includes('Dra. Maria &lt;Souza&gt;'));
  assert.ok(html.includes('529.982.247-25'));
  assert.ok(html.includes('R$ 549,00'));
});

t('busca da base entende objeção de preço', () => {
  const q = buildQuery('Achei muito caro, vou pensar', 'negociando');
  assert.ok(q.includes('preço') && q.includes('objeção'));
  assert.ok(!q.includes('muito'));
  assert.ok(/^[a-zà-ÿ| ]+$/.test(q));
});

t('erros do Google viram causa e solução', () => {
  const a = explainGoogleError(403, JSON.stringify({ error: { code: 403, message: 'The caller does not have permission', status: 'PERMISSION_DENIED' } }));
  assert.ok(a.fix.includes('chave NOVA'));
  const b = explainGoogleError(403, JSON.stringify({ error: { message: 'x', details: [{ reason: 'API_KEY_SERVICE_BLOCKED' }] } }));
  assert.ok(b.cause.includes('restrição de API'));
  const c = explainGoogleError(403, JSON.stringify({ error: { message: 'Places API (New) has not been used in project 1 before or it is disabled', details: [{ reason: 'SERVICE_DISABLED' }] } }));
  assert.ok(c.cause.includes('não está ativada'));
});

t('links de pagamento', () => {
  const s = newSlug();
  assert.equal(s.length, 8);
  assert.ok(/^[a-zA-Z0-9]+$/.test(s));
  assert.ok(isMonthly('Mensal') && !isMonthly('Pagamento único'));
  assert.equal(checkoutBase({ checkout: { base_url: 'pagar.fenix.com.br/' } }), 'https://pagar.fenix.com.br');
});

t('custo da IA por modelo', () => {
  assert.equal(aiCost('claude-haiku-5-5', 1_000_000, 0), 0.1);
  assert.equal(aiCost('claude-sonnet-5-5', 0, 1_000_000), 10);
  assert.ok(aiCost('claude-haiku-5-5', 3000, 150) < 0.001);
  // cache: ler 1M tokens do cache custa 10% da entrada normal
  assert.ok(Math.abs(aiCost('claude-sonnet-5-5', 0, 0, 0, 1_000_000) - 0.2) < 1e-9);
  assert.ok(Math.abs(aiCost('claude-sonnet-5-5', 0, 0, 1_000_000, 0) - 2.5) < 1e-9);
});

t('prompt de vendas separa parte fixa (cache) da parte do cliente', () => {
  const p = salesSystem({ settings: DEFAULT_SETTINGS, services: [], approach: null, playbook: null, objections: [], brains: 'CEREBRO', situation: 'SITUACAO', lead: { name: 'Clínica X', reviews: 1, photos: 0 }, floor: 549 });
  assert.ok(p.cached.includes('CEREBRO') && !p.cached.includes('Clínica X') && !p.cached.includes('549'));
  assert.ok(p.rest.includes('SITUACAO') && p.rest.includes('Clínica X') && p.rest.includes('549'));
});

t('balões: no máximo 3, sem vazios', () => {
  assert.deepEqual(bubbles({ messages: ['Opa!', '', 'Sai a partir de R$ 299', 'Faz sentido?', 'extra'] }), ['Opa!', 'Sai a partir de R$ 299', 'Faz sentido? extra']);
  assert.deepEqual(bubbles({ reply: 'Oi\n\nTudo bem?' }), ['Oi', 'Tudo bem?']);
  assert.deepEqual(bubbles({ messages: [] }), []);
});

t('resposta da IA fora do formato é consertada', () => {
  const schema = { type: 'object', properties: { insights: { type: 'array', items: { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' } } } } } } };
  const r = fixShape({ insights: JSON.stringify([{ title: 'x', tags: 'preço' }]) }, schema);
  assert.ok(Array.isArray(r.insights) && Array.isArray(r.insights[0].tags));
  assert.deepEqual(fixShape({ insights: { a: { title: 'y' } } }, schema).insights, [{ title: 'y' }]);
});

t('texto de PDF sem caracteres que o banco recusa', () => {
  const t1 = cleanText('Venda\u0000s ok \uD83D fim');
  assert.ok(!t1.includes('\u0000') && !/[\uD800-\uDFFF]/.test(t1));
  assert.equal(cleanText('emoji 😊 ok'), 'emoji 😊 ok');
});

t('não repete frase já dita', () => {
  const { similar } = require('../src/lib/engine');
  assert.ok(similar('Hoje, quando alguém indicado procura você no Google, o que aparece pra essa pessoa?', 'Hoje, quando alguém indicado procura você no Google, acha alguma coisa ou fica no escuro?') > 0.55);
  assert.ok(similar('Prefere Pix ou cartão?', 'Hoje seus clientes chegam pelo Instagram ou Google?') < 0.4);
});

t('cor pedida pelo cliente vira cor do site', () => {
  const { colorFrom } = require('../src/lib/preview');
  assert.equal(colorFrom('pode ser um verde!'), '#16a34a');
  assert.equal(colorFrom('azul marinho'), '#1e3a8a');
  assert.equal(colorFrom('#123abc'), '#123abc');
  assert.equal(colorFrom('tanto faz'), null);
});

t('técnica de linguagem corporal é barrada; técnica de texto passa', () => {
  const { isOfflineTechnique } = require('../src/lib/knowledge');
  assert.ok(isOfflineTechnique({ title: 'Aperto de mão firme', content: 'Cumprimente com firmeza' }));
  assert.ok(isOfflineTechnique('Mantenha contato visual e levante a sobrancelha ao fazer a pergunta'));
  assert.ok(isOfflineTechnique('Use linguagem corporal aberta, sem braços cruzados'));
  assert.ok(!isOfflineTechnique({ title: 'Pergunta de implicação', content: 'Pergunte o que acontece se nada mudar', example: 'E se continuar assim, quanto cliente você perde por mês?' }));
  assert.ok(!isOfflineTechnique('Dê um toque no cliente depois de 2 dias com uma pergunta leve'));
  assert.ok(!isOfflineTechnique('Mantenha o tom de voz da marca nas mensagens escritas'));
});

t('cérebro usa ~70% primário e ~30% secundário', () => {
  const { pickForBrain } = require('../src/lib/knowledge');
  const prio = { a: 'primario', b: 'secundario' };
  const list = [...Array.from({ length: 300 }, (_, i) => ({ id: i, doc_id: 'a', kind: 'tecnica', wins: 0 })), ...Array.from({ length: 300 }, (_, i) => ({ id: 1000 + i, doc_id: 'b', kind: 'copy', wins: 0 }))];
  const p = pickForBrain(list, prio, 100);
  assert.equal(p.length, 100);
  assert.equal(p.filter((x: any) => x.doc_id === 'a').length, 70);
  // poucas do primário: o secundário completa
  const p2 = pickForBrain([...list.slice(0, 10), ...list.slice(300)], prio, 100);
  assert.equal(p2.length, 100);
  assert.equal(p2.filter((x: any) => x.doc_id === 'a').length, 10);
});

t('técnicas da conversa: cota 70/30 por prioridade', () => {
  const { priorityMix } = require('../src/lib/intel');
  const l = [...Array.from({ length: 6 }, (_, i) => ({ id: i, priority: 'secundario' })), ...Array.from({ length: 6 }, (_, i) => ({ id: 10 + i, priority: 'primario' }))];
  const r = priorityMix(l, 6);
  assert.equal(r.length, 6);
  assert.equal(r.filter((x: any) => x.priority === 'primario').length, 4);
  assert.deepEqual(priorityMix(l.slice(0, 6), 3).length, 3);
});

t('Prompt Master vai no topo absoluto', () => {
  const { withMaster, masterBlock } = require('../src/lib/intel');
  assert.equal(masterBlock(''), '');
  assert.ok(withMaster('Nunca prometa prazo menor que 7 dias', 'Você é Ana').startsWith('PROMPT MASTER'));
  const { salesSystem } = require('../src/lib/prompts');
  const { DEFAULT_SETTINGS } = require('../src/lib/settings');
  const sys = salesSystem({ settings: DEFAULT_SETTINGS, services: [], approach: null, playbook: null, objections: [], brains: 'CEREBRO', master: masterBlock('LEI DA AGENCIA'), situation: '', lead: { name: 'X', reviews: 1, photos: 0 }, floor: null });
  assert.ok(sys.cached.startsWith('PROMPT MASTER'));
  assert.ok(sys.cached.indexOf('LEI DA AGENCIA') < sys.cached.indexOf('CEREBRO'));
});

t('sem desespero: não cobra pagamento nem repete o pedido do link', () => {
  const { payPace, pushyBubble } = require('../src/lib/engine');
  const hist = [
    { direction: 'out', author: 'ai', body: 'O site completo sai por R$ 549, pagamento único.' },
    { direction: 'out', author: 'ai', body: 'Posso te mandar o link?' },
    { direction: 'in', author: 'lead', body: 'vou ver com meu sócio' },
  ];
  const pace = payPace(hist, { stage: 'negociando' }, 'vou ver com meu sócio');
  assert.ok(pace.askedRecently && !pace.clientTalksPay);
  assert.ok(pushyBubble('Te mando o link pra garantir?', pace));
  assert.ok(pushyBubble('E aí, conseguiu pagar?', { askedRecently: false, linkSent: false, clientTalksPay: false }));
  assert.ok(!pushyBubble('Tranquilo, sem pressa! O que ele costuma olhar primeiro num site?', pace));
  // o cliente puxou o assunto: pode falar
  assert.ok(!pushyBubble('Te mando o link?', payPace(hist, { stage: 'negociando' }, 'como faço pra pagar?')));
  // depois do link enviado, pedir de novo é cobrança
  const p2 = payPace([{ direction: 'out', author: 'ai', body: 'Aqui o link de pagamento: https://x.com/pagar/abc' }], { stage: 'pix' }, 'ok');
  assert.ok(pushyBubble('Deu certo o pagamento?', p2) && pushyBubble('Quer que eu te mande o link de novo?', p2));
});

t('mensagem pela metade espera o resto', () => {
  const { looksUnfinished } = require('../src/lib/engine');
  assert.ok(looksUnfinished('oi'));
  assert.ok(looksUnfinished('boa tarde!'));
  assert.ok(looksUnfinished('queria saber sobre o site e'));
  assert.ok(looksUnfinished('então,'));
  assert.ok(!looksUnfinished('quanto custa o site?'));
  assert.ok(!looksUnfinished('tenho uma clínica de estética em Campinas'));
});

t('a IA nunca diz que é IA/robô nem que é humana', () => {
  const { selfIdentifies } = require('../src/lib/engine');
  for (const x of ['Sou uma assistente virtual da equipe', 'Eu sou uma IA, mas posso ajudar', 'Não sou robô não, rsrs', 'Sou humana sim!', 'Essa é uma mensagem automática', 'aqui é o atendimento automático']) assert.ok(selfIdentifies(x), x);
  for (const x of ['Vou chamar alguém da equipe pra continuar com você aqui', 'Sou a Natália, da equipe 😊', 'A gente faz o site completo em 7 dias']) assert.ok(!selfIdentifies(x), x);
});

t('texto do áudio sai falável', () => {
  const { speakable } = require('../src/lib/voice');
  assert.equal(speakable('Fica R$ 549 rsrs 😊'), 'Fica 549 reais');
  assert.equal(speakable('Sai por R$ 1.290,50!'), 'Sai por 1290 reais e 50 centavos!');
});

t('momentos de voz ligam e desligam', () => {
  const { momentOn } = require('../src/lib/voice');
  const { DEFAULT_SETTINGS } = require('../src/lib/settings');
  assert.ok(momentOn(DEFAULT_SETTINGS, 'boas_vindas'));
  assert.ok(!momentOn({ voice: { moments: { boas_vindas: { on: false } } } }, 'boas_vindas'));
  assert.ok(!momentOn({ voice: { on_client_audio: false } }, 'cliente_audio'));
  assert.ok((DEFAULT_SETTINGS.voice.moments.boas_vindas.scripts || []).every((x: string) => x.includes('{atendente}')));
});

t('APP_URL vira só o endereço base', () => {
  const { appBase } = require('../src/lib/util');
  assert.equal(appBase('https://radar-painel.zcluoa.easypanel.host/api/google/drive/callback'), 'https://radar-painel.zcluoa.easypanel.host');
  assert.equal(appBase('https://radar-painel.zcluoa.easypanel.host/'), 'https://radar-painel.zcluoa.easypanel.host');
  assert.equal(appBase('radar-painel.zcluoa.easypanel.host'), 'https://radar-painel.zcluoa.easypanel.host');
});

t('modelo premium: conteúdo e cores do cliente entram na página', () => {
  const { renderPremium, themeFor, slugify } = require('../src/lib/premium');
  const html = '<html><head><title>X</title><script type="application/ld+json">{"a":1}</script></head><body><div id="root"></div></body></html>';
  const out = renderPremium(html, { site: { brand: { name: 'Clínica <Sol>' } }, theme: themeFor('verde'), title: 'Clínica Sol' });
  assert.ok(out.indexOf('window.__SITE_CONTENT__') < out.indexOf('</head>'));
  assert.ok(!out.includes('ld+json'));
  assert.ok(out.includes('<title>Clínica Sol</title>'));
  assert.ok(out.includes('--primary:#16a34a'));
  assert.ok(!out.includes('<Sol>'));
  assert.equal(slugify('Odontologia Premium!'), 'odontologia-premium');
  assert.equal(themeFor('tanto faz'), null);
});

t('zip da Arena: tira a pasta de fora e exige content.ts', async () => {
  const JSZip = require('jszip');
  const { readZip } = require('../src/lib/premium');
  const z = new JSZip();
  z.file('meu-site/package.json', '{}');
  z.file('meu-site/src/content.ts', 'export default content;');
  z.file('meu-site/node_modules/x/index.js', 'x');
  const files = await readZip(await z.generateAsync({ type: 'nodebuffer' }));
  assert.deepEqual(files.map((f: any) => f.path).sort(), ['package.json', 'src/content.ts']);
});

t('domínio: limpa endereço e separa raiz de subdomínio', () => {
  const { cleanHost, splitHost, validHost } = require('../src/lib/domains');
  assert.equal(cleanHost('https://Painel.Fenix.com.br/conversas'), 'painel.fenix.com.br');
  assert.deepEqual(splitHost('painel.fenix.com.br'), { root: 'fenix.com.br', sub: 'painel', isRoot: false });
  assert.equal(splitHost('fenix.com.br').isRoot, true);
  assert.equal(splitHost('fenixads.com').isRoot, true);
  assert.ok(validHost('pagar.fenix.com.br') && !validHost('fenix'));
});

t('prévia premium: cidade do modelo e última cor pedida', () => {
  const { cityOf, latestColor } = require('../src/lib/premium');
  assert.equal(cityOf({ contact: { address: 'Rua da Boa Morte, 480 — Sala 12, Centro, Limeira/SP' } }), 'Limeira');
  assert.equal(latestColor({ cor_preferida: 'verde', pedidos_previa: ['trocar o nome', 'mudar a cor para azul marinho'] }), 'mudar a cor para azul marinho');
  assert.equal(latestColor({ cor_preferida: 'rosa', pedidos_previa: ['tirar os planos'] }), 'rosa');
});

t('IA não manda link de prévia por conta própria (só o sistema, conferido)', () => {
  const txt = 'Segue de novo: https://radar-painel.zcluoa.easypanel.host/previa/natalia-dantas-wdwq olha aí';
  assert.equal(txt.replace(/https?:\/\/\S*\/(previa|site)\/\S+/gi, '').replace(/\s{2,}/g, ' ').trim(), 'Segue de novo: olha aí');
});

t('prévia prometida ou pedida sempre gera o link', () => {
  const { previewPromised, previewRequested } = require('../src/lib/engine');
  assert.ok(previewPromised('Fechou, Matheus, deixa comigo então! Já deixei a prévia pronta, em vermelho e preto, com seu nome e Limeira e região de Campinas:'));
  assert.ok(previewPromised('Verdade, Matheus, desculpa a falha! Aqui está a prévia:'));
  assert.ok(previewPromised('Show, Matheus, bora fazer! Vou montar a prévia com web design e já te mando aqui.'));
  assert.ok(!previewPromised('Nesse valor fica mais tranquilo de você se organizar na semana que vem?'));
  assert.ok(previewRequested('Você não me mandou o link'));
  assert.ok(previewRequested('Então, monta uma prévia aí, gera um modelo, um exemplo, um esboço para eu ver.'));
  assert.ok(previewRequested('cadê o link?'));
  assert.ok(!previewRequested('mas ainda não vim pra comprar hoje não'));
});

t('pedido de versão nova também gera (e link de pagamento não confunde)', () => {
  const { previewPromised, previewRequested, changeRequest } = require('../src/lib/engine');
  assert.ok(previewRequested('Quero que você gere uma versão em azul agora'));
  assert.ok(previewPromised('Claro, Matheus, vou gerar a versão em azul agora.'));
  assert.ok(previewPromised('Quando chegar, me conta se prefere ela ou a vermelha e preta?'));
  assert.ok(!previewRequested('me manda o link de pagamento'));
  assert.ok(!previewRequested('quanto custa fazer um site?'));
  assert.ok(!previewPromised('Posso te mandar o link de pagamento?'));
  assert.equal(changeRequest('Quero que você gere uma versão em azul agora'), 'Quero que você gere uma versão em azul agora');
});

t('IA entende pelo contexto (gírias, cobranças, pedidos repetidos)', () => {
  const { insistent, needsSmarter, previewByUnderstanding } = require('../src/lib/engine');
  const h = (xs: string[]) => xs.map((body) => ({ direction: 'in', body }));
  assert.ok(insistent(h(['kd o link?'])));
  assert.ok(insistent(h(['quero ver em azul', 'quero ver em azul por favor'])));
  assert.ok(!insistent(h(['oi', 'tenho uma clínica de fisioterapia'])));
  assert.ok(needsSmarter({ understanding: { confidence: 40, intents: [], promises: [], mood: 'neutro' } }));
  assert.ok(needsSmarter({ understanding: { confidence: 90, intents: ['repetiu_pedido'], promises: [], mood: 'neutro' } }));
  assert.ok(!needsSmarter({ understanding: { confidence: 90, intents: ['pergunta_preco'], promises: [], mood: 'animado' } }));
  assert.ok(previewByUnderstanding({ understanding: { client_meant: 'quer a versão azul', intents: ['quer_mudar_previa'], promises: [] } }));
  assert.ok(previewByUnderstanding({ understanding: { client_meant: 'cobrando o link da prévia', intents: ['cobrando_algo_prometido'], promises: [] } }));
  assert.ok(!previewByUnderstanding({ understanding: { client_meant: 'cobrando o recibo do pagamento', intents: ['cobrando_algo_prometido'], promises: [] } }));
  assert.ok(previewByUnderstanding({ understanding: { client_meant: 'ok', intents: [], promises: ['enviar_previa'] } }));
});

t('prévia: cores do cliente aplicadas no modelo e nenhum campo UNKNOWN', () => {
  const { colorsFrom } = require('../src/lib/preview');
  const { themeFor, recolor, fillPlaceholders, latestColor, renderPremium } = require('../src/lib/premium');
  const c = colorsFrom('troca a cor pra verde e azul clarinho');
  assert.equal(c.length, 2);
  const th = themeFor('verde e azul');
  assert.equal(th['--primary'], '#16a34a');
  assert.equal(th['--accent'], '#2563eb');
  const html = '<html><head><style>:root{--primary:#944D48;--primary-foreground:#FFFFFF;--accent:#c89b54}.b{background:#944d48}.g{box-shadow:0 0 3px #c89b5459}.w{color:#ffffff}</style></head><body class="bg-[#944D48]"></body></html>';
  const out = recolor(html, th);
  assert.ok(!/944d48/i.test(out) && !/c89b54/i.test(out));
  assert.ok(out.includes('#2563eb59') && out.includes('color:#ffffff'));
  const r = renderPremium(html, { site: { x: "R$ 5 $' $&" }, theme: th, title: 'T' });
  assert.ok(r.length < html.length * 3 && r.includes('--accent:#2563eb'));
  const tpl = { plans: [{ price: 'R$ 590', installments: 'ou 10x' }] };
  const filled = fillPlaceholders({ plans: [{ price: '<UNKNOWN>', installments: '<UNKNOWN>' }, { price: '<UNKNOWN>', area: '' }] }, tpl, 'Campinas');
  assert.equal(filled.plans[0].price, 'R$ 590');
  assert.ok(!JSON.stringify(filled).includes('UNKNOWN'));
  assert.equal(filled.plans[1].area, 'Campinas e região');
  assert.ok(/clar/.test(latestColor({ pedidos_previa: ['trocar a cor para verde e azul', 'clarinho'] })));
});

t('números de WhatsApp: nome com final e cor de etiqueta', () => {
  const { chipName, chipFinal, chipColor, CHIP_COLORS } = require('../src/lib/chips');
  assert.equal(chipFinal({ phone: '5519999283671' }), '3671');
  assert.equal(chipName({ id: 'a', label: 'Comercial', phone: '5519999283671' }), 'Comercial - 3671');
  assert.equal(chipName({ id: 'a', label: 'Linha 03' }), 'Linha 03');
  assert.equal(chipColor({ id: 'a', label: 'x', color: '#123456' }, 0), '#123456');
  assert.equal(chipColor({ id: 'a', label: 'x' }, 1), CHIP_COLORS[1]);
});

t('editor visual: campos marcados e decodificados; público e gênero', () => {
  const { leaves, markContent, decodeMark, setAt } = require('../src/lib/premium-edit');
  const c = { hero: { title: 'Seu sorriso *novo* começa aqui', image: 'https://images.unsplash.com/photo-1?w=800', icon: 'Heart' }, cta: { href: '#contato' } };
  const ls = leaves(c);
  assert.equal(ls.length, 4);
  assert.equal(ls.find((l: any) => l.path.join('.') === 'hero.image').kind, 'image');
  assert.equal(ls.find((l: any) => l.path.join('.') === 'hero.icon').kind, 'other');
  const m = markContent(c);
  assert.equal(decodeMark(m.hero.title), 0);
  assert.ok(m.hero.title.endsWith('Seu sorriso *novo* começa aqui'));
  assert.ok(m.hero.image.endsWith('#rp=1'));
  assert.equal(m.hero.icon, 'Heart');
  assert.equal(m.cta.href, '#contato');
  assert.equal(setAt(c, ['hero', 'title'], 'Oi').hero.title, 'Oi');
  const { audienceOf } = require('../src/lib/premium');
  assert.equal(audienceOf('Mulheres'), 'feminino');
  assert.equal(audienceOf('homem'), 'masculino');
  assert.equal(audienceOf(''), null);
  const { firstName, guessByEnding } = require('../src/lib/gender');
  assert.equal(firstName('  João Pedro'), 'joao');
  assert.equal(firstName('Studio Bella'), null);
  assert.equal(guessByEnding('mariana').gender, 'feminino');
  assert.equal(guessByEnding('ricardo').gender, 'masculino');
  assert.equal(guessByEnding('matheus').gender, 'masculino');
});

t('desconto: nunca diz que vai consultar/aprovar; prévia com atraso configurável', () => {
  const { approvalTalk, neutralHold, previewDelayMs } = require('../src/lib/engine');
  assert.ok(approvalTalk('Vou consultar com a equipe se dá pra fazer esse valor'));
  assert.ok(approvalTalk('Preciso de aprovação do meu gerente'));
  assert.ok(approvalTalk('Não tenho autonomia pra esse desconto'));
  assert.ok(approvalTalk('vou verificar com o financeiro'));
  assert.ok(!approvalTalk('Consigo fazer por R$ 649 com o botão de agendamento'));
  assert.ok(!approvalTalk('Deixa eu ver o que consigo fazer por você hoje 😊'));
  assert.ok(/\p{Extended_Pictographic}/u.test(neutralHold()));
  for (let i = 0; i < 20; i++) {
    const d = previewDelayMs({ previews: { delay_min: 200, delay_max: 250 } });
    assert.ok(d >= 200_000 && d <= 250_000);
  }
  assert.equal(previewDelayMs({ previews: { delay_on: false } }), 0);
});

t('zip da Arena com o conteúdo fora do lugar é ajeitado sozinho', () => {
  const { relocateContent } = require('../src/lib/premium');
  const files: any[] = [
    { path: 'package.json', data: Buffer.from('{}') },
    { path: 'src/data/siteContent.ts', data: Buffer.from("import type { X } from '../types';\nexport const siteContent = { a: 1 };\n") },
  ];
  assert.ok(relocateContent(files));
  const main = files.find((f) => f.path === 'src/content.ts').data.toString();
  assert.ok(main.includes('export default siteContent;'));
  assert.ok(main.includes("from './types'"));
  assert.ok(files.find((f) => f.path === 'src/data/siteContent.ts').data.toString().includes("from '../content'"));
  assert.ok(!relocateContent([{ path: 'src/App.tsx', data: Buffer.from('x') }]));
});

t('GitHub: arquivos de texto vão dentro do commit (sem 1 pedido por arquivo)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src/lib/github.ts'), 'utf8');
  assert.ok(src.includes("content: f.data.toString('utf8')"));
  assert.ok(src.includes('rate limit'));
  const prem = require('fs').readFileSync(require('path').join(__dirname, '../src/lib/premium.ts'), 'utf8');
  assert.ok(prem.includes('await repoTree()'));
  assert.ok(!prem.includes('listModelDirs()'));
});

t('conversas: arquivar/excluir e contatos salvos', () => {
  const fs = require('fs');
  const path = require('path');
  const api = fs.readFileSync(path.join(__dirname, '../src/app/api/leads/[id]/route.ts'), 'utf8');
  assert.ok(api.includes("case 'archive'") && api.includes("case 'delete'") && api.includes("need(user, 'leads.excluir')"));
  const eng = fs.readFileSync(path.join(__dirname, '../src/lib/engine.ts'), 'utf8');
  assert.ok(eng.includes('isSavedContact(instance, jid)'));
  const { DEFAULT_SETTINGS } = require('../src/lib/settings');
  assert.equal(DEFAULT_SETTINGS.ai_on_saved_contacts, false);
});

t('cada número com o nome de quem atende; apresentação natural', () => {
  const { withAgent } = require('../src/lib/engine');
  const { art } = require('../src/lib/prompts');
  assert.equal(withAgent({ assistant_name: 'Ana' }, { agent_name: 'Carla' }).assistant_name, 'Carla');
  assert.equal(withAgent({ assistant_name: 'Ana' }, { agent_name: '' }).assistant_name, 'Ana');
  assert.equal(art('Ana'), 'a');
  assert.equal(art('João'), 'o');
  assert.equal(art('Rafael'), 'o');
  assert.equal(art('Beatriz'), 'a');
});

t('cliente que escreveu de verdade nunca fica sem resposta', () => {
  const { clientExpectsReply, fallbackReply, pendingClientText } = require('../src/lib/engine');
  assert.ok(clientExpectsReply('oi'));
  assert.ok(clientExpectsReply('Boa tarde Tudo bem? oi'));
  assert.ok(clientExpectsReply('quanto custa?'));
  assert.ok(!clientExpectsReply('👍'));
  assert.ok(!clientExpectsReply('obrigado!'));
  assert.ok(!clientExpectsReply('ok'));
  assert.equal(pendingClientText([{ direction: 'out', body: 'x' }, { direction: 'in', body: 'oi' }]), 'oi');
  assert.ok(/Qual seu nome\?/.test(fallbackReply({ memory: {} }, { assistant_name: 'Ana', company_name: 'Fênix' }, 'oi')));
  assert.ok(/Matheus/.test(fallbackReply({ memory: { nome_cliente: 'Matheus' } }, {}, 'oi')));
});

t('domínio digitado com espaço é aceito', () => {
  const { cleanHost, validHost } = require('../src/lib/domains');
  assert.equal(cleanHost(' sistema. agenciafenixads.com.br '), 'sistema.agenciafenixads.com.br');
  assert.ok(validHost(cleanHost('https://Sistema.AgenciaFenixAds.com.br/')));
});

Promise.all(pending).then(() => console.log(`\n${ok} testes passaram`));
