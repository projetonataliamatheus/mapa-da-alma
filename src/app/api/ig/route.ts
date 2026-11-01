import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { logEvent, withSteps } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Instagram assistido: enviado, respondeu, perfil errado. */
export const POST = withUser(async (req, _ctx, user) => {
  const { id, action, reply } = await req.json();
  const db = admin();
  const { data: l } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!l) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
  if (action === 'sent') {
    await db.from('leads').update({ ig_status: 'enviado', steps: withSteps(l.steps, 'ig'), stage: l.stage === 'novo' ? 'abordado' : l.stage }).eq('id', id);
    await logEvent(id, 'ig_sent', 'ig', `Direct enviado para ${l.instagram} (assistido)`, { by: user.email });
  } else if (action === 'replied') {
    await db
      .from('leads')
      .update({
        ig_status: 'respondeu',
        stage: ['novo', 'abordado'].includes(l.stage) ? 'respondeu' : l.stage,
        temperature: Math.max(l.temperature || 0, 30),
        steps: withSteps(l.steps, 'ig', 'talk'),
        wa_status: l.whatsapp && l.wa_status === 'nao' ? 'fila' : l.wa_status,
        summary: reply ? `Respondeu no Instagram: "${String(reply).slice(0, 200)}"` : l.summary,
        next_step: l.whatsapp ? 'Prioridade na fila do WhatsApp para continuar a venda.' : 'Continuar a conversa pelo Instagram e pedir o WhatsApp.',
      })
      .eq('id', id);
    await logEvent(id, 'ig_reply', 'ig', `${l.instagram} respondeu no Instagram`);
  } else if (action === 'wrong') {
    await db.from('leads').update({ instagram: null, ig_status: 'nao' }).eq('id', id);
  } else return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}, { perm: 'instagram' });
