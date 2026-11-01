import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { checkPassword, cleanUser, clientIp, ipLimited, makeSession, setSessionCookie } from '@/lib/client-auth';

export const dynamic = 'force-dynamic';

const WRONG = 'Usuário ou senha incorretos.';

export async function POST(req: Request) {
  if (ipLimited(clientIp(req))) return NextResponse.json({ error: 'Muitas tentativas. Espere 15 minutos e tente de novo.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const username = cleanUser(b.username);
  const password = String(b.password || '');
  if (!username || !password) return NextResponse.json({ error: 'Digite o usuário e a senha.' }, { status: 400 });
  const db = admin();
  const { data: a } = await db.from('client_accounts').select('id,pass_hash,pass_ver,active,failed,locked_until').eq('username', username).maybeSingle();
  if (!a) {
    // mesmo custo de tempo de uma conta existente (não revela quais usuários existem)
    checkPassword(password, 's1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  if (a.locked_until && new Date(a.locked_until).getTime() > Date.now()) return NextResponse.json({ error: 'Acesso bloqueado por muitas senhas erradas. Tente de novo em 15 minutos.' }, { status: 429 });
  if (!a.active) return NextResponse.json({ error: 'Este acesso está desativado. Fale com quem te atendeu.' }, { status: 403 });
  if (!checkPassword(password, a.pass_hash)) {
    const failed = (a.failed || 0) + 1;
    await db.from('client_accounts').update({ failed: failed >= 5 ? 0 : failed, locked_until: failed >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null }).eq('id', a.id);
    return NextResponse.json({ error: failed >= 5 ? 'Acesso bloqueado por muitas senhas erradas. Tente de novo em 15 minutos.' : WRONG }, { status: 401 });
  }
  await db.from('client_accounts').update({ failed: 0, locked_until: null, last_login_at: new Date().toISOString() }).eq('id', a.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, makeSession(a.id, a.pass_ver));
  return res;
}
