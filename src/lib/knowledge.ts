/**
 * Base de conhecimento que aprende de verdade.
 *
 * 1. Upload: o PDF vira texto e é dividido em trechos (knowledge_chunks).
 * 2. Leitura: o robô lê o livro inteiro em partes de ~36 mil caracteres e a IA extrai
 *    técnicas aplicáveis à venda pelo WhatsApp (knowledge_insights), em português.
 * 3. Cérebro de vendas: quando um livro termina, a IA consolida tudo num manual curto
 *    (knowledge_brain) que entra em TODAS as mensagens.
 * 4. Em cada resposta: busca as técnicas e trechos mais relevantes para o momento da
 *    conversa. As técnicas usadas ficam registradas na mensagem; se o cliente compra,
 *    elas ganham pontos e passam a ser escolhidas com mais frequência.
 */
import { admin } from './supabase/admin';
import { structured } from './ai';

const db = () => admin();
export const CHUNKS_PER_SECTION = 30;

import { KINDS } from './knowledge-kinds';
export { KINDS };

/* ---------------- trechos ---------------- */

/** Divide um texto longo em trechos de ~1.200 caracteres, cortando em parágrafos. */
/** Remove caracteres que o banco não aceita (nulos e pedaços de emoji quebrados vindos do PDF). */
export function cleanText(t: string) {
  return String(t || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

export function chunkText(text: string, size = 1200) {
  const clean = cleanText(text)
    .replace(/\r/g, '')
    .replace(/-\n(?=[a-zà-ú])/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const paras = clean.split(/\n\n+/);
  const out: string[] = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > size && cur) {
      out.push(cur.trim());
      cur = '';
    }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size) out.push(p.slice(i, i + size).trim());
    } else cur += (cur ? '\n\n' : '') + p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((c) => c.length > 40);
}

export async function saveDocument(name: string, kind: string, text: string, pages: number | null) {
  text = cleanText(text);
  name = cleanText(name).slice(0, 200);
  const { data: doc, error } = await db().from('knowledge_docs').insert({ name, kind, pages, status: 'processando', chars: text.length }).select('*').single();
  if (error) throw error;
  try {
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i += 200) {
      const batch = chunks.slice(i, i + 200).map((content) => ({ doc_id: doc.id, content }));
      const { error: e } = await db().from('knowledge_chunks').insert(batch);
      if (e) throw e;
    }
    const sections = Math.max(1, Math.ceil(chunks.length / CHUNKS_PER_SECTION));
    await db()
      .from('knowledge_docs')
      .update({ status: chunks.length ? 'aprendendo' : 'vazio', chunks: chunks.length, sections, sections_done: 0, updated_at: new Date().toISOString() })
      .eq('id', doc.id);
    return { ...doc, chunks: chunks.length, sections };
  } catch (e: any) {
    await db().from('knowledge_docs').update({ status: 'erro', error: e.message }).eq('id', doc.id);
    throw e;
  }
}

/* ---------------- só o que funciona por texto ---------------- */

/**
 * Técnicas que dependem de presença física ou de voz não servem para o WhatsApp
 * (aperto de mão, olhar nos olhos, postura, sobrancelha, gestos, tom de voz…).
 */
const OFFLINE_RE = new RegExp(
  [
    'linguagem (corporal|n[aã]o.?verbal)',
    'comunica[cç][aã]o n[aã]o.?verbal',
    'aperto de m[aã]o',
    'apertar a m[aã]o',
    'olh(ar|e|o)s? (nos|no fundo dos) olhos',
    'contato visual',
    'olhar fixo',
    'sobrancelha',
    'postura (f[ií]sica|corporal|do corpo|ereta)',
    'express(ão|ões|ao|oes) facia(l|is)',
    'gestos? (com as m[aã]os|corporais|f[ií]sicos)',
    'gesticul',
    'bra[cç]os cruzados',
    'inclin(ar|e) o corpo',
    'espelhamento (f[ií]sico|corporal|de postura)',
    'espelh(ar|e) (a postura|os gestos|o corpo)',
    'toque f[ií]sico',
    'tocar no (bra[cç]o|ombro)',
    'sorri(r|a) (para|com os olhos)',
    'tom de voz (calmo|firme|baixo|grave|suave|confiante|seguro|ao falar)',
    'volume da voz',
    'entona[cç][aã]o',
    'cara a cara',
    'face a face',
    'olho no olho',
    'body language',
    'eye contact',
    'handshake',
    'posture',
    'eyebrow',
  ].join('|'),
  'i',
);

