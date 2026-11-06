import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { taxas } from '@/lib/cambio';
import { estadoConsumo, avaliarConsumo } from '@/lib/consumo-alertas';

export const dynamic = 'force-dynamic';

const SERVICOS: Record<string, { nome: string; unidade: string; cobra: 'log' | 'unidade' }> = {
  anthropic: { nome: 'Claude (Anthropic)', unidade: 'tokens', cobra: 'log' },
  elevenlabs: { nome: 'ElevenLabs (voz)', unidade: 'caracteres', cobra: 'log' },
  browserless: { nome: 'Browserless (PDF)', unidade: 'PDFs', cobra: 'unidade' },
  grok: { nome: 'Grok (xAI)', unidade: 'chamadas', cobra: 'log' },
};
const TAREFAS: Record<string, string> = {
  resposta: 'Resposta no atendimento', abertura: 'Abertura da conversa', follow_up: 'Follow-up / retomada', resumo: 'Resumo da conversa',
  resumo_projeto: 'Resumo do projeto', previa: 'Prévia do mapa', previa_premium: 'Prévia premium', livro: 'Mapa completo (livro)', cerebro: 'Cérebro / análise',
  traducao: 'Tradução', aprendizado: 'Aprendizado pós-venda', playbook: 'Playbook', modelos: 'Modelos', avaliacao: 'Avaliação', teste: 'Teste',
  audio: 'Áudio (voz)', pdf: 'PDF',
};
const serviceOf = (r: any) => r.service || (r.kind === 'ai' ? 'anthropic' : r.kind === 'voz' ? 'elevenlabs' : r.kind?.startsWith('google') ? 'google' : r.kind || 'outro');
const dia = (d: string | Date) => new Date(new Date(d).getTime() - 3 * 3600000).toISOString().slice(0, 10);

