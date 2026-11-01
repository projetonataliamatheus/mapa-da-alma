// Entrega do tarô depois do pagamento (ou na conversa gratuita): sorteia, grava, manda o link e agenda a leitura ao vivo.
import { admin as db } from '../../supabase/admin'
import { appBase } from '../../util'
import { sortear, novoSlugTiragem, type Tiragem } from './tiragem.ts'
import { TIRAGENS, tipoPorServico } from './cartas.ts'

export const linkTiragem = (t: { slug: string }) => `${appBase()}/taro/${t.slug}`

export async function criarTiragem(p: { leadId?: string | null; servico?: string | null; tipo?: string | null; pergunta?: string | null; nome?: string | null; paymentId?: string | null }): Promise<Tiragem> {
  const tipo = (p.tipo && TIRAGENS[p.tipo] ? p.tipo : tipoPorServico(p.servico)) || '3cartas'
  const { data, error } = await db().from('tiragens').insert({
    slug: novoSlugTiragem(p.nome), lead_id: p.leadId || null, tipo, pergunta: p.pergunta ? String(p.pergunta).slice(0, 300) : null,
    nome: p.nome || null, cartas: sortear(tipo), liberado: true, payment_id: p.paymentId || null,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data as Tiragem
}

/** Cria a tiragem da conversa, manda o link e marca a leitura ao vivo para daqui a 2–4 min (a "consultora embaralhando e abrindo as cartas"). */
export async function entregarTaro(lead: any, servico: string | null, paymentId: string | null, sendText: (t: string) => Promise<any>) {
  if (paymentId) {
    const { data: ja } = await db().from('tiragens').select('id').eq('payment_id', paymentId).maybeSingle()
    if (ja) return null
  }
  const { data: recente } = await db().from('tiragens').select('id,created_at').eq('lead_id', lead.id).gt('created_at', new Date(Date.now() - 5 * 60_000).toISOString()).limit(1)
  if (recente?.length) return null
  const mem: any = lead.memory || {}
  const nome = String(mem.nome_cliente || mem.mapa_nome_completo || lead.name || '').trim()
  const t = await criarTiragem({ leadId: lead.id, servico, tipo: mem.taro_tipo, pergunta: mem.taro_pergunta, nome, paymentId })
  const def = TIRAGENS[t.tipo]
  await sendText(`${nome.split(' ')[0] || 'Prontinho'}, vou embaralhar as cartas agora pensando na sua pergunta 🔮✨\n\nAs cartas que saírem ficam aqui, pra você ver e guardar 👇\n${linkTiragem(t)}\n\nMe dá uns minutinhos que já volto com a leitura de cada uma, com calma 💜`)
  const ate = Date.now() + (120 + Math.floor(Math.random() * 120)) * 1000
  const nova = { ...mem, taro_ativa: t.slug, consulta_pendente: { tema: `leitura do tarô (${def.nome})`, ate }, ultima_consulta: Date.now() }
  await db().from('leads').update({ memory: nova, reply_due_at: new Date(ate).toISOString() }).eq('id', lead.id)
  return t
}
