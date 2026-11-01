import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json().catch(() => ({}));
  const text = String(b.text || '').trim().slice(0, 2000);
  if (!text || (!b.entry_id && !b.payment_id)) return NextResponse.json({ error: 'Escreva o comentário.' }, { status: 400 });
  const { data, error } = await admin().from('fin_comments').insert({ entry_id: b.entry_id || null, payment_id: b.payment_id || null, text, author: user.member?.name || user.email }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'financeiro' });