/** true se a técnica depende de corpo, voz ou presença física (não serve para conversa por texto). */
export function isOfflineTechnique(t: { title?: string | null; content?: string | null; example?: string | null } | string) {
  const text = typeof t === 'string' ? t : `${t.title || ''} ${t.content || ''} ${t.example || ''}`;
  return OFFLINE_RE.test(text);
}

/* ---------------- leitura pela IA ---------------- */

const DIGEST_SCHEMA = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: Object.keys(KINDS) },
          title: { type: 'string', description: 'Nome curto da técnica (até 8 palavras), em português.' },
          content: { type: 'string', description: 'Como aplicar na prática, em 1 a 3 frases, em português.' },
          example: { type: ['string', 'null'], description: 'Exemplo curto de mensagem de WhatsApp, natural e descontraída, em português, terminando em pergunta. null se não fizer sentido.' },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 6, description: 'Palavras-chave em português (ex.: preço, confiança, urgência, prova social).' },
        },
        required: ['kind', 'title', 'content', 'tags'],
      },
    },
  },
  required: ['insights'],
};

const DIGEST_SYSTEM = `Você é um especialista em vendas consultivas e copywriting. Está lendo um livro, parte por parte, para ensinar uma IA que é uma consultora de numerologia e astrologia que atende pelo WhatsApp pessoas comuns (muitas vezes passando por problemas de dinheiro, amor, família ou saúde) e vende o Mapa da Alma (estudo de numerologia cabalística + signo, R$ 19 a R$ 49) e leituras de tarô, com mensagens curtas, calmas e acolhedoras.
Os EXEMPLOS de mensagem devem ser sempre desse contexto (alguém contando um problema na vida e a consultora mostrando o que o mapa revela), NUNCA de sites, agência, marketing, lojas, clínicas ou negócios.

Extraia SOMENTE técnicas que essa IA consegue aplicar numa conversa de WhatsApp: como abrir conversa, fazer perguntas, criar conexão, despertar desejo, usar gatilhos com ética, contornar objeções, conduzir ao fechamento, fazer follow-up e escrever textos persuasivos.
- Ignore sumário, prefácio, agradecimentos, biografia, histórias sem lição prática e repetições.
- Escreva tudo em português do Brasil, mesmo se o livro estiver em inglês.
- Seja específico: nada de conselhos genéricos como "seja confiante".
- Nunca inclua táticas enganosas, mentiras ou pressão abusiva.
- A venda acontece TODA pelo WhatsApp: ignore técnicas de marcar reunião, visita, café, almoço, ligação ou apresentação presencial. Se a ideia for boa, adapte para uma mensagem curta de WhatsApp.
- Ignore técnicas manipuladoras ou que pressionam alguém fragilizado. Escutar a dor da pessoa com carinho é permitido e desejado.
- PROIBIDO criar técnica de linguagem corporal ou presencial: aperto de mão, olhar nos olhos, contato visual, levantar sobrancelha, postura, gestos, expressão facial, espelhamento físico, toque, tom de voz ou entonação. A conversa é só por TEXTO no WhatsApp; se a ideia por trás for útil, reescreva como algo que se faz por mensagem escrita.
- Se esta parte não tiver nada aplicável, devolva uma lista vazia.`;

/** Lê a próxima parte de um livro que está sendo aprendido. Devolve true se trabalhou. */
const reading = new Set<string>();

/** Estuda a próxima parte de um livro da fila. Vários estudantes podem rodar juntos (um livro cada). */
export async function digestNext(): Promise<boolean> {
  // livros menores primeiro: o conhecimento chega mais rápido e os grandes vêm em seguida
  const { data: docs } = await db().from('knowledge_docs').select('id').eq('status', 'aprendendo').order('pages', { ascending: true, nullsFirst: false }).order('chunks', { ascending: true }).order('created_at').limit(20);
  const id = (docs || []).map((d: any) => d.id).find((x: string) => !reading.has(x));
  if (!id) return false;
  reading.add(id);
  try {
    return await digestDoc(id);
  } catch (e: any) {
    await db().from('knowledge_docs').update({ error: explainAiError(e), updated_at: new Date().toISOString() }).eq('id', id);
    throw e;
  } finally {
    reading.delete(id);
  }
}

