/**
 * ROBÔ 24/7 — roda junto com o painel no servidor (Easypanel).
 * A cada 15 segundos:
 *  1. responde quem escreveu (respeitando o tempo de espera configurado)
 *  2. envia primeiras mensagens e follow-ups, número por número, dentro dos limites e intervalos
 * A cada 5 minutos: confere a conexão dos números.
 * A cada 10 minutos: calcula a saúde dos números (pausa sozinho se precisar), cuida dos Pix parados
 * e estuda as vendas concluídas.
 */
import { admin } from '../src/lib/supabase/admin';
import { getSettings, Settings } from '../src/lib/settings';
import { handleReply, sendFollowUp, logEvent, analyzeSale, processPreviewJobs, maybeRefreshSummary } from '../src/lib/engine';
import { evo } from '../src/lib/evolution';
import { processPendingReceipts } from '../src/lib/receipt';
import { processBioJobs } from '../src/lib/bio-auto';
import { processDrafts, prospectCfg } from '../src/lib/prospect';
import { maybeSendWeeklyReport } from '../src/lib/report';
import { inCommercial } from '../src/lib/hours';
import { processRenewals, processTestimonials } from '../src/lib/client-jobs';
import { lembretesTaro } from '../src/lib/mapa-alma/taro/servico';
import { modoAtual } from '../src/lib/mapa-alma/modos';
import { connectedNumber, sendAndRecord } from '../src/lib/engine';
import { trackInstagramDaily } from '../src/lib/ig-track';
import { digestNext, flagWaiting, explainAiError, rateInsights, rebuildBrain } from '../src/lib/knowledge';
import { syncRecentMessages } from '../src/lib/wa-import';
import { driveCycle } from '../src/lib/production';
import { syncTemplates } from '../src/lib/premium';
import { checkDomain, applyDomains } from '../src/lib/domains';
import { embedPending, scoreMessages, studyPendingCases, maybeRebuildRealBrain } from '../src/lib/intel';
import { dailyLimit } from '../src/lib/limits';
import { inBusinessHours, spNow, rand, sleep } from '../src/lib/util';

const db = () => admin();
const recentLogs: string[] = [];
const log = (...a: any[]) => {
  const line = `${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}`;
  recentLogs.push(line.slice(0, 300));
  if (recentLogs.length > 40) recentLogs.shift();
  console.log(new Date().toISOString(), '[robô]', ...a);
};

let lastSync = 0;
let lastHealth = 0;
let lastConsumo = 0;
let lastRecup = 0;
let lastClientJobs = 0;

/** Nada no robô pode ficar esperando para sempre. */
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: any;
  return Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error(msg)), ms)))]).finally(() => clearTimeout(t));
}

/** Sinais de vida de cada parte do robô (o vigia reinicia se alguma travar). */
const alive = { tick: Date.now(), replies: Date.now() };

/** Respostas aos clientes têm laço próprio: nunca esperam envios, recibos ou leitura de livros. */
const replyingNow = new Set<string>();
async function processReplies(settings: Settings) {
  if (!settings.reply_24h && !inBusinessHours(settings.hours)) return;
  const { data: due } = await db().from('leads').select('id,name').lte('reply_due_at', new Date().toISOString()).order('reply_due_at').limit(6);
  const todo = (due || []).filter((l: any) => !replyingNow.has(l.id)).slice(0, 3);
  await Promise.all(
    todo.map(async (l: any) => {
      replyingNow.add(l.id);
      const t0 = Date.now();
      try {
        log(`respondendo ${l.name}…`);
        await withTimeout(handleReply(l.id), 4 * 60_000, 'a resposta demorou mais de 4 minutos');
        // resumo vivo da conversa (ficha para retomar dias depois), em segundo plano
        void maybeRefreshSummary(l.id).catch(() => {});
        log(`respondeu ${l.name} em ${Math.round((Date.now() - t0) / 1000)}s`);
      } catch (e: any) {
        log('erro ao responder', l.name, e.message);
        lastReplyError = `${new Date().toISOString()} ${l.name}: ${String(e.message).slice(0, 200)}`;
        await db().from('leads').update({ reply_due_at: new Date(Date.now() + 120000).toISOString() }).eq('id', l.id);
        await logEvent(l.id, 'reply_error', 'warn', `Erro ao responder ${l.name}: ${e.message}`);
      } finally {
        replyingNow.delete(l.id);
      }
    }),
  );
}

