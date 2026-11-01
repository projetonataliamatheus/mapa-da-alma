/**
 * Inteligência que melhora a cada venda.
 *  Base 1 (livros): técnicas + trechos, com busca por significado.
 *  Base 2 (cenários reais): casos ganhos/perdidos e mensagens medidas (as campeãs sobem).
 * Tudo fica no Supabase; para o Claude vai só um resumo curto do que importa agora.
 */
import { admin } from './supabase/admin';
import { structured } from './ai';
import { embed, embedQuery, embedStatus, toVec } from './embed';
import { buildQuery } from './knowledge';
import { KINDS as KINDS_LABEL } from './knowledge-kinds';
import { transcript, leadBlock } from './prompts';
import { brl } from './util';

const db = () => admin();

const RANK: Record<string, number> = { novo: 0, abordado: 1, respondeu: 2, interessado: 3, negociando: 4, pix: 5, pago: 6, sem: 1, remarketing: 1 };

/* ---------------- busca combinada ---------------- */

export type Intel = {
  insights: any[];
  chunks: any[];
  cases: any[];
  lost: any[];
  snippets: any[];
  semantic: boolean;
};

const EMPTY: Intel = { insights: [], chunks: [], cases: [], lost: [], snippets: [], semantic: false };

/** Busca nas duas bases o que serve para este momento da conversa. */
export async function gather(text: string, opts: { stage?: string; niche?: string | null; kinds?: string[]; nInsights?: number; nChunks?: number; nCases?: number; nSnippets?: number } = {}): Promise<Intel> {
  const q = buildQuery(`${opts.niche || ''} ${text}`, opts.stage) || '';
  const emb = await embedQuery(`${opts.niche ? opts.niche + ': ' : ''}${text}`);
  const v = toVec(emb);
  const niche = opts.niche || null;
  const nIns = opts.nInsights ?? 6;
  const [ins0, ch, won, lost, sn] = await Promise.all([
    // v2 traz a prioridade do livro; busca o dobro para poder montar a cota 70/30
    nIns === 0 ? null : db().rpc('match_insights_v2', { q, emb: v, n: nIns * 2 }),
    opts.nChunks === 0 ? null : db().rpc('match_chunks', { q, emb: v, n: opts.nChunks ?? 3 }),
    opts.nCases === 0 ? null : db().rpc('match_cases', { q, emb: v, p_niche: niche, p_outcome: 'ganho', n: opts.nCases ?? 2 }),
    opts.nCases === 0 ? null : db().rpc('match_cases', { q, emb: v, p_niche: niche, p_outcome: 'perdido', n: 2 }),
    opts.nSnippets === 0 ? null : db().rpc('match_snippets', { q, emb: v, p_niche: niche, p_kinds: opts.kinds || null, n: opts.nSnippets ?? 3 }),
  ]);
  let ins: any = ins0;
  if (ins0?.error) ins = await db().rpc('match_insights', { q, emb: v, n: nIns }); // migração 013 ainda não rodada
  else if (ins0?.data) ins = { ...ins0, data: priorityMix(ins0.data, nIns) };
  // atualização 007 ainda não rodada: volta para a busca antiga por palavras
  if (ins?.error && /match_insights|function/i.test(ins.error.message)) {
    if (!q) return EMPTY;
    const [a, b] = await Promise.all([db().rpc('search_insights', { q, n: opts.nInsights ?? 6 }), db().rpc('search_chunks', { q, n: opts.nChunks ?? 3 })]);
    return { ...EMPTY, insights: a.data || [], chunks: b.data || [] };
  }
  for (const r of [ins, ch, won, lost, sn]) if (r?.error) console.error('busca da inteligência:', r.error.message);
  return {
    insights: ins?.data || [],
    chunks: ch?.data || [],
    cases: won?.data || [],
    lost: lost?.data || [],
    snippets: sn?.data || [],
    semantic: !!emb,
  };
}

/**
 * Técnicas para a conversa: ~70% dos livros primários (base principal) e ~30% dos secundários (apoio).
 * Se um lado não tiver técnica relevante, o outro completa. Mantém a ordem de relevância.
 */
