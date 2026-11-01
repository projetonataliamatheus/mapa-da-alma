import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { bioBase } from '@/lib/bio-server';
import { catBase } from '@/lib/catalog-server';
import { accessMessage, ensureLeadAccess, hashPassword, newPassword } from '@/lib/client-auth';
import { appBase } from '@/lib/util';
import { getSettings } from '@/lib/settings';
import { previewUrl } from '@/lib/preview';

export const dynamic = 'force-dynamic';

/** Tudo de um cliente numa resposta só: dados, páginas, pagamentos, renovações, Instagram e acesso. */
export const GET = withUser(async (_req, ctx) => {
  const id = ctx.params.id;
  const db = admin();
  const { data: lead } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  const [pays, entries, rens, bios, cats, prevs, igs, acc, s] = await Promise.all([
    db.from('payments').select('id,receipt_number,service,amount,status,method,created_at,paid_at,asaas_receipt_url,receipt_path').eq('lead_id', id).order('created_at', { ascending: false }),
    db.from('fin_entries').select('*').eq('lead_id', id).order('due_date', { ascending: false }),
    db.from('renewals').select('*').eq('lead_id', id).order('next_due'),
    db.from('bio_pages').select('id,slug,status,visible,views,clicks,data').eq('lead_id', id),
    db.from('catalogs').select('id,slug,status,visible,views,data').eq('lead_id', id),
    db.from('previews').select('slug,visible,views,created_at,sent_at').eq('lead_id', id),
    db.from('ig_profiles').select('*').eq('lead_id', id),
    db.from('client_accounts').select('id,username,active,last_login_at,created_at').eq('lead_id', id).order('created_at').limit(1).maybeSingle(),
    getSettings(db),
  ]);
  const igIds = (igs.data || []).map((p: any) => p.id);
  const { data: snaps } = igIds.length ? await db.from('ig_snapshots').select('*').in('profile_id', igIds).order('day').gte('day', new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10)) : { data: [] as any[] };
  const [bb, cb] = await Promise.all([bioBase(), catBase()]);
  return NextResponse.json({
    lead,
    payments: pays.data || [],
    entries: entries.data || [],
    renewals: rens.data || [],
    bios: (bios.data || []).map((b: any) => ({ ...b, name: b.data?.name || b.slug, url: `${bb}/${b.slug}`, data: undefined })),
    catalogs: (cats.data || []).map((c: any) => ({ ...c, name: c.data?.name || c.slug, url: `${cb}/${c.slug}`, data: undefined })),
    previews: (prevs.data || []).map((p: any) => ({ ...p, url: previewUrl(s, p.slug) })),
    instagram: (igs.data || []).map((p: any) => ({ ...p, snapshots: (snaps || []).filter((x: any) => x.profile_id === p.id) })),
    account: acc.data || null,
    area: `${appBase()}/cliente`,
  });
}, { perm: ['clientes', 'leads'] });

/** Acesso do cliente (um por cliente): criar, nova senha, ativar/desativar. */
export const POST = withUser(async (req, ctx, user) => {
  need(user, 'leads.editar');
  const b = await req.json().catch(() => ({}));
  const id = ctx.params.id;
  const db = admin();
  try {
    if (b.action === 'create') {
      const r = await ensureLeadAccess(id, { username: b.username || undefined, byName: user.member?.name });
      return NextResponse.json({ ...r, message: accessMessage(appBase(), r.username, r.password) });
    }
    const { data: a } = await db.from('client_accounts').select('id,username,pass_ver').eq('lead_id', id).order('created_at').limit(1).maybeSingle();
    if (!a) return NextResponse.json({ error: 'Este cliente ainda não tem acesso.' }, { status: 400 });
    if (b.action === 'reset') {
      const password = newPassword();
      await db.from('client_accounts').update({ pass_hash: hashPassword(password), pass_ver: (a.pass_ver || 1) + 1, failed: 0, locked_until: null, active: true, updated_at: new Date().toISOString() }).eq('id', a.id);
      return NextResponse.json({ username: a.username, password, message: accessMessage(appBase(), a.username, password) });
    }
    if (b.action === 'enable' || b.action === 'disable') {
      await db.from('client_accounts').update({ active: b.action === 'enable', pass_ver: (a.pass_ver || 1) + 1 }).eq('id', a.id);
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}, { perm: ['clientes', 'leads'] });
