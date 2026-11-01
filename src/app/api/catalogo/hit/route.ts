import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const kind = ['view', 'open', 'click'].includes(b.kind) ? b.kind : null;
    if (!kind || !/^[0-9a-f-]{36}$/.test(String(b.id || ''))) return NextResponse.json({ ok: false });
    if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(req.headers.get('user-agent') || '')) return NextResponse.json({ ok: true });
    const { data: c } = await admin().from('catalogs').select('id,status').eq('id', b.id).maybeSingle();
    if (c?.status === 'publicado') await admin().rpc('catalog_hit', { p_id: c.id, p_kind: kind, p_target: String(b.target || '').slice(0, 60) });
  } catch {}
  return NextResponse.json({ ok: true });
}
