import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Lista da central de clientes: quem já é cliente, com total pago, próxima renovação e Instagram. */
export const GET = withUser(async () => {
  const db = admin();
  const { data: leads, error } = await db
    .from('leads')
    .select('id,name,niche,city,whatsapp,photo_url,client_since,stage,deal_service,production_status,production_due,delivered_at,campaign,source')
    .eq('is_client', true)
    .order('client_since', { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message.includes('is_client') ? 'Falta rodar a atualização do banco (040).' : error.message }, { status: 500 });
  const ids = (leads || []).map((l: any) => l.id);
  const [pays, rens, igs, accs] = await Promise.all([
    db.from('payments').select('lead_id,amount').eq('status', 'pago').in('lead_id', ids),
    db.from('renewals').select('lead_id,title,next_due,amount,active').eq('active', true).in('lead_id', ids).order('next_due'),
    db.from('ig_profiles').select('id,lead_id,username').in('lead_id', ids),
    db.from('client_accounts').select('lead_id,username,last_login_at').in('lead_id', ids),
  ]);
  const igIds = (igs.data || []).map((p: any) => p.id);
  const { data: snaps } = igIds.length ? await db.from('ig_snapshots').select('profile_id,day,followers').in('profile_id', igIds).order('day', { ascending: false }).limit(igIds.length * 31) : { data: [] as any[] };
  const total: Record<string, number> = {};
  for (const p of pays.data || []) total[p.lead_id] = (total[p.lead_id] || 0) + Number(p.amount || 0);
  const nextRen: Record<string, any> = {};
  for (const r of rens.data || []) if (!nextRen[r.lead_id]) nextRen[r.lead_id] = r;
  const ig: Record<string, any> = {};
  for (const p of igs.data || []) {
    const s = (snaps || []).filter((x: any) => x.profile_id === p.id);
    const last = s[0];
    const old = s.find((x: any) => Date.parse(x.day) <= Date.parse(last?.day || '') - 29 * 86400_000) || s[s.length - 1];
    ig[p.lead_id] = { username: p.username, followers: last?.followers ?? null, growth: last && old && last !== old ? (last.followers || 0) - (old.followers || 0) : null };
  }
  const acc: Record<string, any> = {};
  for (const a of accs.data || []) acc[a.lead_id] = a;
  return NextResponse.json({ clients: (leads || []).map((l: any) => ({ ...l, total: total[l.id] || 0, renewal: nextRen[l.id] || null, ig: ig[l.id] || null, account: acc[l.id] || null })) });
}, { perm: 'leads' });

/** Marca (ou tira) um contato da lista de clientes. */
export const POST = withUser(async (req) => {
  const { lead_id, is_client } = await req.json().catch(() => ({}));
  if (!lead_id) return NextResponse.json({ error: 'Cliente não informado.' }, { status: 400 });
  await admin().from('leads').update({ is_client: is_client !== false, ...(is_client !== false ? { client_since: new Date().toISOString() } : {}) }).eq('id', lead_id);
  return NextResponse.json({ ok: true });
}, { perm: 'leads.editar' });
