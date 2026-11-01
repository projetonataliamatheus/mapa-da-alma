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
- Quando usar: como presente depois que a pessoa comprou; ou quando ela desabafou sobre amor, dinheiro, trabalho, família ou saúde e ficou abalada (antes ou depois da oferta, sem trocar a oferta pela simpatia). Escolha a do tema que ela contou.
- No máximo 1 por conversa, a não ser que ela peça outra. Avise na mensagem ("vou te mandar uma simpatia simples pra esse momento 💜") e preencha o código; o texto vai sozinho logo depois.
- Saúde: sempre deixe claro que é um apoio para o coração e não substitui o médico nem o tratamento.`
}

/** Texto pronto para mandar no WhatsApp. */
export function textoSimpatia(s: Simpatia): string {
  return `✨ *${s.titulo}*\n\n${s.texto}`
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
