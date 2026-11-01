import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { nextDue } from '@/lib/finance';

export const dynamic = 'force-dynamic';

const FIELDS = ['kind', 'description', 'category', 'amount', 'recurrence', 'due_date', 'status', 'paid_at', 'method', 'supplier', 'notes', 'lead_id', 'service', 'archived'];
function pick(b: any) {
  const o: any = {};
  for (const k of FIELDS) if (b[k] !== undefined) o[k] = b[k] === '' ? null : b[k];
  if (o.amount !== undefined) {
    const a = String(o.amount ?? '0');
    o.amount = Math.max(0, Number(a.includes(',') ? a.replace(/\./g, '').replace(',', '.') : a) || 0);
  }
  if (o.description !== undefined) o.description = String(o.description || '').slice(0, 300);
  return o;
}

/** Tudo do financeiro de uma vez: lançamentos + pagamentos recebidos (Asaas/Pix/links). */
export const GET = withUser(async () => {
  const db = admin();
  const [e, p, f] = await Promise.all([
    db.from('fin_entries').select('*, leads(name)').order('due_date', { ascending: false, nullsFirst: false }).limit(3000),
    db
      .from('payments')
      .select('id,receipt_number,lead_id,service,amount,status,method,provider,created_at,paid_at,asaas_receipt_url,receipt_path,notes,checkout_id,leads(name,whatsapp,stage),checkout_links(title,billing)')
      .order('created_at', { ascending: false })
      .limit(3000),
    db.from('fin_files').select('entry_id,payment_id'),
  ]);
  if (e.error) return NextResponse.json({ error: e.error.message.includes('fin_entries') ? 'Falta rodar a atualização do banco (039_financeiro).' : e.error.message }, { status: 500 });
  const files: Record<string, number> = {};
  for (const x of f.data || []) {
    const k = x.entry_id || x.payment_id;
    files[k] = (files[k] || 0) + 1;
  }
  return NextResponse.json({ entries: e.data || [], payments: p.data || [], files });
}, { perm: 'financeiro' });

export const POST = withUser(async (req, _ctx, user) => {
  const b = pick(await req.json().catch(() => ({})));
  if (!b.description) return NextResponse.json({ error: 'Descreva o lançamento.' }, { status: 400 });
  if (b.status === 'pago' && !b.paid_at) b.paid_at = new Date().toISOString();
  const { data, error } = await admin().from('fin_entries').insert({ ...b, created_by_name: user.member?.name || user.email }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'financeiro.editar' });

/** Edita; ao marcar como paga uma conta recorrente, já cria a do próximo mês/ano. */
export const PATCH = withUser(async (req, _ctx, user) => {
  const raw = await req.json().catch(() => ({}));
  if (!raw.id) return NextResponse.json({ error: 'Lançamento não informado.' }, { status: 400 });
  const db = admin();
  const { data: old } = await db.from('fin_entries').select('*').eq('id', raw.id).maybeSingle();
  if (!old) return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
  const b = pick(raw);
  if (b.status === 'pago' && old.status !== 'pago' && !b.paid_at) b.paid_at = new Date().toISOString();
  if (b.status && b.status !== 'pago') b.paid_at = null;
  const { data, error } = await db.from('fin_entries').update({ ...b, updated_at: new Date().toISOString() }).eq('id', raw.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let next = null;
  if (b.status === 'pago' && old.status !== 'pago' && data.recurrence !== 'unico' && data.due_date) {
    const due = nextDue(data.due_date, data.recurrence);
    const { data: exists } = await db.from('fin_entries').select('id').eq('parent_id', data.parent_id || data.id).eq('due_date', due).maybeSingle();
    if (!exists) {
      const r = await db
        .from('fin_entries')
        .insert({ kind: data.kind, description: data.description, category: data.category, amount: data.amount, recurrence: data.recurrence, due_date: due, supplier: data.supplier, method: data.method, lead_id: data.lead_id, service: data.service, parent_id: data.parent_id || data.id, created_by_name: user.member?.name || 'Recorrência' })
        .select('*')
        .single();
      next = r.data;
    }
  }
  return NextResponse.json({ ...data, next });
}, { perm: 'financeiro.editar' });

export const DELETE = withUser(async (req) => {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Lançamento não informado.' }, { status: 400 });
  const db = admin();
  const { data: fs } = await db.from('fin_files').select('path').eq('entry_id', id);
  if (fs?.length) await db.storage.from('financeiro').remove(fs.map((x: any) => x.path));
  await db.from('fin_entries').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}, { perm: 'financeiro.editar' });