let lastSyncMsgs = 0;
let lastResgate = 0;
async function replyLoop() {
  // ao ligar (ex.: reinício do Easypanel): solta travas órfãs e já devolve à fila o que ficou parado
  try {
    const { soltarTravasAoLigar, resgatarConversas } = await import('../src/lib/resgate');
    await soltarTravasAoLigar();
    const n = await resgatarConversas();
    if (n) log(`resgate ao ligar: ${n} atendimento(s) retomado(s)`);
  } catch (e: any) { log('resgate ao ligar', e.message); }
  for (;;) {
    alive.replies = Date.now();
    // a cada 60 s: atendimento parado (queda, reinício, trava) volta para a fila e a IA continua de onde parou
    if (Date.now() - lastResgate > 60_000) {
      lastResgate = Date.now();
      void import('../src/lib/resgate').then((m) => withTimeout(m.resgatarConversas(), 50_000, 'resgate demorou')).then((n) => n && log(`resgate: ${n} atendimento(s) retomado(s)`)).catch((e) => log('resgate', e.message));
    }
    // a cada minuto: recupera mensagens que o aviso da Evolution não entregou
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && Date.now() - lastSyncMsgs > 60_000) {
      lastSyncMsgs = Date.now();
      // roda em paralelo: não atrasa as respostas
      void withTimeout(syncRecentMessages(), 90_000, 'conferência demorou')
        .then((n) => n && log(`conferência: ${n} mensagem(ns) recuperada(s)`))
        .catch((e) => log('conferência', e.message));
    }
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const settings = await getSettings(db());
        if (!settings.paused) await withTimeout(processReplies(settings), 5 * 60_000, 'ciclo de respostas travado');
        // prévias agendadas que já deram a hora
        if (!settings.paused) await withTimeout(processPreviewJobs(), 4 * 60_000, 'envio de prévia travado').catch((e) => log('prévia agendada', e.message));
        if (!settings.paused && inCommercial(settings)) await withTimeout(processBioJobs(), 2 * 60_000, 'link na bio travado').catch((e) => log('link na bio agendado', e.message));
        // prospecção: rascunhos que deram a hora saem e o próximo é preparado (só no horário de trabalho)
        if (!settings.paused && inCommercial(settings)) await withTimeout(processDrafts(settings), 2 * 60_000, 'prospecção travada').catch((e) => log('prospecção', e.message));
      }
    } catch (e: any) {
      log('erro no laço de respostas', e?.message || e);
    }
    await sleep(3000);
  }
}

