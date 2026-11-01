import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Abre o PDF do recibo (link temporário de 5 minutos). */
export const GET = withUser(async (_req, ctx) => {
  const { data: p } = await admin().from('payments').select('receipt_path').eq('id', ctx.params.id).maybeSingle();
  if (!p?.receipt_path) return NextResponse.json({ error: 'Este pagamento ainda não tem recibo.' }, { status: 404 });
  const { data, error } = await admin().storage.from('recibos').createSignedUrl(p.receipt_path, 300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
});

/** Reenvia o recibo pelo WhatsApp (o robô gera e envia no próximo ciclo). */
export const POST = withUser(async (_req, ctx) => {
  await admin().from('payments').update({ receipt_sent_at: null, receipt_attempts: 0, receipt_error: null }).eq('id', ctx.params.id);
  return NextResponse.json({ ok: true });
});
