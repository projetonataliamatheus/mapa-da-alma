// Menu Campanhas: de onde o contato veio. Cada campanha tem a mensagem pronta do anúncio (ou palavras-chave);
// quando a 1ª mensagem do cliente bate, a conversa é marcada com a campanha (e pode usar um fluxo de abertura próprio).
import { admin as db } from '../supabase/admin'
import { similar } from '../engine'
import { norm } from '../util'

export const ORIGENS: Record<string, string> = {
  meta: 'Meta Ads (Instagram/Facebook)',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google (página de vendas)',
  site: 'Site / página',
  indicacao: 'Indicação',
  outro: 'Outro',
}
/** origem da campanha → "source" da conversa */
export const sourceDaOrigem = (o: string) => (['meta', 'instagram', 'facebook'].includes(o) ? 'anuncio' : o === 'indicacao' ? 'indicacao' : 'site')

export async function campanhaDaMensagem(msg: string): Promise<any | null> {
  const t = norm(String(msg || ''))
  if (t.length < 2) return null
  const { data, error } = await db().from('campanhas').select('*').eq('ativo', true)
  if (error || !data?.length) return null
  const hoje = new Date().toISOString().slice(0, 10)
  let best: any = null
  let score = 0
  for (const c of data) {
    if (c.inicio && c.inicio > hoje) continue
    if (c.fim && c.fim < hoje) continue
    const m = norm(String(c.mensagem || ''))
    let sc = 0
    if (m.length >= 6) {
      if (t.includes(m) || m.includes(t) && t.length >= 12) sc = 1
      else sc = similar(m, t)
    }
    const pal = String(c.palavras || '').split(/\n|,/).map((x: string) => norm(x)).filter((x: string) => x.length >= 3)
    if (pal.some((p: string) => t.includes(p))) sc = Math.max(sc, 0.9)
    if (sc > score) { score = sc; best = c }
  }
  return score >= 0.72 ? best : null
}
