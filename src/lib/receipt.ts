/** Recibo em PDF: monta o HTML, gera o PDF no Browserless, guarda no Supabase e envia pelo WhatsApp. */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { evo } from './evolution';
import { formatDocument } from './asaas';
import { formatPhone } from './phone';
import { logEvent, connectedNumber } from './engine';

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const money = (v: any) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUND = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function under1000(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUND[h]);
  if (r) parts.push(r < 20 ? UNITS[r] : TENS[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNITS[r % 10] : ''));
  return parts.join(' e ');
}
/** Valor por extenso (até 999.999,99). */
export function extenso(v: number) {
  const reais = Math.floor(v);
  const cents = Math.round((v - reais) * 100);
  const th = Math.floor(reais / 1000);
  const rest = reais % 1000;
  const words: string[] = [];
  if (th) words.push(th === 1 ? 'mil' : under1000(th) + ' mil');
  if (rest) words.push(under1000(rest));
  let txt = words.join(rest && (rest < 100 || rest % 100 === 0) && th ? ' e ' : ' ');
  if (reais) txt += reais === 1 ? ' real' : ' reais';
  if (cents) txt += (reais ? ' e ' : '') + under1000(cents) + (cents === 1 ? ' centavo' : ' centavos');
  return txt.trim() || 'zero real';
}

