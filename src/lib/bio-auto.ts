/**
 * Link na bio automático: enquanto a prévia do site é feita, o sistema monta também o Link na bio do cliente
 * (mesmas cores, WhatsApp, Instagram, localização, horários e o link da prévia do site) e, alguns minutos
 * depois da prévia, manda o link com a oferta. Tudo por modelo: não gasta IA.
 */
import { inCommercial, nextCommercialStart } from './hours';
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { evo } from './evolution';
import { fromLead, mergeData, newId } from './bio';
import { bioBase, freeSlug } from './bio-server';
import { colorsFrom } from './preview';
import { connectedNumber, sendBubbles, logEvent } from './engine';

const db = () => admin();
const brl = (v: any) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Foto do perfil do WhatsApp do cliente, guardada no nosso armazenamento (o link do WhatsApp expira). */
async function profilePhoto(instance: string, phone: string, pageId: string) {
  try {
    const r: any = await evo.profilePic(instance, phone);
    const url = r?.profilePictureUrl || r?.picture || r?.url;
    if (!url) return '';
    const img = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!img.ok) return '';
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length > 1.5 * 1024 * 1024) return '';
    const path = `bio/${pageId}/perfil${Date.now().toString(36)}.jpg`;
    const up = await db().storage.from('publico').upload(path, buf, { contentType: img.headers.get('content-type') || 'image/jpeg', cacheControl: '31536000' });
    return up.error ? '' : db().storage.from('publico').getPublicUrl(path).data.publicUrl;
  } catch {
    return '';
  }
}

/** Cria (ou atualiza) o Link na bio do lead com o que se sabe da conversa. Devolve o endereço. */
export async function buildBioForLead(lead: any, number: any, previewUrl?: string | null) {
  const mem = lead.memory || {};
  const base = fromLead({ ...lead, instagram: mem.instagram || lead.instagram, address: mem.endereco || lead.address });
  base.name = String(mem.nome_no_site || mem.nome_negocio || lead.name || base.name).slice(0, 60);
  if (mem.servicos_principais || mem.negocio) base.tagline = String(mem.servicos_principais || mem.negocio).slice(0, 120);
  const cols = colorsFrom(mem.cor_preferida);
  if (cols[0]) base.color = cols[0];
  if (cols[1]) base.color2 = cols[1];
  if (mem.horarios) base.hours = String(mem.horarios);
  if (previewUrl && !base.buttons.some((b) => b.type === 'site')) base.buttons.splice(1, 0, { id: newId(), type: 'site', label: 'Conheça nosso site', value: previewUrl, on: true });
  const { data: cur } = await db().from('bio_pages').select('*').eq('lead_id', lead.id).order('created_at').limit(1).maybeSingle();
  let id = cur?.id;
  let slug = cur?.slug;
  if (cur) {
    // já existia (talvez editado pela equipe): só completa o que estiver vazio
    const d = mergeData(cur.data);
    const fill: any = { ...d };
    for (const k of ['tagline', 'address', 'hours'] as const) if (!d[k] && (base as any)[k]) fill[k] = (base as any)[k];
    if (previewUrl && !d.buttons.some((b) => b.type === 'site')) fill.buttons = [...d.buttons, { id: newId(), type: 'site', label: 'Conheça nosso site', value: previewUrl, on: true }];
    await db().from('bio_pages').update({ data: fill, updated_at: new Date().toISOString() }).eq('id', cur.id);
  } else {
    slug = await freeSlug(base.name);
    const { data: row, error } = await db().from('bio_pages').insert({ slug, lead_id: lead.id, data: base, status: 'previa', created_by_name: 'IA' }).select('id,slug').single();
    if (error) throw new Error(error.message);
    id = row.id;
    slug = row.slug;
    // foto do perfil do WhatsApp (se o cliente tiver e for pública)
    if (number && lead.whatsapp) {
      const pic = await profilePhoto(number.instance_name, String(lead.whatsapp).replace(/\D/g, ''), id!);
      if (pic) await db().from('bio_pages').update({ data: { ...base, avatar: pic } }).eq('id', id);
    }
  }
  return `${await bioBase()}/${slug}`;
}

