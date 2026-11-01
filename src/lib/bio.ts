/** Link na bio: tipos, temas, montagem dos links dos botões e preenchimento a partir do lead. Usado no navegador e no servidor. */
import { nicheKey } from './bio-icons';

export type BioButton = { id: string; type: string; label: string; value: string; highlight?: boolean; on?: boolean };
export type BioData = {
  name: string;
  subtitle: string;
  tagline: string;
  about: string;
  logo: string;
  avatar: string;
  cover: string;
  theme: string;
  color: string;
  color2: string;
  font: string;
  niche: string;
  floating: boolean;
  buttons: BioButton[];
  socials: { type: string; value: string }[];
  address: string;
  hours: string;
  gallery: string[];
  footer: boolean;
};

/** [chave, nome, descrição] */
export const THEMES: [string, string, string][] = [
  ['aurora', 'Aurora', 'Luzes coloridas no fundo e botões de vidro'],
  ['clean', 'Clean', 'Branco, limpo e direto'],
  ['noite', 'Noite', 'Escuro e elegante, com brilho na cor'],
  ['capa', 'Capa', 'Foto de capa no topo e cartões'],
  ['pastel', 'Pastel', 'Tons suaves e botões arredondados'],
  ['bold', 'Bold', 'Fundo na cor da marca e letras grandes'],
  ['luxo', 'Luxo', 'Foto do espaço no topo, retrato com moldura, botões em grade e barra de ícones'],
  ['elegante', 'Elegante', 'Foto grande que se funde na cor, monograma no fundo e botões com ícone'],
];

/** Cores e fonte sugeridas ao escolher o tema (o cliente pode mudar depois). */
export const THEME_PRESET: Record<string, Partial<BioData>> = {
  luxo: { color: '#6b3424', color2: '#e9d3b0', font: 'Playfair Display' },
  elegante: { color: '#5a0f1d', color2: '#d9b779', font: 'Playfair Display' },
};

export const FONTS: [string, string][] = [
  ['Geist', 'Moderna'],
  ['Poppins', 'Redonda'],
  ['Montserrat', 'Forte'],
  ['Playfair Display', 'Elegante'],
  ['DM Sans', 'Leve'],
  ['Lora', 'Clássica'],
];

export const PALETTE = ['#e8562a', '#e11d48', '#db2777', '#9333ea', '#4f46e5', '#2563eb', '#0891b2', '#0d9488', '#16a34a', '#65a30d', '#ca8a04', '#b45309', '#78716c', '#111827'];

/** Limites: mantêm as páginas leves e o armazenamento barato. */
export const LIMITS = { buttons: 12, gallery: 6, tagline: 120, imageKB: 350 };

export const newId = () => Math.random().toString(36).slice(2, 9);

export function defaultData(name = 'Seu negócio'): BioData {
  return {
    name,
    subtitle: '',
    tagline: '',
    about: '',
    logo: '',
    avatar: '',
    cover: '',
    theme: 'aurora',
    color: '#e8562a',
    color2: '#7a5af8',
    font: 'Geist',
    niche: 'geral',
    floating: true,
    buttons: [],
    socials: [],
    address: '',
    hours: '',
    gallery: [],
    footer: true,
  };
}

export function mergeData(d: any): BioData {
  const base = defaultData();
  const o = { ...base, ...(d || {}) } as BioData;
  o.buttons = Array.isArray(o.buttons) ? o.buttons.slice(0, LIMITS.buttons).map((b) => ({ id: b.id || newId(), type: b.type || 'link', label: b.label || '', value: b.value || '', highlight: !!b.highlight, on: b.on !== false })) : [];
  o.socials = Array.isArray(o.socials) ? o.socials.filter((s) => s?.type && s?.value).slice(0, 8) : [];
  o.gallery = Array.isArray(o.gallery) ? o.gallery.filter(Boolean).slice(0, LIMITS.gallery) : [];
  return o;
}

export function slugify(t: string) {
  return (
    String(t || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 30) || 'meulink'
  );
}

const digits = (v: string) => String(v || '').replace(/\D/g, '');
const ensureHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : 'https://' + u.replace(/^\/+/, ''));
const handle = (v: string) => String(v || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?[^/]+\//i, '').replace(/\/.*$/, '');
const wa = (v: string) => {
  let d = digits(v);
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d;
};

/** Transforma o que o cliente digitou (número, @usuario, endereço) no link certo de cada botão. */
export function buttonHref(type: string, value: string, name = ''): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) && !['whatsapp', 'telefone', 'email', 'pix'].includes(type)) return v;
  switch (type) {
    case 'whatsapp':
      return /wa\.me|whatsapp\.com/.test(v) ? ensureHttp(v) : `https://wa.me/${wa(v)}?text=${encodeURIComponent(`Olá! Vim pelo link da bio${name ? ' da ' + name : ''}.`)}`;
    case 'instagram':
      return `https://instagram.com/${handle(v)}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${handle(v)}`;
    case 'telefone':
      return `tel:+${wa(v)}`;
    case 'email':
      return `mailto:${v}`;
    case 'maps':
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
    case 'pix':
      return null; // copia a chave ao tocar
    case 'agenda':
      return digits(v).length >= 10 && !/[a-z]/i.test(v) ? `https://wa.me/${wa(v)}?text=${encodeURIComponent('Olá! Quero agendar um horário.')}` : ensureHttp(v);
    default:
      return ensureHttp(v);
  }
}

/** Primeiro rascunho a partir do lead (dados do Google e da conversa). */
export function fromLead(lead: any): BioData {
  const d = defaultData(lead?.name || 'Seu negócio');
  d.niche = nicheKey(lead?.niche);
  d.tagline = lead?.niche ? `${String(lead.niche).replace(/^./, (c: string) => c.toUpperCase())}${lead?.city ? ' em ' + lead.city : ''}` : '';
  const btn = (type: string, label: string, value: string, highlight = false): BioButton => ({ id: newId(), type, label, value, highlight, on: true });
  const phone = lead?.whatsapp || lead?.phone;
  if (phone) d.buttons.push(btn('whatsapp', 'Fale comigo no WhatsApp', phone, true));
  if (['odonto', 'saude', 'beleza', 'barbearia', 'fitness', 'pet'].includes(d.niche) && phone) d.buttons.push(btn('agenda', 'Agendar horário', phone));
  if (['comida', 'padaria'].includes(d.niche)) d.buttons.push(btn('catalogo', 'Ver cardápio', ''));
  if (lead?.website) d.buttons.push(btn('site', 'Visite nosso site', lead.website));
  if (lead?.address) {
    d.buttons.push(btn('maps', 'Como chegar', lead.address));
    d.address = lead.address;
  }
  if (lead?.instagram) d.socials.push({ type: 'instagram', value: lead.instagram });
  if (phone) d.socials.push({ type: 'whatsapp', value: phone });
  return d;
}

/** Checklist que a equipe (ou a IA) manda para o cliente na primeira edição. */
export const ASK_TEXT = `Para montar o seu link na bio, me envie por aqui:

1. Sua logo ou foto de perfil (quadrada, boa resolução)
2. Uma foto de capa (opcional: fachada, ambiente ou trabalho)
3. O nome como quer que apareça
4. Uma frase curta sobre o que você faz (até 120 letras)
5. WhatsApp para contato
6. Seu @ do Instagram (e TikTok, se tiver)
7. Outros links: site, agenda, cardápio, delivery, avaliação no Google
8. Endereço e horário de funcionamento
9. Até 6 fotos para a galeria (opcional)
10. Cor preferida da marca (se tiver)`;