async function dueFollowUp(number: any, settings: Settings) {
  const today = spNow().date;
  // remarketing com data vencida
  const { data: rm } = await db()
    .from('leads')
    .select('*')
    .eq('stage', 'remarketing')
    .eq('opted_out', false)
    .eq('ai_enabled', true)
    .not('whatsapp', 'is', null)
    .lte('remarketing_at', today)
    .or(`number_id.eq.${number.id},number_id.is.null`)
    .limit(1);
  if (rm?.[0] && !rm[0].archived_at && rm[0].source !== 'recuperacao_site') return rm[0];

  // REAQUECIMENTO: quase comprou (interessado/negociando/pix) e sumiu há 20 h–6 dias, ainda não reaquecido → volta com dor + dica prática
  const { data: hot } = await db()
    .from('leads')
    .select('*')
    .eq('number_id', number.id)
    .eq('opted_out', false)
    .eq('ai_enabled', true)
    .in('stage', ['interessado', 'negociando', 'pix'])
    .neq('source', 'google')
    .not('last_inbound_at', 'is', null)
    .lt('last_inbound_at', new Date(Date.now() - 20 * 3600000).toISOString())
    .gt('last_inbound_at', new Date(Date.now() - 6 * 86400000).toISOString())
    .order('temperature', { ascending: false })
    .limit(20);
  const quente = (hot || []).find((l: any) => {
    if (l.archived_at || l.memory?.reaquecido_em) return false;
    const inAt = new Date(l.last_inbound_at).getTime();
    const outAt = l.last_outbound_at ? new Date(l.last_outbound_at).getTime() : 0;
    return outAt >= inAt - 60000 && Date.now() - Math.max(inAt, outAt) >= 20 * 3600000; // a última palavra foi nossa e já faz 20 h
  });
  if (quente) return quente;

  const days = settings.followup_days;
  const minDays = Math.min(...days);
  const { data: cands } = await db()
    .from('leads')
    .select('*')
    .eq('number_id', number.id)
    .eq('opted_out', false)
    .eq('ai_enabled', true)
    .in('stage', ['abordado', 'respondeu', 'interessado', 'negociando'])
    .lt('followups_sent', days.length)
    .lt('last_outbound_at', new Date(Date.now() - minDays * 86400000).toISOString())
    .order('score', { ascending: false })
    .limit(30);
  const maxPros = prospectCfg(settings).max_followups;
  return (cands || []).find((l: any) => {
    // conversa arquivada não recebe follow-up
    if (l.archived_at) return false;
    // recuperação do site: uma abordagem só, nunca insiste
    if (l.source === 'recuperacao_site') return false;
    // prospecção: abordado que não respondeu recebe no máximo N lembretes (não insiste)
    if (l.source === 'google' && l.stage === 'abordado' && Number(l.followups_sent || 0) >= maxPros) return false;
    // Modo Grazi: um follow-up só (a segunda oferta, no dia seguinte); depois disso não insiste
    if (modoAtual(settings) === 'grazi' && Number(l.followups_sent || 0) >= 1) return false;
    const waited = days[l.followups_sent] ?? 999;
    const outAt = new Date(l.last_outbound_at).getTime();
    const silent = !l.last_inbound_at || new Date(l.last_inbound_at).getTime() < outAt;
    return silent && Date.now() - outAt >= waited * 86400000;
  });
}

async function dispatch(settings: Settings) {
  // chamar por conta própria (follow-up, remarketing, recuperação): só no horário COMERCIAL
  if (!inCommercial(settings)) return;
  const nowIso = new Date().toISOString();
  const today = spNow().date;
  const { data: numbers } = await db().from('whatsapp_numbers').select('*').eq('status', 'conectado');
  for (const n of numbers || []) {
    if (n.recuperacao) continue; // chip de Recuperação só trabalha na recuperação do site
    if (n.paused_until && new Date(n.paused_until) > new Date()) continue;
    if (n.sent_date !== today) {
      await db().from('whatsapp_numbers').update({ sent_today: 0, sent_date: today }).eq('id', n.id);
      n.sent_today = 0;
    }
    const limit = dailyLimit(n, settings.limits);
    if (n.sent_today >= limit) continue;
    if (n.next_send_at && n.next_send_at > nowIso) continue;

    let sent = false;
    try {
      const fu = await dueFollowUp(n, settings);
      if (fu) {
        await sendFollowUp(n, fu, settings);
        sent = true;
      }
      // primeiras abordagens: só pela Prospecção (lista de selecionados → Iniciar), com rascunho revisável — veja src/lib/prospect.ts
    } catch (e: any) {
      log('erro no disparo', n.label, e.message);
      await logEvent(null, 'send_error', 'warn', `${n.label}: erro ao enviar (${e.message.slice(0, 120)})`, { number_id: n.id });
      await db().from('whatsapp_numbers').update({ next_send_at: new Date(Date.now() + 5 * 60000).toISOString() }).eq('id', n.id);
      continue;
    }
    if (!sent) continue;

    let next = Date.now() + rand(settings.interval_min.min, settings.interval_min.max) * 60000;
    let since = n.sends_since_pause + 1;
    if (since >= settings.long_pause_every) {
      next += rand(settings.long_pause_min.min, settings.long_pause_min.max) * 60000;
      since = 0;
    }
    await db()
      .from('whatsapp_numbers')
      .update({ sent_today: n.sent_today + 1, sent_date: today, sends_since_pause: since, next_send_at: new Date(next).toISOString() })
      .eq('id', n.id);
  }
}

