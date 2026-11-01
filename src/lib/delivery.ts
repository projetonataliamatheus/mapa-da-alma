/**
 * Entrega automática depois do pagamento: Pack Canva (link do modelo), Link na bio (publica e manda o link + edição)
 * e Catálogo digital (publica e manda o link + edição). Vale para link avulso, combo e Pix gerado pela IA.
 * Site não entra aqui: ele segue para a Produção com a equipe.
 */
import { admin } from './supabase/admin';
import { connectedNumber, sendAndRecord, logEvent } from './engine';
import { packsFor } from './packs-server';
import { bioBase } from './bio-server';
import { catBase } from './catalog-server';
import { accessMessage, ensureAccess } from './client-auth';
import { appBase } from './util';

const db = () => admin();
type Kind = 'pack' | 'bio' | 'catalogo';

export function kindOfService(s: { slug?: string | null; name?: string | null }): Kind | null {
  const t = `${s.slug || ''} ${s.name || ''}`.toLowerCase();
  if (/pack|canva|artes/.test(t)) return 'pack';
  if (/bio|olinks/.test(t)) return 'bio';
  if (/cat[aá]logo|card[aá]pio|qr/.test(t)) return 'catalogo';
  return null;
}

/** Entrega o que foi pago neste pagamento (uma vez só). */
export async function deliverProducts(leadId: string, paymentId?: string | null) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return;
  let pay: any = null;
  if (paymentId) pay = (await db().from('payments').select('*').eq('id', paymentId).maybeSingle()).data;
  if (!pay) pay = (await db().from('payments').select('*').eq('lead_id', leadId).eq('status', 'pago').order('paid_at', { ascending: false }).limit(1)).data?.[0];
  if (pay?.delivered_at) return;
  // o que foi comprado: itens do combo, o serviço do link/pagamento ou o serviço negociado
  let slugs: string[] = [];
  if (pay?.checkout_id) {
    const { data: link } = await db().from('checkout_links').select('service_slug,combo,title').eq('id', pay.checkout_id).maybeSingle();
    if (Array.isArray(link?.combo) && link.combo.length) slugs = link.combo.map((c: any) => c.slug).filter(Boolean);
    else if (link?.service_slug) slugs = [link.service_slug];
  }
  if (!slugs.length && pay?.service) slugs = [pay.service];
  if (!slugs.length && lead.deal_service) slugs = [lead.deal_service];
  if (!slugs.length) return;
  const { data: svcs } = await db().from('services').select('slug,name').in('slug', slugs);
  const kinds = Array.from(new Set((svcs || []).map(kindOfService).filter(Boolean))) as Kind[];
  if (!kinds.length) return;
  if (pay) await db().from('payments').update({ delivered_at: new Date().toISOString() }).eq('id', pay.id).is('delivered_at', null);

  const number = await connectedNumber(lead.number_id);
  const pending: string[] = [];
  const say = async (t: string) => (number && lead.whatsapp ? sendAndRecord(number, lead, t, 'system', true).catch(() => null) : null);

  for (const k of kinds) {
    if (k === 'pack') {
      const [p] = await packsFor(lead.niche || lead.memory?.negocio || '', 1).catch(() => []);
      if (p?.canva_url) {
        await say(`Prontinho! 🎉 Aqui está o seu ${p.name} 👇\n${p.canva_url}\n\nÉ só abrir no Canva (pode ser a conta grátis), clicar em "Usar modelo" e trocar logo, cores, textos e fotos. Qualquer dúvida, me chama aqui 😊`);
        await logEvent(lead.id, 'delivered', 'ok', `Pack "${p.name}" entregue automaticamente para ${lead.name}`);
      } else pending.push('Pack Canva (não achei um pack ativo com link do Canva para o ramo do cliente)');
    }
    if (k === 'bio') {
      const { data: page } = await db().from('bio_pages').select('id,slug,edit_token,status').eq('lead_id', lead.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (page) {
        if (page.status !== 'publicado') await db().from('bio_pages').update({ status: 'publicado' }).eq('id', page.id);
        const base = await bioBase();
        const acc = await ensureAccess('bio_pages', page.id, { byName: 'Entrega automática' });
        await say(`Seu Link na bio já está no ar! 🎉 Coloque este link na bio do Instagram 👇\n${base}/${page.slug}`);
        await say(accessMessage(appBase(), acc.username, acc.password));
        await logEvent(lead.id, 'delivered', 'ok', `Link na bio de ${lead.name} publicado e entregue automaticamente`);
      } else pending.push('Link na bio (ainda não tinha página criada para este cliente)');
    }
    if (k === 'catalogo') {
      const { data: c } = await db().from('catalogs').select('id,slug,edit_token,status').eq('lead_id', lead.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (c) {
        if (c.status !== 'publicado') await db().from('catalogs').update({ status: 'publicado' }).eq('id', c.id);
        const base = await catBase();
        const acc = await ensureAccess('catalogs', c.id, { byName: 'Entrega automática' });
        await say(`Seu cardápio digital já está no ar! 🎉 Este é o link (dá pra colocar no QR Code e no Instagram) 👇\n${base}/${c.slug}`);
        await say(accessMessage(appBase(), acc.username, acc.password));
        await logEvent(lead.id, 'delivered', 'ok', `Catálogo de ${lead.name} publicado e entregue automaticamente`);
      } else pending.push('Catálogo digital (ainda não tinha catálogo criado para este cliente)');
    }
  }
  if (pending.length) {
    await db().from('leads').update({ needs_human: `Pago: falta entregar ${pending.join('; ')}.` }).eq('id', lead.id);
    await logEvent(lead.id, 'deliver_pending', 'warn', `Entrega manual necessária para ${lead.name}: ${pending.join('; ')}`);
  }
}
