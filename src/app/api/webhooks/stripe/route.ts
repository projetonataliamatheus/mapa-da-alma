import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { markPaid, logEvent } from '@/lib/engine';
import { assinaturaStripeValida } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Webhook do Stripe. No Stripe (Developers › Webhooks) crie um endpoint:
 *   URL: https://SEU-PAINEL/api/webhooks/stripe   ·   Evento: checkout.session.completed (e checkout.session.async_payment_succeeded)
 *   Copie o "Signing secret" (whsec_...) para a variável STRIPE_WEBHOOK_SECRET no Easypanel.
 */
export async function POST(req: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET || '';
  const corpo = await req.text();
  if (!segredo || !assinaturaStripeValida(corpo, req.headers.get('stripe-signature'), segredo)) return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });
  let ev: any = {};
  try { ev = JSON.parse(corpo); } catch { return NextResponse.json({ received: true }); }
  if (!/^checkout\.session\.(completed|async_payment_succeeded)$/.test(ev?.type || '')) return NextResponse.json({ received: true });
  const s = ev.data?.object || {};
  if (s.payment_status && s.payment_status !== 'paid') return NextResponse.json({ received: true });
  const pagId = s.metadata?.pagamento_id || s.client_reference_id;
  try {
    const db = admin();
    const { data: pay } = pagId ? await db.from('payments').select('*').eq('id', pagId).maybeSingle() : { data: null as any };
    if (!pay) return NextResponse.json({ received: true });
    if (pay.status === 'pago') return NextResponse.json({ received: true });
    await db.from('payments').update({ status: 'pago', paid_at: new Date().toISOString() }).eq('id', pay.id);
    await logEvent(pay.lead_id, 'pago_stripe', 'pay', `Pagamento internacional recebido (${s.currency?.toUpperCase()} ${(Number(s.amount_total || 0) / 100).toLocaleString('es')})`);
    await markPaid(pay.lead_id, Number(pay.amount) || null, 'stripe', pay.id, pay.service);
  } catch (e: any) {
    console.error('webhook stripe', e);
    return NextResponse.json({ error: 'falha' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
