import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { withUser } from '@/lib/supabase/server';
import { authUrl, oauthConfigured } from '@/lib/drive';

export const dynamic = 'force-dynamic';

/** Abre o login do Google para autorizar o Drive (só o Master). */
export const GET = withUser(async () => {
  if (!oauthConfigured()) return NextResponse.json({ error: 'Falta GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no Easypanel.' }, { status: 400 });
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set('drive_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}, { master: true });
