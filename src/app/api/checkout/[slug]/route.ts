import { NextResponse } from 'next/server';
import { publicLink, payLink, CheckoutError } from '@/lib/checkout';

export const dynamic = 'force-dynamic';

/** Dados públicos do link (checkout). */
export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  const link = await publicLink(ctx.params.slug);
  if (!link) return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 });
  return NextResponse.json(link);
}

/** Pagamento: Pix ou cartão. */
export async function POST(req: Request, ctx: { params: { slug: string } }) {
  try {
    const body = await req.json();
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '0.0.0.0';
    const r = await payLink(ctx.params.slug, body, ip);
    return NextResponse.json(r);
  } catch (e: any) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('checkout', e);
    const msg = String(e?.message || '');
    return NextResponse.json({ error: msg.startsWith('Asaas:') ? msg.replace(/^Asaas:\s*/, '') : 'Não foi possível concluir agora. Tente novamente em instantes.' }, { status: 500 });
  }
}
