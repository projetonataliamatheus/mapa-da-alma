import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { admin } from '@/lib/supabase/admin';
import { markPaid, logEvent } from '@/lib/engine';
import { liquidoDoEvento, camposLiquido } from '@/lib/kiwify-liquido';

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
const f2 = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const resumoLiquido = (l: any) => `bruto US$ ${f2(l.bruto_usd)} · taxas US$ ${f2(l.taxa_usd)} · líquido US$ ${f2(l.liquido_usd)} ≈ R$ ${f2(l.liquido_brl)}${l.origem === 'estimado' ? ' (estimado: a Kiwify não enviou o líquido)' : ''}`;
/** Grava com as colunas novas do líquido; se o banco ainda não rodou a 065, grava só o essencial (a venda NUNCA pode falhar por isso). */
const COLS_NOVAS = ['liquido_usd', 'taxa_usd', 'liquido_brl', 'cambio_brl', 'liquido_origem', 'kiwify_raw'];
const semNovas = (o: any) => Object.fromEntries(Object.entries(o).filter(([k]) => !COLS_NOVAS.includes(k)));
const digitos = (v: any) => String(v || '').replace(/\D/g, '');


/** Dados do comprador que a Kiwify manda (e-mail, telefone, endereço, IP): guardados no contato para o Meta (qualidade da correspondência). */
async function guardarComprador(leadId: string | null | undefined, ev: any) {
  if (!leadId) return;
  const c = ev.Customer || ev.customer || {};
  await import('@/lib/meta-capi').then((m) => m.salvarCliente(leadId, {
    email: c.email, telefone: digitos(c.mobile || c.phone), nome: c.full_name || c.first_name, ip: c.ip || ev.ip || null,
    cidade: c.city, estado: c.state, cep: c.zipcode || c.zip_code, pais: c.country, fonte: 'kiwify',
  })).catch(() => {});
}

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
      const { data: pg } = orderId ? await db.from('payments').select('id,lead_id').eq('provider', 'kiwify').eq('provider_id', orderId).maybeSingle() : { data: null as any };
      if (pg) await db.from('payments').update({ status: 'estornado' }).eq('id', pg.id);
      await logEvent(pg?.lead_id || null, 'kiwify_estorno', 'warn', `Kiwify: ${tipo === 'chargeback' ? 'CHARGEBACK' : 'REEMBOLSO'} no pedido ${orderId}. Revise o acesso ao mapa e o contato.`, { order_id: orderId, tipo });
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
    // 3) comprou pelo botão "Pagar" do teste gratuito do site (?src=CÓDIGO do teste)
    if (!pay && /^[A-HJ-NP-Z2-9]{6}$/i.test(ref)) {
      const { data: sl } = await db.from('site_leads').select('*').eq('ref', ref.toUpperCase()).maybeSingle();
      if (sl) {
        await db.from('site_leads').update({ pago: true }).eq('id', sl.id);
        if (sl.lead_id) {
          await guardarComprador(sl.lead_id, ev);
          const liqS = await liquidoDoEvento(ev, 10);
          const rowS = { lead_id: sl.lead_id, provider: 'kiwify', provider_id: orderId || null, service: 'mapa-completo', status: 'pago', paid_at: new Date().toISOString(), ...camposLiquido(liqS, null) };
          if ((await db.from('payments').insert(rowS)).error) await db.from('payments').insert(semNovas(rowS));
          await logEvent(sl.lead_id, 'pago_kiwify', 'pay', `Pagamento internacional recebido pela Kiwify (pedido ${orderId}) · veio do site · ${resumoLiquido(liqS)}`);
          await markPaid(sl.lead_id, liqS.liquido_brl, 'kiwify', null, 'mapa-completo');
        } else {
          await logEvent(null, 'kiwify_site_sem_conversa', 'ok', `Kiwify: ${sl.nome} (${sl.nascimento}) comprou direto pelo site (pedido ${orderId}). Nenhuma mensagem é enviada: fica só registrado.`, { order_id: orderId, ref: sl.ref, mobile: ev.Customer?.mobile || null });
        }
        return NextResponse.json({ received: true });
      }
    }
    if (!pay) {
      await logEvent(null, 'kiwify_sem_contato', 'warn', `Kiwify: pagamento aprovado (pedido ${orderId}) mas não achei o contato. Confira na Kiwify e libere à mão.`, { order_id: orderId, email: ev.Customer?.email || null });
      return NextResponse.json({ received: true });
    }
    if (pay.status === 'pago') return NextResponse.json({ received: true });
    await guardarComprador(pay.lead_id, ev);
    // valor REAL: bruto em US$, taxas e líquido (US$ e R$) vindos da própria Kiwify; amount = líquido em R$
    const liq = await liquidoDoEvento(ev, Number(pay.valor_local) || 10);
    const upd = { status: 'pago', provider: 'kiwify', provider_id: orderId || null, paid_at: new Date().toISOString(), ...camposLiquido(liq, Number(pay.amount) || null) };
    if ((await db.from('payments').update(upd).eq('id', pay.id)).error) await db.from('payments').update(semNovas(upd)).eq('id', pay.id);
    await logEvent(pay.lead_id, 'pago_kiwify', 'pay', `Pagamento internacional recebido pela Kiwify (pedido ${orderId}) · ${resumoLiquido(liq)}`);
    await markPaid(pay.lead_id, liq.liquido_brl ?? (Number(pay.amount) || null), 'kiwify', pay.id, pay.service);
  } catch (e: any) {
    console.error('webhook kiwify', e);
    return NextResponse.json({ error: 'falha' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