async function digestDoc(id: string): Promise<boolean> {
  const { data: doc, error: docErr } = await db().from('knowledge_docs').select('*').eq('id', id).single();
  if (docErr) throw new Error('Não consegui ler o livro no banco: ' + docErr.message);

  let sections = doc.sections;
  if (!sections) {
    const { count } = await db().from('knowledge_chunks').select('id', { count: 'exact', head: true }).eq('doc_id', doc.id);
    sections = Math.max(1, Math.ceil((count || 0) / CHUNKS_PER_SECTION));
    await db().from('knowledge_docs').update({ sections, chunks: count || 0 }).eq('id', doc.id);
  }
  const part = Number(doc.sections_done) || 0;
  if (part >= sections) {
    await finishDoc(doc.id);
    return true;
  }

  const from = part * CHUNKS_PER_SECTION;
  const { data: chunks } = await db().from('knowledge_chunks').select('content').eq('doc_id', doc.id).order('id').range(from, from + CHUNKS_PER_SECTION - 1);
  const text = (chunks || []).map((c: any) => c.content).join('\n\n');

  if (text.trim().length > 200) {
    let r: { insights: any[] };
    try {
      r = await structured<{ insights: any[] }>(
        DIGEST_SYSTEM,
        `Livro: "${doc.name}" — parte ${part + 1} de ${sections}.\n\n${text}`,
        'registrar_tecnicas',
        DIGEST_SCHEMA,
        2500,
        { task: 'livro' },
      );
    } catch (e: any) {
      throw e;
    }
    // outro estudante (ou o botão do painel) já fez esta parte? então descarta para não duplicar
    const { data: cur } = await db().from('knowledge_docs').select('sections_done,status').eq('id', doc.id).maybeSingle();
    if (!cur || cur.status !== 'aprendendo' || (Number(cur.sections_done) || 0) !== part) return true;
    const rows = (Array.isArray(r.insights) ? r.insights : [])
      .filter((i) => i.title && i.content && !isOfflineTechnique(i))
      .map((i) => ({
        doc_id: doc.id,
        kind: KINDS[i.kind] ? i.kind : 'tecnica',
        title: String(i.title).slice(0, 140),
        content: String(i.content).slice(0, 900),
        example: i.example ? String(i.example).slice(0, 400) : null,
        tags: (i.tags || []).map((t: string) => String(t).toLowerCase().slice(0, 40)).slice(0, 6),
      }));
    if (rows.length) {
      const { error: insErr } = await db().from('knowledge_insights').insert(rows);
      if (insErr) throw new Error('Não consegui salvar as técnicas: ' + insErr.message);
    }
  }

  const { count: total } = await db().from('knowledge_insights').select('id', { count: 'exact', head: true }).eq('doc_id', doc.id);
  const { error: upErr } = await db()
    .from('knowledge_docs')
    .update({ sections_done: part + 1, insights: total || 0, error: null, updated_at: new Date().toISOString() })
    .eq('id', doc.id);
  if (upErr) throw new Error('Não consegui salvar o progresso: ' + upErr.message);
  if (part + 1 >= sections) await finishDoc(doc.id);
  return true;
}

/** Traduz o erro da IA para algo que a equipe entende e sabe resolver. */
export function explainAiError(e: any) {
  const m = String(e?.message || e || '');
  const st = e?.status || e?.error?.status;
  if (/falta ANTHROPIC_API_KEY/i.test(m)) return 'Aguardando a chave da IA: cole ANTHROPIC_API_KEY no Easypanel (radar › painel › Ambiente) e clique em Implantar.';
  if (/tool_choice/i.test(m)) return 'O modelo escolhido não aceita o formato de resposta usado. O sistema já tenta outro jeito sozinho; se continuar, use AI_MODEL_FAST=claude-haiku-5-5.';
  if (st === 401 || /authentication|invalid x-api-key|api key/i.test(m)) return 'A chave da IA foi recusada. Crie uma chave nova em console.anthropic.com › API Keys, cole no Easypanel e clique em Implantar.';
  if (/credit balance|billing|purchase credits/i.test(m)) return 'Sem crédito na API do Claude. Adicione crédito em console.anthropic.com › Billing. A leitura continua sozinha.';
  if (/spend limit|usage limit|limit.*reached/i.test(m)) return 'Limite de gasto do Console da Anthropic atingido. Aumente em Settings › Limits.';
  if (st === 404 || /not_found|model/i.test(m)) return 'Modelo da IA não encontrado. Confira AI_MODEL_FAST=claude-haiku-5-5 e AI_MODEL=claude-sonnet-5-5 no Easypanel.';
  if (st === 429 || /rate limit|overloaded/i.test(m)) return 'A IA está ocupada no momento. O sistema tenta de novo sozinho em 1 minuto.';
  if (/Teto de gastos/i.test(m)) return m;
  return 'Erro ao ler esta parte: ' + m.slice(0, 220) + ' (o sistema tenta de novo em 1 minuto)';
}

