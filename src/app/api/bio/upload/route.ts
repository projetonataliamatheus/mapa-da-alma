import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { currentMember } from '@/lib/supabase/server';
import { can } from '@/lib/perms';
import { saveImage } from '@/lib/bio-server';

import { ownsPage, OWN_ERR } from '@/lib/client-auth';

export const dynamic = 'force-dynamic';

/** Envio de imagem: pela equipe (logada) ou pelo cliente (link secreto). */
export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    let pageId: string | null = null;
    const token = String(fd.get('token') || '');
    if (token) {
      const own = await ownsPage('bio_pages', token);
      if (own.reason !== 'ok') return NextResponse.json({ error: (OWN_ERR[own.reason] || OWN_ERR.invalido)[1] }, { status: 403 });
      pageId = own.page.id;
    } else {
      const me = await currentMember();
      if (!me?.member || me.member.active === false || !can(me.member, 'bio.editar')) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
      pageId = String(fd.get('id') || '') || null;
    }
    if (!pageId) return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
    return NextResponse.json({ url: await saveImage(pageId, file) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao enviar' }, { status: 400 });
  }
}
