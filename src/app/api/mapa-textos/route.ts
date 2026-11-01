import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () => {
  const { data } = await db().from('mapa_textos').select('*');
  return NextResponse.json({ textos: data || [] });
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
