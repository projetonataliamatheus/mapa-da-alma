import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { cartaPorId, TIRAGENS } from '@/lib/mapa-alma/taro/cartas';
import { linkTiragem } from '@/lib/mapa-alma/taro/servico';

export const dynamic = 'force-dynamic';

/** Tiragens de tarô feitas (painel › Gerador de mapas › Tarô). */
export const GET = withUser(async () => {
  const { data, error } = await db().from('tiragens').select('*, leads(id,name,whatsapp)').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ tiragens: [], aviso: /tiragens/.test(error.message) ? 'Rode o SQL 048 no Supabase para ativar o tarô.' : error.message });
  return NextResponse.json({
    tiragens: (data || []).map((t: any) => ({
      ...t, url: linkTiragem(t), tipo_nome: TIRAGENS[t.tipo]?.nome || t.tipo,
      cartas_nomes: (t.cartas || []).map((x: any) => cartaPorId(x.id)?.nome || x.id),
    })),
  });
}, { perm: 'mapas' });
