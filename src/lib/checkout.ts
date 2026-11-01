/**
 * Links de pagamento com checkout próprio (no seu domínio), processados pelo Asaas.
 * O cliente escolhe Pix ou cartão. Serviços mensais viram assinatura no Asaas.
 */
import { randomBytes } from 'crypto';
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { cleanDocument, ensureCustomer, createPixPayment, pixQr, createCardPayment, createSubscription, subscriptionPayments, deletePayment, PAID_STATUSES } from './asaas';
import { toWhatsapp, waKey } from './phone';
import { markPaid, logEvent } from './engine';
import { brl, appBase } from './util';
import { mergeDesign } from './checkout-design';

const db = () => admin();

export function newSlug(len = 8) {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(len);
  return Array.from(b, (x) => abc[x % abc.length]).join('');
}

export function checkoutBase(settings: any) {
  const raw = String(settings?.checkout?.base_url || settings?.domains?.checkout || process.env.CHECKOUT_URL || appBase() || '').trim();
  if (!raw) return '';
  return (raw.startsWith('http') ? raw : 'https://' + raw).replace(/\/$/, '');
}
export function linkUrl(settings: any, slug: string) {
  const base = checkoutBase(settings);
  // subdomínio só de pagamentos (pagamento.suaagencia.com.br/slug): link curto
  return /^https:\/\/pagamento\./.test(base) ? `${base}/${slug}` : `${base}/pagar/${slug}`;
}

export function isMonthly(billing?: string | null) {
  return /mensal/i.test(String(billing || ''));
}

type NewLink = {
  service_slug?: string | null;
  combo?: { slug: string; name: string; price: number }[] | null;
  title: string;
  description?: string | null;
  includes?: string | null;
  amount: number;
  billing: 'unico' | 'mensal';
  max_installments?: number;
  methods?: string[];
  lead_id?: string | null;
  created_by?: 'ia' | 'equipe';
  created_by_user?: string | null;
  expires_days?: number;
};

export async function createLink(input: NewLink) {
  const settings = await getSettings(db());
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new Error('Informe um valor maior que zero.');
  let lead: any = null;
  if (input.lead_id) lead = (await db().from('leads').select('name,cpf_cnpj,whatsapp,asaas_customer_id').eq('id', input.lead_id).maybeSingle()).data;
  const days = input.expires_days ?? settings.checkout.expiry_days;
  const row = {
    slug: newSlug(),
    lead_id: input.lead_id || null,
    service_slug: input.service_slug || null,
    ...(input.combo ? { combo: input.combo } : {}),
    title: input.title.trim(),
    description: input.description || null,
    includes: input.includes || null,
    amount,
    billing: input.billing,
    max_installments: input.billing === 'mensal' ? 1 : Math.max(1, Math.min(12, input.max_installments ?? settings.checkout.max_installments)),
    methods: input.methods?.length ? input.methods : settings.checkout.methods,
    expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
    created_by: input.created_by || 'equipe',
    created_by_user: input.created_by_user || null,
    customer_name: lead?.name || null,
    customer_document: lead?.cpf_cnpj || null,
    customer_phone: lead?.whatsapp || null,
    asaas_customer_id: lead?.asaas_customer_id || null,
  };
  const { data, error } = await db().from('checkout_links').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return { ...data, url: linkUrl(settings, data.slug) };
}

/** Altera valor/descrição. Se já existia um Pix gerado e não pago, ele é cancelado no Asaas. */
export async function updateLink(id: string, patch: any) {
  const { data: link } = await db().from('checkout_links').select('*').eq('id', id).single();
  if (link.status === 'pago') throw new Error('Este link já foi pago e não pode ser alterado.');
  const allowed: any = {};
  for (const k of ['title', 'description', 'includes', 'amount', 'billing', 'max_installments', 'methods', 'status', 'expires_at']) if (k in patch) allowed[k] = patch[k];
  if ('amount' in allowed) {
    allowed.amount = Math.round(Number(allowed.amount) * 100) / 100;
    if (!(allowed.amount > 0)) throw new Error('Informe um valor maior que zero.');
  }
  if (allowed.status === 'ativo' && link.expires_at && new Date(link.expires_at) < new Date()) {
    const s = await getSettings(db());
    allowed.expires_at = new Date(Date.now() + (s.checkout.expiry_days || 7) * 86400000).toISOString();
  }
  const priceChanged = ('amount' in allowed && allowed.amount !== Number(link.amount)) || ('billing' in allowed && allowed.billing !== link.billing);
  if ((priceChanged || allowed.status === 'cancelado') && link.asaas_payment_id) {
    await deletePayment(link.asaas_payment_id);
    allowed.asaas_payment_id = null;
    await db().from('payments').update({ status: 'cancelado' }).eq('provider_id', link.asaas_payment_id).eq('status', 'pendente');
  }
  const { data, error } = await db().from('checkout_links').update(allowed).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  const s = await getSettings(db());
  return { ...data, url: linkUrl(s, data.slug) };
}

