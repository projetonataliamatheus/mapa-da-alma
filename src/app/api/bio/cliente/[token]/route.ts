import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { mergeData } from '@/lib/bio';
import { bioBase, cleanImages, imagesOf } from '@/lib/bio-server';
import { logEvent } from '@/lib/engine';
import { ownsPage, OWN_ERR } from '@/lib/client-auth';

/** Edição pelo próprio cliente: precisa estar logado com o usuário dono da página. */
async function byToken(token: string) {
  const r = await ownsPage('bio_pages', token);
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
  const p = own.page;
  return NextResponse.json({ id: p.id, slug: p.slug, status: p.status, data: mergeData(p.data), base: await bioBase() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request, ctx: any) {
  const own = await byToken(ctx.params.token);
  if (own.reason !== 'ok') return denied(own.reason);
  const p = own.page;
  const b = await req.json().catch(() => ({}));
  const data = mergeData({ ...b.data, footer: (p.data as any)?.footer !== false });
  const { error } = await admin().from('bio_pages').update({ data, updated_at: new Date().toISOString(), client_edited_at: new Date().toISOString() }).eq('id', p.id);
  if (error) return NextResponse.json({ error: 'Não consegui salvar. Tente de novo.' }, { status: 500 });
  cleanImages(p.id, imagesOf(data)).catch(() => {});
  if (p.lead_id) await logEvent(p.lead_id, 'bio_client_edit', 'acc', `O cliente editou o link na bio ${p.slug}`).catch(() => {});
  return NextResponse.json({ ok: true });
}