/** Consumo detalhado de todos os serviços (US$ e R$), com limites mensais e saldo. */
export const GET = withUser(async () => {
  const db = admin();
  const [{ data: cfgRows }, tx] = await Promise.all([db.from('consumo_config').select('*'), taxas()]);
  const cfg: Record<string, any> = Object.fromEntries((cfgRows || []).map((c: any) => [c.service, c]));
  const brl = Number(tx.taxas?.BRL) || 5.5;

  const desde = new Date(Date.now() - 62 * 86400000).toISOString();
  const rows: any[] = [];
  for (let from = 0; from < 60000; from += 1000) {
    const { data } = await db.from('usage_log').select('kind,service,task,model,units,input_tokens,output_tokens,calls,cost_usd,lead_id,created_at').gte('created_at', desde).order('created_at', { ascending: false }).range(from, from + 999);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const custo = (r: any, s: string) => (SERVICOS[s]?.cobra === 'unidade' ? Number(r.units ?? 1) * Number(cfg[s]?.custo_unidade || 0) : Number(r.cost_usd) || 0);
  const qtd = (r: any, s: string) => (s === 'anthropic' ? Number(r.input_tokens) + Number(r.output_tokens) : s === 'elevenlabs' ? Number(r.units ?? r.input_tokens) : s === 'google' ? Number(r.calls) : Number(r.units ?? r.calls ?? 1));

  const agora = Date.now();
  const hoje = dia(new Date());
  const mesIni = hoje.slice(0, 7);
  const sem0 = agora - 7 * 86400000;
  const zero = () => ({ hoje: 0, semana: 0, mes: 0, calls_mes: 0, qtd_mes: 0 });
  const porServico: Record<string, any> = Object.fromEntries(Object.keys(SERVICOS).map((k) => [k, zero()]));
  const dias: Record<string, Record<string, number>> = {};
  for (let i = 29; i >= 0; i--) dias[dia(new Date(agora - i * 86400000))] = {};
  const semanas: Record<string, number> = {};
  const tarefas: Record<string, { calls: number; usd: number }> = {};
  const modelos: Record<string, { calls: number; usd: number }> = {};
  const leads: Record<string, { calls: number; usd: number }> = {};
  const desdeSaldo: Record<string, number> = {};
  let respostas = { calls: 0, usd: 0 };

  for (const r of rows) {
    const s = serviceOf(r);
    if (!porServico[s]) porServico[s] = zero();
    const c = custo(r, s);
    const d = dia(r.created_at);
    const t = new Date(r.created_at).getTime();
    const p = porServico[s];
    if (d === hoje) p.hoje += c;
    if (t >= sem0) p.semana += c;
    if (d.startsWith(mesIni)) { p.mes += c; p.calls_mes += Number(r.calls) || 1; p.qtd_mes += qtd(r, s); }
    if (dias[d]) dias[d][s] = (dias[d][s] || 0) + c;
    const sem = dia(new Date(t - ((new Date(t - 3 * 3600000).getUTCDay() + 6) % 7) * 86400000));
    semanas[sem] = (semanas[sem] || 0) + c;
    if (d >= dia(new Date(agora - 29 * 86400000))) {
      const tk = r.task || '—';
      (tarefas[tk] ||= { calls: 0, usd: 0 }).calls += 1; tarefas[tk].usd += c;
      if (s === 'anthropic') {
        const mk = String(r.model || '—');
        (modelos[mk] ||= { calls: 0, usd: 0 }).calls += 1; modelos[mk].usd += c;
        if (tk === 'resposta') { respostas.calls++; respostas.usd += c; }
      }
      if (r.lead_id) { (leads[r.lead_id] ||= { calls: 0, usd: 0 }).calls += 1; leads[r.lead_id].usd += c; }
    }
    const cs = cfg[s];
    if (cs?.saldo_em && t >= new Date(cs.saldo_em).getTime()) desdeSaldo[s] = (desdeSaldo[s] || 0) + c;
  }

  const topIds = Object.entries(leads).sort((a, b) => b[1].usd - a[1].usd).slice(0, 25).map(([id]) => id);
  const { data: ls } = topIds.length ? await db.from('leads').select('id,name,pais').in('id', topIds) : { data: [] as any[] };
  const nomes = Object.fromEntries((ls || []).map((l: any) => [l.id, l.name || l.id.slice(0, 6)]));

  // ElevenLabs: saldo real direto da conta (créditos usados/limite)
  let eleven: any = null;
  try {
    if (process.env.ELEVENLABS_API_KEY) {
      const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(8000) });
      if (r.ok) { const j = await r.json(); eleven = { usado: j.character_count, limite: j.character_limit, renova: j.next_character_count_reset_unix ? new Date(j.next_character_count_reset_unix * 1000).toISOString() : null, plano: j.tier }; }
    }
  } catch {}

  const servicos = Object.entries(porServico).map(([k, v]) => {
    const c = cfg[k] || {};
    const limite = Number(c.limite_usd) || 0;
    const saldoRest = c.saldo_usd != null && c.saldo_em ? Number(c.saldo_usd) - (desdeSaldo[k] || 0) : null;
    return { id: k, nome: SERVICOS[k]?.nome || k, unidade: SERVICOS[k]?.unidade || '', ...v, limite_usd: limite, pct: limite > 0 ? v.mes / limite : null,
      saldo_inicial: c.saldo_usd != null ? Number(c.saldo_usd) : null, saldo_em: c.saldo_em || null, saldo_restante: saldoRest, custo_unidade: Number(c.custo_unidade) || 0, obs: c.obs || '',
      sincronizado: k === 'elevenlabs' && !!eleven };
  });
  await avaliarConsumo().catch(() => {});
  const vivo = await estadoConsumo().catch(() => null);
  const totalMes = servicos.reduce((a, s) => a + s.mes, 0);

  return NextResponse.json({
    brl, cambio_ao_vivo: tx.ao_vivo,
    total: { hoje: servicos.reduce((a, s) => a + s.hoje, 0), semana: servicos.reduce((a, s) => a + s.semana, 0), mes: totalMes },
    servicos, eleven, vivo: vivo?.servicos || [], conta_anthropic: vivo?.contaAnthropic ?? null,
    dias: Object.entries(dias).map(([day, v]) => ({ day, ...v, total: Object.values(v).reduce((a, b) => a + b, 0) })),
    semanas: Object.entries(semanas).sort().slice(-8).map(([sem, usd]) => ({ sem, usd })),
    tarefas: Object.entries(tarefas).map(([k, v]) => ({ id: k, nome: TAREFAS[k] || k, ...v, medio: v.calls ? v.usd / v.calls : 0 })).sort((a, b) => b.usd - a.usd),
    modelos: Object.entries(modelos).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => b.usd - a.usd),
    leads: topIds.map((id) => ({ id, nome: nomes[id], ...leads[id] })),
    por_resposta: respostas.calls ? respostas.usd / respostas.calls : 0,
  });
}, { perm: 'custos' });

/** Salva limite mensal, saldo informado (com data) e custo por unidade de um serviço. */
export const POST = withUser(async (req, _c, user) => {
  need(user, 'custos');
  const b = await req.json();
  if (!SERVICOS[b.service]) return NextResponse.json({ error: 'Serviço inválido.' }, { status: 400 });
  const num = (v: any) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
  const row: any = { service: b.service, custo_unidade: num(b.custo_unidade) ?? 0, obs: String(b.obs || '').slice(0, 300), updated_at: new Date().toISOString() };
  const lu = num(b.limite_unidades);
  if (lu != null && b.service === 'browserless') row.limite_unidades = lu;
  const saldo = num(b.saldo_usd);
  if (saldo != null) { row.saldo_usd = saldo; row.saldo_em = new Date().toISOString(); } // saldo informado "agora": o sistema desconta o consumo daqui pra frente
  const { error } = await admin().from('consumo_config').upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}, { perm: 'custos' });
