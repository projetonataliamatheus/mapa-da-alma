import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const OK = /^(image\/(png|jpe?g|webp|gif|heic)|application\/pdf)$/i;

/** Anexa comprovante (imagem ou PDF, até 10 MB) a um lançamento ou pagamento. */
export const POST = withUser(async (req, _ctx, user) => {
  const fd = await req.formData();
  const file = fd.get('file') as File | null;
  const entry_id = String(fd.get('entry_id') || '') || null;
  const payment_id = String(fd.get('payment_id') || '') || null;
  if (!file || (!entry_id && !payment_id)) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
  if (!OK.test(file.type)) return NextResponse.json({ error: 'Envie imagem (JPG, PNG, WEBP) ou PDF.' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo maior que 10 MB.' }, { status: 400 });
  const ext = (file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  const path = `${entry_id || payment_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const db = admin();
  const up = await db.storage.from('financeiro').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (up.error) return NextResponse.json({ error: 'Não consegui guardar o arquivo: ' + up.error.message }, { status: 500 });
  const { data, error } = await db.from('fin_files').insert({ entry_id, payment_id, path, name: file.name.slice(0, 120), mime: file.type, size: file.size, created_by_name: user.member?.name || user.email }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'financeiro.editar' });

export const DELETE = withUser(async (req) => {
  const { id } = await req.json().catch(() => ({}));
  const db = admin();
  const { data } = await db.from('fin_files').select('path').eq('id', id).maybeSingle();
  if (data) await db.storage.from('financeiro').remove([data.path]);
  await db.from('fin_files').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}, { perm: 'financeiro.editar' });
