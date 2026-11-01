import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Leituras das páginas públicas de Orçamento e Relatório (código do Lovable).
 * Só libera o necessário: orçamento pelo endereço, relatório publicado pelo endereço/token, e as peças dele.
 * Senhas nunca saem em texto: vão como hash e a página compara o hash do que o cliente digitou.
 */
const sha = (s: string) => createHash('sha256').update(String(s)).digest('hex');
const RULES: Record<string, { need?: string[]; extra?: (q: any) => any; strip?: string[] }> = {
  quotes: { need: ['slug'] },
  quote_templates: {},
  quote_faq_items: {},
  site_settings: {},
  sales_page_config: {},
  google_reviews: {},
  traffic_reports: { need: ['slug', 'access_token'], extra: (q) => q.eq('status', 'published') },
  traffic_metrics: { need: ['report_id'] },
  traffic_report_simulations: { need: ['report_id'] },
  traffic_report_creatives: { need: ['report_id'] },
  traffic_report_snapshots: { need: ['report_id'] },
  clients: { need: ['id'] },
  contracts: { need: ['token'] },
  contract_templates: {},
  empresa_contratada_config: {},
};

function hide(row: any) {
  if (!row || typeof row !== 'object') return row;
  const r = { ...row };
  if (r.password) r.password = 'sha256:' + sha(r.password);
  if (r.access_password) r.access_password = 'sha256:' + sha(r.access_password);
  return r;
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const db = admin();
  if (b.rpc) {
    if (b.rpc === 'track_page_view') {
      const a = b.args || {};
      if (a._target_type === 'quote') {
        const { data } = await db.from('quotes').select('id,view_count').eq('slug', String(a._target_slug || '')).maybeSingle();
        if (data) {
          await db.from('quotes').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
          await db.from('quote_views').insert({ quote_id: data.id, ip_address: (req.headers.get('x-forwarded-for') || '').split(',')[0] }).then(() => {}, () => {});
        }
      }
      if (a._target_type === 'report') {
        const t = String(a._target_slug || '');
        const { data } = await db.from('traffic_reports').select('id,view_count').or(`slug.eq.${t.replace(/[^a-zA-Z0-9_-]/g, '')},access_token.eq.${t.replace(/[^a-zA-Z0-9_-]/g, '')}`).maybeSingle();
        if (data) await db.from('traffic_reports').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id).then(() => {}, () => {});
      }
    }
    return NextResponse.json({ data: null });
  }
  // aviso para a equipe (ex.: cliente assinou o contrato)
  if (b.notify) {
    const n = b.notify || {};
    const { logEvent } = await import('@/lib/engine');
    await logEvent(null, 'lv_' + String(n.type || 'evento').slice(0, 30), 'ok', `${String(n.title || 'Evento').slice(0, 120)}${n.message ? ' — ' + String(n.message).slice(0, 200) : ''}`).catch(() => {});
    return NextResponse.json({ data: null });
  }
  // assinatura do contrato pela página pública
  if (b.update) {
    if (b.table !== 'contracts') return NextResponse.json({ error: 'Não permitido.' }, { status: 403 });
    const tok = (b.filters || []).find((f: any) => f[0] === 'eq' && f[1] === 'token')?.[2];
    if (!tok) return NextResponse.json({ error: 'Não permitido.' }, { status: 403 });
    const { data: c } = await db.from('contracts').select('id,provider_signature,client_signature,status').eq('token', String(tok)).maybeSingle();
    if (!c) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    const u = b.update || {};
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const CLIENT = ['client_signature', 'client_signed_at', 'client_user_agent', 'client_name', 'client_document', 'document_hash', 'status'];
    const PROVIDER = ['provider_signature', 'provider_signed_at', 'provider_user_agent', 'document_hash', 'status'];
    const isProvider = 'provider_signature' in u;
    if (isProvider) {
      // a Contratada só assina com alguém da equipe logado (2 etapas) neste navegador
      const { currentMember } = await import('@/lib/supabase/server');
      const me = await currentMember().catch(() => null);
      if (!me?.member) return NextResponse.json({ error: 'Para assinar como empresa, entre no painel neste navegador.' }, { status: 403 });
    } else if (c.client_signature) return NextResponse.json({ error: 'Este contrato já foi assinado pelo cliente.' }, { status: 409 });
    const allow = isProvider ? PROVIDER : CLIENT;
    const patch: any = {};
    for (const k of allow) if (k in u) patch[k] = u[k];
    if (isProvider) patch.provider_ip = ip;
    else patch.client_ip = ip;
    if (patch.status && !['enviado', 'assinado_todos', 'assinado_cliente'].includes(patch.status)) delete patch.status;
    const { error } = await db.from('contracts').update(patch).eq('id', c.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: null });
  }
  const rule = RULES[b.table];
  if (!rule) return NextResponse.json({ error: 'Não permitido.' }, { status: 403 });
  const filters: any[] = Array.isArray(b.filters) ? b.filters : [];
  if (rule.need && !filters.some((f) => f[0] === 'eq' && rule.need!.includes(f[1]) && f[2])) return NextResponse.json({ error: 'Não permitido.' }, { status: 403 });
  let q: any = db.from(b.table).select(b.table === 'clients' ? 'name' : typeof b.select === 'string' ? b.select : '*');
  for (const [op, col, val] of filters) {
    if (!/^[a-z_]+$/.test(String(col))) continue;
    q = op === 'in' ? q.in(col, val) : q.eq(col, val);
  }
  if (rule.extra) q = rule.extra(q);
  for (const [col, asc] of b.order || []) if (/^[a-z_]+$/.test(String(col))) q = q.order(col, { ascending: !!asc });
  q = q.limit(Math.min(Number(b.limit) || 500, 1000));
  const { data, error } = b.single ? await q.maybeSingle() : await q;
  if (error) return NextResponse.json({ data: null, error: error.message });
  if (b.single === 'single' && !data) return NextResponse.json({ data: null, error: 'Não encontrado' });
  return NextResponse.json({ data: Array.isArray(data) ? data.map(hide) : hide(data) }, { headers: { 'Cache-Control': 'no-store' } });
}
