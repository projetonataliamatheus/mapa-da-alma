import { NextResponse } from 'next/server';
import { withUser, clearMemberCache } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { isMaster, grantable, PRESETS, ROLES } from '@/lib/perms';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const ROLE_KEYS = ROLES.map((r) => r[0]).filter((r) => r !== 'master');

/** Regras: ninguém cria Master; quem não é Master só cria Vendedor/Atendente/Personalizado
 *  e só dá permissões que ele mesmo tem; ninguém mexe em quem está acima dele. */
function checkGrant(me: any, role: string, perms: string[] | undefined) {
  if (!ROLE_KEYS.includes(role)) throw new Error('Perfil inválido.');
  if (!isMaster(me) && role === 'gerente') throw new Error('Só o Master cria gerentes.');
  const base = perms && perms.length ? perms : PRESETS[role] || [];
  return grantable(me, base);
}

async function target(id: string) {
  const { data } = await admin().from('team_members').select('*').eq('id', id).maybeSingle();
  if (!data) throw new Error('Pessoa não encontrada.');
  return data;
}
function canManage(me: any, t: any) {
  if (t.id === me.id) return false;
  if (isMaster(t)) return false;
  if (isMaster(me)) return true;
  return t.role !== 'gerente' && t.created_by === me.id;
}

export const POST = withUser(
  async (req, _ctx, user) => {
    const me = user.member;
    const { name, email, password, role = 'vendedor', perms } = await req.json();
    if (!email || !password || String(password).length < 8) return NextResponse.json({ error: 'Informe e-mail e uma senha com pelo menos 8 caracteres.' }, { status: 400 });
    let finalPerms: string[];
    try {
      finalPerms = checkGrant(me, role, perms);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { invited: true, role },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin().from('team_members').upsert({ id: data.user.id, name, email, role, perms: finalPerms, created_by: me.id, active: true });
    await logEvent(null, 'team', 'acc', `${me.name || user.email} criou o acesso de ${name || email} (${role})`);
    return NextResponse.json({ ok: true });
  },
  { perm: 'equipe.gerenciar' },
);

export const PATCH = withUser(
  async (req, _ctx, user) => {
    const me = user.member;
    const { id, role, perms, active, name, reset_2fa } = await req.json();
    const t = await target(id);
    if (reset_2fa) {
      // perdeu o celular: apaga o autenticador; no próximo login a pessoa configura de novo
      if (!isMaster(me) && !canManage(me, t)) return NextResponse.json({ error: 'Você não pode alterar este acesso.' }, { status: 403 });
      const { data: f } = await admin().auth.admin.mfa.listFactors({ userId: id });
      for (const x of f?.factors || []) await admin().auth.admin.mfa.deleteFactor({ id: x.id, userId: id });
      await admin().rpc('signout_user', { p_user: id }).then(() => {}, () => {});
      await logEvent(null, 'team', 'acc', `${me.name || user.email} redefiniu a verificação em 2 etapas de ${t.name || t.email}`);
      return NextResponse.json({ ok: true });
    }
    if (!canManage(me, t)) return NextResponse.json({ error: 'Você não pode alterar este acesso.' }, { status: 403 });
    const patch: any = {};
    if (role !== undefined || perms !== undefined) {
      try {
        patch.role = role || t.role;
        patch.perms = checkGrant(me, patch.role, perms !== undefined ? perms : role ? undefined : t.perms);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
    }
    if (typeof active === 'boolean') patch.active = active;
    if (name) patch.name = name;
    await admin().from('team_members').update(patch).eq('id', id);
    clearMemberCache();
    return NextResponse.json({ ok: true });
  },
  { perm: 'equipe.gerenciar' },
);

export const DELETE = withUser(
  async (req, _ctx, user) => {
    const { id } = await req.json();
    const t = await target(id);
    if (!canManage(user.member, t)) return NextResponse.json({ error: 'Você não pode remover este acesso.' }, { status: 403 });
    await admin().auth.admin.deleteUser(id);
    clearMemberCache();
    return NextResponse.json({ ok: true });
  },
  { perm: 'equipe.gerenciar' },
);
