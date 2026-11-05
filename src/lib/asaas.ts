/** Pix com confirmação automática pelo Asaas. */

function base() {
  return process.env.ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
}

async function call(path: string, method = 'GET', body?: any) {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('Asaas não configurado: falta ASAAS_API_KEY');
  const r = await fetch(base() + path, {
    signal: AbortSignal.timeout(60_000),
    method,
    headers: { 'Content-Type': 'application/json', access_token: key, 'User-Agent': 'radar-de-vendas' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    j = { raw: text };
  }
  if (!r.ok) {
    const msg = j?.errors?.map((e: any) => e.description).join('; ') || text.slice(0, 200);
    throw new Error('Asaas: ' + msg);
  }
  return j;
}

/** CPF (11) ou CNPJ (14) só com números; null se inválido. */
export function cleanDocument(v?: string | null) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && validCpf(d)) return d;
  if (d.length === 14 && validCnpj(d)) return d;
  return null;
}

function validCpf(c: string) {
  if (/^(\d)\1+$/.test(c)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

function validCnpj(c: string) {
  if (/^(\d)\1+$/.test(c)) return false;
  const calc = (n: number) => {
    const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = w.reduce((a, x, i) => a + x * Number(c[i]), 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export function formatDocument(d?: string | null) {
  if (!d) return '';
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

/** Encontra ou cria o cliente no Asaas. */
export async function ensureCustomer(lead: { id: string; name: string; cpf_cnpj: string; whatsapp?: string | null; email?: string | null; asaas_customer_id?: string | null }) {
  if (lead.asaas_customer_id) return lead.asaas_customer_id;
  const found = await call(`/customers?cpfCnpj=${lead.cpf_cnpj}&limit=1`);
  if (found?.data?.[0]?.id) {
    if (lead.email && !found.data[0].email) await call(`/customers/${found.data[0].id}`, 'PUT', { email: lead.email }).catch(() => {});
    return found.data[0].id as string;
  }
  let phone = String(lead.whatsapp || '').replace(/\D/g, '');
  if (phone.startsWith('55')) phone = phone.slice(2);
  const c = await call('/customers', 'POST', {
    name: lead.name,
    cpfCnpj: lead.cpf_cnpj,
    mobilePhone: phone || undefined,
    email: lead.email || undefined,
    externalReference: lead.id,
    notificationDisabled: true,
  });
  return c.id as string;
}

function dueDate(hours: number) {
  const d = new Date(Date.now() + Math.max(24, hours) * 3600 * 1000 - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Cria a cobrança Pix e devolve o copia e cola. */
export async function createPixCharge(p: { customerId: string; amount: number; description: string; leadId: string; hours: number }) {
  const pay = await call('/payments', 'POST', {
    customer: p.customerId,
    billingType: 'PIX',
    value: Math.round(p.amount * 100) / 100,
    dueDate: dueDate(p.hours),
    description: p.description.slice(0, 500),
    externalReference: p.leadId,
  });
  const qr = await call(`/payments/${pay.id}/pixQrCode`);
  return {
    id: pay.id as string,
    qr_code: qr.payload as string,
    ticket_url: pay.invoiceUrl as string,
    expires_at: qr.expirationDate ? new Date(String(qr.expirationDate).replace(' ', 'T') + '-03:00').toISOString() : new Date(Date.now() + p.hours * 3600 * 1000).toISOString(),
  };
}

export async function getPayment(id: string) {
  return call(`/payments/${encodeURIComponent(id)}`);
}

export const PAID_STATUSES = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

/* ---------------- checkout próprio ---------------- */

export type CardInput = { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string };
export type HolderInfo = { name: string; email: string; cpfCnpj: string; postalCode: string; addressNumber: string; phone: string };

function todaySP() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** QR Code do Pix de uma cobrança (imagem em base64 + copia e cola). */
export async function pixQr(paymentId: string) {
  const qr = await call(`/payments/${paymentId}/pixQrCode`);
  return { image: qr.encodedImage as string, payload: qr.payload as string, expires: qr.expirationDate as string };
}

/** Cobrança avulsa por Pix (pagamento único). */
export async function createPixPayment(p: { customerId: string; amount: number; description: string; ref: string; days: number }) {
  const due = new Date(Date.now() - 3 * 3600 * 1000 + Math.max(1, p.days) * 86400000).toISOString().slice(0, 10);
  const pay = await call('/payments', 'POST', {
    customer: p.customerId,
    billingType: 'PIX',
    value: Math.round(p.amount * 100) / 100,
    dueDate: due,
    description: p.description.slice(0, 500),
    externalReference: p.ref,
  });
  return pay;
}

/** Cobrança no cartão (à vista ou parcelada). O cartão não é guardado em lugar nenhum. */
export async function createCardPayment(p: { customerId: string; amount: number; installments: number; description: string; ref: string; card: CardInput; holder: HolderInfo; ip: string }) {
  const body: any = {
    customer: p.customerId,
    billingType: 'CREDIT_CARD',
    dueDate: todaySP(),
    description: p.description.slice(0, 500),
    externalReference: p.ref,
    creditCard: p.card,
    creditCardHolderInfo: { ...p.holder, mobilePhone: p.holder.phone },
    remoteIp: p.ip,
  };
  if (p.installments > 1) {
    body.installmentCount = p.installments;
    body.totalValue = Math.round(p.amount * 100) / 100;
  } else body.value = Math.round(p.amount * 100) / 100;
  return call('/payments', 'POST', body);
}

/** Assinatura mensal (serviços recorrentes). No cartão, a primeira mensalidade é cobrada na hora. */
export async function createSubscription(p: { customerId: string; amount: number; description: string; ref: string; method: 'PIX' | 'CREDIT_CARD'; card?: CardInput; holder?: HolderInfo; ip?: string }) {
  const body: any = {
    customer: p.customerId,
    billingType: p.method,
    value: Math.round(p.amount * 100) / 100,
    nextDueDate: todaySP(),
    cycle: 'MONTHLY',
    description: p.description.slice(0, 500),
    externalReference: p.ref,
  };
  if (p.method === 'CREDIT_CARD') {
    body.creditCard = p.card;
    body.creditCardHolderInfo = { ...p.holder, mobilePhone: p.holder?.phone };
    body.remoteIp = p.ip;
  }
  return call('/subscriptions', 'POST', body);
}

export async function subscriptionPayments(id: string) {
  const r = await call(`/subscriptions/${id}/payments?limit=5`);
  return (r.data || []) as any[];
}

export async function deletePayment(id: string) {
  return call(`/payments/${id}`, 'DELETE').catch(() => null);
}

export async function cancelSubscription(id: string) {
  return call(`/subscriptions/${id}`, 'DELETE').catch(() => null);
}

/* ---------------- Pix direto (QR Code estático) ---------------- */

let chaveCache: { v: string; at: number } | null = null;
/** Chave Pix da conta Asaas: ASAAS_PIX_KEY ou a primeira chave ativa cadastrada no Asaas. */
export async function chavePixAsaas(): Promise<string> {
  if (process.env.ASAAS_PIX_KEY) return process.env.ASAAS_PIX_KEY;
  if (chaveCache && Date.now() - chaveCache.at < 3600_000) return chaveCache.v;
  const r: any = await call('/pix/addressKeys?status=ACTIVE&limit=10');
  const k = (r?.data || []).find((x: any) => x.status === 'ACTIVE' || !x.status)?.key;
  if (!k) throw new Error('Nenhuma chave Pix ativa no Asaas. Cadastre uma chave Pix na conta Asaas (ou informe ASAAS_PIX_KEY).');
  chaveCache = { v: k, at: Date.now() };
  return k;
}

/**
 * Pix "copia e cola" com valor fixo, sem precisar de CPF nem de cadastro do cliente (bom para quem tem dificuldade com link).
 * Quando a pessoa paga, o Asaas cria a cobrança sozinho e o webhook traz o pixQrCodeId: é assim que sabemos de qual conversa veio.
 */
export async function criarPixDireto(p: { valor: number; descricao: string; horas?: number }) {
  const addressKey = await chavePixAsaas();
  const exp = p.horas ? new Date(Date.now() - 3 * 3600_000 + p.horas * 3600_000).toISOString().slice(0, 19).replace('T', ' ') : undefined;
  const qr: any = await call('/pix/qrCodes/static', 'POST', {
    addressKey,
    description: p.descricao.slice(0, 37),
    value: Math.round(p.valor * 100) / 100,
    format: 'ALL',
    ...(exp ? { expirationDate: exp } : {}),
  });
  return { id: qr.id as string, payload: qr.payload as string, image: (qr.encodedImage as string) || null };
}

/* ---------------- Link de pagamento fixo da página de vendas BR ---------------- */

export const getCustomer = (id: string) => call(`/customers/${id}`);

/** Link de pagamento do Asaas (Pix/cartão, valor único) usado pelo botão "Quero meu mapa" de mapadaalma.site. Criado na primeira vez pela API e guardado em settings.data.asaas_link_br. */
export async function linkPagamentoMapaBR(): Promise<{ id: string; url: string }> {
  const { admin } = await import('@/lib/supabase/admin');
  const db = admin();
  const { data: s } = await db.from('settings').select('data').eq('id', 1).maybeSingle();
  const data: any = s?.data || {};
  if (data.asaas_link_br?.url) return data.asaas_link_br;
  const l: any = await call('/paymentLinks', 'POST', {
    name: 'Mapa da Alma completo',
    description: 'Mapa da Alma completo: numerologia cabalística e astrologia, entregue pelo WhatsApp.',
    billingType: 'UNDEFINED',
    chargeType: 'DETACHED',
    value: 49,
    dueLimitDays: 10,
    notificationEnabled: false,
  });
  const novo = { id: String(l.id), url: String(l.url) };
  await db.from('settings').update({ data: { ...data, asaas_link_br: novo } }).eq('id', 1);
  return novo;
}
