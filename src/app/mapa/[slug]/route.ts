import { admin as db } from '@/lib/supabase/admin';
import { paginaDoMapa, chaveEquipe, type MapaRow } from '@/lib/mapa-alma/servico';

export const dynamic = 'force-dynamic';

/** Mapa ao vivo do cliente: prévia (parte bloqueada) até o pagamento; depois, completo com PDF. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return new Response('Mapa não encontrado', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const k = new URL(req.url).searchParams.get('k');
  const equipe = !!k && k === chaveEquipe(m.slug);
  if (!equipe) {
    await db().from('mapas').update({ views: (m.views || 0) + 1 }).eq('id', m.id).then(() => {}, () => {});
    if (!m.views && m.lead_id)
      await db().from('lead_events').insert({ lead_id: m.lead_id, type: 'preview_view', channel: 'acc', text: `${m.nome.split(' ')[0]} abriu ${m.liberado ? 'o mapa completo' : 'a prévia do mapa'}` }).then(() => {}, () => {});
  }
  const html = await paginaDoMapa(m as MapaRow, { equipe });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
