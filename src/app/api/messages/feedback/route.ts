import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { setFeedback } from '@/lib/intel';

export const dynamic = 'force-dynamic';

/** 👍/👎 da equipe numa mensagem enviada. value: 1, -1 ou null (desfaz). */
export const POST = withUser(
  async (req, _ctx, user) => {
    const { id, value, note } = await req.json();
    if (!id || ![1, -1, null].includes(value)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    await setFeedback(id, value, note ? String(note).slice(0, 300) : null, user.id);
    return NextResponse.json({ ok: true });
  },
  { perm: 'conversas.responder' },
);