async function syncConnections() {
  const { data: numbers } = await db().from('whatsapp_numbers').select('*').in('status', ['conectado', 'qr', 'desconectado']);
  for (const n of numbers || []) {
    try {
      const r: any = await evo.state(n.instance_name);
      const state = r?.instance?.state || r?.state;
      const status = state === 'open' ? 'conectado' : state === 'connecting' ? n.status : 'desconectado';
      if (status !== n.status) {
        await db().from('whatsapp_numbers').update({ status, qr: status === 'conectado' ? null : n.qr }).eq('id', n.id);
        await logEvent(null, 'number_status', status === 'conectado' ? 'wa' : 'warn', `${n.label} ${status === 'conectado' ? 'conectado' : 'desconectou. Leia o QR Code de novo em Números WhatsApp'}`);
      }
    } catch (e: any) {
      log('erro ao conferir conexão', n.label, e.message);
    }
  }
}

function tomorrowAt8() {
  const d = new Date(Date.now() + 86400000);
  const day = spNow(d).date;
  return `${day}T08:00:00-03:00`;
}

async function health(settings: Settings) {
  const since24 = new Date(Date.now() - 86400000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: numbers } = await db().from('whatsapp_numbers').select('*');
  const { data: ev } = await db().from('lead_events').select('type,meta,lead_id').gte('created_at', since24).in('type', ['wa_first', 'opt_out', 'send_error']);
  for (const n of numbers || []) {
    const sent24 = (ev || []).filter((e: any) => e.type === 'wa_first' && e.meta?.number_id === n.id).length;
    const errors24 = (ev || []).filter((e: any) => e.type === 'send_error' && e.meta?.number_id === n.id).length;
    const optLeadIds = (ev || []).filter((e: any) => e.type === 'opt_out').map((e: any) => e.lead_id);
    let opt24 = 0;
    if (optLeadIds.length) {
      const { count } = await db().from('leads').select('id', { count: 'exact', head: true }).in('id', optLeadIds).eq('number_id', n.id);
      opt24 = count || 0;
    }
    const { count: contacted } = await db().from('leads').select('id', { count: 'exact', head: true }).eq('number_id', n.id).gte('last_outbound_at', since7);
    const { count: replied } = await db().from('leads').select('id', { count: 'exact', head: true }).eq('number_id', n.id).gte('last_outbound_at', since7).not('last_inbound_at', 'is', null);
    const resp = contacted ? (replied || 0) / contacted : 0;
    const bad = sent24 ? (opt24 + errors24) / sent24 : 0;
    let score = 100 - Math.min(60, bad * 1000) - (contacted && contacted >= 20 && resp < 0.1 ? 20 : 0) - (n.status !== 'conectado' ? 20 : 0);
    score = Math.max(0, Math.round(score));
    const patch: any = { health: score, stats: { sent24, errors24, optouts24: opt24, contacted7: contacted || 0, replied7: replied || 0, resp_rate: Math.round(resp * 100) } };
    if (sent24 >= 10 && bad * 100 > settings.auto_pause_pct && !(n.paused_until && new Date(n.paused_until) > new Date())) {
      patch.paused_until = tomorrowAt8();
      patch.pause_reason = `Recusas/erros em ${Math.round(bad * 100)}% dos envios nas últimas 24h`;
      await logEvent(null, 'auto_pause', 'warn', `${n.label} pausou sozinho: ${patch.pause_reason}. Volta amanhã às 8h.`, { number_id: n.id });
    }
    await db().from('whatsapp_numbers').update(patch).eq('id', n.id);
  }
}

async function pixWatch(settings: Settings) {
  const { data: pend } = await db().from('payments').select('*, leads(name,needs_human,stage)').eq('status', 'pendente');
  for (const p of pend || []) {
    const age = Date.now() - new Date(p.created_at).getTime();
    if (p.expires_at && new Date(p.expires_at) < new Date()) {
      await db().from('payments').update({ status: 'expirado' }).eq('id', p.id);
      await db().from('leads').update({ needs_human: 'O Pix venceu sem pagamento. Ligue e gere outro se for o caso.' }).eq('id', p.lead_id);
      await logEvent(p.lead_id, 'pix_expired', 'warn', `Pix de ${p.leads?.name} venceu sem pagamento`);
    } else if (!p.reminded && age > 3 * 3600000) {
      await db().from('payments').update({ reminded: true }).eq('id', p.id);
      if (!p.leads?.needs_human) await db().from('leads').update({ needs_human: 'Pix gerado há mais de 3h e ainda não pago. Vale uma ligação.' }).eq('id', p.lead_id);
    }
  }
}

async function receipts(settings: Settings) {
  await processPendingReceipts(settings, log);
}

