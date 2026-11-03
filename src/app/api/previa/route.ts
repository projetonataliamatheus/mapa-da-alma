import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { previaCfg, PREVIA_PADRAO } from '@/lib/mapa-alma/previa';

export const dynamic = 'force-dynamic';

/** Configuração da prévia com bloqueios + um mapa de exemplo para a visualização ao vivo (salvar: PATCH /api/settings, só Master). */
export const GET = withUser(async () => {
  const { data } = await db().from('mapas').select('slug,nome').eq('tipo', 'pessoal').order('created_at', { ascending: false }).limit(1);
  return NextResponse.json({ cfg: await previaCfg(), padrao: PREVIA_PADRAO, exemplo: (data || [])[0] || null });
}, { perm: 'mapas' });
