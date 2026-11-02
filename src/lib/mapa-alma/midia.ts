// Envio de mídia (áudio gravado, imagem, PDF) já registrando o id do WhatsApp na conversa.
// IMPORTANTE: sem o id, o "eco" da mensagem que volta pelo webhook parece mensagem da equipe pelo celular
// e a IA se desliga sozinha na conversa. Por isso toda mídia do sistema passa por aqui.
import { admin as db } from '../supabase/admin'
import { evo } from '../evolution'

export type TipoMidia = 'audio' | 'imagem' | 'pdf'

export async function enviarMidia(number: any, lead: any, o: { tipo: TipoMidia; b64: string; mime?: string; nome?: string; legenda?: string; body: string; transcript?: string | null; meta?: any; author?: 'ai' | 'human' }) {
  const { markSentByUs } = await import('../engine')
  let r: any
  if (o.tipo === 'audio') r = await evo.sendAudio(number.instance_name, lead.whatsapp, o.b64, 4000 + Math.floor(Math.random() * 4000))
  else if (o.tipo === 'imagem') r = await evo.sendImage(number.instance_name, lead.whatsapp, o.b64, o.mime || 'image/jpeg', o.legenda || '', o.nome || 'imagem.jpg')
  else r = await evo.sendDocument(number.instance_name, lead.whatsapp, o.b64, o.nome || 'arquivo.pdf', o.legenda || '')
  const waId = r?.key?.id || null
  markSentByUs(waId)
  await db().from('messages').insert({
    lead_id: lead.id, number_id: number.id, direction: 'out', author: o.author || 'ai',
    kind: o.tipo === 'pdf' ? 'document' : o.tipo === 'imagem' ? 'image' : 'audio',
    body: o.body, transcript: o.transcript || null, wa_message_id: waId, meta: { ...(o.meta || {}), sistema: true },
  })
  await db().from('leads').update({ last_outbound_at: new Date().toISOString() }).eq('id', lead.id)
  return waId
}

export async function baixarArquivo(url: string): Promise<{ b64: string; mime: string }> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('arquivo não abriu (' + r.status + ')')
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: r.headers.get('content-type')?.split(';')[0] || '' }
}
