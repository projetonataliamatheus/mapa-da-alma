import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { mergeData } from '@/lib/bio';
import { bioBase, validSlug, cleanImages, imagesOf } from '@/lib/bio-server';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Página + números dos últimos 30 dias. */
export const GET = withUser(
  async (_req, ctx) => {
    const db = admin();
    const { data: p } = await db.from('bio_pages').select('*, leads(name,whatsapp,niche,city)').eq('id', ctx.params.id).maybeSingle();
    if (!p) return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: st } = await db.from('bio_stats').select('day,kind,target,n').eq('page_id', p.id).gte('day', since);
    return NextResponse.json({ page: { ...p, data: mergeData(p.data) }, stats: st || [], base: await bioBase() });
  },
  { perm: 'bio' },
);

export const PATCH = withUser(
  async (req, ctx, user: any) => {
    need(user, 'bio.editar');
    const b = await req.json();
    const db = admin();
    const { data: cur } = await db.from('bio_pages').select('*').eq('id', ctx.params.id).maybeSingle();
    if (!cur) return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
    const patch: any = { updated_at: new Date().toISOString() };
    if (b.data) patch.data = mergeData(b.data);
    if (typeof b.slug === 'string' && b.slug !== cur.slug) {
      const s = b.slug.toLowerCase().trim();
      if (!validSlug(s)) return NextResponse.json({ error: 'Endereço inválido: use de 2 a 30 letras minúsculas e números, sem espaço nem acento.' }, { status: 400 });
      const { data: taken } = await db.from('bio_pages').select('id').eq('slug', s).maybeSingle();
      if (taken) return NextResponse.json({ error: `O endereço "${s}" já está em uso. Escolha outro.` }, { status: 400 });
      patch.slug = s;
    }
    if (b.status && ['rascunho', 'previa', 'publicado', 'pausado'].includes(b.status)) {
      patch.status = b.status;
      if (b.status === 'publicado' && !cur.published_at) patch.published_at = new Date().toISOString();
    }
    const { data: row, error } = await db.from('bio_pages').update(patch).eq('id', cur.id).select('*').single();
    if (error) throw new Error(error.message);
    if (patch.data) cleanImages(cur.id, imagesOf(patch.data)).catch(() => {});
    if (patch.status && cur.lead_id && patch.status !== cur.status) {
      const msg = { publicado: 'publicado', pausado: 'pausado', previa: 'liberado como prévia', rascunho: 'voltou para rascunho' }[patch.status as string];
      await logEvent(cur.lead_id, 'bio_status', 'acc', `Link na bio ${row.slug} ${msg}`).catch(() => {});
    }
    return NextResponse.json({ ...row, data: mergeData(row.data) });
  },
  { perm: 'bio' },
);

/** Ações: gerar um novo link de edição para o cliente (o antigo para de funcionar). */
export const POST = withUser(
  async (req, ctx, user: any) => {
    need(user, 'bio.editar');
    const b = await req.json().catch(() => ({}));
    if (b.action === 'token') {
      const token = crypto.randomUUID().replace(/-/g, '');
      const { error } = await admin().from('bio_pages').update({ edit_token: token }).eq('id', ctx.params.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ edit_token: token });
    }
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  },
  { perm: 'bio' },
);

export const DELETE = withUser(
  async (_req, ctx, user: any) => {
    need(user, 'bio.editar');
    const { error } = await admin().from('bio_pages').delete().eq('id', ctx.params.id);
    if (error) throw new Error(error.message);
    cleanImages(ctx.params.id, []).catch(() => {});
    return NextResponse.json({ ok: true });
  },
  { perm: 'bio' },
);
