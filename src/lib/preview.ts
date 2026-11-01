/**
 * Prévia de site para lead quente: a IA (Haiku) escreve só os textos e o
 * sistema encaixa no modelo do nicho com os dados da ficha do Google.
 * Fica em /previa/<slug>, sem deploy e sem custo extra.
 */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { structured } from './ai';
import { checkoutBase, newSlug } from './checkout';
import { norm } from './util';

const db = () => admin();

export const PREVIEW_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'Título principal do site, até 8 palavras, com o benefício para o cliente final.' },
    subheadline: { type: 'string', description: 'Subtítulo de 1 frase (até 22 palavras).' },
    cta: { type: 'string', description: 'Texto do botão principal (até 4 palavras), ex.: "Agendar pelo WhatsApp".' },
    about: { type: 'string', description: 'Parágrafo "Sobre" de 2 a 3 frases, caloroso, sem inventar fatos (sem anos de experiência, prêmios ou nomes que não foram dados).' },
    services: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string', description: '1 frase curta.' } }, required: ['title', 'text'] },
      description: 'Serviços típicos do nicho (ou os que o cliente citou).',
    },
    benefits: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'string' }, description: 'Diferenciais curtos (3 a 6 palavras cada).' },
    faq: {
      type: 'array',
      minItems: 3,
      maxItems: 4,
      items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] },
    },
    closing: { type: 'string', description: 'Chamada final de 1 frase antes do botão do rodapé.' },
  },
  required: ['headline', 'subheadline', 'cta', 'about', 'services', 'benefits', 'faq', 'closing'],
};

export type PreviewContent = {
  headline: string;
  subheadline: string;
  cta: string;
  about: string;
  services: { title: string; text: string }[];
  benefits: string[];
  faq: { q: string; a: string }[];
  closing: string;
  business: { name: string; niche?: string; city?: string; address?: string; rating?: number | null; reviews?: number; whatsapp?: string | null; phone?: string | null; instagram?: string | null; maps_url?: string | null; lat?: number | null; lng?: number | null };
  template: { accent: string; style: string; hero_image?: string | null; gallery?: string[]; name?: string };
};

const COLORS: [RegExp, string][] = [
  [/verde.?(agua|água)|turquesa|tiffany/i, '#14b8a6'],
  [/verde.?(escuro|musgo|oliva)/i, '#166534'],
  [/verde/i, '#16a34a'],
  [/azul.?(claro|bebe|bebê|celeste)/i, '#0ea5e9'],
  [/azul.?(escuro|marinho)/i, '#1e3a8a'],
  [/azul/i, '#2563eb'],
  [/lil[aá]s|lavanda/i, '#a78bfa'],
  [/roxo|violeta|p[uú]rpura/i, '#7c3aed'],
  [/rosa.?(claro|beb[eê])/i, '#f9a8d4'],
  [/rosa|pink/i, '#e75480'],
  [/vermelh|vinho|bord[oô]/i, '#b91c1c'],
  [/laranja|coral|p[eê]ssego/i, '#f97316'],
  [/amarel|mostarda/i, '#eab308'],
  [/dourad|ouro/i, '#b8860b'],
  [/marrom|caf[eé]|chocolate|terracota/i, '#8b5a2b'],
  [/bege|nude|areia/i, '#c8a97e'],
  [/cinza|grafite|prata/i, '#4b5563'],
  [/preto|black/i, '#111827'],
];

/**
 * Todas as cores citadas, na ordem em que aparecem ("verde e azul clarinho" → [verde, azul claro]).
 * "clarinho"/"escuro" no fim valem para todas as cores do pedido.
 */
