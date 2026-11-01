import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { currentClient } from '@/lib/client-auth';
import { bioBase } from '@/lib/bio-server';
import { catBase } from '@/lib/catalog-server';

export const dynamic = 'force-dynamic';

/** Quem está logado na área do cliente e o que é dele. */
export async function GET() {
  const me = await currentClient();
  if (!me) return NextResponse.json({ error: 'login' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const db = admin();
  const [bios, cats] = await Promise.all([
    db.from('bio_pages').select('slug,status,data,edit_token,views,clicks,visible').eq('account_id', me.id),
    db.from('catalogs').select('slug,status,data,edit_token,views,visible').eq('account_id', me.id),
  ]);
  // o que é do cliente (pelo contato ligado ao acesso): Instagram, pagamentos e renovações
  let instagram: any[] = [];
  let payments: any[] = [];
  let renewals: any[] = [];
  if (me.lead_id) {
    const [ig, pays, rens] = await Promise.all([
      db.from('ig_profiles').select('id,username,full_name,pic_url,last_fetch_at').eq('lead_id', me.lead_id).eq('active', true),
      db.from('payments').select('id,receipt_number,service,amount,paid_at,status,receipt_path').eq('lead_id', me.lead_id).eq('status', 'pago').order('paid_at', { ascending: false }).limit(50),
      db.from('renewals').select('title,amount,cycle,next_due,last_link_id').eq('lead_id', me.lead_id).eq('active', true).order('next_due'),
    ]);
    const ids = (ig.data || []).map((p: any) => p.id);
    const { data: snaps } = ids.length ? await db.from('ig_snapshots').select('profile_id,day,followers,following,posts,likes,comments,recent').in('profile_id', ids).gte('day', new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10)).order('day') : { data: [] as any[] };
    instagram = (ig.data || []).map((p: any) => ({ ...p, id: undefined, snapshots: (snaps || []).filter((x: any) => x.profile_id === p.id).map((x: any) => ({ ...x, profile_id: undefined })) }));
    payments = (pays.data || []).map((p: any) => ({ num: p.receipt_number, service: p.service, amount: p.amount, paid_at: p.paid_at }));
    const linkIds = (rens.data || []).map((r: any) => r.last_link_id).filter(Boolean);
    const { data: links } = linkIds.length ? await db.from('checkout_links').select('id,slug,status').in('id', linkIds) : { data: [] as any[] };
    const { getSettings } = await import('@/lib/settings');
    const { linkUrl } = await import('@/lib/checkout');
    const s = await getSettings(db);
    renewals = (rens.data || []).map((r: any) => {
      const l = (links || []).find((x: any) => x.id === r.last_link_id);
      return { title: r.title, amount: r.amount, cycle: r.cycle, next_due: r.next_due, pay: l && l.status === 'ativo' ? linkUrl(s, l.slug) : null };
    });
  }
  return NextResponse.json(
    {
      instagram,
      payments,
      renewals,
      name: me.name,
      username: me.username,
      bioBase: await bioBase(),
      catBase: await catBase(),
      bios: (bios.data || []).map((p: any) => ({ slug: p.slug, name: p.data?.name || p.slug, token: p.edit_token, views: p.views, clicks: p.clicks, on: p.visible !== false && p.status !== 'pausado' })),
      catalogs: (cats.data || []).map((p: any) => ({ slug: p.slug, name: p.data?.name || p.slug, token: p.edit_token, views: p.views, on: p.visible !== false && p.status !== 'pausado' })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