/** Marca nos livros pendentes por que a leitura ainda não começou. */
export async function flagWaiting(reason: string) {
  await db().from('knowledge_docs').update({ error: reason }).eq('status', 'aprendendo');
}

async function finishDoc(id: string) {
  await db().from('knowledge_docs').update({ status: 'processado', updated_at: new Date().toISOString() }).eq('id', id);
  const { data: d } = await db().from('knowledge_docs').select('name,insights').eq('id', id).single();
  await db().from('lead_events').insert({ type: 'kb_done', channel: 'ai', text: `IA terminou de estudar "${d?.name}": ${d?.insights || 0} técnicas aprendidas` });
  // o cérebro é refeito quando a fila de livros acabar (ou a cada 3 livros), para não gastar à toa
  const { count: left } = await db().from('knowledge_docs').select('id', { count: 'exact', head: true }).eq('status', 'aprendendo');
  const { count: done } = await db().from('knowledge_docs').select('id', { count: 'exact', head: true }).eq('status', 'processado');
  if (!left || (done || 0) % 3 === 0) await rebuildBrain().catch((e) => console.error('cérebro dos livros:', e?.message || e));
}

/** Apaga em lotes pequenos (livros grandes têm milhares de trechos; um delete único estoura o tempo do banco). */
async function deleteInBatches(table: 'knowledge_insights' | 'knowledge_chunks', docId: string) {
  let total = 0;
  for (let guard = 0; guard < 400; guard++) {
    const { data, error } = await db().from(table).select('id').eq('doc_id', docId).limit(500);
    if (error) throw new Error(`Não consegui apagar (${table}): ${error.message}`);
    if (!data?.length) break;
    const { error: e } = await db().from(table).delete().in('id', data.map((r: any) => r.id));
    if (e) throw new Error(`Não consegui apagar (${table}): ${e.message}`);
    total += data.length;
  }
  return total;
}

/**
 * Exclusão em cascata de verdade: técnicas aprendidas, trechos e o próprio material.
 * Depois o Cérebro de vendas é refeito só com o que sobrou (sem o livro excluído).
 */
export async function deleteDocument(id: string) {
  reading.delete(id);
  // tira da fila primeiro, para nenhum estudante gravar técnica nova deste livro no meio da exclusão
  await db().from('knowledge_docs').update({ status: 'excluindo' }).eq('id', id);
  const insights = await deleteInBatches('knowledge_insights', id);
  const chunks = await deleteInBatches('knowledge_chunks', id);
  const { error } = await db().from('knowledge_docs').delete().eq('id', id);
  if (error) throw new Error('Não consegui apagar o material: ' + error.message);
  // sobrou alguma técnica gravada no meio do caminho? sai também
  await deleteInBatches('knowledge_insights', id).catch(() => 0);
  return { insights, chunks };
}

/**
 * Sincronizar base ativa: apaga técnicas e trechos de livros que não existem mais (órfãos)
 * e as técnicas de linguagem corporal/presencial. Fica só o que vem dos materiais da lista.
 */