export function receiptHtml(d: {
  number: string;
  date: string;
  company: any;
  companyName: string;
  client: { name: string; document?: string | null; phone?: string | null };
  service: string;
  includes?: string | null;
  delivery?: string | null;
  amount: number;
  paymentRef?: string | null;
  method?: string | null;
  monthly?: boolean;
  accent?: string | null;
}) {
  const c = d.company || {};
  const ac = /^#[0-9a-f]{6}$/i.test(String(d.accent || '')) ? String(d.accent) : '#D9532A';
  const via = d.method === 'card' ? 'cartão de crédito' : d.method === 'boleto' ? 'boleto' : d.method === 'manual' ? 'transferência' : 'Pix';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${esc(d.number)}</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;color:#17212A;background:#fff}
.page{padding:46px 52px;min-height:297mm;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${ac};padding-bottom:22px}
.brand b{font-size:22px;display:block}
.brand span{font-size:12px;color:#5A6870;line-height:1.6;display:block}
.tag{text-align:right}
.tag h1{margin:0;font-size:30px;letter-spacing:.04em;color:${ac}}
.tag div{font-size:12px;color:#5A6870;margin-top:4px}
.amount{margin:30px 0 8px;background:color-mix(in srgb, ${ac} 14%, #fff);border-radius:14px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
.amount small{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#33404a;font-weight:700}
.amount strong{font-size:32px}
.words{font-size:12.5px;color:#5A6870;margin-bottom:26px}
.text{font-size:14.5px;line-height:1.75}
table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#5A6870;padding:9px 10px;background:#EEF1F0}
td{padding:12px 10px;border-bottom:1px solid #D6DEDC;vertical-align:top}
td.r,th.r{text-align:right}
.note{margin-top:22px;font-size:12.5px;color:#5A6870;line-height:1.6;background:#F5F7F6;border-radius:10px;padding:12px 14px}
.sign{margin-top:auto;padding-top:60px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#5A6870}
.line{border-top:1px solid #17212A;width:260px;text-align:center;padding-top:6px;color:#17212A}
</style></head><body><div class="page">
<div class="top"><div class="brand"><b>${esc(c.legal_name || d.companyName)}</b><span>${[c.document ? 'CNPJ/CPF ' + esc(formatDocument(String(c.document).replace(/\D/g, '')) || c.document) : '', esc(c.address), esc(c.city)].filter(Boolean).join('<br>')}${c.phone || c.email ? '<br>' + [esc(c.phone), esc(c.email)].filter(Boolean).join(' · ') : ''}</span></div>
<div class="tag"><h1>RECIBO</h1><div>Nº ${esc(d.number)}</div><div>${esc(d.date)}</div></div></div>
<div class="amount"><div><small>Valor recebido</small></div><strong>${money(d.amount)}</strong></div>
<div class="words">(${esc(extenso(d.amount))})</div>
<p class="text">Recebemos de <b>${esc(d.client.name)}</b>${d.client.document ? `, inscrito(a) sob o ${String(d.client.document).length === 14 ? 'CNPJ' : 'CPF'} <b>${esc(formatDocument(d.client.document))}</b>` : ''}, a importância de <b>${money(d.amount)}</b>, referente ao serviço descrito abaixo, pago via <b>${via}</b>.</p>
<table><thead><tr><th>Serviço</th><th>Prazo</th><th class="r">Valor</th></tr></thead>
<tbody><tr><td><b>${esc(d.service)}</b>${d.includes ? `<br><span style="color:#5A6870">${esc(d.includes)}</span>` : ''}</td><td>${esc(d.delivery || '—')}</td><td class="r"><b>${money(d.amount)}</b></td></tr></tbody></table>
<div class="note">${d.monthly ? 'Mensalidade do serviço.' : 'Pagamento único, sem mensalidade.'}${d.paymentRef ? ` Identificador do pagamento: ${esc(d.paymentRef)}.` : ''} Guarde este recibo para seu controle.</div>
<div class="sign"><div>${esc(c.city || '')}${c.city ? ', ' : ''}${esc(d.date)}</div><div class="line">${esc(c.legal_name || d.companyName)}</div></div>
</div></body></html>`;
}

/** Gera o PDF no Browserless (nuvem ou instalado no seu servidor). */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const baseUrl = (process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io').replace(/\/$/, '');
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error('Browserless não configurado: falta BROWSERLESS_TOKEN');
  const r = await fetch(`${baseUrl}/pdf?token=${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(60_000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, options: { format: 'A4', printBackground: true, preferCSSPageSize: true } }),
  });
  if (!r.ok) throw new Error('Browserless: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}

/** PDF de uma página da internet (ex.: comprovante do Asaas). */
export async function urlToPdf(url: string): Promise<Buffer> {
  const baseUrl = (process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io').replace(/\/$/, '');
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error('Browserless não configurado: falta BROWSERLESS_TOKEN');
  const r = await fetch(`${baseUrl}/pdf?token=${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(60_000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, options: { format: 'A4', printBackground: true }, gotoOptions: { waitUntil: 'networkidle2' } }),
  });
  if (!r.ok) throw new Error('Browserless: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}

/** Gera, guarda e envia o recibo de um pagamento. */
export async function sendReceipt(paymentId: string) {
  const db = admin();
  const { data: pay } = await db.from('payments').select('*').eq('id', paymentId).single();
  const { data: lead } = await db.from('leads').select('*').eq('id', pay.lead_id).single();
  const settings = await getSettings(db);
  const { data: svc } = pay.service ? await db.from('services').select('*').eq('slug', pay.service).maybeSingle() : { data: null as any };
  // link de pagamento: nome, documento e título que o cliente usou no checkout
  const { data: link } = pay.checkout_id ? await db.from('checkout_links').select('*').eq('id', pay.checkout_id).maybeSingle() : { data: null as any };
  const number = String(pay.receipt_number || '').padStart(5, '0');
  const date = new Date(pay.paid_at || Date.now()).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long', year: 'numeric' });

  const html = receiptHtml({
    number,
    date,
    company: settings.company,
    companyName: settings.company_name,
    client: { name: link?.customer_name || lead.name, document: link?.customer_document || lead.cpf_cnpj, phone: formatPhone(lead.whatsapp) },
    service: link?.title || svc?.name || 'Serviço contratado',
    includes: link?.includes || svc?.includes,
    delivery: svc?.delivery,
    amount: Number(pay.amount),
    paymentRef: pay.provider_id,
    method: pay.method,
    monthly: link?.billing === 'mensal',
    accent: (settings as any).checkout?.accent,
  });
  const pdf = await htmlToPdf(html);
  const path = `${new Date().getFullYear()}/recibo-${number}-${lead.id.slice(0, 8)}.pdf`;
  const up = await db.storage.from('recibos').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (up.error) throw new Error('Supabase Storage: ' + up.error.message);
  await db.from('payments').update({ receipt_path: path }).eq('id', pay.id);

  // vai pelo mesmo número (chip) da conversa que a IA atendeu; se o cliente não tinha conversa, pelo número conectado
  const wa = await connectedNumber(lead.number_id);
  if (!wa || !lead.whatsapp) throw new Error('Recibo gerado, mas não há número de WhatsApp conectado para enviar');
  const fileName = `Recibo ${number} - ${link?.customer_name || lead.name}.pdf`.replace(/[\\/:*?"<>|]/g, '');
  const r: any = await evo.sendDocument(wa.instance_name, lead.whatsapp, pdf.toString('base64'), fileName, settings.receipts.message);
  await db.from('messages').insert({ lead_id: lead.id, number_id: wa.id, direction: 'out', author: 'system', kind: 'document', body: `📄 ${fileName}`, wa_message_id: r?.key?.id || null });
  await db.from('payments').update({ receipt_sent_at: new Date().toISOString(), receipt_error: null }).eq('id', pay.id);
  await logEvent(lead.id, 'receipt', 'ok', `Recibo ${number} enviado para ${lead.name} pelo WhatsApp`);
}

/** Recibos pendentes (pagos e ainda não enviados): usado pelo robô e, se ele estiver sem sinal, pelo próprio painel. */
export async function processPendingReceipts(settings: any, log: (...a: any[]) => void = console.log) {
  const db = admin;
  if (!settings.receipts?.enabled) return;
  const { data: pend } = await db().from('payments').select('*').eq('status', 'pago').is('receipt_sent_at', null).lt('receipt_attempts', 3).limit(3);
  for (const p of pend || []) {
    try {
      await sendReceipt(p.id);
    } catch (e: any) {
      const msg = String(e.message || e);
      // sem Browserless: manda o comprovante do próprio Asaas, se existir
      if (msg.includes('BROWSERLESS_TOKEN') && p.asaas_receipt_url) {
        try {
          const { data: lead } = await db().from('leads').select('*').eq('id', p.lead_id).single();
          const { connectedNumber, sendAndRecord } = await import('./engine');
          const n = await connectedNumber(lead.number_id);
          if (n && lead.whatsapp) {
            await sendAndRecord(n, lead, `Aqui está o comprovante do seu pagamento: ${p.asaas_receipt_url}`, 'system', false);
            await db().from('payments').update({ receipt_sent_at: new Date().toISOString() }).eq('id', p.id);
            continue;
          }
        } catch {}
      }
      const attempts = (p.receipt_attempts || 0) + 1;
      await db().from('payments').update({ receipt_attempts: attempts, receipt_error: msg.slice(0, 300) }).eq('id', p.id);
      log('erro no recibo', p.id, msg);
      if (attempts >= 3) {
        await db().from('leads').update({ needs_human: 'O recibo não foi enviado: ' + msg.slice(0, 150) }).eq('id', p.lead_id);
        await logEvent(p.lead_id, 'receipt_error', 'warn', 'Recibo não enviado: ' + msg.slice(0, 150));
      }
    }
  }
}
