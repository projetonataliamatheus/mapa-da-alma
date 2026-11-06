// Simpatias e orações: biblioteca editável (menu Simpatias). A IA pode oferecer uma como carinho e a equipe manda pela conversa.
import { admin as db } from '../../supabase/admin'

export const TEMAS_SIMPATIA: Record<string, string> = {
  amor: 'Amor e relacionamentos',
  dinheiro: 'Dinheiro e prosperidade',
  trabalho: 'Trabalho e oportunidades',
  saude: 'Saúde e bem-estar',
  familia: 'Família e lar',
  protecao: 'Proteção e energia',
}

export interface Simpatia { id: string; codigo: number; tema: string; tipo: string; titulo: string; texto: string; ativo: boolean; envios: number }

export async function listarSimpatias(soAtivas = false): Promise<Simpatia[]> {
  let q = db().from('simpatias').select('*').order('tema').order('codigo')
  if (soAtivas) q = q.eq('ativo', true)
  const { data, error } = await q
  if (error) return []
  return (data || []) as Simpatia[]
}

/** Lista curta para a IA (código, tema e título). */
export async function blocoSimpatias(): Promise<string> {
  const l = await listarSimpatias(true)
  if (!l.length) return ''
  return `SIMPATIAS (biblioteca da casa; para mandar uma, preencha "enviar_simpatia" com o código)
${l.map((x) => `S${x.codigo} · ${TEMAS_SIMPATIA[x.tema] || x.tema} · ${x.tipo === 'oracao' ? 'oração' : 'simpatia'}: ${x.titulo}`).join('\n')}
Regras:
- É um CARINHO, nunca uma promessa: diga que ajuda a acalmar, a trazer leveza e a lidar com o momento. PROIBIDO dizer que resolve, cura, garante ou faz alguém voltar.
- BRINDE FINAL: no fim do atendimento (depois de entregar o mapa ou o tarô), ofereça UMA simpatia ou oração de presente, do tema que ela contou na conversa (dívidas/dinheiro, amor, trabalho, família, saúde ou proteção). Nunca antes da compra para fechar a venda.
- Quando usar: como presente depois que a pessoa comprou; ou quando ela desabafou sobre amor, dinheiro, trabalho, família ou saúde e ficou abalada (antes ou depois da oferta, sem trocar a oferta pela simpatia). Escolha a do tema que ela contou.
- No máximo 1 por conversa, a não ser que ela peça outra. Avise na mensagem ("vou te mandar uma simpatia simples pra esse momento 💜") e preencha o código; o texto vai sozinho logo depois.
- Saúde: sempre deixe claro que é um apoio para o coração e não substitui o médico nem o tratamento.`
}

/** Texto pronto para mandar no WhatsApp. */
export function textoSimpatia(s: Simpatia): string {
  return `✨ *${s.titulo}*\n\n${s.texto}`
}

/** Texto em espanhol já pronto no banco (titulo_es/texto_es). Se ainda não existir, traduz uma vez, guarda e reaproveita para sempre. */
export async function textoSimpatiaES(s: Simpatia): Promise<string> {
  const x: any = s
  if (x.titulo_es && x.texto_es) return `✨ *${x.titulo_es}*\n\n${x.texto_es}`
  const r = await traduzirSimpatia(s)
  return r ? `✨ *${r.titulo_es}*\n\n${r.texto_es}` : textoSimpatia(s)
}

/** Traduz uma simpatia e grava a versão em espanhol na própria linha. */
export async function traduzirSimpatia(s: Simpatia): Promise<{ titulo_es: string; texto_es: string } | null> {
  try {
    const { traduzirTextos } = await import('../../i18n')
    const m = await traduzirTextos([s.titulo, s.texto], { limiteMs: 60_000 })
    const t = m.get(s.titulo), x = m.get(s.texto)
    if (!t || !x) return null
    await db().from('simpatias').update({ titulo_es: t, texto_es: x }).eq('id', s.id).then(() => {}, () => {})
    return { titulo_es: t, texto_es: x }
  } catch { return null }
}

/** Traduz todas as simpatias que ainda não têm espanhol (roda no robô a cada 10 min e ao salvar). */
export async function garantirSimpatiasES(): Promise<number> {
  const { data } = await db().from('simpatias').select('*').is('texto_es', null)
  let n = 0
  for (const s of (data || []) as Simpatia[]) if (await traduzirSimpatia(s)) n++
  return n
}

export async function simpatiaPorCodigo(cod: string | number): Promise<Simpatia | null> {
  const n = Number(String(cod).replace(/\D/g, ''))
  if (!n) return null
  const { data } = await db().from('simpatias').select('*').eq('codigo', n).eq('ativo', true).maybeSingle()
  return (data as Simpatia) || null
}

export async function contarEnvio(id: string) {
  const { data } = await db().from('simpatias').select('envios').eq('id', id).maybeSingle()
  await db().from('simpatias').update({ envios: (Number(data?.envios) || 0) + 1 }).eq('id', id).then(() => {}, () => {})
}