async function learn() {
  // autocorreção: vendas estudadas antes sem nicho passam para o nicho do sistema; vendas confirmadas sem estudo voltam para a fila (máx. 2 tentativas)
  try {
    const { NICHO_MAPA } = await import('../src/lib/engine');
    await db().from('learnings').update({ niche: NICHO_MAPA }).is('niche', null);
    const { data: pagos } = await db().from('leads').select('id,memory').eq('stage', 'pago').eq('cortesia', false).eq('learn_pending', false).order('paid_at', { ascending: false }).limit(60);
    const ids = (pagos || []).map((x: any) => x.id);
    if (ids.length) {
      const { data: ja } = await db().from('learnings').select('lead_id').in('lead_id', ids);
      const tem = new Set((ja || []).map((x: any) => x.lead_id));
      for (const x of (pagos || []).filter((x: any) => !tem.has(x.id) && Number(x.memory?.learn_erro || 0) < 2).slice(0, 3))
        await db().from('leads').update({ learn_pending: true }).eq('id', x.id);
    }
    const { count } = await db().from('learnings').select('id', { count: 'exact', head: true }).eq('niche', NICHO_MAPA);
    if (count) {
      const { data: pb } = await db().from('playbooks').select('niche').eq('niche', NICHO_MAPA).maybeSingle();
      if (!pb) await import('../src/lib/engine').then((m) => m.generatePlaybook(NICHO_MAPA));
    }
  } catch (e: any) { log('aprendizado (ajuste)', e.message); }
  const { data } = await db().from('leads').select('id,name').eq('learn_pending', true).limit(2);
  for (const l of data || []) {
    try {
      await analyzeSale(l.id);
    } catch (e: any) {
      log('erro ao estudar venda', l.name, e.message);
      const { data: cur } = await db().from('leads').select('memory').eq('id', l.id).maybeSingle();
      await db().from('leads').update({ learn_pending: false, memory: { ...((cur?.memory as any) || {}), learn_erro: Number((cur?.memory as any)?.learn_erro || 0) + 1 } }).eq('id', l.id);
    }
  }
}

const startedAt = new Date().toISOString();
let lastBeat = 0;
let lastReplyError: string | null = null;
async function beat(_settings?: Settings) {
  /* o sinal de vida agora é enviado pelo beatLoop, independente do ciclo */
}

/** Sinal de vida a cada 20 s e vigia: se uma parte travar por minutos, o robô reinicia sozinho (o painel continua no ar). */
async function beatLoop() {
  for (;;) {
    const now = Date.now();
    const tickAge = Math.round((now - alive.tick) / 1000);
    const repAge = Math.round((now - alive.replies) / 1000);
    if (process.env.SUPABASE_SERVICE_ROLE_KEY)
      await db()
        .from('worker_status')
        .upsert({ id: 1, beat_at: new Date().toISOString(), started_at: startedAt, info: { ai: !!process.env.ANTHROPIC_API_KEY, tick_age_s: tickAge, replies_age_s: repAge, replying: replyingNow.size, last_reply_error: lastReplyError, logs: recentLogs.slice(-25), version: 'v10' } })
        .then(() => {}, () => {});
    if (repAge > 6 * 60 || tickAge > 12 * 60) {
      log(`vigia: parte do robô travada (respostas há ${repAge}s, ciclo há ${tickAge}s). Reiniciando…`);
      process.exit(1);
    }
    await sleep(20000);
  }
}

