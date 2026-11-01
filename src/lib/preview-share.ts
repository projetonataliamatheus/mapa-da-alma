/**
 * Compartilhamento da prévia (WhatsApp, Instagram…): título, descrição e imagem de propaganda.
 * Título: "Jorge Ramos | Dentista na região de Campinas" (nome que o cliente disse; senão, o nome do negócio).
 */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { cityOf } from './premium';

const cap = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());
const clean = (s: any) => String(s ?? '').replace(/\s+/g, ' ').trim();

export async function previewShare(slug: string) {
  const db = admin();
  const { data: p } = await db.from('previews').select('slug,lead_id,content').eq('slug', slug).maybeSingle();
  if (!p) return null;
  const c: any = p.content || {};
  const { data: lead } = p.lead_id ? await db.from('leads').select('name,niche,city,memory').eq('id', p.lead_id).maybeSingle() : { data: null as any };
  const m: any = lead?.memory || {};
  const s: any = await getSettings(db);
  // nome: o que o cliente disse > nome do negócio
  const person = clean(m.nome_cliente);
  const business = clean(m.nome_negocio || c.business?.name || c.site?.brand?.name || lead?.name);
  const name = person || business || 'Seu negócio';
  const niche = clean(m.negocio || lead?.niche || c.business?.niche);
  const city = clean(m.cidade || lead?.city || c.business?.city || (c.site ? cityOf(c.site) : '') || '').replace(/\s*[-/]\s*[A-Z]{2}$/, '');
  const line = niche ? `${cap(niche)}${city ? ` na região de ${city}` : ''}` : city ? `Site profissional em ${city}` : 'Site profissional';
  const title = `${name} | ${line}`;
  const agency = clean(s.company_name) || 'Agência';
  const desc = `Prévia exclusiva do novo site${person && business && business !== person ? ` da ${business}` : ''}, feita pela ${agency}. Toque e veja como ficou ✨`;
  const color = String(c.theme?.['--primary'] || c.colors || '').match(/#[0-9a-f]{6}/i)?.[0] || '#e8562a';
  return { title, desc, name, line, agency, color, business: business && business !== name ? business : '' };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Tags de compartilhamento para colocar no <head> do site da prévia. */
export function shareTags(info: { title: string; desc: string }, url: string, image: string) {
  return [
    `<title>${esc(info.title)}</title>`,
    `<meta name="description" content="${esc(info.desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(info.title)}">`,
    `<meta property="og:description" content="${esc(info.desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(info.title)}">`,
    `<meta name="twitter:description" content="${esc(info.desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="robots" content="noindex">`,
  ].join('');
}
