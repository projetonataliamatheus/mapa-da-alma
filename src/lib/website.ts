import { toWhatsapp } from './phone';

const WEAK_HOSTS = ['linktr.ee', 'linktree', 'wa.me', 'api.whatsapp.com', 'facebook.com', 'fb.com', 'bit.ly', 'linkin.bio', 'beacons.ai', 'taplink', 'bio.link', 'instabio', 'sites.google.com', 'wixsite.com', 'negocio.site', 'business.site'];
const IG_SKIP = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv', 'share', 'direct']);

export function instagramFromUrl(url: string): string | null {
  const m = String(url).match(/instagram\.com\/([A-Za-z0-9_.]{2,30})/i);
  if (!m || IG_SKIP.has(m[1].toLowerCase())) return null;
  return '@' + m[1].replace(/\.$/, '');
}

export type SiteCheck = { status: 'nenhum' | 'fraco' | 'ok'; reasons: string[]; instagram: string | null; whatsapp: string | null };

/** Olha o site do negócio: existe? é só um Linktree/Instagram? tem https? funciona no celular? */
export async function analyzeWebsite(url?: string | null): Promise<SiteCheck> {
  if (!url) return { status: 'nenhum', reasons: ['Sem site cadastrado'], instagram: null, whatsapp: null };
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com')) return { status: 'fraco', reasons: ['O "site" é o Instagram'], instagram: instagramFromUrl(url), whatsapp: null };
  const weak = WEAK_HOSTS.find((h) => lower.includes(h));
  const reasons: string[] = [];
  if (weak) reasons.push('Usa só um link de página pronta (' + weak + ')');

  let html = '';
  let finalUrl = url;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const started = Date.now();
    const r = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' } });
    clearTimeout(t);
    finalUrl = r.url || url;
    if (!r.ok) reasons.push('Site com erro (' + r.status + ')');
    html = (await r.text()).slice(0, 400000);
    if (Date.now() - started > 5000) reasons.push('Site lento');
  } catch {
    reasons.push('Site fora do ar ou muito lento');
  }
  if (finalUrl.startsWith('http://')) reasons.push('Sem cadeado de segurança (https)');
  if (html && !/<meta[^>]+name=["']viewport/i.test(html)) reasons.push('Não se adapta ao celular');

  const instagram = instagramFromUrl(html) || null;
  const wa = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/i);
  return { status: reasons.length ? 'fraco' : 'ok', reasons, instagram, whatsapp: wa ? toWhatsapp(wa[1]) : null };
}
