import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { seal, keyId } from '@/lib/vault';
import { can } from '@/lib/perms';

export const dynamic = 'force-dynamic';

const clean = (v: any, max = 500) => String(v ?? '').trim().slice(0, max);

/** Lista os acessos (sem as senhas: elas só saem uma a uma, pelo olhinho ou pelo copiar). */
export const GET = withUser(
  async () => {
    const { data, error } = await admin().from('acessos').select('id,nome,categoria,url,usuario,notas,senha_enc,updated_at,updated_by_name,created_by_name').order('nome');
    if (error) throw new Error(error.message);
    const rows = (data || []).map(({ senha_enc, ...r }: any) => ({ ...r, tem_senha: !!senha_enc }));
    return NextResponse.json(rows);
  },
  { perm: 'acessos' },
);

export const POST = withUser(
  async (req, _ctx, user: any) => {
    if (!can(user.member, 'acessos.editar')) return NextResponse.json({ error: 'Seu acesso permite só ver e copiar. Peça ao Master para liberar "Cadastrar e editar acessos".' }, { status: 403 });
    const b = await req.json();
    const nome = clean(b.nome, 120);
    if (!nome) return NextResponse.json({ error: 'Dê um nome para o acesso (ex.: Instagram da agência).' }, { status: 400 });
    const who = user.member?.name || user.email;
    const { data, error } = await admin()
      .from('acessos')
      .insert({ nome, categoria: clean(b.categoria, 60) || 'Geral', url: clean(b.url, 500) || null, usuario: clean(b.usuario, 200) || null, senha_enc: seal(String(b.senha || '')), kid: keyId(), notas: clean(b.notas, 2000) || null, created_by: user.id, created_by_name: who, updated_by_name: who })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  },
  { perm: 'acessos' },
);
