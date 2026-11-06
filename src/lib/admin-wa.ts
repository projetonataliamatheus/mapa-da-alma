/**
 * Administradores pelo WhatsApp: números cadastrados mandam palavras-atalho ("quero relatórios", "vendas", "consumo"...)
 * ao próprio chat do atendimento e recebem o resumo formatado em texto. NÃO usa IA nem créditos: só consulta o banco.
 */
import { admin as db } from './supabase/admin';
import { waKey } from './phone';
import { evo } from './evolution';
import { markSentByUs } from './engine';

let cache: { at: number; ativo: boolean; chaves: Set<string>; nomes: Map<string, string> } | null = null;
export async function adminsAtivos() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const chaves = new Set<string>(), nomes = new Map<string, string>();
  let ativo = false;
  try {
    const { data: c } = await db().from('admin_wa_config').select('ativo').eq('id', 1).maybeSingle();
    ativo = !!c?.ativo;
    if (ativo) {
      const { data } = await db().from('admin_wa').select('nome,wa_key').eq('ativo', true);
      for (const a of data || []) { chaves.add(a.wa_key); nomes.set(a.wa_key, a.nome); }
    }
  } catch {}
  cache = { at: Date.now(), ativo, chaves, nomes };
  return cache;
}
export const limparCacheAdmin = () => { cache = null; };

