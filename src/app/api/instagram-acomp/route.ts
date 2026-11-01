import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { cleanIgUser, snapshotProfile } from '@/lib/ig-track';

export const dynamic = 'force-dynamic';

/** Começa a acompanhar um @ (já faz a primeira leitura). */
export const POST = withUser(async (req) => {
  const b = await req.json().catch(() => ({}));
  const db = admin();
  if (b.action === 'refresh') {
    const { data: p } = await db.from('ig_profiles').select('id,username').eq('id', b.id).single();
    try {
      return NextResponse.json({ ok: true, stats: await snapshotProfile(p!, 'manual') });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  if (b.action === 'manual') {
    // lançamento manual de um dia (se o Instagram bloquear a leitura automática por um tempo)
    const row: any = { profile_id: b.id, day: b.day, source: 'manual' };
    for (const k of ['followers', 'following', 'posts', 'likes', 'comments']) if (b[k] !== undefined && b[k] !== '') row[k] = Number(String(b[k]).replace(/\D/g, '')) || 0;
    const { error } = await db.from('ig_snapshots').upsert(row, { onConflict: 'profile_id,day' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  const username = cleanIgUser(b.username);
  if (!b.lead_id || !username) return NextResponse.json({ error: 'Informe o @ do Instagram.' }, { status: 400 });
  let { data: p } = await db.from('ig_profiles').select('*').eq('lead_id', b.lead_id).ilike('username', username).maybeSingle();
  if (!p) {
    const r = await db.from('ig_profiles').insert({ lead_id: b.lead_id, username, active: true }).select('*').single();
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
    p = r.data;
  } else if (!p.active) await db.from('ig_profiles').update({ active: true }).eq('id', p.id);
  let warn = '';
  await snapshotProfile(p).catch((e) => (warn = e.message));
  return NextResponse.json({ profile: p, warning: warn || undefined });
}, { perm: 'leads.editar' });

export const PATCH = withUser(async (req) => {
  const b = await req.json().catch(() => ({}));
  await admin().from('ig_profiles').update({ active: b.active !== false }).eq('id', b.id);
  return NextResponse.json({ ok: true });
}, { perm: 'leads.editar' });

export const DELETE = withUser(async (req) => {
  const { id } = await req.json().catch(() => ({}));
  await admin().from('ig_profiles').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}, { perm: 'leads.editar' });
