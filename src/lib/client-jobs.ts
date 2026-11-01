/**
 * Rotinas da central do cliente (rodam no robô, só no horário comercial):
 * - Renovações: alguns dias antes do vencimento cria a conta a receber + link de pagamento e manda a cobrança no WhatsApp;
 *   no dia do vencimento, se não pagou, manda um lembrete. Quando paga, a próxima data é calculada sozinha.
 * - Depoimento: X dias depois da entrega, pede uma avaliação (uma vez só).
 */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { connectedNumber, sendAndRecord, logEvent } from './engine';
import { createLink } from './checkout';
import { nextDue, todaySP, daysUntil } from './finance';
import { brl } from './util';

const db = () => admin();
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const first = (n?: string | null) => String(n || '').trim().split(/\s+/)[0] || '';
const fmt = (d: string) => d.split('-').reverse().join('/');

export async function processRenewals(max = 5) {
  const today = todaySP();
  const s: any = await getSettings(db());
  const { data: list } = await db().from('renewals').select('*, leads(id,name,whatsapp,number_id,memory,ai_locked)').eq('active', true).order('next_due').limit(100);
  let n = 0;
  for (const r of list || []) {
    if (n >= max) break;
    const left = daysUntil(r.next_due, today);
    if (left > r.remind_days) continue;
    // conta a receber + link deste vencimento (uma vez por ciclo)
    let entry: any = null;
    if (r.last_entry_id) entry = (await db().from('fin_entries').select('*').eq('id', r.last_entry_id).maybeSingle()).data;
    if (!entry || entry.due_date !== r.next_due) {
      const link = await createLink({ lead_id: r.lead_id, title: r.title, description: `Renovação ${r.cycle === 'anual' ? 'anual' : 'mensal'}`, amount: Number(r.amount), billing: 'unico', created_by: 'equipe', expires_days: Math.max(10, left + 10) });
      await db().from('checkout_links').update({ renewal_id: r.id }).eq('id', link.id);
      const { data: e } = await db()
        .from('fin_entries')
        .insert({ kind: 'receita', description: r.title, category: r.kind === 'dominio' ? 'Domínio' : r.kind === 'hospedagem' ? 'Hospedagem' : 'Mensalidade', amount: r.amount, recurrence: 'unico', due_date: r.next_due, lead_id: r.lead_id, renewal_id: r.id, created_by_name: 'Renovação automática' })
        .select('*')
        .single();
      entry = e;
      await db().from('renewals').update({ last_entry_id: e?.id, last_link_id: link.id, last_sent_at: null, updated_at: new Date().toISOString() }).eq('id', r.id);
      r.last_link_id = link.id;
      r.last_sent_at = null;
    }
    if (entry?.status === 'pago' || !r.auto_charge || !r.leads?.whatsapp || r.leads?.ai_locked) continue;
    // 1ª cobrança (X dias antes) e lembrete no dia do vencimento
    const sentDay = r.last_sent_at ? new Date(new Date(r.last_sent_at).getTime() - 3 * 3600_000).toISOString().slice(0, 10) : '';
    const dueReminder = left <= 0 && sentDay && sentDay < r.next_due;
    if (sentDay && !dueReminder) continue;
    if (left < -3) continue; // passou muito: a equipe cuida (aparece como vencida no Financeiro)
    const { data: link } = await db().from('checkout_links').select('slug').eq('id', r.last_link_id).maybeSingle();
    const { linkUrl } = await import('./checkout');
    const url = link ? linkUrl(s, link.slug) : '';
    const number = await connectedNumber(r.leads.number_id);
    if (!number || !url) continue;
    const vars = { nome: first(r.leads.memory?.nome_cliente || r.leads.name), servico: r.title, valor: brl(r.amount), vencimento: fmt(r.next_due), link: url };
    const text = fill(dueReminder ? s.renewal?.due_text : s.renewal?.text, vars);
    await sendAndRecord(number, r.leads, text, 'system');
    await db().from('renewals').update({ last_sent_at: new Date().toISOString() }).eq('id', r.id);
    await logEvent(r.lead_id, 'renewal_charge', 'acc', `${dueReminder ? 'Lembrete de vencimento' : 'Cobrança de renovação'} enviada: ${r.title} · ${brl(r.amount)} · vence ${fmt(r.next_due)}`);
    n++;
  }
  return n;
}

/** Pagamento de um link de renovação: baixa a conta a receber e avança a próxima data. */
export async function renewalPaid(linkId: string, paymentId: string) {
  const { data: link } = await db().from('checkout_links').select('renewal_id').eq('id', linkId).maybeSingle();
  if (!link?.renewal_id) return;
  const { data: r } = await db().from('renewals').select('*').eq('id', link.renewal_id).maybeSingle();
  if (!r) return;
  if (r.last_entry_id) await db().from('fin_entries').update({ status: 'pago', paid_at: new Date().toISOString(), payment_id: paymentId }).eq('id', r.last_entry_id);
  await db().from('renewals').update({ next_due: nextDue(r.next_due, r.cycle), last_sent_at: null, updated_at: new Date().toISOString() }).eq('id', r.id);
  await logEvent(r.lead_id, 'renewal_paid', 'ok', `Renovação paga: ${r.title}. Próximo vencimento: ${fmt(nextDue(r.next_due, r.cycle))}`);
}

export async function processTestimonials(max = 3) {
  const s: any = await getSettings(db());
  const t = s.testimonial || {};
  if (t.on === false || !String(t.link || '').trim()) return 0;
  const before = new Date(Date.now() - Math.max(1, Number(t.days) || 3) * 86400_000).toISOString();
  const { data: list } = await db().from('leads').select('*').not('delivered_at', 'is', null).lte('delivered_at', before).gte('delivered_at', new Date(Date.now() - 30 * 86400_000).toISOString()).is('testimonial_asked_at', null).eq('ai_locked', false).limit(max);
  let n = 0;
  for (const l of list || []) {
    // marca antes de enviar: nunca pede duas vezes
    await db().from('leads').update({ testimonial_asked_at: new Date().toISOString() }).eq('id', l.id);
    const number = await connectedNumber(l.number_id);
    if (!number || !l.whatsapp) continue;
    await sendAndRecord(number, l, fill(t.text, { nome: first(l.memory?.nome_cliente || l.name), link: String(t.link).trim() }), 'system');
    await logEvent(l.id, 'testimonial_ask', 'acc', `Pedido de depoimento enviado para ${l.name}`);
    n++;
  }
  return n;
}
