import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { catMerge } from '@/lib/catalog';
import { catBase, catEditBase, validCatSlug, cleanCatImages, catImages } from '@/lib/catalog-server';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export const GET = withUser(
  async (_req, ctx) => {
    const db = admin();
    const { data: c } = await db.from('catalogs').select('*, leads(name,whatsapp,niche,city)').eq('id', ctx.params.id).maybeSingle();
    if (!c) return NextResponse.json({ error: 'Catálogo não encontrado.' }, { status: 404 });
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: st } = await db.from('catalog_stats').select('day,kind,target,n').eq('catalog_id', c.id).gte('day', since);
    return NextResponse.json({ page: { ...c, data: catMerge(c.data) }, stats: st || [], base: await catBase(), editBase: await catEditBase() });
  },
  { perm: 'catalogo' },
);

export const PATCH = withUser(
  async (req, ctx, user: any) => {
    need(user, 'catalogo.editar');
    const b = await req.json();
    const db = admin();
    const { data: cur } = await db.from('catalogs').select('*').eq('id', ctx.params.id).maybeSingle();
    if (!cur) return NextResponse.json({ error: 'Catálogo não encontrado.' }, { status: 404 });
    const patch: any = { updated_at: new Date().toISOString() };
    if (b.data) patch.data = catMerge(b.data);
    if (typeof b.slug === 'string' && b.slug !== cur.slug) {
      const s = b.slug.toLowerCase().trim();
      if (!validCatSlug(s)) return NextResponse.json({ error: 'Endereço inválido: use de 2 a 30 letras minúsculas e números.' }, { status: 400 });
      const { data: taken } = await db.from('catalogs').select('id').eq('slug', s).maybeSingle();
      if (taken) return NextResponse.json({ error: `O endereço "${s}" já está em uso.` }, { status: 400 });
      patch.slug = s;
    }
    if (b.plan && ['unico', 'mensal'].includes(b.plan)) patch.plan = b.plan;
    if (b.status && ['rascunho', 'previa', 'publicado', 'pausado'].includes(b.status)) {
      patch.status = b.status;
      if (b.status === 'publicado' && !cur.published_at) patch.published_at = new Date().toISOString();
    }
    const { data: row, error } = await db.from('catalogs').update(patch).eq('id', cur.id).select('*').single();
    if (error) throw new Error(error.message);
    if (patch.data) cleanCatImages(cur.id, catImages(patch.data)).catch(() => {});
    if (patch.status && cur.lead_id && patch.status !== cur.status) await logEvent(cur.lead_id, 'catalog_status', 'acc', `Catálogo ${row.slug}: ${patch.status}`).catch(() => {});
    return NextResponse.json({ ...row, data: catMerge(row.data) });
  },
  { perm: 'catalogo' },
);

export const POST = withUser(
  async (req, ctx, user: any) => {
    need(user, 'catalogo.editar');
    const b = await req.json().catch(() => ({}));
    if (b.action === 'token') {
      const token = crypto.randomUUID().replace(/-/g, '');
      await admin().from('catalogs').update({ edit_token: token }).eq('id', ctx.params.id);
      return NextResponse.json({ edit_token: token });
    }
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  },
  { perm: 'catalogo' },
);

export const DELETE = withUser(
  async (_req, ctx, user: any) => {
    need(user, 'catalogo.editar');
    await admin().from('catalogs').delete().eq('id', ctx.params.id);
    cleanCatImages(ctx.params.id, []).catch(() => {});
    return NextResponse.json({ ok: true });
  },
  { perm: 'catalogo' },
);