export function priorityMix(list: any[], n: number) {
  const prim = list.filter((i) => i.priority === 'primario');
  const sec = list.filter((i) => i.priority !== 'primario');
  if (!prim.length || !sec.length) return list.slice(0, n);
  let wantP = Math.max(1, Math.round(n * 0.7));
  let wantS = n - wantP;
  if (prim.length < wantP) {
    wantS += wantP - prim.length;
    wantP = prim.length;
  }
  if (sec.length < wantS) {
    wantP = Math.min(prim.length, wantP + wantS - sec.length);
    wantS = sec.length;
  }
  const keep = new Set([...prim.slice(0, wantP), ...sec.slice(0, wantS)]);
  return list.filter((i) => keep.has(i));
}

export async function getBrains() {
  const [{ data }, { data: pm }] = await Promise.all([db().from('knowledge_brain').select('*').eq('id', 1).maybeSingle(), db().from('prompt_master').select('content').eq('id', 1).maybeSingle()]);
  return { books: data?.content || null, real: data?.real_content || null, master: (pm?.content || '').trim() || null };
}

/**
 * PROMPT MASTER: a diretriz fixa da agência. Vai SEMPRE no topo absoluto do prompt, antes de tudo.
 * A atualização do Cérebro de vendas nunca mexe nela (fica em outra tabela).
 */
export function masterBlock(master: string | null | undefined) {
  const t = String(master || '').trim();
  if (!t) return '';
  return `PROMPT MASTER — DIRETRIZ IMUTÁVEL DA AGÊNCIA (LEI MÁXIMA)
Tudo abaixo (regras de escrita, Cérebro de vendas, técnicas e exemplos) vem DEPOIS desta diretriz. Se qualquer coisa abaixo conflitar com ela, siga esta diretriz.
<<<
${t}
>>>

`;
}

/** Junta o Prompt Master no topo de um prompt de sistema. */
export function withMaster(master: string | null | undefined, system: string) {
  return masterBlock(master) + system;
}

/** Parte fixa (vai para o cache do Claude): os dois cérebros. */
export function brainsBlock(b: { books: string | null; real: string | null; master?: string | null }) {
  return [
    `CÉREBRO REAL — o que já funcionou com os NOSSOS clientes (tem prioridade quando conflitar com os livros)\n${b.real || '(ainda poucas conversas reais estudadas; apoie-se nos livros)'}`,
    `CÉREBRO DOS LIVROS — princípios estudados pela equipe (siga sempre)\n${b.books || '(ainda sem livros estudados)'}`,
  ].join('\n\n');
}

/** Parte variável: o que foi encontrado para esta situação. */
export function situationBlock(k: Intel) {
  const parts: string[] = [];
  if (k.cases.length)
    parts.push(
      'CLIENTES REAIS PARECIDOS QUE COMPRARAM (use a lição; nunca cite o nome de outro cliente)\n' +
        k.cases.map((c) => `[caso ${c.id}] ${c.niche || ''}${c.price ? ` · ${brl(c.price)}` : ''}: ${c.summary} Virada: ${c.turning_point || '—'}. Lição: ${c.lesson}`).join('\n'),
    );
  if (k.lost.length) parts.push('CUIDADO — CONVERSAS PARECIDAS QUE PERDEMOS\n' + k.lost.map((c) => `- ${c.lost_reason || 'perdido'}: ${c.lesson}`).join('\n'));
  if (k.snippets.length)
    parts.push(
      'MENSAGENS QUE MAIS FUNCIONARAM EM SITUAÇÕES PARECIDAS (inspire-se no jeito; escreva a sua, adaptada a este cliente)\n' +
        k.snippets.map((s) => `- Cliente disse: "${String(s.situation || 'primeiro contato').slice(0, 140)}" → resposta que funcionou: "${s.text}"`).join('\n'),
    );
  if (k.insights.length)
    parts.push(
      'TÉCNICAS DOS LIVROS MAIS RELEVANTES AGORA (aplique a que fizer sentido e informe o número em "techniques_used"). As de BASE PRINCIPAL conduzem a estratégia; as de APOIO servem só para lapidar o texto, os gatilhos e a empatia\n' +
        k.insights
          .map((i) => `#${i.id} [${i.priority === 'primario' ? 'BASE PRINCIPAL' : i.priority ? 'APOIO' : ''}${i.priority ? ' · ' : ''}${KINDS_LABEL[i.kind] || i.kind}] ${i.title}: ${i.content}${i.example ? ` Exemplo: "${i.example}"` : ''}`)
          .join('\n'),
    );
  if (k.chunks.length) parts.push('TRECHOS DOS LIVROS (inspiração; não copie)\n' + k.chunks.map((c) => `- (${c.doc_name}) ${String(c.content).slice(0, 600)}`).join('\n'));
  return parts.join('\n\n');
}

