import { NextResponse } from 'next/server';
import { admin as db } from '@/lib/supabase/admin';
import { estadoPrevia } from '@/lib/mapa-alma/servico';

export const dynamic = 'force-dynamic';

/** Estado ao vivo da prévia (estilo da faixa, tempo que falta, o que a IA liberou). A página consulta a cada poucos segundos. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return NextResponse.json({ erro: 1 }, { status: 404 });
  const ep = await estadoPrevia(m as any);
  const c = ep.cfg;
  return NextResponse.json(
    { ativo: c.ativo, liberado: !!m.liberado, expirou: ep.expirou && !!m.previa_inicio, restante_ms: ep.ms, vers: ep.vers, vars: ep.vars, cfg: { texto: c.texto, topo: c.topo, rodape: c.rodape, msg_bloqueio: c.msg_bloqueio } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
