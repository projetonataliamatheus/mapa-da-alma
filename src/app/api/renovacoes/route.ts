import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const F = ['lead_id', 'title', 'kind', 'amount', 'cycle', 'next_due', 'remind_days', 'auto_charge', 'active', 'notes'];
function pick(b: any) {
  const o: any = {};
  for (const k of F) if (b[k] !== undefined) o[k] = b[k] === '' ? null : b[k];
  if (o.amount !== undefined) {
    const a = String(o.amount);
    o.amount = Number(a.includes(',') ? a.replace(/\./g, '').replace(',', '.') : a) || 0;
  }
  if (o.remind_days !== undefined) o.remind_days = Math.max(0, Math.min(30, Number(o.remind_days) || 0));
  return o;
}

/** Todas as renovações (tela de Clientes › Renovações). */
export const GET = withUser(async () => {
  const { data } = await admin().from('renewals').select('*, leads(id,name,whatsapp)').order('next_due').limit(1000);
  return NextResponse.json({ items: data || [] });
}, { perm: 'leads' });

export const POST = withUser(async (req, _ctx, user) => {
  const b = pick(await req.json().catch(() => ({})));
  if (!b.lead_id || !b.title || !(b.amount > 0) || !b.next_due) return NextResponse.json({ error: 'Preencha o serviço, o valor e o próximo vencimento.' }, { status: 400 });
  const { data, error } = await admin().from('renewals').insert({ ...b, created_by_name: user.member?.name || user.email }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'leads.editar' });

export const PATCH = withUser(async (req) => {
  const raw = await req.json().catch(() => ({}));
  if (!raw.id) return NextResponse.json({ error: 'Renovação não informada.' }, { status: 400 });
  const b = pick(raw);
  const { data, error } = await admin().from('renewals').update({ ...b, updated_at: new Date().toISOString() }).eq('id', raw.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'leads.editar' });

export const DELETE = withUser(async (req) => {
  const { id } = await req.json().catch(() => ({}));
  await admin().from('renewals').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}, { perm: 'leads.editar' });
