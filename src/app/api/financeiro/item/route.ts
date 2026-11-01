import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Ficha de um lançamento ou pagamento: cliente, resumo da conversa, comprovantes (links temporários) e comentários. */
export const GET = withUser(async (req) => {
  const u = new URL(req.url);
  const type = u.searchParams.get('type');
  const id = u.searchParams.get('id') || '';
  const db = admin();
  let item: any = null;
  if (type === 'payment') {
    const { data } = await db.from('payments').select('*, checkout_links(title,description,includes,billing,slug,customer_name,customer_document,customer_email,customer_phone)').eq('id', id).maybeSingle();
    item = data;
  } else {
    const { data } = await db.from('fin_entries').select('*').eq('id', id).maybeSingle();
    item = data;
  }
  if (!item) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  const key = type === 'payment' ? 'payment_id' : 'entry_id';
  const [files, comments, lead] = await Promise.all([
    db.from('fin_files').select('*').eq(key, id).order('created_at'),
    db.from('fin_comments').select('*').eq(key, id).order('created_at'),
    item.lead_id ? db.from('leads').select('id,name,whatsapp,stage,niche,city,summary,next_step,source,campaign').eq('id', item.lead_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const signed = await Promise.all(
    (files.data || []).map(async (f: any) => ({ ...f, url: (await db.storage.from('financeiro').createSignedUrl(f.path, 600)).data?.signedUrl || null })),
  );
  let receipt = null;
  if (type === 'payment' && item.receipt_path) receipt = `/api/payments/${item.id}`;
  return NextResponse.json({ item, lead: (lead as any).data || null, files: signed, comments: comments.data || [], receipt }, { headers: { 'Cache-Control': 'no-store' } });
}, { perm: 'financeiro' });

/** Observação de um pagamento do Asaas. */
export const PATCH = withUser(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'Pagamento não informado.' }, { status: 400 });
  await admin().from('payments').update({ notes: String(b.notes || '').slice(0, 2000) }).eq('id', b.id);
  return NextResponse.json({ ok: true });
}, { perm: 'financeiro.editar' });
