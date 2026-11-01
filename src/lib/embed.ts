/**
 * Busca por significado, de graça: o modelo multilingual-e5-small (384 dimensões)
 * roda na própria VPS. Se não carregar, o sistema segue com a busca por palavras.
 */

const MODEL = process.env.EMBED_MODEL || 'Xenova/multilingual-e5-small';
export const EMBED_DIM = 384;

let loader: Promise<any> | null = null;
let failed: { at: number; error: string } | null = null;
let ready = false;

export function embedStatus() {
  return { model: MODEL, ready, error: failed?.error || null, disabled: process.env.EMBED_DISABLED === '1' };
}

async function pipe() {
  if (process.env.EMBED_DISABLED === '1') throw new Error('Busca por significado desligada (EMBED_DISABLED=1)');
  // tenta de novo 10 minutos depois de uma falha
  if (failed && Date.now() - failed.at < 10 * 60_000) throw new Error(failed.error);
  if (!loader) {
    loader = (async () => {
      const t: any = await import('@huggingface/transformers');
      if (process.env.EMBED_CACHE) t.env.cacheDir = process.env.EMBED_CACHE;
      const p = await t.pipeline('feature-extraction', MODEL, { dtype: 'q8' });
      ready = true;
      failed = null;
      return p;
    })().catch((e) => {
      loader = null;
      failed = { at: Date.now(), error: String(e?.message || e).slice(0, 300) };
      throw e;
    });
  }
  return loader;
}

/** Vetores de textos. kind: 'query' para perguntas, 'passage' para o conteúdo guardado. */
export async function embed(texts: string[], kind: 'query' | 'passage' = 'passage'): Promise<number[][]> {
  if (!texts.length) return [];
  const p = await pipe();
  const input = texts.map((t) => `${kind}: ${String(t || '').replace(/\s+/g, ' ').slice(0, 1500)}`);
  const out = await p(input, { pooling: 'mean', normalize: true });
  const data: Float32Array = out.data;
  const dim = out.dims[out.dims.length - 1];
  const res: number[][] = [];
  for (let i = 0; i < texts.length; i++) res.push(Array.from(data.slice(i * dim, (i + 1) * dim)).map((v) => Math.round(v * 1e6) / 1e6));
  return res;
}

/** Vetor de uma pergunta, ou null se a busca por significado não estiver disponível. */
export async function embedQuery(text: string, waitMs = 2500): Promise<number[] | null> {
  if (!String(text || '').trim()) return null;
  try {
    // nunca segura a resposta ao cliente: se o modelo ainda estiver carregando, segue com a busca por palavras
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), waitMs));
    return await Promise.race([embed([text], 'query').then((v) => v[0]).catch(() => null), timeout]);
  } catch {
    return null;
  }
}

/** Formato que o Postgres (pgvector) entende. */
export const toVec = (v: number[] | null) => (v ? `[${v.join(',')}]` : null);
