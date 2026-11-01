import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { accessMessage, ensureAccess, hashPassword, newPassword } from '@/lib/client-auth';
import { appBase } from '@/lib/util';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const TABLE: Record<string, ['bio_pages' | 'catalogs', string]> = { bio: ['bio_pages', 'bio.editar'], catalogo: ['catalogs', 'catalogo.editar'] };

/** Acesso do cliente de uma página: usuário, se está ativo, último login. */
export const GET = withUser(async (req) => {
  const u = new URL(req.url);
  const t = TABLE[u.searchParams.get('kind') || ''];
  if (!t) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  const { data: page } = await admin().from(t[0]).select('account_id').eq('id', u.searchParams.get('id')).maybeSingle();
  if (!page?.account_id) return NextResponse.json({ account: null });
  const { data: a } = await admin().from('client_accounts').select('id,username,name,active,last_login_at,locked_until,created_at').eq('id', page.account_id).maybeSingle();
  return NextResponse.json({ account: a || null });
});

/** Cria (ou liga) o acesso do cliente e devolve a senha uma única vez. */
export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json().catch(() => ({}));
  const t = TABLE[b.kind];
  if (!t) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  need(user, t[1]);
  try {
    const r = await ensureAccess(t[0], b.id, { username: b.username || undefined, byName: user.member?.name });
    return NextResponse.json({ ...r, message: accessMessage(appBase(), r.username, r.password) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});

/** Nova senha (derruba as sessões abertas), desativar/reativar, ou desligar o acesso da página. */
export const PATCH = withUser(async (req, _ctx, user) => {
  const b = await req.json().catch(() => ({}));
  const t = TABLE[b.kind];
  if (!t) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  need(user, t[1]);
  const db = admin();
  const { data: page } = await db.from(t[0]).select('account_id,lead_id,slug').eq('id', b.id).maybeSingle();
  if (!page?.account_id) return NextResponse.json({ error: 'Esta página ainda não tem acesso de cliente.' }, { status: 400 });
  const { data: a } = await db.from('client_accounts').select('id,username,pass_ver').eq('id', page.account_id).single();
  if (b.action === 'reset') {
    const password = newPassword();
    await db.from('client_accounts').update({ pass_hash: hashPassword(password), pass_ver: (a!.pass_ver || 1) + 1, failed: 0, locked_until: null, active: true, updated_at: new Date().toISOString() }).eq('id', a!.id);
    if (page.lead_id) await logEvent(page.lead_id, 'client_access', 'acc', `Nova senha da área do cliente gerada (${a!.username})`).catch(() => {});
    return NextResponse.json({ username: a!.username, password, message: accessMessage(appBase(), a!.username, password) });
  }
  if (b.action === 'disable' || b.action === 'enable') {
    await db.from('client_accounts').update({ active: b.action === 'enable', pass_ver: (a!.pass_ver || 1) + 1, updated_at: new Date().toISOString() }).eq('id', a!.id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'unlink') {
    await db.from(t[0]).update({ account_id: null }).eq('id', b.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
});
