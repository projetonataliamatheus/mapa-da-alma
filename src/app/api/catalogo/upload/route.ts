import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { currentMember } from '@/lib/supabase/server';
import { can } from '@/lib/perms';
import { saveCatImage } from '@/lib/catalog-server';

import { ownsPage, OWN_ERR } from '@/lib/client-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    let id: string | null = null;
    const token = String(fd.get('token') || '');
    if (token) {
      const own = await ownsPage('catalogs', token);
      if (own.reason !== 'ok') return NextResponse.json({ error: (OWN_ERR[own.reason] || OWN_ERR.invalido)[1] }, { status: 403 });
      id = own.page.id;
    } else {
      const me = await currentMember();
      if (!me?.member || me.member.active === false || !can(me.member, 'catalogo.editar')) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
      id = String(fd.get('id') || '') || null;
    }
    if (!id) return NextResponse.json({ error: 'Catálogo não encontrado.' }, { status: 404 });
    return NextResponse.json({ url: await saveCatImage(id, file) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao enviar' }, { status: 400 });
  }
}
