import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { seal, open, keyId } from '@/lib/vault';
import { can } from '@/lib/perms';

export const dynamic = 'force-dynamic';

const clean = (v: any, max = 500) => String(v ?? '').trim().slice(0, max);
const editor = (user: any) => can(user.member, 'acessos.editar');
const deny = () => NextResponse.json({ error: 'Seu acesso permite só ver e copiar. Peça ao Master para liberar "Cadastrar e editar acessos".' }, { status: 403 });

/** Revela a senha (olhinho ou copiar). Fica registrado quem viu. */
export const POST = withUser(
  async (req, ctx, user: any) => {
    const b = await req.json().catch(() => ({}));
    const db = admin();
    const { data: a } = await db.from('acessos').select('id,senha_enc,kid').eq('id', ctx.params.id).maybeSingle();
    if (!a) return NextResponse.json({ error: 'Acesso não encontrado.' }, { status: 404 });
    const senha = open(a.senha_enc, a.kid);
    await db.from('acessos_log').insert({ acesso_id: a.id, actor_id: user.id, actor_name: user.member?.name || user.email, action: b.action === 'copiar' ? 'copiou a senha' : 'viu a senha' });
    return NextResponse.json({ senha }, { headers: { 'Cache-Control': 'no-store' } });
  },
  { perm: 'acessos' },
);

/** Histórico de quem viu/copiou. */
export const GET = withUser(
  async (_req, ctx) => {
    const { data } = await admin().from('acessos_log').select('actor_name,action,created_at').eq('acesso_id', ctx.params.id).order('created_at', { ascending: false }).limit(20);
    return NextResponse.json(data || []);
  },
  { perm: 'acessos' },
);

export const PATCH = withUser(
  async (req, ctx, user: any) => {
    if (!editor(user)) return deny();
    const b = await req.json();
    const patch: any = { updated_at: new Date().toISOString(), updated_by_name: user.member?.name || user.email };
    if ('nome' in b) {
      patch.nome = clean(b.nome, 120);
      if (!patch.nome) return NextResponse.json({ error: 'O nome não pode ficar vazio.' }, { status: 400 });
    }
    if ('categoria' in b) patch.categoria = clean(b.categoria, 60) || 'Geral';
    if ('url' in b) patch.url = clean(b.url, 500) || null;
    if ('usuario' in b) patch.usuario = clean(b.usuario, 200) || null;
    if ('notas' in b) patch.notas = clean(b.notas, 2000) || null;
    // senha só muda quando vem preenchida (campo vazio = manter a atual)
    if (typeof b.senha === 'string' && b.senha !== '') {
      patch.senha_enc = seal(b.senha);
      patch.kid = keyId();
    }
    const { error } = await admin().from('acessos').update(patch).eq('id', ctx.params.id);
    if (error) throw new Error(error.message);
    if (patch.senha_enc) await admin().from('acessos_log').insert({ acesso_id: ctx.params.id, actor_id: user.id, actor_name: user.member?.name || user.email, action: 'trocou a senha' });
    return NextResponse.json({ ok: true });
  },
  { perm: 'acessos' },
);

export const DELETE = withUser(
  async (_req, ctx, user: any) => {
    if (!editor(user)) return deny();
    const { error } = await admin().from('acessos').delete().eq('id', ctx.params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  },
  { perm: 'acessos' },
);
