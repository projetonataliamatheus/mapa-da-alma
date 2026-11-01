import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Conta visitas e cliques (só de páginas publicadas). Sem dados pessoais do visitante. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const kind = ['view', 'click', 'social'].includes(b.kind) ? b.kind : null;
    if (!kind || !/^[0-9a-f-]{36}$/.test(String(b.id || ''))) return NextResponse.json({ ok: false });
    if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(req.headers.get('user-agent') || '')) return NextResponse.json({ ok: true });
    const { data: p } = await admin().from('bio_pages').select('id,status').eq('id', b.id).maybeSingle();
    if (p?.status === 'publicado') await admin().rpc('bio_hit', { p_page: p.id, p_kind: kind, p_target: String(b.target || '').slice(0, 60) });
  } catch {}
  return NextResponse.json({ ok: true });
}
