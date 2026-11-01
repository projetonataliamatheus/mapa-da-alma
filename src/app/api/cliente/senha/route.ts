import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { checkPassword, clientIp, currentClient, hashPassword, ipLimited, makeSession, setSessionCookie } from '@/lib/client-auth';

export const dynamic = 'force-dynamic';

/** O cliente troca a própria senha (precisa da atual). Outras sessões abertas caem. */
export async function POST(req: Request) {
  if (ipLimited(clientIp(req))) return NextResponse.json({ error: 'Muitas tentativas. Espere 15 minutos.' }, { status: 429 });
  const me = await currentClient();
  if (!me) return NextResponse.json({ error: 'Entre de novo para trocar a senha.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const nova = String(b.nova || '');
  if (nova.length < 8) return NextResponse.json({ error: 'A senha nova precisa ter pelo menos 8 caracteres.' }, { status: 400 });
  const db = admin();
  const { data: a } = await db.from('client_accounts').select('pass_hash,pass_ver').eq('id', me.id).single();
  if (!checkPassword(String(b.atual || ''), a!.pass_hash)) return NextResponse.json({ error: 'A senha atual está incorreta.' }, { status: 400 });
  const ver = (a!.pass_ver || 1) + 1;
  await db.from('client_accounts').update({ pass_hash: hashPassword(nova), pass_ver: ver, updated_at: new Date().toISOString() }).eq('id', me.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, makeSession(me.id, ver));
  return res;
}