export function colorsFrom(text?: string | null): string[] {
  const t = String(text || '');
  const found: { at: number; c: string; len: number }[] = [];
  for (const m of t.matchAll(/#[0-9a-f]{6}\b/gi)) found.push({ at: m.index || 0, c: m[0], len: 7 });
  const taken: [number, number][] = found.map((f) => [f.at, f.at + f.len]);
  for (const [re, c] of COLORS) {
    const g = new RegExp(re.source, 'gi');
    for (const m of t.matchAll(g)) {
      const a = m.index || 0;
      const b = a + m[0].length;
      if (taken.some(([x, y]) => a < y && b > x)) continue;
      taken.push([a, b]);
      found.push({ at: a, c, len: m[0].length });
    }
  }
  let list = found.sort((a, b) => a.at - b.at).map((f) => f.c);
  list = list.filter((c, i) => list.indexOf(c) === i).slice(0, 3);
  const light = /clar(inh)?[oa]s?|suave|pastel|beb[eê]/i.test(t);
  const dark = /escur[oa]s?|fechad[oa]|forte/i.test(t);
  if (light || dark) list = list.map((c) => shade(c, light ? 0.35 : -0.3));
  return list;
}

/** Clareia (t > 0) ou escurece (t < 0) uma cor #rrggbb. */
export function shade(hex: string, t: number) {
  const p = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const to = t > 0 ? 255 : 0;
  return '#' + p.map((v) => Math.round(v + (to - v) * Math.abs(t)).toString(16).padStart(2, '0')).join('');
}

/** Converte "verde", "azul marinho" ou "#1a2b3c" em uma cor do site. */
export function colorFrom(text?: string | null): string | null {
  const t = String(text || '');
  const hex = t.match(/#[0-9a-f]{6}\b/i);
  if (hex) return hex[0];
  for (const [re, c] of COLORS) if (re.test(t)) return c;
  return null;
}

export function previewUrl(settings: any, slug: string) {
  const own = String(settings?.domains?.previa || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  // subdomínio só de prévias (previa.suaagencia.com.br/cliente): link curto e sem nada do painel
  if (own && own.startsWith('previa.')) return `https://${own}/${slug}`;
  return `${own ? 'https://' + own : checkoutBase(settings)}/previa/${slug}`;
}

function slugify(s: string) {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'site';
}

/** Escolhe o modelo do nicho (ou o primeiro ativo). */
export async function templateFor(niche?: string | null) {
  const { data } = await db().from('site_templates').select('*').eq('active', true).order('created_at');
  const list = data || [];
  const n = norm(niche || '');
  return list.find((t: any) => n && (n.includes(norm(t.niche)) || norm(t.niche).includes(n))) || list.find((t: any) => norm(t.niche) === 'geral') || list[0] || null;
}

/** Lista de exemplos prontos para a IA mostrar na conversa. */
export async function examplesFor(niche?: string | null) {
  const { data } = await db().from('site_templates').select('niche,name,example_url').eq('active', true).not('example_url', 'is', null);
  const n = norm(niche || '');
  const list = (data || []).filter((t: any) => t.example_url);
  const same = list.filter((t: any) => n && (n.includes(norm(t.niche)) || norm(t.niche).includes(n)));
  return (same.length ? same : list).slice(0, 2);
}

export async function generatePreview(leadId: string, by: 'ia' | 'equipe' = 'ia', opts: { template?: string | null } = {}) {
  // Mapa da Alma: a "prévia" é a prévia do mapa (nome completo + data de nascimento que o cliente passou)
  {
    const { gerarMapaDoLead } = await import('./mapa-alma/servico');
    const p = await gerarMapaDoLead(leadId, by);
    await db().from('leads').update({ preview_slug: p.slug }).eq('id', leadId).then(() => {}, () => {});
    return { ...p, template: null as any };
  }
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) throw new Error('Lead não encontrado');
  // modelo premium (pasta Modelos do GitHub): o escolhido pela equipe ou o que mais combina com o nicho
  const s0 = await getSettings(db());
  if ((s0 as any).previews?.premium !== false) {
    try {
      const prem = await import('./premium');
      // escolhe sozinho o modelo premium que mais combina (do mesmo nicho ou o mais parecido) e adapta ao cliente
      const tpl = await prem.templateForLead(lead, opts.template, false);
      if (tpl) return await premiumPreview(lead, tpl, by, s0);
    } catch (e: any) {
      if (opts.template) throw e;
      console.error('prévia premium falhou, usando o modelo simples:', e?.message || e);
    }
  }
  // preferências que o cliente passou na conversa (nome, cor, serviços, ajustes pedidos)
  const mem: any = lead.memory || {};
  const showName = String(mem.nome_no_site || mem.nome_negocio || lead.name).slice(0, 80);
  const color = colorFrom(mem.cor_preferida);
  const wishes = [mem.servicos_principais && `Serviços principais: ${mem.servicos_principais}`, ...(Array.isArray(mem.pedidos_previa) ? mem.pedidos_previa.map((x: string) => `Pedido do cliente: ${x}`) : [])].filter(Boolean).join('\n');
  const [settings, tpl] = await Promise.all([getSettings(db()), templateFor(lead.niche)]);
  const { data: msgs } = await db().from('messages').select('direction,body,transcript').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(16);
  const said = (msgs || [])
    .reverse()
    .filter((m: any) => m.direction === 'in')
    .map((m: any) => `- ${(m.transcript || m.body || '').slice(0, 240)}`)
    .join('\n');

  const r = await structured<Omit<PreviewContent, 'business' | 'template'>>(
    `Você é copywriter de sites para pequenos negócios locais no Brasil. Escreva textos curtos, claros e persuasivos, em português do Brasil, para uma página de apresentação (prévia).
Regras: não invente números, prêmios, anos de experiência, nomes de profissionais ou preços. Use o nicho, a cidade e o que o cliente contou. Tom ${tpl?.style || 'moderno'} e acolhedor.`,
    `Negócio: ${showName}
Nicho: ${lead.niche || mem.negocio || 'não informado'}
Cidade: ${lead.city || ''}
Endereço: ${lead.address || ''}
Avaliação no Google: ${lead.rating ? `${lead.rating} (${lead.reviews} avaliações)` : 'sem avaliação'}
Dores ditas na conversa: ${(lead.pains || []).join('; ') || 'nenhuma'}
O que o cliente falou:
${said || '(nada ainda)'}
${tpl?.notes ? `\nObservações do modelo: ${tpl.notes}` : ''}
${wishes ? `\nSIGA À RISCA o que o cliente pediu:\n${wishes}` : ''}`,
    'textos_da_previa',
    PREVIEW_SCHEMA,
    1400,
    { task: 'previa', leadId },
  );

  const content: PreviewContent = {
    ...r,
    business: {
      name: showName,
      niche: lead.niche,
      city: lead.city,
      address: lead.address,
      rating: lead.rating,
      reviews: lead.reviews,
      whatsapp: lead.whatsapp,
      phone: lead.phone,
      instagram: lead.instagram,
      maps_url: lead.maps_url,
      lat: lead.lat,
      lng: lead.lng,
    },
    template: { accent: color || tpl?.accent || settings.checkout.accent || '#e8562a', style: tpl?.style || 'moderno', hero_image: tpl?.hero_image, gallery: tpl?.gallery || [], name: tpl?.name },
  };

  const slug = await savePreview(lead, showName, content, tpl?.id || null, by);
  await db().from('lead_events').insert({ lead_id: lead.id, type: 'preview', channel: 'ai', text: `Prévia do site criada para ${lead.name}`, meta: { slug } });
  return { slug, url: previewUrl(settings, slug) };
}

/**
 * Grava a prévia do cliente e GARANTE que o link existe antes de alguém mandar:
 *  - já tem link e a prévia existe → atualiza (mesmo link)
 *  - já tem link mas a prévia foi apagada → recria com o mesmo link (o link antigo volta a funcionar)
 *  - não tem link → cria um novo
 * Se no fim o link não abrir, dá erro (e nada é enviado ao cliente).
 */
async function savePreview(lead: any, showName: string, content: any, templateId: string | null, by: 'ia' | 'equipe') {
  let slug = (lead.preview_slug as string | null) || null;
  if (slug) {
    const { data: upd, error } = await db().from('previews').update({ content, template_id: templateId }).eq('slug', slug).select('slug');
    if (error) throw new Error('Não consegui salvar a prévia: ' + error.message);
    if (!upd?.length) {
      const { error: e2 } = await db().from('previews').insert({ slug, lead_id: lead.id, template_id: templateId, content, created_by: by });
      if (e2) slug = null; // o link antigo está em uso por outra prévia: cria um novo abaixo
    }
  }
  if (!slug) {
    slug = `${slugify(showName)}-${newSlug(4).toLowerCase()}`;
    const { error } = await db().from('previews').insert({ slug, lead_id: lead.id, template_id: templateId, content, created_by: by });
    if (error) throw new Error('Não consegui criar a prévia: ' + error.message);
  }
  if (slug !== lead.preview_slug) await db().from('leads').update({ preview_slug: slug, steps: Array.from(new Set([...(lead.steps || []), 'preview'])) }).eq('id', lead.id);
  lead.preview_slug = slug;
  // conferência final: o link precisa abrir
  const { data: ok } = await db().from('previews').select('slug').eq('slug', slug).maybeSingle();
  if (!ok) throw new Error('A prévia não ficou salva (link não abriria). Nada foi enviado ao cliente.');
  return slug;
}

/** Prévia com um modelo premium: só o conteúdo muda; o design do modelo fica igual. */
async function premiumPreview(lead: any, tpl: any, by: 'ia' | 'equipe', settings: any) {
  const prem = await import('./premium');
  let slug = lead.preview_slug as string | null;
  let prev: any = null;
  if (slug) prev = (await db().from('previews').select('content').eq('slug', slug).maybeSingle()).data?.content;
  // ajuste na mesma prévia: parte do que o cliente já viu (mais barato e mantém o que ele aprovou)
  const base = prev?.kind === 'premium' && prev.template === tpl.slug ? prev.site : undefined;
  const p = await prem.personalize(tpl, lead, base);
  const content = { kind: 'premium', template: tpl.slug, template_name: tpl.name, site: p.site, theme: p.theme, colors: p.colors || null, title: p.title };
  slug = await savePreview(lead, String(lead.memory?.nome_no_site || lead.memory?.nome_negocio || lead.name), content, null, by);
  await db().from('leads').update({ premium_template: tpl.slug }).eq('id', lead.id).then(() => {}, () => {});
  await db().from('premium_templates').update({ uses: (tpl.uses || 0) + 1 }).eq('slug', tpl.slug).then(() => {}, () => {});
  await db().from('lead_events').insert({ lead_id: lead.id, type: 'preview', channel: 'ai', text: `Prévia premium (${tpl.name}) ${base ? 'ajustada' : 'criada'} para ${lead.name}${p.photos ? ` com ${p.photos} foto(s) do cliente` : ''}`, meta: { slug, template: tpl.slug } });
  // pedido que não coube no conteúdo: fica só registrado no histórico (não para a conversa nem chama a equipe)
  if (p.missing?.length)
    await db().from('lead_events').insert({ lead_id: lead.id, type: 'preview_note', channel: 'ai', text: `Prévia: não deu para aplicar no conteúdo: ${p.missing.join('; ').slice(0, 250)}` }).then(() => {}, () => {});
  return { slug, url: previewUrl(settings, slug), template: tpl.slug };
}

export async function publicPreview(slug: string, countView = false) {
  const { data } = await db().from('previews').select('*').eq('slug', slug).maybeSingle();
  if (!data) return null;
  if (countView && data.visible !== false) {
    await db().from('previews').update({ views: (data.views || 0) + 1 }).eq('slug', slug);
    if (!data.views && data.lead_id)
      await db().from('lead_events').insert({ lead_id: data.lead_id, type: 'preview_view', channel: 'acc', text: `${(data.content as any)?.business?.name || 'O lead'} abriu a prévia do site` });
  }
  const settings = await getSettings(db());
  return { ...data, content: data.content as PreviewContent, company: settings.company_name, brand: settings.checkout.brand || settings.company_name };
}
