import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { configModo, MODOS } from '@/lib/mapa-alma/modos';

export const dynamic = 'force-dynamic';

/** Modo de venda ativo + comparativo (conversas atendidas e vendas em cada modo). */
export const GET = withUser(async () => {
  const cfg = configModo(await getSettings(db()));
  const out: any = {};
  for (const m of Object.keys(MODOS)) {
    const { count: conversas } = await db().from('leads').select('id', { count: 'exact', head: true }).eq('modo_venda', m);
    const { data: pagos } = await db().from('payments').select('amount').eq('status', 'pago').eq('modo_venda', m);
    const vendas = (pagos || []).length;
    const valor = (pagos || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    out[m] = { conversas: conversas || 0, vendas, valor, conversao: conversas ? Math.round((vendas / conversas) * 1000) / 10 : 0 };
  }
  return NextResponse.json({ config: cfg, modos: MODOS, resultados: out });
}, { perm: 'abordagens' });