export async function syncActiveBase() {
  let orphanInsights = 0;
  let orphanChunks = 0;
  const { data: r, error } = await db().rpc('kb_sync_orphans');
  if (!error) {
    const row: any = Array.isArray(r) ? r[0] : r;
    orphanInsights = Number(row?.insights) || 0;
    orphanChunks = Number(row?.chunks) || 0;
  } else {
    // migração 013 ainda não rodada: faz pelo app
    const { data: docs } = await db().from('knowledge_docs').select('id');
    const alive = new Set((docs || []).map((d: any) => d.id));
    for (const table of ['knowledge_insights', 'knowledge_chunks'] as const) {
      let last = 0;
      for (let guard = 0; guard < 2000; guard++) {
        const { data } = await db().from(table).select('id,doc_id').gt('id', last).order('id').limit(1000);
        if (!data?.length) break;
        last = Number(data[data.length - 1].id);
        const dead = data.filter((x: any) => !alive.has(x.doc_id)).map((x: any) => x.id);
        if (dead.length) {
          await db().from(table).delete().in('id', dead);
          if (table === 'knowledge_insights') orphanInsights += dead.length;
          else orphanChunks += dead.length;
        }
      }
    }
  }
  // técnicas de corpo/voz/presencial (inclusive as aprendidas antes deste filtro existir)
  const offline: number[] = [];
  let last = 0;
  for (let guard = 0; guard < 500; guard++) {
    const { data } = await db().from('knowledge_insights').select('id,title,content,example').gt('id', last).order('id').limit(1000);
    if (!data?.length) break;
    last = Number(data[data.length - 1].id);
    for (const i of data) if (isOfflineTechnique(i)) offline.push(Number(i.id));
  }
  const removedOffline = offline.length ? await deleteInsights(offline) : 0;
  // contagem certa por livro
  const { data: docs } = await db().from('knowledge_docs').select('id');
  for (const d of docs || []) {
    const { count } = await db().from('knowledge_insights').select('id', { count: 'exact', head: true }).eq('doc_id', d.id);
    await db().from('knowledge_docs').update({ insights: count || 0 }).eq('id', d.id);
  }
  await db().from('lead_events').insert({
    type: 'kb_sync',
    channel: 'ai',
    text: `Base sincronizada: ${orphanInsights} técnica(s) e ${orphanChunks} trecho(s) de livros excluídos + ${removedOffline} técnica(s) de linguagem corporal/presencial removidas`,
  });
  return { orphanInsights, orphanChunks, removedOffline };
}

/** Recomeça a leitura de um livro do zero. */
export async function relearn(id: string) {
  await db().from('knowledge_insights').delete().eq('doc_id', id);
  await db().from('knowledge_docs').update({ status: 'aprendendo', sections_done: 0, insights: 0, error: null }).eq('id', id);
}

/* ---------------- cérebro de vendas ---------------- */

const BRAIN_SCHEMA = {
  type: 'object',
  properties: { content: { type: 'string', description: 'O manual, em texto simples com títulos e tópicos curtos.' } },
  required: ['content'],
};

