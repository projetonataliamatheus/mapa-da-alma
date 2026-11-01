import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { sendAndRecord } from '@/lib/engine';
import { prepare, afterSend, SendError } from '@/lib/team-send';

export const dynamic = 'force-dynamic';

/** Mensagem escrita por uma pessoa da equipe (pode responder uma mensagem específica). A IA pausa para este contato. */
export const POST = withUser(
  async (req) => {
    const { leadId, text, replyTo, clientId } = await req.json();
    const body = String(text || '').trim();
    if (!leadId || !body) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 });
    try {
      const { lead, number, quoted } = await prepare(leadId, replyTo);
      // envia na hora (sem "digitando…") e responde ao painel; o resto acontece em segundo plano
      await sendAndRecord(number, lead, body, 'human', false, { ...(quoted ? { quoted } : {}), ...(clientId ? { cid: String(clientId).slice(0, 40) } : {}) });
      afterSend(lead, number, body);
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      if (e instanceof SendError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }
  },
  { perm: 'conversas.responder' },
);
