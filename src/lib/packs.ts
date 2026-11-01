/** Packs de artes no Canva: tipos e funções comuns (painel, página pública e IA). */
export type CanvaPack = {
  id: string;
  slug: string;
  name: string;
  niche: string | null;
  keywords: string | null;
  description: string | null;
  cover: string | null;
  images: string[];
  items: number | null;
  canva_url: string | null;
  price: number | null;
  active: boolean;
  views: number;
  sort: number;
};

export const PACK_LIMITS = { images: 24 };

export const packSlug = (t: string) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'pack';

const norm = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Pontua quanto um pack combina com o ramo do cliente (0 = nada). */
export function packMatch(p: Pick<CanvaPack, 'name' | 'niche' | 'keywords'>, niche: string) {
  const n = norm(niche);
  if (!n.trim()) return 0;
  const words = n.split(/[^a-z0-9]+/).filter((w) => w.length >= 4).map((w) => w.replace(/(oes|aes|as|es|os|s)$/, '').slice(0, 7));
  const hay = norm(`${p.niche || ''} ${p.keywords || ''} ${p.name || ''}`);
  if (p.niche && (n.includes(norm(p.niche)) || norm(p.niche).includes(n))) return 3;
  const hits = words.filter((w) => w && hay.includes(w)).length;
  return hits ? 1 + hits : 0;
}
