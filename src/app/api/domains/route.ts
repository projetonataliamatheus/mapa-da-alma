import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { cleanHost, validHost, dnsRecords, checkDomain, applyDomains, target, ROLES } from '@/lib/domains';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const roles = (r: any) => (Array.isArray(r) ? r.filter((x) => ROLES.some((y) => y[0] === x)) : []);

export const GET = withUser(async () => {
  const db = admin();
  const { data, error } = await db.from('domains').select('*').order('created_at');
  const list = await Promise.all((data || []).map(async (d: any) => ({ ...d, records: await dnsRecords(d.host) })));
  const s: any = await getSettings(db);
  return NextResponse.json({ missingTable: !!error, target: await target(), active: s.domains || {}, roles: ROLES, domains: list });
}, { master: true });

export const POST = withUser(async (req) => {
  const b = await req.json();
  const host = cleanHost(b.host);
  if (!validHost(host)) return NextResponse.json({ error: 'Domínio inválido. Ex.: painel.suaempresa.com.br ou suaempresa.com.br' }, { status: 400 });
  const { error } = await admin().from('domains').upsert({ host, roles: roles(b.roles) });
  if (error) return NextResponse.json({ error: /domains/.test(error.message) ? 'Rode a migração 018_dominios.sql no Supabase.' : error.message }, { status: 400 });
  return NextResponse.json({ host, records: await dnsRecords(host) });
}, { master: true });

export const PATCH = withUser(async (req) => {
  const b = await req.json();
  const host = cleanHost(b.host);
  if (b.action === 'check') {
    const r = await checkDomain(host);
    await applyDomains();
    return NextResponse.json(r);
  }
  if (b.action === 'confirm') {
    // o navegador do Master confirmou que o domínio abre com HTTPS e chega neste sistema
    const { data: d } = await admin().from('domains').select('dns_ok').eq('host', host).maybeSingle();
    if (!d?.dns_ok) return NextResponse.json({ error: 'Verifique o DNS primeiro.' }, { status: 400 });
    await admin().from('domains').update({ https_ok: true, error: null, last_check: new Date().toISOString() }).eq('host', host);
    await applyDomains();
    const { data: row } = await admin().from('domains').select('*').eq('host', host).maybeSingle();
    return NextResponse.json(row);
  }
  if (b.action === 'roles') {
    await admin().from('domains').update({ roles: roles(b.roles) }).eq('host', host);
    return NextResponse.json(await applyDomains());
  }
  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}, { master: true });

export const DELETE = withUser(async (req) => {
  const { host } = await req.json();
  await admin().from('domains').delete().eq('host', cleanHost(host));
  return NextResponse.json(await applyDomains());
}, { master: true });
