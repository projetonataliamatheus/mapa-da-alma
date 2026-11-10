// Etapas do quiz de teste (/quizz): o mapa real da pessoa dividido em ~45 pontos, um por tela.
// Só o que o mapa APONTA entra aqui; "o que fazer" (plano/conselho) fica no mapa completo.
import { montarConteudo } from './mapa-alma/mapa/conteudo.ts'
import { montarAnalise } from './mapa-alma/analise.ts'

export interface EtapaQuiz {
  tema: string            // seção do mapa (ex.: "Desejo da Alma")
  titulo: string
  num?: string
  destaque?: string
  texto: string[]
  pontos?: string[]       // pontos de atenção (sombras)
  linhas?: number[][]     // pirâmide
  arcano?: string
  arcanoTexto?: string
}

const CONSELHO = /^(o caminho|o ideal|procure|evite|cuide|aprenda|é importante|o segredo|a saída|a solução|o melhor|o que fazer)/i
const frases = (t: string) => String(t || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
const limpo = (t: string) => frases(t).filter((f) => !CONSELHO.test(f)).join(' ')
const corta = (ps: string[], max = 650) => { const o: string[] = []; let n = 0; for (const p of ps.map(limpo).filter(Boolean)) { if (o.length && n + p.length > max) break; o.push(p); n += p.length } return o }

export function etapasBrutas(nome: string, nasc: string, hoje: string): EtapaQuiz[] {
  const c: any = montarConteudo(nome, nasc, {}, hoje)
  const a: any = montarAnalise(nome, nasc, {}, hoje)
  const sec = (id: string) => c.secoes.find((s: any) => s.id === id)
  const out: EtapaQuiz[] = []
  const bl = (id: string, idx: number, extra: { sombra?: boolean; max?: number } = {}) => {
    const s = sec(id); const b = s?.blocos?.[idx]; if (!b) return
    const texto = corta(b.texto || [], extra.max)
    const pontos = extra.sombra ? (b.sombra || []).map(limpo).filter(Boolean).slice(0, 4) : []
    if (!texto.length && !pontos.length) return
    out.push({ tema: s.titulo, titulo: b.rotulo || s.titulo, num: b.numero && b.numero !== '—' ? String(b.numero) : undefined, destaque: b.destaque, texto, pontos: pontos.length ? pontos : undefined })
  }
  const tri = (i: number) => {
    const t = a.triangulos?.[i]; if (!t) return
    const seq = (t.sequencias || []).map((s: any) => limpo(String(s.texto || '').replace(/^Sequência \d+:\s*/i, ''))).filter(Boolean)
    out.push({ tema: 'Pirâmides cabalísticas', titulo: t.nome, texto: seq.slice(0, 2), linhas: t.linhas, arcano: t.arcano?.nome, arcanoTexto: limpo(t.arcano?.texto || '') })
  }
  bl('signo', 0); bl('signo', 1)
  bl('diaNascimento', 0)
  bl('letras', 0, { max: 300 }); bl('letras', 1)
  bl('motivacao', 0, { sombra: true }); bl('impressao', 0, { sombra: true }); bl('expressao', 0, { sombra: true })
  bl('destino', 0, { sombra: true }); bl('missao', 0, { sombra: true })
  bl('talentoOculto', 0); bl('numeroPsiquico', 0); bl('respostaSubconsciente', 0)
  bl('tendenciasOcultas', 0); bl('tendenciasOcultas', 1); bl('tendenciasOcultas', 2)
  bl('licoesCarmicas', 0); bl('dividasCarmicas', 0)
  bl('desafios', 0); bl('desafios', 1); bl('desafios', 2)
  bl('cores', 0)
  bl('ciclos', 0); bl('ciclos', 1); bl('ciclos', 2)
  bl('momentos', 0); bl('momentos', 1); bl('momentos', 2); bl('momentos', 3)
  bl('harmoniaConjugal', 0); bl('harmoniaConjugal', 1)
  bl('arcanos', 0)
  tri(0); tri(1); tri(2); tri(3)
  bl('letras', 2); bl('letras', 3); bl('letras', 4)
  bl('dias', 0); bl('anoPessoal', 0); bl('horoscopo', 0); bl('mesPessoal', 0); bl('diaPessoal', 0)
  bl('arcanosVida', 0); bl('arcanosVida', 1); bl('arcanosVida', 2)
  return out.slice(0, 50)
}

const temLetra = (t: string) => /\p{L}/u.test(t)
/** Monta as etapas e, em espanhol, traduz (com cache). Etapas cuja tradução não ficou completa são descartadas: nunca sai português para quem é de fora. */
export async function montarEtapasQuiz(nome: string, nasc: string, idioma: 'es' | 'pt'): Promise<EtapaQuiz[] | null> {
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
  const e = etapasBrutas(nome, nasc, hoje)
  if (!e.length) return null
  if (idioma === 'pt') return e
  const textos = new Set<string>()
  const add = (x?: string) => { if (x && temLetra(x)) textos.add(x) }
  for (const s of e) { add(s.tema); add(s.titulo); add(s.num); add(s.destaque); s.texto.forEach(add); s.pontos?.forEach(add); add(s.arcano); add(s.arcanoTexto) }
  const { traduzirTextos } = await import('./i18n')
  const tr = await traduzirTextos([...textos], { limiteMs: 52_000 })
  const es = (x?: string) => (x ? (temLetra(x) ? tr.get(x) || '' : x) : undefined)
  const res: EtapaQuiz[] = []
  for (const s of e) {
    const ok = (x?: string) => !x || !!es(x)
    if (![s.tema, s.titulo, s.num, s.destaque, s.arcano, s.arcanoTexto, ...s.texto, ...(s.pontos || [])].every(ok)) continue
    res.push({ ...s, tema: es(s.tema)!, titulo: es(s.titulo)!, num: es(s.num), destaque: es(s.destaque), texto: s.texto.map((t) => es(t)!), pontos: s.pontos?.map((t) => es(t)!), arcano: es(s.arcano), arcanoTexto: es(s.arcanoTexto) })
  }
  return res.length >= 12 ? res : null
}
