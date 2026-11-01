import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** O checkout consulta aqui se o pagamento já caiu. */
export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  const { data } = await admin().from('checkout_links').select('status').eq('slug', ctx.params.slug).maybeSingle();
  return NextResponse.json({ status: data?.status || 'nao-encontrado' });
}
