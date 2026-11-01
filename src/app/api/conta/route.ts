import { NextResponse } from 'next/server';
import { withUser, clearMemberCache } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Minha conta: depois que a pessoa troca a senha (1º acesso), libera o painel. */
export const POST = withUser(async (req, _ctx, user) => {
  const { acao } = await req.json().catch(() => ({}));
  if (acao === 'senha_trocada') {
    await admin().from('team_members').update({ trocar_senha: false }).eq('id', user.id);
    clearMemberCache();
    await logEvent(null, 'team', 'acc', `${user.member?.name || user.email} trocou a própria senha`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
});
