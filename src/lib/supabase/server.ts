import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { admin } from './admin';
import { actorStore } from '../actor';
import { can, isMaster } from '../perms';

export function serverClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list: { name: string; value: string; options?: any }[]) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* chamado de um Server Component: ignorar */
        }
      },
    },
  });
}

/** Nível de autenticação do token (aal1 = só senha; aal2 = senha + código do autenticador). */
export function tokenAal(token: string) {
  try {
    return String(JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8')).aal || '');
  } catch {
    return '';
  }
}

export async function currentUser() {
  const { data } = await serverClient().auth.getUser();
  return data.user || null;
}

/** Cache curto (por token de acesso): evita conferir login e permissões no Supabase a cada clique. */
const memberCache = new Map<string, { at: number; v: any }>();
const CACHE_MS = 30_000;

export async function currentMember() {
  const sb = serverClient();
  const { data: sess } = await sb.auth.getSession();
  const token = sess.session?.access_token;
  // 2 fatores obrigatório: sessão só com senha (aal1) não acessa nada
  if (!token || tokenAal(token) !== 'aal2') return null;
  if (token) {
    const hit = memberCache.get(token);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.v;
  }
  const { data } = await sb.auth.getUser();
  const user = data.user || null;
  if (!user) return null;
  const { data: member } = await admin().from('team_members').select('*').eq('id', user.id).maybeSingle();
  const v = { user, member };
  if (token) {
    memberCache.set(token, { at: Date.now(), v });
    if (memberCache.size > 500) for (const k of Array.from(memberCache.keys()).slice(0, 250)) memberCache.delete(k);
  }
  return v;
}

/** Ao mudar permissões ou desativar alguém, o efeito é imediato. */
export function clearMemberCache() {
  memberCache.clear();
}

type Handler = (req: Request, ctx: any, user: any) => Promise<Response>;

/** Erro de permissão que vira resposta 403. */
export class Forbidden extends Error {}
export function need(user: any, perm: string) {
  if (!can(user?.member, perm)) throw new Forbidden('Seu acesso não permite esta ação. Peça ao Master para liberar.');
}

/** Protege uma rota da API: só usuários logados (e com a permissão, se informada). */
export function withUser(handler: Handler, opts: { admin?: boolean; master?: boolean; perm?: string | string[] } = {}) {
  return async (req: Request, ctx: any) => {
    // garante a reserva de respostas ligada enquanto o painel estiver em uso
    import('../reply-runner').then((m) => m.startReplyRunner()).catch(() => {});
    try {
      const me = await currentMember();
      if (!me) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
      if (!me.member) return NextResponse.json({ error: 'Seu acesso ainda não foi liberado por um administrador.' }, { status: 403 });
      if (me.member.active === false) return NextResponse.json({ error: 'Seu acesso está desativado.' }, { status: 403 });
      if ((opts.admin || opts.master) && !isMaster(me.member)) return NextResponse.json({ error: 'Só o Master pode fazer isso.' }, { status: 403 });
      if (opts.perm && ![opts.perm].flat().some((p) => can(me.member, p))) return NextResponse.json({ error: 'Seu acesso não permite esta ação. Peça ao Master para liberar.' }, { status: 403 });
      // quem está agindo: o logEvent e as mensagens enviadas registram o membro sozinhos
      const actor = { id: me.user.id, email: me.user.email || '', name: me.member.name || me.user.email || 'Equipe' };
      return await actorStore.run(actor, () => handler(req, ctx, { ...me.user, member: me.member }));
    } catch (e: any) {
      if (e instanceof Forbidden) return NextResponse.json({ error: e.message }, { status: 403 });
      console.error(e);
      return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
    }
  };
}
