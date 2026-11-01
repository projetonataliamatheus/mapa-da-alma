import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { can } from '@/lib/perms';
import { todaySP } from '@/lib/finance';

export const dynamic = 'force-dynamic';

/** Números rápidos para a Visão geral (cada bloco só para quem tem permissão). */
export const GET = withUser(async (_req, _ctx, user) => {
  const db = admin();
  const today = todaySP();
  const month = today.slice(0, 7);
  const start = new Date(`${month}-01T00:00:00-03:00`).toISOString();
  const lim = new Date(Date.parse(today + 'T00:00:00Z') + 3 * 86400_000).toISOString().slice(0, 10);
  const out: any = {};
  if (can(user.member, 'financeiro')) {
    const [pays, manual, open, due] = await Promise.all([
      db.from('payments').select('amount').eq('status', 'pago').gte('paid_at', start),
      db.from('fin_entries').select('amount,payment_id').eq('kind', 'receita').eq('status', 'pago').gte('paid_at', start),
      db.from('fin_entries').select('amount').eq('kind', 'receita').eq('status', 'pendente').eq('archived', false),
      db.from('fin_entries').select('amount,due_date').eq('kind', 'despesa').eq('status', 'pendente').eq('archived', false).lte('due_date', lim),
    ]);
    const sum = (l: any[] | null) => (l || []).reduce((t, x) => t + Number(x.amount || 0), 0);
    out.fin = {
      received: sum(pays.data) + sum((manual.data || []).filter((x: any) => !x.payment_id)),
      receivable: sum(open.data),
      bills: (due.data || []).length,
      bills_sum: sum(due.data),
      bills_late: (due.data || []).filter((x: any) => x.due_date < today).length,
    };
  }
  if (can(user.member, 'producao')) {
    const { data } = await db.from('leads').select('id,name,production_due').not('production_status', 'is', null).neq('production_status', 'entregue').not('production_due', 'is', null).lte('production_due', lim).order('production_due').limit(20);
    out.deliveries = (data || []).map((l: any) => ({ id: l.id, name: l.name, due: l.production_due, late: l.production_due < today }));
  }
  if (can(user.member, 'leads')) {
    const { data } = await db.from('renewals').select('id,title,next_due,amount,lead_id,leads(name)').eq('active', true).lte('next_due', new Date(Date.parse(today + 'T00:00:00Z') + 15 * 86400_000).toISOString().slice(0, 10)).order('next_due').limit(20);
    out.renewals = data || [];
  }
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
});