const sp = (ms = Date.now()) => new Date(ms - 3 * 3600_000);
const diaSP = (ms = Date.now()) => sp(ms).toISOString().slice(0, 10);
const iniDia = (dia: string) => new Date(`${dia}T03:00:00.000Z`).toISOString();
const norm = (t: string) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const n0 = (n: number) => Math.round(n).toLocaleString('pt-BR');
const money = (n: number, m = 'BRL') => (m === 'BRL' ? 'R$ ' : m === 'USD' ? 'US$ ' : m + ' ') + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const barra = (v: number, max: number, w = 10) => '█'.repeat(max ? Math.round((v / max) * w) : 0).padEnd(w, '░');
const FLAG: Record<string, string> = { BR: '🇧🇷', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', PE: '🇵🇪', MX: '🇲🇽', PY: '🇵🇾', UY: '🇺🇾', BO: '🇧🇴', EC: '🇪🇨', PT: '🇵🇹', ES: '🇪🇸', US: '🇺🇸', PA: '🇵🇦', VE: '🇻🇪', CR: '🇨🇷', GT: '🇬🇹', DO: '🇩🇴' };

type Periodo = { nome: string; ini: string; fim: string; dias: number };
function periodo(t: string): Periodo {
  const hoje = diaSP(), agora = new Date().toISOString();
  if (/\bontem\b/.test(t)) { const o = diaSP(Date.now() - 86400000); return { nome: 'ontem', ini: iniDia(o), fim: iniDia(hoje), dias: 1 }; }
  if (/\bsemana|7 dias\b/.test(t)) return { nome: 'últimos 7 dias', ini: iniDia(diaSP(Date.now() - 6 * 86400000)), fim: agora, dias: 7 };
  if (/\bmes\b|30 dias/.test(t)) return { nome: 'este mês', ini: iniDia(hoje.slice(0, 8) + '01'), fim: agora, dias: Number(hoje.slice(8)) };
  return { nome: 'hoje', ini: iniDia(hoje), fim: agora, dias: 1 };
}
const head = (emoji: string, titulo: string, p?: Periodo) => `${emoji} *${titulo}*${p ? `\n🗓️ ${p.nome} · ${sp().toISOString().slice(8, 10)}/${sp().toISOString().slice(5, 7)} ${sp().toISOString().slice(11, 16)}` : ''}\n━━━━━━━━━━━━━━`;

async function vendas(p: Periodo) {
  const { data } = await db().from('clientes_compradores').select('data_compra,nome_completo,valor_pago,moeda,pais,gateway,forma_pagamento').gte('data_compra', p.ini).lt('data_compra', p.fim).order('data_compra', { ascending: false }).limit(1000);
  const v = data || [];
  const porMoeda: Record<string, number> = {}, porPais: Record<string, number> = {}, porGw: Record<string, number> = {};
  for (const x of v) { const m = x.moeda || 'BRL'; porMoeda[m] = (porMoeda[m] || 0) + Number(x.valor_pago || 0); porPais[x.pais || '—'] = (porPais[x.pais || '—'] || 0) + 1; porGw[x.gateway || '—'] = (porGw[x.gateway || '—'] || 0) + 1; }
  let t = head('💰', 'VENDAS', p) + `\n✅ Vendas confirmadas: *${v.length}*\n`;
  t += Object.entries(porMoeda).map(([m, s]) => `💵 ${money(s, m)}${v.length ? ` (ticket ${money(s / (v.filter((x: any) => (x.moeda || 'BRL') === m).length || 1), m)})` : ''}`).join('\n') || '💵 Nenhum valor ainda';
  if (Object.keys(porPais).length) t += '\n\n🌎 *Por país*\n' + Object.entries(porPais).sort((a, b) => b[1] - a[1]).map(([c, q]) => `${FLAG[c] || '🌐'} ${c}: ${q} ${barra(q, v.length)}`).join('\n');
  if (Object.keys(porGw).length) t += '\n\n🏦 *Por forma*\n' + Object.entries(porGw).map(([g, q]) => `• ${g}: ${q}`).join('\n');
  if (v.length) t += '\n\n🧾 *Últimas vendas*\n' + v.slice(0, 5).map((x: any) => `• ${String(x.nome_completo || '—').split(' ').slice(0, 2).join(' ')} — ${money(x.valor_pago, x.moeda || 'BRL')} ${FLAG[x.pais] || ''}`).join('\n');
  return t;
}

async function semanaVendas() {
  const dias: { d: string; q: number }[] = [];
  const { data } = await db().from('clientes_compradores').select('data_compra').gte('data_compra', iniDia(diaSP(Date.now() - 6 * 86400000)));
  for (let i = 6; i >= 0; i--) { const d = diaSP(Date.now() - i * 86400000); dias.push({ d, q: (data || []).filter((x: any) => diaSP(new Date(x.data_compra).getTime()) === d).length }); }
  const max = Math.max(1, ...dias.map((x) => x.q));
  return '📈 *Vendas nos últimos 7 dias*\n' + dias.map((x) => `${x.d.slice(8)}/${x.d.slice(5, 7)} ${barra(x.q, max, 12)} ${x.q}`).join('\n');
}

async function atendimentos(p: Periodo) {
  const c = (q: any) => q.then((r: any) => r.count || 0);
  const cnt = (f: (q: any) => any) => c(f(db().from('leads').select('id', { count: 'exact', head: true })));
  const [novos, ativos, pagos, esperando, ptN, esN] = await Promise.all([
    cnt((q) => q.gte('created_at', p.ini).lt('created_at', p.fim)),
    cnt((q) => q.gte('last_inbound_at', p.ini).lt('last_inbound_at', p.fim)),
    cnt((q) => q.eq('stage', 'pago').gte('paid_at', p.ini).lt('paid_at', p.fim)),
    cnt((q) => q.not('needs_human', 'is', null).eq('opted_out', false)),
    cnt((q) => q.gte('last_inbound_at', p.ini).lt('last_inbound_at', p.fim).eq('idioma', 'pt')),
    cnt((q) => q.gte('last_inbound_at', p.ini).lt('last_inbound_at', p.fim).eq('idioma', 'es')),
  ]);
  const { count: mapas } = await db().from('mapas').select('id', { count: 'exact', head: true }).gte('created_at', p.ini).lt('created_at', p.fim);
  const { count: lib } = await db().from('mapas').select('id', { count: 'exact', head: true }).eq('liberado', true).gte('created_at', p.ini).lt('created_at', p.fim);
  const conv = ativos ? Math.round((pagos / ativos) * 100) : 0;
  return head('💬', 'ATENDIMENTOS', p) + `\n🆕 Contatos novos: *${novos}*\n🗣️ Conversas com resposta do cliente: *${ativos}*\n   🇧🇷 português ${ptN} · 🌎 espanhol ${esN}\n🗺️ Mapas gerados: *${mapas || 0}* (completos: ${lib || 0})\n✅ Vendas: *${pagos}*  (${conv}% das conversas)\n⚠️ Esperando você (aprovação/ajuda): *${esperando}*`;
}

async function recuperacao(p: Periodo) {
  const { data } = await db().from('site_leads').select('site,idioma,whatsapp,recup_status,pago,lead_id,wa_click_at').gte('created_at', p.ini).lt('created_at', p.fim).limit(2000);
  const s = data || [];
  const br = s.filter((x: any) => (x.site || (x.idioma === 'pt' ? 'br' : 'es')) === 'br').length;
  const env = s.filter((x: any) => x.recup_status === 'enviado');
  const ids = env.map((x: any) => x.lead_id).filter(Boolean);
  let resp = 0;
  if (ids.length) { const { data: l } = await db().from('leads').select('id').in('id', ids).not('last_inbound_at', 'is', null); resp = l?.length || 0; }
  return head('🌐', 'SITE E RECUPERAÇÃO', p) + `\n🧪 Testes grátis feitos: *${s.length}*  (🇧🇷 ${br} · 🌎 ${s.length - br})\n📱 Com WhatsApp: *${s.filter((x: any) => x.whatsapp).length}*\n👆 Clicaram no WhatsApp: *${s.filter((x: any) => x.wa_click_at).length}*\n💌 Recuperação enviada: *${env.length}*\n↩️ Responderam: *${resp}*\n✅ Compraram: *${s.filter((x: any) => x.pago).length}*`;
}

async function consumo() {
  const { estadoConsumo } = await import('./consumo-alertas');
  const { servicos } = await estadoConsumo();
  const f = (id: string) => servicos.find((s) => s.id === id)!;
  const c = f('anthropic'), e = f('elevenlabs'), b = f('browserless');
  const flag = (s: any) => (s.ativo_alerta ? '🚨' : '✅');
  return head('📊', 'CONSUMO E SALDOS') +
    `\n${flag(c)} *Claude (IA)*: ${c.restante != null ? 'restam US$ ' + c.restante.toFixed(2) : 'informe o saldo no painel'}\n   gasto no mês: US$ ${c.gasto_mes_usd.toFixed(2)}` +
    `\n${flag(e)} *ElevenLabs (voz)*: ${e.restante != null ? n0(e.restante) + ' créditos restantes' : 'sem leitura'}\n   usados: ${n0(e.usado_mes)}${e.limite ? ' de ' + n0(e.limite) : ''}` +
    `\n${flag(b)} *Browserless (PDF)*: ${n0(b.restante ?? 0)} PDFs restantes de ${n0(b.limite || 1000)}`;
}

async function status() {
  const { data: n } = await db().from('whatsapp_numbers').select('label,status,recuperacao');
  const { data: w } = await db().from('worker_status').select('*').eq('id', 1).maybeSingle();
  const beat = w?.beat_at ? Math.round((Date.now() - new Date(w.beat_at).getTime()) / 60000) : null;
  const on = (n || []).filter((x: any) => x.status === 'conectado').length;
  return head('🛰️', 'SISTEMA') + `\n${beat != null && beat < 3 ? '🟢' : '🔴'} Robô: ${beat == null ? 'sem sinal' : beat < 1 ? 'ativo agora' : `último sinal há ${beat} min`}\n📱 Chips conectados: *${on}/${(n || []).length}*\n` + (n || []).map((x: any) => `${x.status === 'conectado' ? '🟢' : '🔴'} ${x.label}${x.recuperacao ? ' (Recuperação)' : ''}`).join('\n');
}

const MENU = (nome: string, nao = false) => `${nao ? '🤔 Não entendi, mas olha o que eu faço:\n\n' : ''}👋 Oi, ${nome}! Painel de administrador pelo WhatsApp.\n\nManda uma palavra:\n📋 *relatórios* — resumo geral\n💰 *vendas* — faturamento e últimas vendas\n💬 *atendimentos* — conversas, mapas, vendas\n🌐 *site* — testes grátis e recuperação\n📊 *consumo* — saldos (Claude, voz, PDF)\n🛰️ *sistema* — robô e chips\n\nDá para somar o período: _hoje_, _ontem_, _semana_ ou _mês_.\nEx.: *vendas semana*`;

/** Monta a resposta para a mensagem do administrador. */
export async function respostaAdmin(texto: string, nome: string): Promise<string> {
  const t = norm(texto);
  const p = periodo(t);
  try {
    if (/relat|resumo|geral|dashboard|painel|situacao|como esta/.test(t)) {
      const partes = await Promise.all([vendas(p), atendimentos(p), recuperacao(p), consumo(), semanaVendas()]);
      return `📋 *RELATÓRIO GERAL* — ${p.nome}\n\n` + partes.join('\n\n');
    }
    if (/venda|fatur|financ|receita|compra/.test(t)) return (await vendas(p)) + '\n\n' + (await semanaVendas());
    if (/atend|conversa|lead|cliente|mapa/.test(t)) return atendimentos(p);
    if (/site|teste|recuper/.test(t)) return recuperacao(p);
    if (/consum|saldo|custo|credito|gasto|api/.test(t)) return consumo();
    if (/sistema|status|robo|chip|numero|online/.test(t)) return status();
    return MENU(nome, !/^(oi|ola|menu|ajuda|comandos?|help|bom dia|boa tarde|boa noite)\b/.test(t));
  } catch (e: any) {
    return `⚠️ Não consegui montar esse relatório agora (${String(e?.message || e).slice(0, 80)}). Tente de novo em instantes.`;
  }
}

/** Se quem escreveu é administrador (e o recurso está ligado), responde e devolve true. */
export async function tratarAdmin(number: any, k: string | null, digits: string, texto: string, fromMe: boolean): Promise<boolean> {
  if (!k) return false;
  const a = await adminsAtivos();
  if (!a.ativo || !a.chaves.has(k)) return false;
  if (fromMe) return true; // eco do que o próprio sistema mandou
  const nome = (a.nomes.get(k) || 'admin').split(' ')[0];
  const resp = await respostaAdmin(texto, nome);
  try {
    // WhatsApp aceita ~4000 caracteres por mensagem: quebra em duas se passar
    const partes = resp.length > 3800 ? resp.split('\n\n').reduce<string[]>((acc, bloco) => { const u = acc[acc.length - 1]; if (u && (u + '\n\n' + bloco).length < 3500) acc[acc.length - 1] = u + '\n\n' + bloco; else acc.push(bloco); return acc; }, []) : [resp];
    for (const parte of partes) { const r: any = await evo.sendText(number.instance_name, digits, parte, 600); markSentByUs(r?.key?.id); }
  } catch (e: any) { console.error('[admin-wa]', e?.message); }
  return true;
}
