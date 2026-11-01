import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { structured } from '@/lib/ai';
import { explainAiError } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

/** Teste rápido da IA (chave, crédito e modelo). Custa uma fração de centavo. */
export const GET = withUser(async () => {
  try {
    const r = await structured<{ ok: string }>('Responda só "ok".', 'Teste de conexão.', 'teste', { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'] }, 20, { task: 'teste' });
    return NextResponse.json({ ok: true, model: process.env.AI_MODEL_FAST || 'claude-haiku-5-5', reply: r.ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, cause: explainAiError(e), raw: String(e?.message || e).slice(0, 300) });
  }
}, { master: true });
