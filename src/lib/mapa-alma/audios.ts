// Biblioteca de áudios gravados: a IA (e a equipe) mandam como resposta pronta para situações e dúvidas.
// Regra de ouro: o mesmo áudio NUNCA vai duas vezes para o mesmo contato (só se a conversa for limpa e recomeçar).
import { admin as db } from '../supabase/admin'

export interface AudioPronto { id: string; codigo: number; nome: string; intuito?: string | null; transcricao?: string | null; url: string; mime?: string | null; ativo: boolean; usos: number; idioma?: string | null }

export const jaEnviado = (lead: any, a: { id: string; url: string }) => {
  const l: string[] = Array.isArray(lead?.memory?.audios_enviados) ? lead.memory.audios_enviados : []
  return l.includes(a.id) || l.includes(a.url)
}

export async function listarAudios(soAtivos = false): Promise<AudioPronto[]> {
  let q = db().from('audios').select('*').order('codigo')
  if (soAtivos) q = q.eq('ativo', true)
  const { data, error } = await q
  return error ? [] : ((data || []) as AudioPronto[])
}

/** Bloco para a IA: só os áudios ativos que ESTE contato ainda não recebeu. */
export async function blocoAudios(lead: any): Promise<string> {
  const lang = lead?.idioma === 'es' ? 'es' : 'pt'
  const l = (await listarAudios(true)).filter((a) => !jaEnviado(lead, a) && (a.idioma || 'pt') === lang)
  if (!l.length) return ''
  return `ÁUDIOS PRONTOS (gravados pela ${'atendente'}; para mandar um, preencha "enviar_audio" com o código)
${l.map((a) => `A${a.codigo} · ${a.nome}${a.intuito ? ` · quando usar: ${a.intuito}` : ''}${a.transcricao ? ` · o que ele diz: "${String(a.transcricao).slice(0, 400)}"` : ''}`).join('\n')}
Regras: mande um áudio só quando ele responde EXATAMENTE ao momento da conversa (o intuito bate com o que a pessoa disse ou perguntou). No máximo 1 por resposta. Quando mandar, o seu texto fica curto (uma frase ou nada de novo), porque o áudio já fala; e NÃO repita no texto o que o áudio diz. Os áudios desta lista ainda não foram enviados para esta pessoa; depois de enviado, ele sai da lista.`
}

export async function audioPorCodigo(cod: string | number): Promise<AudioPronto | null> {
  const n = Number(String(cod).replace(/\D/g, ''))
  if (!n) return null
  const { data } = await db().from('audios').select('*').eq('codigo', n).eq('ativo', true).maybeSingle()
  return (data as AudioPronto) || null
}

/** Manda o áudio (se ainda não foi para este contato). Devolve false se já tinha ido. */
export async function enviarAudioPronto(number: any, lead: any, a: AudioPronto, author: 'ai' | 'human' = 'ai'): Promise<boolean> {
  if (jaEnviado(lead, a)) return false
  const { enviarMidia, baixarArquivo } = await import('./midia')
  const { marcarAudio } = await import('./fluxo')
  const f = await baixarArquivo(a.url)
  await enviarMidia(number, lead, { tipo: 'audio', b64: f.b64, mime: f.mime || a.mime || 'audio/mpeg', body: `🎤 ${a.transcricao || a.nome}`, transcript: a.transcricao || null, author, meta: { audio_id: a.id, url: a.url } })
  await marcarAudio(lead, a.id, a.url)
  await db().from('audios').update({ usos: (Number(a.usos) || 0) + 1 }).eq('id', a.id).then(() => {}, () => {})
  return true
}