/** Ids usados como exemplo (para dar pontos quando a venda sair). */
export function exMeta(k: Intel) {
  const ex: any = {};
  if (k.cases.length) ex.cases = k.cases.map((c) => Number(c.id));
  if (k.snippets.length) ex.snippets = k.snippets.map((s) => Number(s.id));
  return Object.keys(ex).length ? { ex } : {};
}

export async function markExamplesUsed(k: Intel) {
  const c = k.cases.map((x) => Number(x.id));
  const s = k.snippets.map((x) => Number(x.id));
  await Promise.all([c.length ? db().rpc('bump_cases', { ids: c, field: 'used' }) : null, s.length ? db().rpc('bump_snippets', { ids: s, field: 'used' }) : null]);
}

/** Venda feita: casos e mensagens que inspiraram a conversa ganham pontos; as mensagens desta conversa viram "venderam". */
export async function creditRealWins(leadId: string) {
  const { data } = await db().from('messages').select('meta').eq('lead_id', leadId).eq('direction', 'out').not('meta', 'is', null);
  const cases = new Set<number>();
  const sn = new Set<number>();
  for (const m of data || []) {
    for (const id of m.meta?.ex?.cases || []) cases.add(Number(id));
    for (const id of m.meta?.ex?.snippets || []) sn.add(Number(id));
  }
  await Promise.all([
    cases.size ? db().rpc('bump_cases', { ids: Array.from(cases), field: 'wins' }) : null,
    sn.size ? db().rpc('bump_snippets', { ids: Array.from(sn), field: 'wins' }) : null,
    db().from('msg_snippets').update({ won: true }).eq('lead_id', leadId),
  ]);
}

/* ---------------- medição de cada mensagem ---------------- */

function kindOf(prevInbound: boolean, outsBefore: number, stage: string) {
  if (!prevInbound) return outsBefore === 0 ? 'abertura' : 'follow_up';
  if (stage === 'pix') return 'fechamento';
  if (stage === 'negociando') return 'objecao';
  return 'resposta';
}

/**
 * Mede as mensagens enviadas (IA e equipe): respondeu? esquentou? avançou? vendeu?
 * Roda no robô. Só mede depois de dar tempo para o cliente responder.
 */
export async function scoreMessages(limit = 150) {
  const sixH = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { data: pend, error } = await db()
    .from('messages')
    .select('lead_id')
    .eq('direction', 'out')
    .in('author', ['ai', 'human'])
    .eq('scored', false)
    .lt('created_at', sixH)
    .limit(limit);
  if (error) return 0; // atualização 007 ainda não rodada
  const leads = Array.from(new Set((pend || []).map((m: any) => m.lead_id))).slice(0, 25);
  let n = 0;
  for (const leadId of leads) n += await scoreLead(leadId);
  return n;
}

