/** Relatório semanal no WhatsApp (toda segunda de manhã): vendas, receita, conversas, campanhas e gasto de IA. */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { evo } from './evolution';
import { brl, spNow } from './util';

const db = () => admin();

export async function buildWeeklyReport() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: leads }, { data: paid }, { data: usage }, s] = await Promise.all([
    db().from('leads').select('source,campaign,stage,preview_slug,steps').gte('created_at', since).limit(20000),
    db().from('leads').select('name,paid_amount,source,campaign,deal_service').gte('paid_at', since).eq('stage', 'pago').limit(2000),
    db().from('usage_log').select('kind,cost_usd').gte('created_at', since).limit(50000),
    getSettings(db()),
  ]);
  const L = leads || [];
  const P = paid || [];
  const receita = P.reduce((a, l: any) => a + Number(l.paid_amount || 0), 0);
  const ai = (usage || []).filter((u: any) => u.kind === 'ai').reduce((a, u: any) => a + Number(u.cost_usd || 0), 0);
  const rate = Number((s as any).budget?.usd_brl) || 5.6;
  const bySrc = (k: string) => L.filter((l: any) => (k === 'direto' ? !['anuncio', 'google'].includes(l.source) : l.source === k)).length;
  const camps: Record<string, { n: number; pagos: number; receita: number }> = {};
  for (const l of L.filter((x: any) => x.source === 'anuncio')) (camps[l.campaign || 'sem nome'] ||= { n: 0, pagos: 0, receita: 0 }).n++;
  for (const l of P.filter((x: any) => x.source === 'anuncio')) {
    const c = (camps[l.campaign || 'sem nome'] ||= { n: 0, pagos: 0, receita: 0 });
    c.pagos++;
    c.receita += Number(l.paid_amount || 0);
  }
  const top = Object.entries(camps)
    .sort((a, b) => b[1].receita - a[1].receita || b[1].n - a[1].n)
    .slice(0, 3);
  const previas = L.filter((l: any) => l.preview_slug || (l.steps || []).includes('preview')).length;
  const lines = [
    `📊 *Resumo da semana* — ${(s as any).company_name || 'Agência'}`,
    '',
    `💰 *Vendas:* ${P.length} · *Receita:* ${brl(receita)}`,
    `👥 *Novos contatos:* ${L.length} (anúncios ${bySrc('anuncio')} · prospecção ${bySrc('google')} · direto ${bySrc('direto')})`,
    `🖼️ *Prévias enviadas:* ${previas}`,
    top.length ? `\n🏆 *Campanhas da semana:*\n${top.map(([n, c], i) => `${i + 1}. ${n} — ${c.n} contatos, ${c.pagos} vendas, ${brl(c.receita)}`).join('\n')}` : '',
    P.length ? `\n✅ *Quem comprou:*\n${P.slice(0, 8).map((l: any) => `• ${l.name} — ${brl(l.paid_amount)}`).join('\n')}${P.length > 8 ? `\n• e mais ${P.length - 8}` : ''}` : '',
    `\n🤖 *Gasto de IA na semana:* US$ ${ai.toFixed(2).replace('.', ',')} (≈ ${brl(ai * rate)})`,
    '',
    'Detalhes no painel › Visão geral › Funil por campanha.',
  ];
  return lines.filter((x) => x !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Envia na segunda-feira a partir das 8h (uma vez por semana). */
export async function maybeSendWeeklyReport() {
  const s: any = await getSettings(db());
  const r = s.report || {};
  if (r.on === false) return false;
  const now = spNow();
  if (now.dow !== 1 || now.minutes < 8 * 60) return false;
  if (r.last === now.date) return false;
  const { data: nums } = await db().from('whatsapp_numbers').select('*').eq('status', 'conectado').order('created_at');
  const n = (nums || [])[0];
  if (!n) return false;
  const to = String(r.to || n.phone || '').replace(/\D/g, '');
  if (!to) return false;
  // marca antes de enviar: nunca manda duas vezes no mesmo dia
  const { data: row } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const cur: any = row?.data || {};
  await db().from('settings').upsert({ id: 1, data: { ...cur, report: { ...(cur.report || {}), last: now.date } }, updated_at: new Date().toISOString() });
  const text = await buildWeeklyReport();
  await evo.sendText(n.instance_name, to.length <= 11 ? '55' + to : to, text, 0);
  return true;
}
