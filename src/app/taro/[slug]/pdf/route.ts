import { admin as db } from '@/lib/supabase/admin';
import { pdfDaTiragem } from '@/lib/mapa-alma/taro/servico';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** PDF da tiragem de tarô (gerado uma vez e reaproveitado). */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { data: t } = await db().from('tiragens').select('*').eq('slug', params.slug).maybeSingle();
  if (!t || !t.liberado) return new Response('Tiragem não encontrada', { status: 404 });
  try {
    const pdf = await pdfDaTiragem(t);
    return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent('Tarô - ' + (t.nome || 'leitura') + '.pdf')}` } });
  } catch (e: any) {
    return new Response('Não foi possível gerar o PDF agora: ' + (e?.message || e), { status: 500 });
  }
}
