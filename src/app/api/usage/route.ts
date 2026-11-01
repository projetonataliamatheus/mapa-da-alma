import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { monthUsage, GOOGLE_FREE } from '@/lib/usage';

export const dynamic = 'force-dynamic';

/** Gastos do mês: IA (US$) e consultas ao Google, com os tetos configurados. */
export const GET = withUser(async () => {
  const db = admin();
  const [u, settings] = await Promise.all([monthUsage(true), getSettings(db)]);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recent } = await db.from('usage_log').select('kind,cost_usd,calls,created_at').gte('created_at', since).limit(20000);
  const days: Record<string, { ai: number; google: number; calls: number }> = {};
  for (let i = 29; i >= 0; i--) days[new Date(Date.now() - i * 86400000 - 3 * 3600000).toISOString().slice(0, 10)] = { ai: 0, google: 0, calls: 0 };
  for (const r of recent || []) {
    const d = new Date(new Date(r.created_at).getTime() - 3 * 3600000).toISOString().slice(0, 10);
    if (!days[d]) continue;
    if (r.kind === 'ai') {
      days[d].ai += Number(r.cost_usd);
      days[d].calls += 1;
    }
    else days[d].google += Number(r.calls);
  }
  return NextResponse.json({
    usage: u,
    budget: settings.budget,
    free: GOOGLE_FREE,
    days: Object.entries(days).map(([day, v]) => ({ day, ...v })),
    models: { fast: process.env.AI_MODEL_FAST || 'claude-haiku-5-5', smart: process.env.AI_MODEL || 'claude-sonnet-5-5' },
  });
}, { perm: 'custos' });
