import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withUser } from '@/lib/supabase/server';
import { finishOAuth } from '@/lib/drive';
import { appBase } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Volta do login do Google: guarda a autorização e cria a pasta raiz dos clientes. */
export const GET = withUser(async (req) => {
  const url = new URL(req.url);
  const base = appBase() || url.origin;
  const back = (q: string) => NextResponse.redirect(`${base}/producao?drive=${q}`);
  const state = cookies().get('drive_oauth_state')?.value;
  if (url.searchParams.get('error')) return back('cancelado');
  if (!state || state !== url.searchParams.get('state')) return back('erro&msg=' + encodeURIComponent('Sessão de login expirou. Tente conectar de novo.'));
  try {
    await finishOAuth(String(url.searchParams.get('code') || ''));
    const res = back('ok');
    res.cookies.delete('drive_oauth_state');
    return res;
  } catch (e: any) {
    return back('erro&msg=' + encodeURIComponent(String(e?.message || e).slice(0, 200)));
  }
}, { master: true });
