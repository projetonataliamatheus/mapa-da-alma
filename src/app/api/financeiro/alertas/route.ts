import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { todaySP } from '@/lib/finance';

export const dynamic = 'force-dynamic';

/** Contas vencidas e as que vencem nos próximos 3 dias (para o aviso na tela). */
export const GET = withUser(async () => {
  const lim = new Date(Date.parse(todaySP() + 'T00:00:00Z') + 3 * 86400_000).toISOString().slice(0, 10);
  const { data } = await admin().from('fin_entries').select('id,kind,description,amount,due_date,supplier').eq('status', 'pendente').eq('archived', false).lte('due_date', lim).order('due_date').limit(30);
  return NextResponse.json({ items: data || [], today: todaySP() }, { headers: { 'Cache-Control': 'no-store' } });
}, { perm: 'financeiro' });
