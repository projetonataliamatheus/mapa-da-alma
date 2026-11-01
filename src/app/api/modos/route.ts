import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { configModo, MODOS, calcVagas } from '@/lib/mapa-alma/modos';
import { spNow } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Modo de venda ativo + comparativo (conversas atendidas e vendas em cada modo). */
export const GET = withUser(async () => {
  const settings = await getSettings(db());
  const cfg = configModo(settings);
  const out: any = {};
  for (const m of Object.keys(MODOS)) {
    const { count: conversas } = await db().from('leads').select('id', { count: 'exact', head: true }).eq('modo_venda', m);
    const { data: pagos } = await db().from('payments').select('amount').eq('status', 'pago').eq('modo_venda', m);
    const vendas = (pagos || []).length;
    const valor = (pagos || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    out[m] = { conversas: conversas || 0, vendas, valor, conversao: conversas ? Math.round((vendas / conversas) * 1000) / 10 : 0 };
  }
  // fila de hoje (Modo Grazi): conversas distintas que a IA atendeu desde a meia-noite de Brasília
  const desde = new Date(Date.now() - spNow().minutes * 60_000);
  desde.setSeconds(0, 0);
  const { data: hoje } = await db().from('messages').select('lead_id').eq('direction', 'out').eq('author', 'ai').gte('created_at', desde.toISOString()).limit(5000);
  const vagas = calcVagas(settings, new Set((hoje || []).map((r: any) => r.lead_id)).size);
  return NextResponse.json({ config: cfg, modos: MODOS, resultados: out, vagas });
}, { perm: 'abordagens' });