async function scoreLead(leadId: string) {
  const [{ data: lead }, { data: msgs }] = await Promise.all([
    db().from('leads').select('id,niche,stage,temperature').eq('id', leadId).maybeSingle(),
    db().from('messages').select('id,direction,author,body,transcript,meta,feedback,scored,created_at').eq('lead_id', leadId).order('created_at').limit(400),
  ]);
  if (!lead || !msgs) return 0;
  const now = Date.now();
  let outs = 0;
  let lastIn: string | null = null;
  let prevInbound = false;
  const rows: any[] = [];
  const done: string[] = [];
  let group: string[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    // resposta em vários balões: só o último é medido, com o texto de todos juntos
    const parts = Number(m.meta?.parts || 1);
    const isPart = m.direction === 'out' && parts > 1 && Number(m.meta?.part ?? parts - 1) < parts - 1;
    if (isPart) {
      group.push(String(m.body || ''));
      if (!m.scored) done.push(m.id);
      continue;
    }
    const fullText = m.direction === 'out' && parts > 1 ? [...group, String(m.body || '')].join(' / ') : String(m.body || '');
    if (m.direction === 'out') group = [];
    if (m.direction === 'in') {
      lastIn = m.transcript || m.body || lastIn;
      prevInbound = true;
      continue;
    }
    if (m.author === 'system') continue;
    const isSent = m.author === 'ai' || m.author === 'human';
    if (isSent && !m.scored && String(m.body || '').trim().length <= 3) done.push(m.id);
    else if (isSent && !m.scored) {
      const age = now - new Date(m.created_at).getTime();
      // resposta = mensagem do cliente antes da próxima mensagem nossa (IA ou equipe)
      let reply: any = null;
      let nextOut: any = null;
      for (let j = i + 1; j < msgs.length; j++) {
        if (msgs[j].direction === 'in') {
          reply = reply || msgs[j];
        } else if (msgs[j].author !== 'system') {
          nextOut = msgs[j];
          break;
        }
      }
      const decided = reply || nextOut || age > 48 * 3600_000;
      if (age > 6 * 3600_000 && decided) {
        const t0 = Number(m.meta?.temp ?? NaN);
        const t1 = Number(nextOut?.meta?.temp ?? (reply ? lead.temperature : NaN));
        const s0 = m.meta?.stage;
        const s1 = nextOut?.meta?.stage || (reply ? lead.stage : s0);
        const stage = s0 || lead.stage;
        rows.push({
          message_id: m.id,
          lead_id: lead.id,
          author: m.author,
          niche: lead.niche,
          stage,
          kind: kindOf(prevInbound, outs, stage),
          situation: lastIn ? String(lastIn).slice(0, 400) : null,
          text: fullText.slice(0, 600),
          got_reply: !!reply,
          temp_delta: reply && Number.isFinite(t0) && Number.isFinite(t1) ? Math.round(t1 - t0) : null,
          advanced: !!(reply && s0 && s1 && (RANK[s1] ?? 0) > (RANK[s0] ?? 0)),
          won: lead.stage === 'pago',
          feedback: m.feedback ?? null,
        });
        done.push(m.id);
      }
    }
    if (isSent) outs++;
    prevInbound = false;
  }
  if (rows.length) await db().from('msg_snippets').upsert(rows, { onConflict: 'message_id' });
  if (done.length) await db().from('messages').update({ scored: true }).in('id', done);
  return rows.length;
}

/** 👍/👎 da equipe numa mensagem. */
export async function setFeedback(messageId: string, value: 1 | -1 | null, note: string | null, userId: string) {
  await db().from('messages').update({ feedback: value, feedback_note: note, feedback_by: userId }).eq('id', messageId);
  await db().from('msg_snippets').update({ feedback: value }).eq('message_id', messageId);
}

/* ---------------- estudo de casos (ganhos e perdidos) ---------------- */

