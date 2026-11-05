import { admin as db } from '@/lib/supabase/admin';
import { htmlTiragem } from '@/lib/mapa-alma/taro/tiragem';
import { marcaDoMapa, emEspanholSeCabe } from '@/lib/mapa-alma/servico';

export const dynamic = 'force-dynamic';

/** Página pública da tiragem de tarô (link enviado no WhatsApp). */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { data: t } = await db().from('tiragens').select('*').eq('slug', params.slug).maybeSingle();
  if (!t || !t.liberado) return new Response('Tiragem não encontrada', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  await db().from('tiragens').update({ views: (t.views || 0) + 1 }).eq('id', t.id).then(() => {}, () => {});
  const lang = new URL(req.url).searchParams.get('lang');
  const html = await emEspanholSeCabe({ lead_id: t.lead_id }, htmlTiragem(t as any, await marcaDoMapa()), 40_000, lang);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