async function tick() {
  const settings = await getSettings(db());
  await beat(settings);
  if (Date.now() - lastSync > 5 * 60000) {
    lastSync = Date.now();
    await syncConnections().catch((e) => log('sync', e.message));
  }
  if (!settings.paused && Date.now() - lastRecup > 4 * 60000) {
    lastRecup = Date.now();
    await import('../src/lib/recuperacao').then((m) => m.recuperarSite()).then((n) => n && log(`Recuperação do site: ${n} contato(s) chamado(s)`)).catch((e) => log('recuperação', e.message));
  }
  if (Date.now() - lastConsumo > 3 * 60000) {
    lastConsumo = Date.now();
    await import('../src/lib/consumo-alertas').then((m) => m.avaliarConsumo()).then((n) => n && log(`Consumo: ${n} alerta(s) de saldo`)).catch((e) => log('consumo', e.message));
  }
  if (Date.now() - lastHealth > 10 * 60000) {
    lastHealth = Date.now();
    await health(settings).catch((e) => log('saúde', e.message));
    await pixWatch(settings).catch((e) => log('pix', e.message));
    await learn().catch((e) => log('aprendizado', e.message));
    await import('../src/lib/mapa-alma/simpatias/servico').then((m) => m.garantirSimpatiasES()).then((n) => n && log(`Simpatias: ${n} traduzida(s) para espanhol`)).catch((e) => log('simpatias', e.message));
    await import('../src/lib/meta-capi').then((m) => m.varreduraMeta(Number((settings as any).meta_abandono_horas) || 6)).then((n) => n && log(`Meta: ${n} contato(s) marcado(s) automaticamente`)).catch((e) => log('meta', e.message));
  }
  await receipts(settings).catch((e) => log('recibos', e.message));
  // central do cliente: renovações e depoimentos (horário comercial) e Instagram (uma leitura por perfil por dia)
  if (Date.now() - lastClientJobs > 10 * 60000) {
    lastClientJobs = Date.now();
    if (inCommercial(settings)) {
      await processRenewals().then((n) => n && log(`renovações: ${n} cobrança(s)`)).catch((e) => log('renovações', e.message));
      await processTestimonials().then((n) => n && log(`depoimentos: ${n} pedido(s)`)).catch((e) => log('depoimentos', e.message));
      // Mapa da Alma: 1 a 2 dias depois do mapa, oferece com carinho uma pergunta ao tarô (uma vez por cliente)
      if (!settings.paused)
        await lembretesTaro(async (lead, texto) => {
          const n = await connectedNumber(lead.number_id);
          if (n) await sendAndRecord(n, lead, texto, 'ai', true, { taro_lembrete: true });
        })
          .then((n) => n && log(`tarô: ${n} lembrete(s)`))
          .catch((e) => log('tarô lembrete', e.message));
    }
    void trackInstagramDaily().then((n) => n && log(`instagram: ${n} perfil(is) lido(s)`)).catch((e) => log('instagram', e.message));
  }
  // relatório semanal no WhatsApp (segunda de manhã)
  await maybeSendWeeklyReport()
    .then((sent) => sent && log('relatório semanal enviado'))
    .catch((e) => log('relatório semanal', e.message));
  if (settings.paused) return;
  await dispatch(settings);
}

/** Leitura dos livros: roda em paralelo para não atrasar as respostas aos clientes. */
async function studyLoop(n: number) {
  // n estudantes em paralelo (um livro cada) — 3 deixam 2.000 páginas prontas em ~1 hora
  await sleep(n * 4000);
  for (;;) {
    let worked = false;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.ANTHROPIC_API_KEY) {
        if (n === 0) await flagWaiting(explainAiError(new Error('falta ANTHROPIC_API_KEY')));
      } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        while (replyingNow.size) await sleep(1000);
        worked = await digestNext();
        if (worked) log(`estudante ${n + 1}: estudou mais uma parte de um livro`);
      }
    } catch (e: any) {
      log(`estudante ${n + 1}: erro ao estudar livro`, e?.message || e);
      await sleep(60000);
    }
    await sleep(worked ? 1500 : 30000);
  }
}