const CASE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'O caso em 2 frases: quem era o cliente, o que queria e como terminou. Sem nome do cliente.' },
    pains: { type: 'array', items: { type: 'string' }, description: 'Dores ditas pelo cliente, com as palavras dele (curtas).' },
    objections: {
      type: 'array',
      items: {
        type: 'object',
        properties: { objection: { type: 'string' }, response: { type: 'string', description: 'O que respondemos.' }, worked: { type: 'boolean', description: 'A resposta destravou?' } },
        required: ['objection', 'response', 'worked'],
      },
    },
    turning_point: { type: 'string', description: 'Ganho: o momento/mensagem que virou a conversa. Perdido: onde a conversa esfriou.' },
    lost_reason: { type: ['string', 'null'], description: 'Só se perdido: motivo em até 6 palavras (ex.: "preço antes do valor", "sumiu após o preço", "não acredita em numerologia", "sem dinheiro agora").' },
    lesson: { type: 'string', description: 'Lição prática para as próximas conversas parecidas, em 1 ou 2 frases, no imperativo ("Mande a prévia antes do preço…").' },
    tags: { type: 'array', items: { type: 'string' }, description: 'Até 6 etiquetas curtas (ex.: preço, prévia, urgência, confiança, prazo).' },
  },
  required: ['summary', 'pains', 'objections', 'turning_point', 'lesson', 'tags'],
};

export async function studyCase(leadId: string, outcome: 'ganho' | 'perdido') {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return null;
  const { data: msgs } = await db().from('messages').select('*').eq('lead_id', leadId).order('created_at').limit(160);
  const list = msgs || [];
  if (list.filter((m: any) => m.direction === 'in').length < 1 && outcome === 'perdido') {
    await db().from('leads').update({ case_done: true }).eq('id', leadId);
    return null;
  }
  const r = await structured<any>(
    `Você é um diretor comercial que estuda conversas reais de venda pelo WhatsApp (Mapa da Alma: numerologia + signo e tarô, para pessoas comuns) para ensinar a equipe e a IA vendedora. Seja específico e prático. Este caso foi ${outcome === 'ganho' ? 'GANHO (o cliente pagou)' : 'PERDIDO (o cliente não comprou)'}.`,
    `Cliente:\n${leadBlock(lead)}\nOrigem: ${lead.source || 'google'} · Abordagem: ${lead.approach_slug || '—'}${lead.paid_amount ? ` · Pagou ${brl(lead.paid_amount)}` : ''}\n\nConversa:\n${transcript(list)}`,
    'estudar_caso',
    CASE_SCHEMA,
    1200,
    { task: outcome === 'ganho' ? 'caso_ganho' : 'caso_perdido', leadId, tier: outcome === 'ganho' ? 'smart' : 'fast' },
  );
  const first = list.find((m: any) => m.direction === 'out');
  const days = lead.paid_at && first ? (new Date(lead.paid_at).getTime() - new Date(first.created_at).getTime()) / 86400000 : null;
  const row = {
    lead_id: lead.id,
    outcome,
    niche: lead.niche,
    channel: lead.source,
    approach_slug: lead.approach_slug,
    service: lead.deal_service,
    price: outcome === 'ganho' ? lead.paid_amount || lead.deal_price : lead.deal_price,
    days_to_close: days ? Math.round(days * 10) / 10 : null,
    messages: list.length,
    pains: (r.pains || []).slice(0, 8),
    objections: (r.objections || []).slice(0, 8),
    turning_point: r.turning_point,
    lost_reason: outcome === 'perdido' ? r.lost_reason || 'não informado' : null,
    lesson: r.lesson,
    summary: r.summary,
    tags: (r.tags || []).map((t: string) => String(t).toLowerCase().slice(0, 30)).slice(0, 6),
  };
  const { data: saved } = await db().from('sales_cases').upsert(row, { onConflict: 'lead_id' }).select('id').single();
  await db().from('leads').update({ case_done: true }).eq('id', lead.id);
  await db().from('lead_events').insert({
    lead_id: lead.id,
    type: 'case',
    channel: 'ai',
    text: outcome === 'ganho' ? `Venda de ${lead.name} virou caso de estudo: ${r.lesson}` : `Conversa perdida com ${lead.name} estudada (${row.lost_reason}): ${r.lesson}`,
  });
  return saved?.id || null;
}

