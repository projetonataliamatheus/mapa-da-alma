import { admin as db } from '@/lib/supabase/admin';
import { pdfDoMapa, nomeArquivo, chaveEquipe, type MapaRow } from '@/lib/mapa-alma/servico';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** PDF do mapa: só depois de liberado (pagamento) ou para a equipe pelo painel. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return new Response('Mapa não encontrado', { status: 404 });
  const u = new URL(req.url);
  const equipe = u.searchParams.get('k') === chaveEquipe(m.slug);
  if (!m.liberado && !equipe) return Response.redirect(new URL(`/mapa/${m.slug}`, u.origin), 302);
  try {
    const pdf = await pdfDoMapa(m as MapaRow, equipe && u.searchParams.get('refazer') === '1');
    return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nomeArquivo(m as MapaRow))}` } });
  } catch (e: any) {
    return new Response('Não foi possível gerar o PDF agora: ' + (e?.message || e), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
