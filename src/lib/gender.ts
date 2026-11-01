/**
 * Homem ou mulher pelo primeiro nome, sem perguntar e sem custo:
 * consulta a base de nomes do Censo do IBGE (grátis, sem chave), guarda o resultado (cada nome é consultado
 * uma vez só) e, se o IBGE não responder, usa a terminação do nome. A IA também observa a conversa
 * ("obrigada", "estou cansada") e isso vale quando o nome não decide.
 */
import { admin } from './supabase/admin';
import { norm } from './util';

const db = () => admin();
export type Gender = 'masculino' | 'feminino';

/** Primeiro nome "limpo" (sem acento, minúsculo); null quando não parece nome de gente. */
export function firstName(raw?: string | null): string | null {
  const t = norm(String(raw || ''))
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .split(/\s+/)[0];
  if (!t || t.length < 2 || t.length > 20) return null;
  if (/^(sr|sra|dr|dra|prof|eu|oi|ola|loja|studio|estudio|clinica|salao|barbearia|empresa|comercial|atendimento|contato|equipe)$/.test(t)) return null;
  return t;
}

/** Palpite pela terminação (só quando o IBGE não responde). */
export function guessByEnding(name: string): { gender: Gender | null; prob: number } {
  const n = name.toLowerCase();
  if (/(a|ane|ene|ine|iele|ele|elly|ely|eth|ah|ys|is|ice|ilde|ide)$/.test(n) && !/(luca|joshua|nikita|andrea|elias|jonas|lucas|thomas|tomas|matheus|mateus|vinicius|marcos|carlos|luis|denis|alexis|moises|jose|felipe|henrique|rique|cleber|isaias)$/.test(n)) return { gender: 'feminino', prob: 0.7 };
  if (/(o|os|son|el|iel|an|on|or|er|ur|im|us|ar|ir|ique|ipe|ton|ilson|ildo|aldo)$/.test(n)) return { gender: 'masculino', prob: 0.7 };
  return { gender: null, prob: 0 };
}

async function ibgeCount(name: string, sexo: 'M' | 'F') {
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v2/censos/nomes/${encodeURIComponent(name)}?sexo=${sexo}`, { signal: AbortSignal.timeout(6000), cache: 'no-store' } as any);
  if (!r.ok) throw new Error(`IBGE ${r.status}`);
  const j: any = await r.json();
  return (Array.isArray(j) ? j : []).reduce((s: number, x: any) => s + (x.res || []).reduce((a: number, y: any) => a + Number(y.frequencia || 0), 0), 0);
}

/** Gênero pelo primeiro nome (com cache no banco). */
export async function genderByName(raw?: string | null): Promise<{ gender: Gender | null; prob: number; source: string } | null> {
  const name = firstName(raw);
  if (!name) return null;
  const { data: hit } = await db().from('name_gender').select('*').eq('name', name).maybeSingle();
  if (hit) return { gender: hit.gender || null, prob: Number(hit.prob || 0), source: hit.source || 'cache' };
  let out: { gender: Gender | null; prob: number; source: string };
  try {
    const [m, f] = await Promise.all([ibgeCount(name, 'M'), ibgeCount(name, 'F')]);
    const total = m + f;
    if (!total) {
      const g = guessByEnding(name);
      out = { ...g, source: 'terminacao' };
    } else {
      const pm = m / total;
      out = pm >= 0.85 ? { gender: 'masculino', prob: pm, source: 'ibge' } : pm <= 0.15 ? { gender: 'feminino', prob: 1 - pm, source: 'ibge' } : { gender: null, prob: Math.max(pm, 1 - pm), source: 'ibge' };
    }
    await db().from('name_gender').upsert({ name, gender: out.gender, prob: Math.round(out.prob * 1000) / 1000, source: out.source }).then(() => {}, () => {});
  } catch {
    // IBGE fora do ar: palpite pela terminação (não guarda, tenta o IBGE de novo depois)
    out = { ...guessByEnding(name), source: 'terminacao' };
  }
  return out;
}

/**
 * Decide o gênero do cliente: nome dito por ele (IBGE) > o que a IA percebeu na conversa.
 * Nunca usa o nome do perfil do WhatsApp sozinho, a não ser que o IBGE tenha certeza quase total.
 */
export async function detectGender(lead: any): Promise<Gender | null> {
  const mem = lead?.memory || {};
  const ai: Gender | null = mem.genero_cliente === 'masculino' || mem.genero_cliente === 'feminino' ? mem.genero_cliente : null;
  if (mem.nome_cliente) {
    const r = await genderByName(mem.nome_cliente).catch(() => null);
    if (r?.gender && (r.source === 'ibge' || r.source === 'cache') && r.prob >= 0.85) return r.gender;
    if (ai) return ai;
    if (r?.gender && r.prob >= 0.7) return r.gender;
    return null;
  }
  if (ai) return ai;
  const r = await genderByName(lead?.name).catch(() => null);
  return r?.gender && r.source !== 'terminacao' && r.prob >= 0.97 ? r.gender : null;
}