/** Bloco de preços do serviço (formato combinado: nome em negrito, 🟢, valor e explicação). */
export function priceBlock(svc: any) {
  const monthly = (svc?.plan_monthly ?? svc?.monthly_price != null) && svc?.monthly_price;
  const annual = svc?.plan_annual && svc?.annual_price;
  const once = svc?.plan_once !== false && svc?.max_price;
  if (!monthly && !annual && !once) return '';
  const out = [`*${svc.name}*`];
  if (monthly) out.push('', '*Valor Mensal:* 🟢', brl(svc.monthly_price), '(cobrado todo mês)');
  if (annual) out.push('', '*Valor Anual:* 🟢', brl(svc.annual_price), '(pagamento único por ano, sem mensalidades)');
  if (once) out.push('', '*Vitalício:* 🟢', brl(svc.max_price), '(pagamento único, é seu para sempre)');
  return out.join('\n');
}

/** Manda os Links na bio agendados que já deram a hora. */
export async function processBioJobs(limit = 2) {
  const now = new Date().toISOString();
  const { data: due, error } = await db().from('leads').select('*').lte('bio_due_at', now).order('bio_due_at').limit(limit);
  if (error) return;
  for (const lead of due || []) {
    const { data: claimed } = await db().from('leads').update({ bio_due_at: null }).eq('id', lead.id).eq('bio_due_at', lead.bio_due_at).select('id');
    if (!claimed?.length) continue;
    try {
      // a equipe assumiu, cliente saiu ou já comprou: não oferece
      if (lead.opted_out || lead.ai_locked || !lead.ai_enabled || ['sem', 'pago'].includes(lead.stage) || lead.memory?.bio_ofertado) continue;
      const settings: any = await getSettings(db());
      const cfg = settings.bio_upsell || {};
      if (cfg.on === false) continue;
      // só oferece o Link na bio depois que o cliente RESPONDEU à prévia (nada de oferta em cima de oferta sem resposta)
      const pvAt = Number(lead.memory?.previa_enviada_em || 0) || (lead.last_outbound_at ? new Date(lead.last_outbound_at).getTime() - 60_000 : 0);
      const replied = lead.last_inbound_at && new Date(lead.last_inbound_at).getTime() > pvAt;
      if (!replied) {
        // espera a resposta por até 2 dias; depois desiste
        if (Date.now() - pvAt < 48 * 3600_000) await db().from('leads').update({ bio_due_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq('id', lead.id);
        continue;
      }
      // fora do horário comercial: deixa para o próximo horário, num minuto aleatório
      if (!inCommercial(settings)) {
        await db().from('leads').update({ bio_due_at: new Date(nextCommercialStart(settings).getTime() + Math.round(5 + Math.random() * 50) * 60_000).toISOString() }).eq('id', lead.id);
        continue;
      }
      const number = await connectedNumber(lead.number_id);
      if (!number) {
        await db().from('leads').update({ bio_due_at: new Date(Date.now() + 60_000).toISOString() }).eq('id', lead.id);
        continue;
      }
      const { data: pv } = await db().from('previews').select('url,slug').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const url = await buildBioForLead(lead, number, pv?.url || null);
      const { data: svc } = await db().from('services').select('*').eq('slug', 'link-na-bio').maybeSingle();
      const block = svc?.active ? priceBlock(svc) : '';
      const parts = [String(cfg.message || '{url}').replace('{url}', url)];
      if (block) parts.push(block, String(cfg.question || 'Qual dessas opções faz mais sentido pra você hoje?'));
      else parts.push('Quer que eu deixe ele pronto junto com o seu site?');
      await sendBubbles(number, lead, parts, 'system', settings.typing, { bio: url });
      const mem = { ...(lead.memory || {}), bio_ofertado: true, ja_ofereceu: Array.from(new Set([...(lead.memory?.ja_ofereceu || []), 'Link na bio (prévia enviada)'])) };
      await db().from('leads').update({ memory: mem, last_outbound_at: new Date().toISOString() }).eq('id', lead.id);
      await logEvent(lead.id, 'bio_offer', 'acc', `Prévia do Link na bio enviada para ${lead.name} com a oferta`);
    } catch (e: any) {
      await logEvent(lead.id, 'bio_error', 'warn', `Não consegui mandar o Link na bio de ${lead.name}: ${String(e?.message || e).slice(0, 200)}`).catch(() => {});
    }
  }
}