/** Usado pela IA: cria o link do lead ou atualiza o que já existe com o novo valor combinado. */
export async function linkForLead(lead: any, svc: any, price: number) {
  const billing = isMonthly(svc.billing) ? 'mensal' : 'unico';
  const { data: existing } = await db().from('checkout_links').select('*').eq('lead_id', lead.id).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1);
  const cur = existing?.[0];
  if (cur && cur.service_slug === svc.slug) {
    return updateLink(cur.id, { amount: price, billing, title: svc.name, description: svc.description, includes: svc.includes });
  }
  return createLink({ lead_id: lead.id, service_slug: svc.slug, title: svc.name, description: svc.description, includes: svc.includes, amount: price, billing, created_by: 'ia' });
}

/* ---------------- checkout público ---------------- */

export async function publicLink(slug: string, countView = false) {
  const { data: link } = await db().from('checkout_links').select('*').eq('slug', slug).maybeSingle();
  if (!link) return null;
  if (link.status === 'ativo' && link.expires_at && new Date(link.expires_at) < new Date()) {
    await db().from('checkout_links').update({ status: 'expirado' }).eq('id', link.id);
    link.status = 'expirado';
  }
  if (countView) await db().from('checkout_links').update({ views: (link.views || 0) + 1 }).eq('id', link.id);
  const s = await getSettings(db());
  return {
    slug: link.slug,
    status: link.status,
    title: link.title,
    description: link.description,
    includes: link.includes,
    amount: Number(link.amount),
    billing: link.billing,
    max_installments: link.max_installments,
    methods: link.methods,
    prefill: { name: link.customer_name || '', document: link.customer_document || '', phone: link.customer_phone ? String(link.customer_phone).replace(/^55/, '') : '' },
    brand: s.checkout.brand || s.company?.legal_name || s.company_name,
    accent: s.checkout.accent,
    logo: s.checkout.logo_url,
    note: link.billing === 'mensal' ? s.checkout.mensal_note : s.checkout.unico_note,
    success: s.checkout.success_message,
    footer: s.checkout.footer,
    design: mergeDesign((s.checkout as any).design),
    company: { document: s.company?.document || '', city: s.company?.city || '', email: s.company?.email || '', phone: s.company?.phone || '' },
  };
}

export type PayInput = {
  method: 'pix' | 'card';
  name: string;
  document: string;
  phone: string;
  email?: string;
  installments?: number;
  card?: { holderName: string; number: string; expiry: string; ccv: string };
  postalCode?: string;
  addressNumber?: string;
};

export class CheckoutError extends Error {}

function cardFromInput(c: PayInput['card']) {
  if (!c) throw new CheckoutError('Preencha os dados do cartão.');
  const number = String(c.number || '').replace(/\D/g, '');
  const [mm, yy] = String(c.expiry || '').split('/').map((x) => x.trim());
  if (number.length < 13 || number.length > 19) throw new CheckoutError('Confira o número do cartão.');
  if (!/^\d{2}$/.test(mm || '') || Number(mm) < 1 || Number(mm) > 12 || !/^\d{2,4}$/.test(yy || '')) throw new CheckoutError('Confira a validade do cartão (MM/AA).');
  if (!/^\d{3,4}$/.test(String(c.ccv || ''))) throw new CheckoutError('Confira o código de segurança (CVV).');
  if (String(c.holderName || '').trim().length < 3) throw new CheckoutError('Informe o nome impresso no cartão.');
  return { holderName: c.holderName.trim(), number, expiryMonth: mm, expiryYear: yy.length === 2 ? '20' + yy : yy, ccv: String(c.ccv) };
}

