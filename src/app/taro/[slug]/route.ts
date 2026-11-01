import { admin as db } from '@/lib/supabase/admin';
import { htmlTiragem } from '@/lib/mapa-alma/taro/tiragem';
import { marcaDoMapa } from '@/lib/mapa-alma/servico';

export const dynamic = 'force-dynamic';

/** Página pública da tiragem de tarô (link enviado no WhatsApp). */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { data: t } = await db().from('tiragens').select('*').eq('slug', params.slug).maybeSingle();
  if (!t || !t.liberado) return new Response('Tiragem não encontrada', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  await db().from('tiragens').update({ views: (t.views || 0) + 1 }).eq('id', t.id).then(() => {}, () => {});
  return new Response(htmlTiragem(t as any, await marcaDoMapa()), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
