import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { CATEGORIAS } from '@/lib/mapa-alma/textos/biblioteca/index.ts';
import { SIGNOS_INFO } from '@/lib/mapa-alma/textos/biblioteca/signos.ts';
import { CORES } from '@/lib/mapa-alma/textos/essencias.ts';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () => {
  const { data } = await db().from('mapa_textos').select('*');
  const categorias = [
    ...CATEGORIAS.map((c) => ({ id: c.id, nome: c.nome, textos: c.textos })),
    { id: 'cores', nome: 'Cores favoráveis', textos: Object.fromEntries(Object.entries(CORES).map(([k, v]) => [k, String(v)])) },
    { id: 'signo', nome: 'Signos (personalidade)', textos: Object.fromEntries(Object.entries(SIGNOS_INFO).map(([k, v]) => [k, v.personalidade])) },
  ];
  return NextResponse.json({ textos: data || [], categorias });
});

/** Salva (ou apaga, se vazio) o texto personalizado de uma categoria + número. */
export const PUT = withUser(async (req) => {
  const { categoria, numero, conteudo } = await req.json();
  if (!categoria || !numero) return NextResponse.json({ error: 'Faltou a categoria ou o número' }, { status: 400 });
  const t = String(conteudo || '').trim();
  if (t) await db().from('mapa_textos').upsert({ categoria, numero: String(numero), conteudo: t, updated_at: new Date().toISOString() });
  else await db().from('mapa_textos').delete().eq('categoria', categoria).eq('numero', String(numero));
  return NextResponse.json({ ok: true });
});