/** Processa o pagamento escolhido pelo cliente no checkout. */
export async function payLink(slug: string, input: PayInput, ip: string) {
  const { data: link } = await db().from('checkout_links').select('*').eq('slug', slug).maybeSingle();
  if (!link) throw new CheckoutError('Link de pagamento não encontrado.');
  if (link.status === 'pago') return { kind: 'paid' as const };
  if (link.status !== 'ativo' || (link.expires_at && new Date(link.expires_at) < new Date())) throw new CheckoutError('Este link não está mais ativo. Peça um novo link para quem te atendeu.');
  if ((link.attempts || 0) >= 20) throw new CheckoutError('Muitas tentativas neste link. Fale com quem te atendeu.');
  await db().from('checkout_links').update({ attempts: (link.attempts || 0) + 1 }).eq('id', link.id);

  const name = String(input.name || '').trim().replace(/\s+/g, ' ');
  if (name.split(' ').length < 2) throw new CheckoutError('Informe seu nome completo.');
  const doc = cleanDocument(input.document);
  if (!doc) throw new CheckoutError('CPF ou CNPJ inválido. Confira os números.');
  const wa = toWhatsapp(input.phone);
  if (!wa) throw new CheckoutError('Informe um WhatsApp válido com DDD.');
  if (!(link.methods || []).includes(input.method)) throw new CheckoutError('Forma de pagamento indisponível neste link.');

  const email = String(input.email || '').trim();
  const customerId = await ensureCustomer({ id: link.lead_id || link.id, name, cpf_cnpj: doc, whatsapp: wa, email: email || null, asaas_customer_id: link.customer_document === doc ? link.asaas_customer_id : null });
  await db().from('checkout_links').update({ customer_name: name, customer_document: doc, customer_phone: wa, customer_email: email || null, asaas_customer_id: customerId, last_method: input.method }).eq('id', link.id);
  if (link.lead_id) await db().from('leads').update({ cpf_cnpj: doc, asaas_customer_id: customerId }).eq('id', link.lead_id);

  const description = `${link.title}${link.billing === 'mensal' ? ' (mensalidade)' : ''}`;
  const amount = Number(link.amount);
  const ref = `ck:${link.id}`;

  /* -------- Pix -------- */
  if (input.method === 'pix') {
    let paymentId = link.asaas_payment_id;
    if (!paymentId) {
      if (link.billing === 'mensal') {
        const sub = await createSubscription({ customerId, amount, description, ref, method: 'PIX' });
        await db().from('checkout_links').update({ asaas_subscription_id: sub.id }).eq('id', link.id);
        const pays = await subscriptionPayments(sub.id);
        paymentId = pays[0]?.id;
        if (!paymentId) throw new CheckoutError('O Asaas ainda está gerando a primeira mensalidade. Tente de novo em alguns segundos.');
      } else {
        const pay = await createPixPayment({ customerId, amount, description, ref, days: 2 });
        paymentId = pay.id;
      }
      await db().from('checkout_links').update({ asaas_payment_id: paymentId }).eq('id', link.id);
      await db().from('payments').insert({ lead_id: link.lead_id, checkout_id: link.id, provider: 'asaas', provider_id: paymentId, service: link.service_slug, amount, status: 'pendente', method: 'pix' });
      if (link.lead_id) await logEvent(link.lead_id, 'checkout_pix', 'pay', `${name} gerou o Pix de ${brl(amount)} no checkout`);
    }
    const qr = await pixQr(paymentId);
    return { kind: 'pix' as const, image: qr.image, payload: qr.payload, expires: qr.expires };
  }

  /* -------- Cartão -------- */
  const card = cardFromInput(input.card);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new CheckoutError('Informe um e-mail válido (o banco exige para pagamento com cartão).');
  const postalCode = String(input.postalCode || '').replace(/\D/g, '');
  if (postalCode.length !== 8) throw new CheckoutError('Informe o CEP do titular do cartão.');
  const addressNumber = String(input.addressNumber || '').trim() || 'S/N';
  const holder = { name: card.holderName, email, cpfCnpj: doc, postalCode, addressNumber, phone: wa.replace(/^55/, '') };
  const installments = link.billing === 'mensal' ? 1 : Math.max(1, Math.min(link.max_installments || 1, Number(input.installments) || 1));

  let pay: any;
  try {
    if (link.billing === 'mensal') {
      const sub = await createSubscription({ customerId, amount, description, ref, method: 'CREDIT_CARD', card, holder, ip });
      await db().from('checkout_links').update({ asaas_subscription_id: sub.id }).eq('id', link.id);
      pay = (await subscriptionPayments(sub.id))[0];
    } else {
      pay = await createCardPayment({ customerId, amount, installments, description, ref, card, holder, ip });
    }
  } catch (e: any) {
    const msg = String(e.message || '').replace(/^Asaas:\s*/, '');
    throw new CheckoutError(msg || 'O cartão foi recusado. Confira os dados ou tente outro cartão.');
  }
  if (!pay?.id) throw new CheckoutError('O pagamento não foi concluído. Tente novamente.');
  await db().from('payments').insert({ lead_id: link.lead_id, checkout_id: link.id, provider: 'asaas', provider_id: pay.id, service: link.service_slug, amount, status: 'pendente', method: 'card' });
  if (PAID_STATUSES.includes(pay.status)) {
    await completeCheckout(pay.id, Number(pay.value || amount) * (installments > 1 ? 1 : 1));
    return { kind: 'paid' as const };
  }
  return { kind: 'processing' as const };
}

