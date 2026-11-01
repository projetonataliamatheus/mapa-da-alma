// @ts-nocheck
'use client';
/**
 * O código trazido do Lovable usa "supabase".
 * - No painel (logado): é o nosso banco com o login da equipe.
 * - Nas páginas públicas (/orcamento/… e /relatorio/…): as leituras passam pelo servidor (/api/lv/public),
 *   que só libera o que a página pública precisa (sem expor a lista de orçamentos, relatórios nem senhas).
 */
import { sb } from '@/lib/supabase/browser';

const isPublic = () =>
  typeof window !== 'undefined' && (/^\/(orcamento|relatorio|contrato)\//.test(window.location.pathname) || /^(orcamento|relatorio|pagamento|previa|catalogo)\./.test(window.location.hostname));

class PublicQuery {
  private q: any;
  constructor(table: string) {
    this.q = { table, select: '*', filters: [], order: [], limit: null, single: null };
  }
  select(cols = '*') {
    this.q.select = cols;
    return this;
  }
  eq(col: string, val: any) {
    this.q.filters.push(['eq', col, val]);
    return this;
  }
  in(col: string, val: any[]) {
    this.q.filters.push(['in', col, val]);
    return this;
  }
  order(col: string, opts: any = {}) {
    this.q.order.push([col, opts.ascending !== false]);
    return this;
  }
  limit(n: number) {
    this.q.limit = n;
    return this;
  }
  single() {
    this.q.single = 'single';
    return this.run();
  }
  maybeSingle() {
    this.q.single = 'maybe';
    return this.run();
  }
  // escrita em página pública: só a assinatura do contrato (o servidor confere o que pode)
  insert() {
    return Promise.resolve({ data: null, error: null });
  }
  update(patch: any) {
    const q = this.q;
    const send = async (col: string, val: any) => {
      const r = await fetch('/api/lv/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: q.table, update: patch, filters: [['eq', col, val]] }) }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : { error: 'Sem conexão' };
      return { data: j.data ?? null, error: j.error ? { message: j.error } : null };
    };
    return { eq: (col: string, val: any) => send(col, val) };
  }
  async run() {
    try {
      const r = await fetch('/api/lv/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.q) });
      const j = await r.json();
      return { data: j.data ?? null, error: j.error ? { message: j.error } : null };
    } catch (e: any) {
      return { data: null, error: { message: String(e?.message || e) } };
    }
  }
  then(res: any, rej?: any) {
    return this.run().then(res, rej);
  }
}

const publicClient: any = {
  from: (t: string) => new PublicQuery(t),
  rpc: async (fn: string, args: any) => {
    const r = await fetch('/api/lv/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rpc: fn, args }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return { data: j.data ?? null, error: j.error ? { message: j.error } : null };
  },
  auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  functions: { invoke: async (_n: string, opts: any) => (fetch('/api/lv/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify: opts?.body || {} }) }).catch(() => null), { data: null, error: null }) },
  storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: p } }) }) },
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: () => {},
};

export const supabase: any = new Proxy({}, { get: (_t, k) => (isPublic() ? publicClient : (sb() as any))[k] });
