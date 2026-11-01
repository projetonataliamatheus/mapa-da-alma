import { admin as db } from '@/lib/supabase/admin';
import { textosPersonalizados, marcaDoMapa, pdfBrowserless } from '@/lib/mapa-alma/servico';
import { montarAnalise } from '@/lib/mapa-alma/analise';
import { htmlFicha } from '@/lib/mapa-alma/mapa/ficha';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Ficha de 1 página com todos os números (só os números; as explicações ficam no mapa completo). ?pdf=1 baixa em PDF. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return new Response('Mapa não encontrado', { status: 404 });
  const a = montarAnalise(m.nome, m.nascimento, await textosPersonalizados(), new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
  const html = htmlFicha(a, await marcaDoMapa());
  if (new URL(req.url).searchParams.get('pdf') === '1') {
    try {
      const pdf = await pdfBrowserless(html);
      return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent('Ficha - ' + m.nome + '.pdf')}` } });
    } catch (e: any) {
      return new Response('Não foi possível gerar o PDF agora: ' + (e?.message || e), { status: 500 });
    }
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