/** Pagamento confirmado: marca o link como pago, garante o lead e dispara recibo + aprendizado. */
export async function completeCheckout(providerId: string, value?: number) {
  const { data: pay } = await db().from('payments').select('*').eq('provider_id', providerId).maybeSingle();
  if (!pay) return;
  const { data: link } = pay.checkout_id ? await db().from('checkout_links').select('*').eq('id', pay.checkout_id).maybeSingle() : { data: null as any };
  let leadId = pay.lead_id || link?.lead_id || null;

  if (!leadId && link) {
    const wa = toWhatsapp(link.customer_phone);
    const k = waKey(wa);
    // mesma pessoa da conversa: usa a conversa mais recente (o recibo sai pelo mesmo número que a atendeu)
    const { data: found } = k ? await db().from('leads').select('id').eq('wa_key', k).order('last_inbound_at', { ascending: false, nullsFirst: false }).limit(1) : { data: [] as any[] };
    if (found?.[0]) leadId = found[0].id;
    else {
      const { data: created } = await db()
        .from('leads')
        .insert({ name: link.customer_name || 'Cliente', source: 'checkout', whatsapp: wa, wa_key: k, cpf_cnpj: link.customer_document, asaas_customer_id: link.asaas_customer_id, stage: 'pix', wa_status: wa ? 'conversa' : 'nao', deal_service: link.service_slug, deal_price: link.amount, summary: 'Cliente pagou por um link de pagamento enviado pela equipe.', steps: ['price', 'pix'] })
        .select('id')
        .single();
      leadId = created?.id || null;
    }
    if (leadId) await db().from('checkout_links').update({ lead_id: leadId }).eq('id', link.id);
  }
  if (leadId && link) await db().from('leads').update({ cpf_cnpj: link.customer_document, deal_service: link.service_slug, deal_price: link.amount }).eq('id', leadId);

  const amount = Number(value || pay.amount);
  const already = pay.status === 'pago';
  await db().from('payments').update({ status: 'pago', paid_at: new Date().toISOString(), lead_id: leadId, amount }).eq('id', pay.id);
  if (link && link.status !== 'pago') await db().from('checkout_links').update({ status: 'pago', paid_at: new Date().toISOString() }).eq('id', link.id);
  // renovação (domínio/hospedagem/mensalidade): baixa a conta a receber e avança a próxima data
  if (!already && link?.renewal_id) await import('./client-jobs').then((m) => m.renewalPaid(link.id, pay.id)).catch((e) => console.error('renovação', e?.message || e));
  if (!already && leadId && link?.renewal_id) {
    await logEvent(leadId, 'checkout_paid', 'ok', `Renovação paga pelo link (${pay.method === 'card' ? 'cartão' : 'Pix'}): ${link?.title || ''} · ${brl(amount)}`);
    return;
  }
  if (!already && leadId) {
    await markPaid(leadId, amount, 'checkout', pay.id);
    // Pack, Link na bio e Catálogo: entrega automática (o site segue para a Produção)
    await import('./delivery').then((m) => m.deliverProducts(leadId!, pay.id)).catch((e) => console.error('entrega automática', e?.message || e));
    await logEvent(leadId, 'checkout_paid', 'ok', `Pago pelo link de pagamento (${pay.method === 'card' ? 'cartão' : 'Pix'}): ${link?.title || ''} · ${brl(amount)}`);
  }
}

/** Mensalidades seguintes de uma assinatura: cria o registro para o recibo do mês. */
export async function registerSubscriptionPayment(subscriptionId: string, payment: any) {
  const { data: link } = await db().from('checkout_links').select('*').eq('asaas_subscription_id', subscriptionId).maybeSingle();
  if (!link) return false;
  const { data: exists } = await db().from('payments').select('id').eq('provider_id', payment.id).maybeSingle();
  if (!exists)
    await db().from('payments').insert({ lead_id: link.lead_id, checkout_id: link.id, provider: 'asaas', provider_id: payment.id, service: link.service_slug, amount: payment.value, status: 'pendente', method: link.last_method || null });
  return true;
}
