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

const LEMBRETES = [
  '{nome}, passando com carinho 💜 Conseguiu ler o seu mapa com calma? Muita gente, depois do mapa, sente vontade de fazer uma pergunta específica: sobre amor, dinheiro ou uma decisão. As cartas do tarô respondem exatamente isso. Tem alguma pergunta no seu coração agora?',
  'Oi, {nome}! ✨ Espero que o seu mapa esteja te ajudando. Se tiver alguma dúvida que ficou martelando (um relacionamento, o trabalho, a família), dá pra gente abrir as cartas do tarô só pra ela. Quer que eu te conte como funciona?',
  '{nome}, tudo bem? 🌙 Fiquei pensando no seu mapa... Ele mostra o caminho geral, mas às vezes a gente precisa de uma resposta mais direta pra um momento específico. Pra isso eu faço a leitura das cartas do tarô. Tem algo que você queira perguntar às cartas?',
]

/**
 * Lembrete do tarô: 1 a 2 dias depois de receber o mapa completo, uma mensagem carinhosa oferecendo uma pergunta às cartas.
 * Uma vez só por cliente, no horário de atendimento, só com a IA ligada, sem tarô comprado e sem conversa em andamento nas últimas horas.
 */
export async function lembretesTaro(enviar: (lead: any, texto: string) => Promise<void>, limite = 3): Promise<number> {
  const agora = Date.now()
  const { data: mapas } = await db().from('mapas').select('lead_id,sent_at').not('lead_id', 'is', null).not('sent_at', 'is', null)
    .lt('sent_at', new Date(agora - 24 * 3600_000).toISOString()).gt('sent_at', new Date(agora - 48 * 3600_000).toISOString()).limit(50)
  let n = 0
  for (const mp of mapas || []) {
    if (n >= limite) break
    const { data: lead } = await db().from('leads').select('*').eq('id', mp.lead_id).maybeSingle()
    if (!lead || !lead.whatsapp || !lead.ai_enabled || lead.ai_locked || lead.opted_out) continue
    const mem: any = lead.memory || {}
    if (mem.taro_oferta_em || mem.taro_ativa) continue
    if (lead.last_inbound_at && agora - new Date(lead.last_inbound_at).getTime() < 6 * 3600_000) continue
    const { data: ja } = await db().from('tiragens').select('id').eq('lead_id', lead.id).limit(1)
    if (ja?.length) continue
    const nome = String(mem.nome_cliente || lead.name || '').split(' ')[0]
    const texto = LEMBRETES[Math.floor(Math.random() * LEMBRETES.length)].replace('{nome}', nome || 'Oi')
    await db().from('leads').update({ memory: { ...mem, taro_oferta_em: new Date().toISOString() } }).eq('id', lead.id)
    await enviar(lead, texto)
    n++
  }
  return n
}

/** PDF da tiragem (gerado uma vez e guardado no Storage, como o do mapa). */
export async function pdfDaTiragem(t: any): Promise<Buffer> {
  const { mapaEmEspanhol, emEspanholSeCabe } = await import('../servico.ts')
  const es = await mapaEmEspanhol({ lead_id: t.lead_id })
  const path = es ? `taro/${t.slug}-es.pdf` : `taro/${t.slug}.pdf`
  const { data: salvo } = await db().storage.from('mapas').download(path)
  if (salvo) return Buffer.from(await salvo.arrayBuffer())
  const { htmlTiragem } = await import('./tiragem.ts')
  const { pdfBrowserless, marcaDoMapa } = await import('../servico.ts')
  const html0 = htmlTiragem(t, await marcaDoMapa(), { pdf: true })
  const pdf = await pdfBrowserless(es ? await emEspanholSeCabe({ lead_id: t.lead_id }, html0, 0, 'es', false) : html0)
  await db().storage.from('mapas').upload(path, pdf, { contentType: 'application/pdf', upsert: true })
  return pdf
}
