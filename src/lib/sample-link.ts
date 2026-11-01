/** Link provisório de um modelo (sem dados de cliente) que expira sozinho. Assinado: ninguém consegue esticar o prazo. */
import { createHmac, timingSafeEqual } from 'crypto';

const key = () => createHmac('sha256', 'radar-amostra-v1').update(process.env.SUPABASE_SERVICE_ROLE_KEY || 'sem-chave').digest();
const sig = (p: string) => createHmac('sha256', key()).update(p).digest('base64url').slice(0, 22);

export function makeSampleToken(slug: string, minutes: number) {
  const exp = Math.floor(Date.now() / 1000) + Math.max(1, Math.min(24 * 60, minutes)) * 60;
  const p = `${slug}~${exp.toString(36)}`;
  return { token: `${p}~${sig(p)}`, expires: new Date(exp * 1000) };
}

export function readSampleToken(token: string): { slug: string; expires: Date; expired: boolean } | null {
  const parts = decodeURIComponent(String(token || '')).split('~');
  if (parts.length !== 3) return null;
  const [slug, exp36, s] = parts;
  const want = sig(`${slug}~${exp36}`);
  if (s.length !== want.length || !timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null;
  const expires = new Date(parseInt(exp36, 36) * 1000);
  return { slug, expires, expired: expires.getTime() < Date.now() };
}
