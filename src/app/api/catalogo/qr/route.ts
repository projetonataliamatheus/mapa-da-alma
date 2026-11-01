import QRCode from 'qrcode';
import { catBase } from '@/lib/catalog-server';

export const dynamic = 'force-dynamic';

/** QR Code (SVG) do catálogo: /api/catalogo/qr?slug=loja&color=111111 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = (u.searchParams.get('slug') || '').toLowerCase();
  if (!/^[a-z0-9]{2,30}$/.test(slug)) return new Response('slug inválido', { status: 400 });
  const color = /^[0-9a-f]{6}$/i.test(u.searchParams.get('color') || '') ? '#' + u.searchParams.get('color') : '#111111';
  const svg = await QRCode.toString(`${await catBase()}/${slug}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: color, light: '#ffffff' } });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } });
}
