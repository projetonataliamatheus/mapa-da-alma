import { admin as db } from '@/lib/supabase/admin';
import { textosPersonalizados, marcaDoMapa, pdfBrowserless, chaveEquipe, acessoLiberado, chavePiramides, emEspanholSeCabe } from '@/lib/mapa-alma/servico';
import { montarAnalise } from '@/lib/mapa-alma/analise';
import { htmlPiramides, pirValidas } from '@/lib/mapa-alma/mapa/piramides';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Relatório só das pirâmides do nome + resumo geral do mapa. ?pdf=1 baixa em PDF. Equipe (?k) sempre; cliente só com o mapa liberado e a senha. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return new Response('Mapa não encontrado', { status: 404 });
  const u = new URL(req.url);
  const equipe = u.searchParams.get('k') === chaveEquipe(m.slug);
  const a = montarAnalise(m.nome, m.nascimento, await textosPersonalizados(), new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
  // só algumas pirâmides (link escolhido na conversa): abre sem senha, só com a assinatura certa, sem PDF
  const so = pirValidas(u.searchParams.get('so'));
  if (so.length && so.length < 4 && u.searchParams.get('t') === chavePiramides(m.slug, so)) {
    const marca = await marcaDoMapa();
    const wa = marca.whatsapp ? String(marca.whatsapp).replace(/\D/g, '') : '';
    const cta = !m.liberado && wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Quero o meu Mapa da Alma completo ✨')}` : undefined;
    return new Response(await emEspanholSeCabe(m as any, htmlPiramides(a, marca, { so, ctaUrl: cta }), 40_000, u.searchParams.get('lang')), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  if ((!m.liberado && !equipe) || !acessoLiberado(m, req, equipe)) return Response.redirect(new URL(`/mapa/${m.slug}`, u.origin), 302);
  const pdf = u.searchParams.get('pdf') === '1';
  const qs = new URLSearchParams(u.search); qs.set('pdf', '1');
  const html = await emEspanholSeCabe(m as any, htmlPiramides(a, await marcaDoMapa(), pdf ? {} : { pdfUrl: `${u.pathname}?${qs}` }), pdf ? 0 : 40_000, u.searchParams.get('lang'), !pdf);
  if (pdf) {
    try {
      const arq = await pdfBrowserless(html);
      return new Response(new Uint8Array(arq), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent('Pirâmides - ' + m.nome + '.pdf')}` } });
    } catch (e: any) {
      return new Response('Não foi possível gerar o PDF agora: ' + (e?.message || e), { status: 500 });
    }
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
