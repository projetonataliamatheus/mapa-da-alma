import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { admin } from '@/lib/supabase/admin';
import { markPaid, logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * Webhook de vendas da Kiwify (checkout internacional do atendimento em espanhol).
 * Kiwify › Apps › Webhooks › Criar: URL https://SEU-PAINEL/api/webhooks/kiwify · produto "Mapa del Alma completo" · evento Compra aprovada
 * (e, se quiser o aviso, Compra reembolsada / Chargeback). O "token" que você criar lá vai na variável KIWIFY_WEBHOOK_TOKEN (Easypanel).
 * A Kiwify assina cada envio: ?signature=HMAC-SHA1 (hex) do corpo cru, com o token como chave.
 */
const assinaturaOk = (corpo: string, assinatura: string | null, token: string) => {
  if (!token || !assinatura) return false;
  const esperado = createHmac('sha1', token).update(corpo).digest('hex');
  const a = Buffer.from(esperado), b = Buffer.from(assinatura.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
};
const digitos = (v: any) => String(v || '').replace(/\D/g, '');

export async function POST(req: Request) {
  const corpo = await req.text();
  const token = process.env.KIWIFY_WEBHOOK_TOKEN || '';
  if (!assinaturaOk(corpo, new URL(req.url).searchParams.get('signature'), token)) return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });
  let ev: any = {};
  try { ev = JSON.parse(corpo); } catch { return NextResponse.json({ received: true }); }
  const tipo = String(ev.webhook_event_type || '');
  const orderId = String(ev.order_id || '');
  const db = admin();
  try {
    if (/^(order_refunded|chargeback)$/.test(tipo)) {
      await logEvent(null, 'kiwify_estorno', 'warn', `Kiwify: ${tipo === 'chargeback' ? 'chargeback' : 'reembolso'} no pedido ${orderId}. Revise o contato.`, { order_id: orderId });
      return NextResponse.json({ received: true });
    }
    if (tipo !== 'order_approved' && ev.order_status !== 'paid') return NextResponse.json({ received: true });
    if (orderId) {
      const { data: ja } = await db.from('payments').select('id').eq('provider', 'kiwify').eq('provider_id', orderId).maybeSingle();
      if (ja) return NextResponse.json({ received: true }); // reenvio da Kiwify: já processado
    }
    // 1) pelo identificador que vai no link (?src=ID da cobrança)
    const tr = ev.TrackingParameters || ev.tracking_parameters || {};
    const ref = String(tr.src || tr.sck || tr.s1 || '');
    let pay: any = null;
    if (/^[0-9a-f-]{36}$/i.test(ref)) pay = (await db.from('payments').select('*').eq('id', ref).maybeSingle()).data;
    // 2) pelo WhatsApp que a pessoa digitou no checkout (últimos 8 dígitos), com cobrança pendente
    if (!pay) {
      const tel = digitos(ev.Customer?.mobile || ev.customer?.mobile || ev.Customer?.phone);
      if (tel.length >= 8) {
        const fim = tel.slice(-8);
        const { data: ls } = await db.from('leads').select('id,whatsapp').like('whatsapp', `%${fim}`).limit(5);
        const ids = (ls || []).filter((l: any) => digitos(l.whatsapp).endsWith(fim)).map((l: any) => l.id);
        if (ids.length === 1) pay = (await db.from('payments').select('*').in('lead_id', ids).eq('status', 'pendente').order('created_at', { ascending: false }).limit(1)).data?.[0] || null;
      }
    }
    if (!pay) {
      await logEvent(null, 'kiwify_sem_contato', 'warn', `Kiwify: pagamento aprovado (pedido ${orderId}) mas não achei o contato. Confira na Kiwify e libere à mão.`, { order_id: orderId, email: ev.Customer?.email || null });
      return NextResponse.json({ received: true });
    }
    if (pay.status === 'pago') return NextResponse.json({ received: true });
    await db.from('payments').update({ status: 'pago', provider: 'kiwify', provider_id: orderId || null, paid_at: new Date().toISOString() }).eq('id', pay.id);
    await logEvent(pay.lead_id, 'pago_kiwify', 'pay', `Pagamento internacional recebido pela Kiwify (pedido ${orderId})`);
    await markPaid(pay.lead_id, Number(pay.amount) || null, 'kiwify', pay.id, pay.service);
  } catch (e: any) {
    console.error('webhook kiwify', e);
    return NextResponse.json({ error: 'falha' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