/** Inteligência: vetores de significado, medição das mensagens e estudo das conversas encerradas. */
/** Backup no Google Drive e resumos da Produção: pastas, arquivos dos clientes, recibos e Google Docs. */
async function driveLoop() {
  let lastErr = '';
  let lastModels = 0;
  let lastDomains = 0;
  for (;;) {
    // domínios próprios ainda sem HTTPS: confere sozinho a cada 10 minutos
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && Date.now() - lastDomains > 10 * 60_000) {
      lastDomains = Date.now();
      const { data: doms } = await db().from('domains').select('host,https_ok').then((r: any) => r, () => ({ data: [] }));
      const pend = (doms || []).filter((x: any) => !x.https_ok);
      for (const x of pend) await checkDomain(x.host).catch(() => {});
      if (pend.length) await applyDomains().catch(() => {});
    }
    // modelos premium do GitHub (pasta Modelos): a cada 5 minutos
    const compiling = process.env.GITHUB_TOKEN
      ? await db().from('premium_templates').select('slug', { count: 'exact', head: true }).eq('status', 'compilando').then((r: any) => r.count || 0, () => 0)
      : 0;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.GITHUB_TOKEN && Date.now() - lastModels > (compiling ? 40_000 : 5 * 60_000)) {
      lastModels = Date.now();
      await withTimeout(syncTemplates(), 5 * 60_000, 'sincronização dos modelos travada')
        .then((r: any) => r?.changed && log(`modelos premium: ${r.changed} atualizado(s) de ${r.total}`))
        .catch((e: any) => !/does not exist|schema cache/i.test(String(e?.message)) && log('modelos', String(e?.message || e).slice(0, 200)));
    }
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        while (replyingNow.size) await sleep(1000);
        const r = await withTimeout(driveCycle(), 8 * 60_000, 'backup no Drive travado');
        if (r.folders || r.files || r.payments || r.docs) log(`drive: ${r.folders} pasta(s), ${r.files} arquivo(s), ${r.payments} recibo(s), ${r.docs} resumo(s)`);
        lastErr = '';
      } catch (e: any) {
        const m = String(e?.message || e).slice(0, 200);
        if (m !== lastErr && !/column|relation .* does not exist|schema cache/i.test(m)) log('drive', m);
        lastErr = m;
      }
    }
    await sleep(compiling ? 20_000 : 60_000);
  }
}

async function intelLoop() {
  let ratedSinceBrain = 0;
  let lastScore = 0;
  let lastCases = 0;
  for (;;) {
    let busy = false;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        while (replyingNow.size) await sleep(1000);
        busy = (await embedPending(12)) > 0;
      } catch (e: any) {
        log('busca por significado indisponível:', String(e?.message || e).slice(0, 200));
        await sleep(10 * 60000);
      }
      if (Date.now() - lastScore > 10 * 60000) {
        lastScore = Date.now();
        await scoreMessages().then((n) => n && log(`mediu ${n} mensagens`)).catch((e) => log('medição', e.message));
      }
      if (process.env.ANTHROPIC_API_KEY) {
        // autoavaliação das técnicas novas (lotes de 40)
        const rated = await rateInsights(40).catch((e) => (log('avaliação das técnicas', e.message), 0));
        if (rated) {
          busy = true;
          ratedSinceBrain += rated;
          log(`avaliou ${rated} técnicas`);
        } else if (ratedSinceBrain >= 40) {
          // terminou de avaliar um lote grande: refaz o cérebro só com as técnicas boas
          ratedSinceBrain = 0;
          await rebuildBrain().catch((e) => log('cérebro dos livros', e.message));
        }
      }
      if (process.env.ANTHROPIC_API_KEY && Date.now() - lastCases > 15 * 60000) {
        lastCases = Date.now();
        await studyPendingCases(3).then((n) => n && log(`estudou ${n} conversas encerradas`)).catch((e) => log('casos', e.message));
        await maybeRebuildRealBrain().catch((e) => log('cérebro real', e.message));
      }
    }
    await sleep(busy ? 1500 : 60000);
  }
}

// um erro solto em segundo plano nunca derruba o robô (nem o painel junto)
process.on('unhandledRejection', (e: any) => log('erro em segundo plano:', e?.message || e));
process.on('uncaughtException', (e: any) => log('erro inesperado:', e?.message || e));

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log('Supabase ainda não configurado. O robô vai esperar.');
  }
  log('ligado', process.env.ANTHROPIC_API_KEY ? '(IA: chave encontrada)' : '(IA: SEM chave)');
  beatLoop();
  replyLoop();
  // assina o evento "digitando…" nos números já conectados (para a IA esperar o cliente terminar)
  (async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const { data: nums } = await db().from('whatsapp_numbers').select('instance_name').eq('status', 'conectado');
    for (const n of nums || []) await evo.setWebhook(n.instance_name).catch((e: any) => log('webhook', e?.message || e));
  })().catch(() => {});
  for (let i = 0; i < 3; i++) studyLoop(i);
  intelLoop();
  driveLoop();
  for (;;) {
    alive.tick = Date.now();
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) await withTimeout(tick(), 10 * 60_000, 'ciclo principal travado');
    } catch (e: any) {
      log('erro no ciclo', e?.message || e);
    }
    await sleep(15000);
  }
}

main();
