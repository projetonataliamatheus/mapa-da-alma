import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { packSlug, PACK_LIMITS } from '@/lib/packs';
import { packsBase } from '@/lib/packs-server';

export const dynamic = 'force-dynamic';

const clean = (b: any) => {
  const row: any = {};
  if (b.name !== undefined) row.name = String(b.name || '').trim().slice(0, 80) || 'Pack sem nome';
  if (b.niche !== undefined) row.niche = String(b.niche || '').trim().slice(0, 60) || null;
  if (b.keywords !== undefined) row.keywords = String(b.keywords || '').trim().slice(0, 300) || null;
  if (b.description !== undefined) row.description = String(b.description || '').trim().slice(0, 1200) || null;
  if (b.cover !== undefined) row.cover = /^https?:\/\//.test(String(b.cover || '')) ? String(b.cover) : null;
  if (b.images !== undefined) row.images = (Array.isArray(b.images) ? b.images : []).filter((u: any) => /^https?:\/\//.test(String(u))).slice(0, PACK_LIMITS.images);
  if (b.items !== undefined) row.items = b.items === '' || b.items == null ? null : Math.max(0, Math.min(999, Number(b.items) || 0));
  if (b.canva_url !== undefined) row.canva_url = /^https?:\/\//.test(String(b.canva_url || '').trim()) ? String(b.canva_url).trim() : null;
  if (b.price !== undefined) row.price = b.price === '' || b.price == null || isNaN(Number(String(b.price).replace(',', '.'))) ? null : Number(String(b.price).replace(',', '.'));
  if (b.active !== undefined) row.active = !!b.active;
  return row;
};

async function freeSlug(want: string, exceptId?: string) {
  const base = packSlug(want);
  for (let i = 0; i < 40; i++) {
    const s = i ? `${base}-${i + 1}` : base;
    const { data } = await admin().from('canva_packs').select('id').eq('slug', s).maybeSingle();
    if (!data || data.id === exceptId) return s;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export const GET = withUser(async () => {
  const { data, error } = await admin().from('canva_packs').select('*').order('sort').order('created_at');
  return NextResponse.json({ packs: data || [], base: await packsBase(), missing: !!error });
}, { perm: 'packs' });

export const POST = withUser(async (req, _ctx, user) => {
  need(user, 'packs.editar');
  const b = await req.json();
  const row = clean({ name: 'Novo pack', ...b });
  row.slug = await freeSlug(b.slug || row.name);
  const { data, error } = await admin().from('canva_packs').insert(row).select('*').single();
  if (error) return NextResponse.json({ error: /canva_packs/.test(error.message) ? 'Rode a atualização 034_packs_canva.sql no Supabase.' : error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'packs' });

export const PATCH = withUser(async (req, _ctx, user) => {
  need(user, 'packs.editar');
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'Pack não informado.' }, { status: 400 });
  const row = clean(b);
  if (b.slug !== undefined) row.slug = await freeSlug(b.slug, b.id);
  row.updated_at = new Date().toISOString();
  const { data, error } = await admin().from('canva_packs').update(row).eq('id', b.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}, { perm: 'packs' });

export const DELETE = withUser(async (req, _ctx, user) => {
  need(user, 'packs.editar');
  const { id } = await req.json();
  await admin().from('canva_packs').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}, { perm: 'packs' });