export async function rebuildBrain(force = false) {
  // economia: o cérebro dos livros é refeito no máximo 1 vez a cada 12 h (automático); o botão do painel força
  if (!force) {
    const { data: b } = await db().from('knowledge_brain').select('updated_at,content').eq('id', 1).maybeSingle();
    if (b?.content && b.updated_at && Date.now() - new Date(b.updated_at).getTime() < 12 * 3600_000) return b.content;
  }
  // só técnicas com nota boa (as fracas ou excluídas ficam de fora); as melhores primeiro
  // prioridade de cada material (primário = base principal, secundário = apoio)
  const { data: docRows } = await db().from('knowledge_docs').select('*');
  const prio: Record<string, string> = Object.fromEntries((docRows || []).map((d: any) => [d.id, d.priority === 'primario' ? 'primario' : 'secundario']));
  let { data: all, error }: { data: any[] | null; error: any } = await db()
    .from('knowledge_insights')
    .select('id,doc_id,kind,title,content,wins,used,quality')
    .or('quality.is.null,quality.gte.5')
    .order('wins', { ascending: false })
    .order('quality', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(2000);
  if (error) ({ data: all } = await db().from('knowledge_insights').select('id,doc_id,kind,title,content,wins,used').order('wins', { ascending: false }).order('id', { ascending: false }).limit(2000));
  // só técnicas de livros que ainda estão na lista e que funcionam por texto
  const list = (all || []).filter((i) => prio[i.doc_id] && !isOfflineTechnique(i));
  if (!list.length) {
    await db().from('knowledge_brain').upsert({ id: 1, content: null, docs: 0, insights: 0, updated_at: new Date().toISOString() });
    return null;
  }
  const picked = pickForBrain(list, prio, 180);
  const hasPrimary = picked.some((i) => prio[i.doc_id] === 'primario');
  const docs = new Set(list.map((i) => i.doc_id)).size;
  const r = await structured<{ content: string }>(
    `Você é diretor comercial e vai escrever o "Cérebro de vendas": o manual que a IA vai seguir em TODA conversa de WhatsApp: ela é uma consultora de numerologia e astrologia que atende pelo WhatsApp pessoas comuns (muitas vezes passando por problemas de dinheiro, amor, família ou saúde) e vende o Mapa da Alma (estudo de numerologia cabalística + signo, R$ 19 a R$ 49) e leituras de tarô, com mensagens curtas, calmas e acolhedoras. Os exemplos devem ser desse contexto, nunca de sites, agência ou negócios.
Use somente as técnicas fornecidas. Junte as repetidas, priorize as que têm vitórias e as que mais aumentam a CONVERSÃO (fechamento, objeções, prova e valor, perguntas de diagnóstico, ancoragem de preço). Persuasão sempre ética.
Formato: títulos curtos (Princípios, Abertura, Perguntas que vendem, Conexão, Gatilhos, Objeções, Fechamento, Follow-up, Escrita) e tópicos de 1 linha, com instruções diretas ("Faça…", "Pergunte…", "Quando ouvir X, responda Y").
Máximo de 45 tópicos no total. Em português do Brasil. Nada de táticas enganosas. A venda é toda pelo WhatsApp: nada de marcar reunião, visita, café ou ligação; nada de perguntas invasivas.
Nada de linguagem corporal ou presencial (aperto de mão, olhar nos olhos, postura, sobrancelha, gestos, tom de voz): a conversa é só por texto.${
      hasPrimary
        ? `
PESO DOS MATERIAIS: as técnicas marcadas [PRIMÁRIO] são a BASE PRINCIPAL e devem formar cerca de 70% do manual: estratégia, condução da conversa, perguntas de diagnóstico, objeções e fechamento vêm delas. As marcadas [APOIO] valem cerca de 30% e servem só para lapidar a escrita (copywriting), os gatilhos mentais e a empatia. Se um [APOIO] contradisser um [PRIMÁRIO], vale o [PRIMÁRIO].`
        : ''
    }`,
    picked.map((i) => `[${prio[i.doc_id] === 'primario' ? 'PRIMÁRIO' : 'APOIO'} · ${KINDS[i.kind] || i.kind}${i.wins ? ` · ${i.wins} vendas` : ''}] ${i.title}: ${i.content}`).join('\n'),
    'cerebro_de_vendas',
    BRAIN_SCHEMA,
    3500,
    { task: 'cerebro', tier: 'smart' },
  );
  await db().from('knowledge_brain').upsert({ id: 1, content: r.content, docs, insights: list.length, updated_at: new Date().toISOString() });
  await db().from('lead_events').insert({ type: 'kb_brain', channel: 'ai', text: `Cérebro de vendas atualizado com ${list.length} técnicas de ${docs} livro(s)` });
  return r.content;
}

/**
 * Escolhe as técnicas que entram no cérebro: ~70% dos materiais primários e ~30% dos secundários
 * (se um dos lados tiver poucas, o outro completa). Dentro de cada lado: as que já venderam primeiro,
 * depois um pouco de cada livro e de cada tipo.
 */
export function pickForBrain(list: any[], prio: Record<string, string>, total = 180) {
  const prim = list.filter((i) => prio[i.doc_id] === 'primario');
  const sec = list.filter((i) => prio[i.doc_id] !== 'primario');
  const spread = (items: any[], max: number) => {
    const out: any[] = items.filter((i) => i.wins > 0).slice(0, Math.min(40, max));
    const seen = new Set(out.map((i) => i.id));
    const byKey: Record<string, any[]> = {};
    for (const i of items) if (!seen.has(i.id)) (byKey[i.doc_id + i.kind] = byKey[i.doc_id + i.kind] || []).push(i);
    const buckets = Object.values(byKey);
    for (let round = 0; out.length < max; round++) {
      let added = false;
      for (const b of buckets) {
        const i = b[round];
        if (i) {
          out.push(i);
          added = true;
          if (out.length >= max) break;
        }
      }
      if (!added) break;
    }
    return out;
  };
  if (!prim.length || !sec.length) return spread(list, total);
  let wantP = Math.round(total * 0.7);
  let wantS = total - wantP;
  if (prim.length < wantP) {
    wantS += wantP - prim.length;
    wantP = prim.length;
  }
  if (sec.length < wantS) {
    wantP = Math.min(prim.length, wantP + (wantS - sec.length));
    wantS = sec.length;
  }
  return [...spread(prim, wantP), ...spread(sec, wantS)];
}

export async function getBrain(): Promise<string | null> {
  const { data } = await db().from('knowledge_brain').select('content').eq('id', 1).maybeSingle();
  return data?.content || null;
}

/* ---------------- busca por relevância ---------------- */

const STOP = new Set(
  'para pelo pela pelos pelas como mais muito muita esse essa isso este esta isto aqui voce vocês você seus suas meu minha nosso nossa quando onde qual quais quem porque porquê sobre entre depois antes ainda também tambem então entao agora tudo todo toda todos todas cada mesmo mesma outro outra outros outras fazer feito tenho temos teria seria pode posso podemos quero queria gostaria obrigado obrigada tudo bem certo beleza olá ola bom boa dia tarde noite vamos'.split(
    ' ',
  ),
);

const STAGE_TERMS: Record<string, string> = {
  novo: 'abertura atenção curiosidade gancho pergunta opening hook curiosity',
  abordado: 'abertura atenção curiosidade gancho follow-up opening hook curiosity',
  respondeu: 'conexão rapport pergunta descoberta dor necessidade confiança question pain trust',
  interessado: 'benefício valor prova desejo demonstração urgência benefit value proof desire',
  negociando: 'objeção preço valor garantia desconto fechamento objection price value close',
  pix: 'fechamento pagamento confiança urgência close payment trust',
  remarketing: 'retomada reengajamento follow-up timing',
  sem: 'objeção rejeição respeito',
};

const OBJECTION_TERMS: [RegExp, string][] = [
  [/caro|preço|preco|valor|custa|barato|desconto/i, 'preço objeção valor investimento price objection'],
  [/pensar|depois|mais pra frente|agora não|agora nao|sem tempo/i, 'indecisão objeção urgência adiamento procrastination'],
  [/s[oó]cio|esposa|marido|chefe|consultar/i, 'decisor objeção autoridade decision maker'],
  [/j[aá] tenho|instagram|indica[cç][aã]o|n[aã]o preciso/i, 'necessidade objeção diferenciação need'],
  [/confian|golpe|garantia|funciona|resultado/i, 'confiança prova social garantia trust proof'],
  [/rob[oô]|ia |humano/i, 'transparência confiança'],
];

export function buildQuery(text: string, stage?: string) {
  const words = (text || '')
    .toLowerCase()
    .match(/[a-zà-öø-ÿ]{4,}/g) || [];
  const terms = words.filter((w) => !STOP.has(w)).slice(-14);
  for (const [re, extra] of OBJECTION_TERMS) if (re.test(text || '')) terms.push(...extra.split(' '));
  if (stage && STAGE_TERMS[stage]) terms.push(...STAGE_TERMS[stage].split(' '));
  const clean = Array.from(new Set(terms.map((t) => t.replace(/[^a-zà-öø-ÿ]/g, '')).filter((t) => t.length > 2))).slice(0, 26);
  return clean.join(' | ');
}

export type Retrieved = { insights: any[]; chunks: any[] };

export async function retrieve(text: string, stage?: string, nInsights = 6, nChunks = 3): Promise<Retrieved> {
  const q = buildQuery(text, stage);
  if (!q) return { insights: [], chunks: [] };
  const [ins, ch] = await Promise.all([db().rpc('search_insights', { q, n: nInsights }), db().rpc('search_chunks', { q, n: nChunks })]);
  if (ins.error) console.error('search_insights', ins.error.message);
  if (ch.error) console.error('search_chunks', ch.error.message);
  return { insights: ins.data || [], chunks: ch.data || [] };
}

export function knowledgeBlock(brain: string | null, k: Retrieved) {
  const parts: string[] = [];
  parts.push(`CÉREBRO DE VENDAS (aprendido dos livros da equipe — siga sempre)\n${brain || '(ainda sem livros estudados)'}`);
  if (k.insights.length)
    parts.push(
      `TÉCNICAS MAIS RELEVANTES PARA ESTE MOMENTO (aplique a que fizer mais sentido e informe o número em "techniques_used")\n` +
        k.insights.map((i) => `#${i.id} [${KINDS[i.kind] || i.kind}] ${i.title}: ${i.content}${i.example ? ` Exemplo: "${i.example}"` : ''} (fonte: ${i.doc_name})`).join('\n'),
    );
  if (k.chunks.length) parts.push(`TRECHOS DOS LIVROS (inspiração; não copie)\n` + k.chunks.map((c) => `- (${c.doc_name}) ${String(c.content).slice(0, 700)}`).join('\n'));
  return parts.join('\n\n');
}

/** Registra quais técnicas foram usadas (ganham pontos de uso). */
export async function markUsed(ids: number[]) {
  const clean = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0)));
  if (clean.length) await db().rpc('bump_insights', { ids: clean, field: 'used' });
  return clean;
}

