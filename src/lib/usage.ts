/**
 * Controle de custos: registra cada chamada paga e confere os tetos do mês.
 * Preços em US$ por milhão de tokens (Console da Anthropic, out/2026).
 */
import { admin } from './supabase/admin';
import { getSettings } from './settings';

export const PRICES: Record<string, { in: number; out: number }> = {
  'claude-haiku-5-5': { in: 0.1, out: 0.5 },
  'claude-sonnet-5-5': { in: 2, out: 10 },
  'claude-opus-5-5': { in: 5, out: 25 },
};

/** Custo em US$. Cache: gravar custa 1,25x a entrada; ler do cache custa 0,1x. */
export function aiCost(model: string, input: number, output: number, cacheWrite = 0, cacheRead = 0) {
  const key = Object.keys(PRICES).find((k) => model.startsWith(k)) || (model.includes('haiku') ? 'claude-haiku-5-5' : model.includes('opus') ? 'claude-opus-5-5' : 'claude-sonnet-5-5');
  const p = PRICES[key];
  return (input * p.in + cacheWrite * p.in * 1.25 + cacheRead * p.in * 0.1 + output * p.out) / 1_000_000;
}

/** Cota grátis do Google por mês (Places API New, Text Search). */
export const GOOGLE_FREE = { google_pro: 5000, google_ent: 1000 };

export type MonthUsage = {
  ai_usd: number;
  google_pro: number;
  google_ent: number;
  rows: { kind: string; task: string | null; model: string | null; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }[];
};

let cache: { at: number; data: MonthUsage } | null = null;

export async function monthUsage(fresh = false): Promise<MonthUsage> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.data;
  const { data, error } = await admin().rpc('usage_month');
  const rows = (error ? [] : data || []).map((r: any) => ({ ...r, calls: Number(r.calls), input_tokens: Number(r.input_tokens), output_tokens: Number(r.output_tokens), cost_usd: Number(r.cost_usd) }));
  const sum = (k: string, f: 'calls' | 'cost_usd') => rows.filter((r: any) => r.kind === k).reduce((a: number, r: any) => a + r[f], 0);
  const out = { ai_usd: sum('ai', 'cost_usd'), google_pro: sum('google_pro', 'calls'), google_ent: sum('google_ent', 'calls'), rows };
  cache = { at: Date.now(), data: out };
  return out;
}

function bump(kind: string, calls: number, usd: number) {
  if (!cache) return;
  if (kind === 'ai') cache.data.ai_usd += usd;
  else if (kind === 'google_pro') cache.data.google_pro += calls;
  else if (kind === 'google_ent') cache.data.google_ent += calls;
}

export async function recordAI(task: string, model: string, input: number, output: number, leadId?: string | null, cacheWrite = 0, cacheRead = 0) {
  const cost = aiCost(model, input, output, cacheWrite, cacheRead);
  bump('ai', 1, cost);
  await admin()
    .from('usage_log')
    .insert({ kind: 'ai', service: 'anthropic', unit_kind: 'tokens', task, model, input_tokens: input + cacheWrite + cacheRead, output_tokens: output, cost_usd: cost, lead_id: leadId || null })
    .then(() => {}, () => {});
}

export async function recordGoogle(kind: 'google_pro' | 'google_ent', task: string) {
  bump(kind, 1, 0);
  await admin().from('usage_log').insert({ kind, task, calls: 1, cost_usd: 0 }).then(() => {}, () => {});
}

/** Confere se ainda cabe uma chamada no Google dentro do teto grátis. */
export async function googleAllowed(kind: 'google_pro' | 'google_ent', need = 1) {
  const [u, s] = await Promise.all([monthUsage(), getSettings(admin())]);
  const cap = kind === 'google_ent' ? s.budget.google_ent_cap : s.budget.google_pro_cap;
  return { ok: u[kind] + need <= cap, used: u[kind], cap };
}

/**
 * Escolhe o modelo: Haiku para o volume, Sonnet só nas conversas quentes.
 * Se o gasto do mês passar do teto, tudo vai para o Haiku; passou de 120%, a IA para.
 */
export async function pickModel(tier: 'fast' | 'smart') {
  const fast = process.env.AI_MODEL_FAST || 'claude-haiku-5-5';
  const smart = process.env.AI_MODEL || 'claude-sonnet-5-5';
  const [u, s] = await Promise.all([monthUsage(), getSettings(admin())]);
  const cap = Number(s.budget.ai_usd) || 0;
  if (cap > 0 && u.ai_usd >= cap * 1.2) throw new Error(`Teto de gastos da IA do mês atingido (US$ ${u.ai_usd.toFixed(2)} de US$ ${cap.toFixed(2)}). Aumente em Custos para continuar.`);
  if (tier === 'smart' && s.budget.smart_for_hot && (cap <= 0 || u.ai_usd < cap)) return smart;
  return fast;
}

/** Registra o consumo de um serviço que não é a IA (Browserless, Grok...). Falha em silêncio. */
export async function recordService(service: string, task: string, o: { units?: number; unitKind?: string; costUsd?: number; leadId?: string | null; meta?: any } = {}) {
  await admin()
    .from('usage_log')
    .insert({ kind: service, service, task, units: o.units ?? 1, unit_kind: o.unitKind || 'chamada', calls: 1, cost_usd: o.costUsd || 0, lead_id: o.leadId || null, meta: o.meta || null })
    .then(() => {}, () => {});
}
