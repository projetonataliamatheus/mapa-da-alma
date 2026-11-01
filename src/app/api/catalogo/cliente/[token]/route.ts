import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { catMerge } from '@/lib/catalog';
import { catBase, cleanCatImages, catImages } from '@/lib/catalog-server';
import { logEvent } from '@/lib/engine';
import { ownsPage, OWN_ERR } from '@/lib/client-auth';

/** Edição pelo próprio cliente: precisa estar logado com o usuário dono da página. */
async function byToken(token: string) {
  const r = await ownsPage('catalogs', token);
  return r;
}
function denied(reason: string) {
  const [status, error] = OWN_ERR[reason] || OWN_ERR.invalido;
  return NextResponse.json({ error, reason }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const dynamic = 'force-dynamic';


export async function GET(_req: Request, ctx: any) {
  const own = await byToken(ctx.params.token);
  if (own.reason !== 'ok') return denied(own.reason);
  const c = own.page;
  return NextResponse.json({ id: c.id, slug: c.slug, status: c.status, data: catMerge(c.data), base: await catBase() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request, ctx: any) {
  const own = await byToken(ctx.params.token);
  if (own.reason !== 'ok') return denied(own.reason);
  const c = own.page;
  const b = await req.json().catch(() => ({}));
  const data = catMerge({ ...b.data, footer: (c.data as any)?.footer !== false });
  const { error } = await admin().from('catalogs').update({ data, updated_at: new Date().toISOString(), client_edited_at: new Date().toISOString() }).eq('id', c.id);
  if (error) return NextResponse.json({ error: 'Não consegui salvar. Tente de novo.' }, { status: 500 });
  cleanCatImages(c.id, catImages(data)).catch(() => {});
  if (c.lead_id) await logEvent(c.lead_id, 'catalog_client_edit', 'acc', `O cliente atualizou o catálogo ${c.slug}`).catch(() => {});
  return NextResponse.json({ ok: true });
}