/** Quando o cliente paga, as técnicas usadas na conversa ganham pontos de vitória. */
export async function creditWins(leadId: string) {
  const { data } = await db().from('messages').select('meta').eq('lead_id', leadId).eq('direction', 'out').not('meta', 'is', null);
  const ids = new Set<number>();
  for (const m of data || []) for (const k of m.meta?.kb || []) if (k?.id) ids.add(Number(k.id));
  if (ids.size) await db().rpc('bump_insights', { ids: Array.from(ids), field: 'wins' });
  return ids.size;
}


/* ---------------- autoavaliação das técnicas ---------------- */

const RATE_SCHEMA = {
  type: 'object',
  properties: {
    ratings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          score: { type: 'integer', minimum: 0, maximum: 10 },
          note: { type: 'string', description: 'Motivo em até 12 palavras.' },
        },
        required: ['id', 'score', 'note'],
      },
    },
  },
  required: ['ratings'],
};

/**
 * A IA dá nota de 0 a 10 para cada técnica nova: quanto ela ajuda a vender serviços digitais
 * pelo WhatsApp, de forma humana. Nota abaixo de 4 deixa de ser usada. Barato (lotes de 40, Haiku).
 */
export async function rateInsights(batch = 40) {
  const { data, error } = await db().from('knowledge_insights').select('id,kind,title,content,example').is('quality', null).order('id').limit(batch);
  if (error || !data?.length) return 0;
  const r = await structured<{ ratings: { id: number; score: number; note: string }[] }>(
    `Você é um diretor comercial exigente. Avalie cada técnica de vendas abaixo com uma nota de 0 a 10, pensando numa IA que é uma consultora de numerologia e astrologia que atende pelo WhatsApp pessoas comuns (muitas vezes passando por problemas de dinheiro, amor, família ou saúde) e vende o Mapa da Alma (estudo de numerologia cabalística + signo, R$ 19 a R$ 49) e leituras de tarô, com mensagens curtas, calmas e acolhedoras. Técnica com exemplo de site, agência, marketing ou negócio vale no máximo 4 (é de outro contexto).
Nota alta (8–10): prática, específica, fácil de aplicar numa mensagem curta, ética e que aumenta DIRETAMENTE a conversão (fechamento, contorno de objeção, prova, valor percebido, ancoragem de preço, urgência honesta, perguntas que revelam a dor).
Nota média (5–7): útil mas genérica ou precisa de adaptação.
Nota baixa (0–4): depende de reunião, visita, café, ligação ou presença física; é linguagem corporal ou de voz (aperto de mão, olhar nos olhos, postura, sobrancelha, gestos, tom de voz) — nesses casos nota 0; é manipuladora com quem está fragilizado; é manipuladora ou antiética; é vaga ("seja confiante"); é teoria sem uso prático; é sobre outro contexto (vendas B2B grandes, varejo de loja física, recrutamento etc.).
Responda com a nota de TODAS as técnicas, usando o mesmo id.`,
    data.map((i: any) => `#${i.id} [${i.kind}] ${i.title}: ${i.content}${i.example ? ` (exemplo: ${i.example})` : ''}`).join('\n'),
    'avaliar_tecnicas',
    RATE_SCHEMA,
    2500,
    { task: 'avaliacao' },
  );
  const byId = new Map((r.ratings || []).map((x) => [Number(x.id), x]));
  let n = 0;
  for (const i of data) {
    const x = byId.get(Number(i.id));
    // técnica que a IA esqueceu de avaliar recebe nota neutra para não travar a fila
    let score = x ? Math.max(0, Math.min(10, Math.round(Number(x.score)))) : 6;
    if (isOfflineTechnique(i)) score = 0; // corpo, voz ou presencial: não serve no WhatsApp
    await db().from('knowledge_insights').update({ quality: score, quality_note: x?.note?.slice(0, 160) || 'sem avaliação' }).eq('id', i.id);
    n++;
  }
  return n;
}

/** Exclui técnicas (a IA para de usar na hora) e atualiza a contagem dos livros. */
export async function deleteInsights(ids: number[]) {
  const clean = ids.map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, 5000);
  if (!clean.length) return 0;
  const { data: rows } = await db().from('knowledge_insights').select('doc_id').in('id', clean);
  await db().from('knowledge_insights').delete().in('id', clean);
  for (const docId of Array.from(new Set((rows || []).map((r: any) => r.doc_id)))) {
    const { count } = await db().from('knowledge_insights').select('id', { count: 'exact', head: true }).eq('doc_id', docId);
    await db().from('knowledge_docs').update({ insights: count || 0 }).eq('id', docId);
  }
  return clean.length;
}
