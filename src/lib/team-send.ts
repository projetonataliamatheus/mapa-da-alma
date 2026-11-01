/** Envio manual pela equipe (texto ou imagem): checagens, resposta citada e o que acontece depois. */
import { admin } from './supabase/admin';
import { currentActor } from './actor';
import { connectedNumber, logEvent } from './engine';

export class SendError extends Error {}

export async function prepare(leadId: string, replyTo?: string | null) {
  const db = admin();
  const { data: lead } = await db.from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead?.whatsapp) throw new SendError('Este contato não tem WhatsApp.');
  const number = await connectedNumber(lead.number_id);
  if (!number) throw new SendError('O número de WhatsApp desta conversa está desconectado. Reconecte em Números WhatsApp (a conversa não é enviada por outro número).');
  let quoted: any = null;
  if (replyTo) {
    const { data: q } = await db.from('messages').select('id,wa_message_id,body,direction,kind').eq('id', replyTo).eq('lead_id', leadId).maybeSingle();
    if (q) quoted = { id: q.id, wa_id: q.wa_message_id, body: String(q.body || (q.kind === 'image' ? '📷 Imagem' : '')).slice(0, 300), dir: q.direction };
  }
  return { lead, number, quoted };
}

/** Depois do envio: a IA sai da conversa, registra no histórico e define o responsável. Roda em segundo plano (não atrasa o envio). */
export function afterSend(lead: any, number: any, what: string) {
  const db = admin();
  const me = currentActor();
  (async () => {
    const wasAi = lead.ai_enabled;
    await db
      .from('leads')
      .update({ ai_enabled: false, reply_due_at: null, number_id: number.id, last_outbound_at: new Date().toISOString(), wa_status: lead.wa_status === 'nao' || lead.wa_status === 'fila' ? 'enviado' : lead.wa_status, ...(me && !lead.assigned_to ? { assigned_to: me.id, assigned_name: me.name } : {}) })
      .eq('id', lead.id);
    if (wasAi) await logEvent(lead.id, 'ai_toggle', 'acc', `A equipe assumiu a conversa com ${lead.name}`);
    await logEvent(lead.id, 'team_msg', 'acc', `Mensagem enviada para ${lead.name}: "${what.slice(0, 80)}"`);
  })().catch((e) => console.error('[envio manual] depois do envio', e?.message || e));
}