/** Encontra conversas encerradas que ainda não viraram caso. */
export async function studyPendingCases(max = 3) {
  const { data: won, error } = await db().from('leads').select('id').eq('stage', 'pago').eq('case_done', false).eq('learn_pending', false).limit(max);
  if (error) return 0;
  const old = new Date(Date.now() - 14 * 86400000).toISOString();
  const quiet = new Date(Date.now() - 3 * 86400000).toISOString();
  const { data: lostA } = await db().from('leads').select('id').eq('case_done', false).or('stage.eq.sem,opted_out.eq.true').not('last_inbound_at', 'is', null).limit(max);
  const { data: lostB } = await db()
    .from('leads')
    .select('id')
    .eq('case_done', false)
    .in('stage', ['respondeu', 'interessado', 'negociando', 'pix'])
    .lt('last_inbound_at', old)
    .lt('last_outbound_at', quiet)
    .limit(max);
  let n = 0;
  for (const l of won || []) if (n < max && (await studyCase(l.id, 'ganho'))) n++;
  for (const l of [...(lostA || []), ...(lostB || [])]) {
    if (n >= max) break;
    if (await studyCase(l.id, 'perdido')) n++;
  }
  if (n) await maybeRebuildRealBrain();
  return n;
}

/* ---------------- cérebro real ---------------- */

const REAL_SCHEMA = {
  type: 'object',
  properties: { content: { type: 'string', description: 'O manual em tópicos curtos com títulos.' } },
  required: ['content'],
};

export async function maybeRebuildRealBrain(force = false) {
  const [{ count }, { data: b }] = await Promise.all([db().from('sales_cases').select('id', { count: 'exact', head: true }), db().from('knowledge_brain').select('real_cases,real_updated_at').eq('id', 1).maybeSingle()]);
  const total = count || 0;
  const last = b?.real_cases || 0;
  const stale = !b?.real_updated_at || Date.now() - new Date(b.real_updated_at).getTime() > 24 * 3600_000;
  if (!force && (total < 2 || (total - last < 3 && !(stale && total > last)))) return null;
  return rebuildRealBrain();
}

export async function rebuildRealBrain() {
  const [{ data: won }, { data: lost }, { data: top }, { data: bad }] = await Promise.all([
    db().from('sales_cases').select('*').eq('outcome', 'ganho').order('wins', { ascending: false }).order('created_at', { ascending: false }).limit(60),
    db().from('sales_cases').select('niche,lost_reason,lesson,turning_point').eq('outcome', 'perdido').order('created_at', { ascending: false }).limit(60),
    db().from('msg_snippets').select('kind,niche,situation,text,score').gte('score', 2).order('score', { ascending: false }).limit(40),
    db().from('msg_snippets').select('kind,text,situation').or('feedback.eq.-1,score.lte.-0.5').order('updated_at', { ascending: false }).limit(15),
  ]);
  const total = (won?.length || 0) + (lost?.length || 0);
  if (!total && !top?.length) return null;
  const r = await structured<{ content: string }>(
    `Você é diretor comercial e vai escrever o "Cérebro real": o manual que a IA vendedora segue em toda conversa, baseado SOMENTE no que aconteceu com os nossos clientes de verdade (vendas ganhas, perdidas e mensagens medidas).
Formato: títulos curtos (O que mais converte, Por nicho, Objeções e respostas que funcionaram, Erros que fazem perder, Mensagens que funcionam, Quando mandar prévia/preço/link) e tópicos de 1 linha, no imperativo.
Seja concreto (cite padrões, números de casos quando houver: "em 4 de 5 vendas de odontologia…"). Máximo 40 tópicos. Português do Brasil. Nada de inventar o que não está nos dados.`,
    [
      `VENDAS GANHAS (${won?.length || 0}):`,
      ...(won || []).map((c: any) => `- [${c.niche || '?'} · ${c.channel || '?'} · ${c.price ? brl(c.price) : '?'} · ${c.days_to_close ?? '?'} dias] ${c.summary} | virada: ${c.turning_point} | lição: ${c.lesson} | objeções: ${(c.objections || []).map((o: any) => `${o.objection} → ${o.response}${o.worked ? ' (funcionou)' : ''}`).join('; ')}`),
      `\nCONVERSAS PERDIDAS (${lost?.length || 0}):`,
      ...(lost || []).map((c: any) => `- [${c.niche || '?'}] ${c.lost_reason}: ${c.lesson} (esfriou em: ${c.turning_point})`),
      `\nMENSAGENS COM MELHOR RESULTADO:`,
      ...(top || []).map((s: any) => `- (${s.kind}, ${s.niche || '?'}, nota ${Number(s.score).toFixed(1)}) cliente: "${String(s.situation || 'primeiro contato').slice(0, 100)}" → "${s.text}"`),
      `\nMENSAGENS QUE NÃO FUNCIONARAM OU A EQUIPE REPROVOU:`,
      ...(bad || []).map((s: any) => `- (${s.kind}) "${s.text}"`),
    ].join('\n'),
    'cerebro_real',
    REAL_SCHEMA,
    3000,
    { task: 'cerebro', tier: 'smart' },
  );
  const { count } = await db().from('sales_cases').select('id', { count: 'exact', head: true });
  await db().from('knowledge_brain').upsert({ id: 1, real_content: r.content, real_cases: count || 0, real_updated_at: new Date().toISOString() });
  await db().from('lead_events').insert({ type: 'kb_brain', channel: 'ai', text: `Cérebro real atualizado com ${count || 0} casos de clientes de verdade` });
  return r.content;
}

