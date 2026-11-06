import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { waKey } from '@/lib/phone';
import { limparCacheAdmin } from '@/lib/admin-wa';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () => {
  const db = admin();
  const [{ data: c }, { data: lista }] = await Promise.all([db.from('admin_wa_config').select('ativo').eq('id', 1).maybeSingle(), db.from('admin_wa').select('*').order('created_at')]);
  return NextResponse.json({ ativo: !!c?.ativo, lista: lista || [] });
}, { perm: 'numeros.gerenciar' });

/** { ativo } liga/desliga · { add: {nome, whatsapp} } cadastra · { del: id } remove · { toggle: id, ativo } */
export const POST = withUser(async (req) => {
  const b = await req.json();
  const db = admin();
  if (typeof b.ativo === 'boolean' && !b.toggle) await db.from('admin_wa_config').upsert({ id: 1, ativo: b.ativo, updated_at: new Date().toISOString() });
  if (b.add) {
    const num = String(b.add.whatsapp || '').replace(/\D/g, '');
    const k = waKey(num);
    if (!k || num.length < 10) return NextResponse.json({ error: 'Número inválido. Use o código do país + DDD + número.' }, { status: 400 });
    const { error } = await db.from('admin_wa').upsert({ nome: String(b.add.nome || 'Admin').slice(0, 40), whatsapp: num, wa_key: k, ativo: true }, { onConflict: 'wa_key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (b.del) await db.from('admin_wa').delete().eq('id', b.del);
  if (b.toggle) await db.from('admin_wa').update({ ativo: !!b.ativo }).eq('id', b.toggle);
  limparCacheAdmin();
  return NextResponse.json({ ok: true });
}, { perm: 'numeros.gerenciar' });
