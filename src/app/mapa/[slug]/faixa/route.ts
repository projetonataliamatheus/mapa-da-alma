import { NextResponse } from 'next/server';
import { admin as db } from '@/lib/supabase/admin';
import { estadoPrevia, mapaEmEspanhol } from '@/lib/mapa-alma/servico';

export const dynamic = 'force-dynamic';

/** Estado ao vivo da prévia (estilo da faixa, tempo que falta, o que a IA liberou). A página consulta a cada poucos segundos. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return NextResponse.json({ erro: 1 }, { status: 404 });
  const ep = await estadoPrevia(m as any);
  let c = ep.cfg;
  if (await mapaEmEspanhol(m as any)) {
    // contato em espanhol: o texto da faixa e o aviso de bloqueio também vão traduzidos (a página os recarrega a cada poucos segundos)
    const { traduzirTextos } = await import('@/lib/i18n');
    const t = await traduzirTextos([c.texto || '', c.msg_bloqueio || ''], { limiteMs: 8000 }).catch(() => new Map<string, string>());
    c = { ...c, texto: t.get(c.texto || '') || c.texto, msg_bloqueio: t.get(c.msg_bloqueio || '') || c.msg_bloqueio } as any;
  }
  return NextResponse.json(
    { ativo: c.ativo, liberado: !!m.liberado, expirou: ep.expirou && !!m.previa_inicio, restante_ms: ep.ms, vers: ep.vers, vars: ep.vars, cfg: { texto: c.texto, topo: c.topo, rodape: c.rodape, msg_bloqueio: c.msg_bloqueio } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