/* ---------------- vetores (busca por significado) ---------------- */

/** Gera os vetores que faltam, em lotes pequenos. Roda no robô. */
export async function embedPending(batch = 24) {
  if (embedStatus().disabled) return 0;
  const jobs: [string, string, (r: any) => string][] = [
    ['knowledge_insights', 'id,title,content,example,tags', (r) => `${r.title}. ${r.content} ${r.example || ''} ${(r.tags || []).join(' ')}`],
    ['sales_cases', 'id,niche,summary,lesson,turning_point,lost_reason,objections', (r) => `${r.niche || ''}: ${r.summary} ${r.lesson} ${r.turning_point || ''} ${r.lost_reason || ''} ${(r.objections || []).map((o: any) => o.objection).join(' ')}`],
    ['msg_snippets', 'id,niche,situation,text', (r) => `${r.niche || ''}: cliente: ${r.situation || 'primeiro contato'} resposta: ${r.text}`],
    ['knowledge_chunks', 'id,content', (r) => r.content],
  ];
  let n = 0;
  for (const [table, cols, textOf] of jobs) {
    const { data, error } = await db().from(table).select(cols).is('embedding', null).order('id').limit(batch);
    if (error || !data?.length) continue;
    const vecs = await embed(data.map(textOf), 'passage');
    await Promise.all(data.map((r: any, i: number) => db().from(table).update({ embedding: toVec(vecs[i]) }).eq('id', r.id)));
    n += data.length;
    if (n >= batch) break;
  }
  return n;
}

/** Números para a tela Inteligência. */
export async function intelStats() {
  const c = (t: string, f?: (q: any) => any) => {
    let q = db().from(t).select('id', { count: 'exact', head: true });
    if (f) q = f(q);
    return q.then((r: any) => r.count || 0);
  };
  const [insights, insightsVec, chunks, chunksVec, won, lost, snippets, champions, liked, disliked] = await Promise.all([
    c('knowledge_insights'),
    c('knowledge_insights', (q) => q.not('embedding', 'is', null)),
    c('knowledge_chunks'),
    c('knowledge_chunks', (q) => q.not('embedding', 'is', null)),
    c('sales_cases', (q) => q.eq('outcome', 'ganho')),
    c('sales_cases', (q) => q.eq('outcome', 'perdido')),
    c('msg_snippets'),
    c('msg_snippets', (q) => q.gte('score', 2)),
    c('messages', (q) => q.eq('feedback', 1)),
    c('messages', (q) => q.eq('feedback', -1)),
  ]);
  return { insights, insightsVec, chunks, chunksVec, won, lost, snippets, champions, liked, disliked, embed: embedStatus() };
}
