import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { getPayment, PAID_STATUSES } from '@/lib/asaas';
import { markPaid, logEvent } from '@/lib/engine';
import { completeCheckout, registerSubscriptionPayment } from '@/lib/checkout';

export const dynamic = 'force-dynamic';

/**
 * Webhook do Asaas. Configure no Asaas:
 *   URL: https://SEU-PAINEL/api/webhooks/asaas
 *   Token de autenticação: o mesmo valor de ASAAS_WEBHOOK_TOKEN
 *   Eventos: Cobrança recebida e Cobrança confirmada (e, se quiser, vencida/estornada)
 * O status é sempre conferido direto na API do Asaas antes de dar a venda como paga.
 */
export async function POST(req: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || req.headers.get('asaas-access-token') !== expected) {
    return NextResponse.json({ error: 'token inválido' }, { status: 401 });
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true });
  }
  const id = body?.payment?.id;
  if (!id) return NextResponse.json({ received: true });
  try {
    const db = admin();
    let { data: pay } = await db.from('payments').select('*').eq('provider_id', id).maybeSingle();
    if (!pay && body?.payment?.subscription) {
      // mensalidade de uma assinatura criada pelo checkout
      if (await registerSubscriptionPayment(body.payment.subscription, body.payment)) pay = (await db.from('payments').select('*').eq('provider_id', id).maybeSingle()).data;
    }
    // Pix direto (QR estático) mandado na conversa: o Asaas cria a cobrança na hora do pagamento e traz o pixQrCodeId
    if (!pay && body?.payment?.pixQrCodeId) {
      const { data: viaQr } = await db.from('payments').select('*').eq('provider', 'asaas_qr').eq('provider_id', body.payment.pixQrCodeId).order('created_at', { ascending: false }).limit(1);
      pay = viaQr?.[0] || null;
      if (pay?.lead_id) await logEvent(pay.lead_id, 'pix_qr_pago', 'pay', `Pix direto recebido no Asaas (cobrança ${id})`);
    }
    if (!pay) return NextResponse.json({ received: true }); // cobrança que não foi criada pelo sistema
    const p: any = await getPayment(id);
    if (PAID_STATUSES.includes(p.status) && pay.status !== 'pago') {
      if (pay.checkout_id) {
        await db.from('payments').update({ asaas_receipt_url: p.transactionReceiptUrl || null }).eq('id', pay.id);
        await completeCheckout(id, Number(p.value || pay.amount));
      } else {
        await db
          .from('payments')
          .update({ status: 'pago', paid_at: new Date().toISOString(), asaas_receipt_url: p.transactionReceiptUrl || null })
          .eq('id', pay.id);
        if (pay.lead_id) {
          await markPaid(pay.lead_id, Number(p.value || pay.amount), 'asaas', pay.id);
          await import('@/lib/delivery').then((m) => m.deliverProducts(pay.lead_id, pay.id)).catch(() => {});
        }
      }
    } else if (p.status === 'OVERDUE' && pay.status === 'pendente') {
      await db.from('payments').update({ status: 'expirado' }).eq('id', pay.id);
      if (pay.checkout_id) await db.from('checkout_links').update({ asaas_payment_id: null }).eq('id', pay.checkout_id).eq('asaas_payment_id', id);
      if (pay.lead_id) {
        await db.from('leads').update({ needs_human: 'O pagamento venceu sem ser pago. Ligue e reenvie o link se for o caso.' }).eq('id', pay.lead_id);
        await logEvent(pay.lead_id, 'pix_expired', 'warn', 'Pagamento venceu sem ser pago');
      }
    } else if (['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED'].includes(p.status)) {
      await db.from('payments').update({ status: 'estornado' }).eq('id', pay.id);
      if (pay.lead_id) {
        await db.from('leads').update({ needs_human: 'Pagamento estornado no Asaas. Verifique.' }).eq('id', pay.lead_id);
        await logEvent(pay.lead_id, 'refund', 'warn', 'Pagamento estornado no Asaas');
      }
    }
  } catch (e) {
    console.error('webhook asaas', e);
    return NextResponse.json({ error: 'erro ao processar' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
