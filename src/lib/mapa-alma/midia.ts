// Envio de mídia (áudio gravado, imagem, PDF) já registrando o id do WhatsApp na conversa.
// IMPORTANTE: sem o id, o "eco" da mensagem que volta pelo webhook parece mensagem da equipe pelo celular
// e a IA se desliga sozinha na conversa. Por isso toda mídia do sistema passa por aqui.
import { admin as db } from '../supabase/admin'
import { evo } from '../evolution'

/** Conversas em que o sistema está mandando mídia agora (ou acabou de mandar): o eco que volta pelo webhook NÃO é da equipe. */
const enviandoMidia = new Map<string, number>()
export const midiaEmEnvio = (leadId: string) => (enviandoMidia.get(leadId) || 0) > Date.now()

export type TipoMidia = 'audio' | 'imagem' | 'pdf'

export async function enviarMidia(number: any, lead: any, o: { tipo: TipoMidia; b64: string; mime?: string; nome?: string; legenda?: string; body: string; transcript?: string | null; meta?: any; author?: 'ai' | 'human' }) {
  const { markSentByUs } = await import('../engine')
  enviandoMidia.set(lead.id, Date.now() + 150_000) // enquanto envia (áudio longo demora) e 2 min depois
  // registra ANTES de enviar: o eco que volta pelo webhook (que pode cair em outro processo) encontra este registro e não vira "mensagem da equipe"
  const { data: reg } = await db().from('messages').insert({
    lead_id: lead.id, number_id: number.id, direction: 'out', author: o.author || 'ai',
    kind: o.tipo === 'pdf' ? 'document' : o.tipo === 'imagem' ? 'image' : 'audio',
    body: o.body, transcript: o.transcript || null, meta: { ...(o.meta || {}), sistema: true },
  }).select('id').maybeSingle()
  let r: any
  try {
    if (o.tipo === 'audio') r = await evo.sendAudio(number.instance_name, lead.whatsapp, o.b64, 4000 + Math.floor(Math.random() * 4000))
    else if (o.tipo === 'imagem') r = await evo.sendImage(number.instance_name, lead.whatsapp, o.b64, o.mime || 'image/jpeg', o.legenda || '', o.nome || 'imagem.jpg')
    else r = await evo.sendDocument(number.instance_name, lead.whatsapp, o.b64, o.nome || 'arquivo.pdf', o.legenda || '')
  } catch (e) {
    if (reg?.id) await db().from('messages').delete().eq('id', reg.id)
    throw e
  }
  const waId = r?.key?.id || null
  markSentByUs(waId)
  enviandoMidia.set(lead.id, Date.now() + 120_000)
  if (reg?.id && waId) await db().from('messages').update({ wa_message_id: waId }).eq('id', reg.id)
  await db().from('leads').update({ last_outbound_at: new Date().toISOString() }).eq('id', lead.id)
  // se o eco já tinha entrado como "mensagem da equipe" ([mídia]), desfaz: apaga a cópia e devolve a conversa para a IA
  if (waId) {
    const { data: dup } = await db().from('messages').select('id').eq('lead_id', lead.id).eq('wa_message_id', waId).eq('author', 'human').limit(5)
    if (dup?.length) {
      await db().from('messages').delete().in('id', dup.map((d: any) => d.id))
      const { data: ev } = await db().from('lead_events').select('id').eq('lead_id', lead.id).eq('type', 'ai_toggle').gte('created_at', new Date(Date.now() - 5 * 60_000).toISOString()).like('text', '%pelo celular%').limit(1)
      if (ev?.length) await db().from('leads').update({ ai_enabled: true }).eq('id', lead.id)
    }
  }
  return waId
}

export async function baixarArquivo(url: string): Promise<{ b64: string; mime: string }> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('arquivo não abriu (' + r.status + ')')
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: r.headers.get('content-type')?.split(';')[0] || '' }
}
