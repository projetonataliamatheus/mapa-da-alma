/**
 * Tradução PT → ES com cache: cada trecho é traduzido uma única vez (tabela traducoes) e reaproveitado em todos os mapas e mensagens.
 * Usado para: (1) mapa/prévia/pirâmides/PDF em espanhol (traduzirHtml), (2) rede de segurança das mensagens fixas do sistema (traduzirMensagem).
 */
import { createHash } from 'crypto'
import { admin as db } from './supabase/admin'
import { structured } from './ai'

const sha = (t: string, idioma = 'es') => createHash('sha1').update(idioma + '\n' + t).digest('hex')

/** Texto em português? (ã, õ, ç ou palavras típicas; o espanhol não tem esses sinais) */
export const pareceTextoPT = (t: string) => t.trim().length >= 10 && (/[ãõç]/i.test(t) || /\b(você|vocês|não|está|obrigad[oa]|pra|tá|então|também|pagamento|mapa da alma)\b/i.test(t) && !/[ñ¿¡]/.test(t))

const SYS_ES = `Você traduz textos de um serviço de numerologia cabalística, astrologia e tarô (o "Mapa da Alma") do português do Brasil para espanhol latino-americano NEUTRO (tratamento "tú"), em tom caloroso, acolhedor e humano, como uma consultora falando com uma cliente.
Regras:
- Preserve exatamente: emojis, quebras de linha, negrito (**texto** e *texto*), URLs, números, datas em formato numérico, nomes próprios e entidades HTML (&amp; &nbsp; etc.).
- Marcadores como <1>…</1>, <2>, <br> devem ficar iguais, na mesma ordem e em volta das palavras equivalentes.
- Vocabulário: lidar = lidiar/afrontar; entender; aprender; descubrir; aliviar; calmar. Nunca use "resolver" nem "curar" se o original não usar.
- Termos: Desejo da Alma = Deseo del Alma; Expressão = Expresión; Impressão = Impresión; Destino; Missão = Misión; Dom do Dia = Don del Día; Pirâmide = Pirámide; bloqueios = bloqueos; Mapa da Alma = Mapa del Alma; pagamento único = pago único.
- Signos e meses em espanhol (Virgem = Virgo, setembro = septiembre). Valores de dinheiro ficam como estão.
- Devolva SOMENTE a lista de traduções, na mesma ordem e com o mesmo número de itens.`

const SCHEMA = { type: 'object', properties: { itens: { type: 'array', items: { type: 'string' } } }, required: ['itens'] }

async function traduzLote(lote: string[]): Promise<string[]> {
  const r = await structured<{ itens: string[] }>(SYS_ES, JSON.stringify(lote), 'traducao', SCHEMA, 12000, { task: 'traducao' })
  const it = Array.isArray(r?.itens) ? r.itens.map((x) => String(x ?? '')) : []
  if (it.length === lote.length) return it
  // quantidade diferente: traduz um a um (garante o pareamento)
  if (lote.length === 1) return ['']
  const out: string[] = []
  for (const t of lote) out.push((await traduzLote([t]))[0] || t)
  return out
}

/** Traduz uma lista de textos (com cache). Se der erro ou passar do prazo, o texto original segue (o resultado ainda é guardado em segundo plano). */
export async function traduzirTextos(textos: string[], o: { limiteMs?: number } = {}): Promise<Map<string, string>> {
  const unicos = [...new Set(textos.map((t) => String(t)).filter((t) => t.trim()))]
  const res = new Map<string, string>()
  if (!unicos.length) return res
  // cache
  for (let i = 0; i < unicos.length; i += 150) {
    const parte = unicos.slice(i, i + 150)
    const { data } = await db().from('traducoes').select('hash,traducao').in('hash', parte.map((t) => sha(t)))
    const mapa = new Map((data || []).map((r: any) => [r.hash, r.traducao]))
    for (const t of parte) { const h = mapa.get(sha(t)); if (h) res.set(t, h as string) }
  }
  const faltam = unicos.filter((t) => !res.has(t))
  if (!faltam.length) return res
  // lotes por tamanho
  const lotes: string[][] = []
  let atual: string[] = [], chars = 0
  for (const t of faltam) {
    if (atual.length && (atual.length >= 40 || chars + t.length > 6000)) { lotes.push(atual); atual = []; chars = 0 }
    atual.push(t); chars += t.length
  }
  if (atual.length) lotes.push(atual)
  const fim = o.limiteMs ? Date.now() + o.limiteMs : 0
  const rodar = async (lote: string[]) => {
    const tr = await traduzLote(lote)
    const linhas = lote.map((t, i) => ({ hash: sha(t), idioma: 'es', original: t, traducao: tr[i] || '' })).filter((l) => l.traducao.trim())
    if (linhas.length) await db().from('traducoes').upsert(linhas).then(() => {}, () => {})
    lote.forEach((t, i) => { if (tr[i]) res.set(t, tr[i]) })
  }
  // 4 lotes ao mesmo tempo
  const fila = [...lotes]
  const trabalhador = async () => {
    for (;;) {
      const lote = fila.shift()
      if (!lote) return
      const p = rodar(lote).catch((e) => console.error('[traducao]', e?.message || e))
      if (fim) { const resta = fim - Date.now(); if (resta <= 0) return; await Promise.race([p, new Promise((r) => setTimeout(r, resta))]) } else await p
    }
  }
  await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()])
  return res
}

/** Mensagem do WhatsApp em português → espanhol (cache). Em erro devolve o original. */
export async function traduzirMensagem(texto: string): Promise<string> {
  try {
    const m = await traduzirTextos([texto], { limiteMs: 20000 })
    return m.get(texto) || texto
  } catch { return texto }
}

// ---------- HTML ----------
const INLINE = new Set(['strong', 'em', 'b', 'i', 'u', 'span', 'a', 'small', 'sup', 'sub', 'mark', 'abbr', 'br', 'code'])
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-t', 'data-title', 'data-label']
const temLetra = (t: string) => /\p{L}/u.test(t.replace(/&[a-z#0-9]+;/gi, ' '))

interface Seg { partes: { tipo: 'txt' | 'tag'; v: string; id?: number; fecha?: boolean }[]; marc: string[]; pilha: { nome: string; id: number }[] }

/** Traduz o HTML (texto, títulos, placeholders…) sem mexer em tags, scripts e estilos. `limiteMs`: o que não ficar pronto segue em português. */
export async function traduzirHtml(html: string, o: { limiteMs?: number; estado?: { completo: boolean } } = {}): Promise<string> {
  const guarda: string[] = []
  let h = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, (m) => { guarda.push(m); return `<!--G${guarda.length - 1}-->` })
  const tokens = h.split(/(<[^>]+>)/)
  // monta segmentos
  const segs: { ini: number; fim: number; seg: Seg; texto: string }[] = []
  const attrs: { idx: number; nome: string; valor: string }[] = []
  let atual: Seg | null = null, iniAtual = -1, ultimoTxt = -1
  const flush = () => {
    if (atual && ultimoTxt >= 0) {
      const texto = atual.partes.slice(0, atual.partes.length).map((p) => (p.tipo === 'txt' ? p.v : p.fecha ? `</${p.id}>` : p.id === -1 ? p.v : `<${p.id}>`)).join('')
      if (temLetra(atual.partes.filter((p) => p.tipo === 'txt').map((p) => p.v).join(' '))) segs.push({ ini: iniAtual, fim: ultimoTxt, seg: atual, texto: texto.trim() })
    }
    atual = null; iniAtual = -1; ultimoTxt = -1
  }
  tokens.forEach((tk, i) => {
    if (i % 2 === 1) {
      const m = /^<\s*(\/?)\s*([a-zA-Z0-9-]+)/.exec(tk)
      const nome = (m?.[2] || '').toLowerCase()
      if (!m || tk.startsWith('<!--')) { return }
      // atributos traduzíveis
      if (!m[1]) for (const a of ATTRS) {
        const r = new RegExp(`\\s${a}="([^"]*)"`, 'i').exec(tk)
        if (r && temLetra(r[1])) attrs.push({ idx: i, nome: a, valor: r[1] })
      }
      if (INLINE.has(nome)) {
        if (!atual) { atual = { partes: [], marc: [], pilha: [] }; iniAtual = i }
        if (nome === 'br') atual.partes.push({ tipo: 'tag', v: tk, id: -1 })
        else if (m[1]) {
          const k = [...atual.pilha].reverse().findIndex((x) => x.nome === nome)
          if (k < 0) { flush(); return }
          const [it] = atual.pilha.splice(atual.pilha.length - 1 - k, 1)
          atual.partes.push({ tipo: 'tag', v: tk, id: it.id, fecha: true })
        } else if (/\/\s*>$/.test(tk)) atual.partes.push({ tipo: 'tag', v: tk, id: -1 })
        else { atual.marc.push(tk); atual.pilha.push({ nome, id: atual.marc.length }); atual.partes.push({ tipo: 'tag', v: tk, id: atual.marc.length }) }
      } else flush()
    } else if (tk.trim()) {
      if (!atual) { atual = { partes: [], marc: [], pilha: [] }; iniAtual = i }
      atual.partes.push({ tipo: 'txt', v: tk })
      ultimoTxt = i
    } else if (atual) atual.partes.push({ tipo: 'txt', v: tk })
  })
  flush()
  const lista = [...segs.map((s) => s.texto), ...attrs.map((a) => a.valor)]
  let mapa = new Map<string, string>()
  try { mapa = await traduzirTextos(lista, o) } catch (e: any) { console.error('[traduzirHtml]', e?.message || e) }
  if (o.estado) o.estado.completo = lista.filter((t) => t.trim()).every((t) => mapa.has(t))
  // reconstrói
  const saida = [...tokens]
  const refaz = (seg: Seg, tr: string) => {
    // volta os marcadores para as tags originais; se faltar algum, mantém o original
    const abre = new Set([...tr.matchAll(/<(\d+)>/g)].map((m) => m[1]))
    const esperado = new Set(seg.partes.filter((p) => p.tipo === 'tag' && p.id! > 0 && !p.fecha).map((p) => String(p.id)))
    if ([...esperado].some((x) => !abre.has(x)) || [...abre].some((x) => !esperado.has(x))) return null
    return tr.replace(/<(\d+)>/g, (_, n) => seg.marc[Number(n) - 1]).replace(/<\/(\d+)>/g, (_, n) => { const t = /^<\s*([a-zA-Z0-9]+)/.exec(seg.marc[Number(n) - 1] || ''); return t ? `</${t[1]}>` : '' })
  }
  for (const s of segs) {
    const tr = mapa.get(s.texto)
    if (!tr) continue
    const novo = refaz(s.seg, tr)
    if (novo == null) continue
    // preserva espaços de borda; troca o primeiro token do segmento e esvazia os demais
    const lead = (tokens[s.ini].match(/^\s*/) || [''])[0], trail = (tokens[s.fim].match(/\s*$/) || [''])[0]
    saida[s.ini] = lead + novo + trail
    for (let k = s.ini + 1; k <= s.fim; k++) saida[k] = ''
  }
  for (const a of attrs) {
    const tr = mapa.get(a.valor)
    if (tr) saida[a.idx] = saida[a.idx].replace(new RegExp(`(\\s${a.nome}=")[^"]*(")`, 'i'), (_m: string, p1: string, p2: string) => p1 + tr.replace(/"/g, '&quot;') + p2)
  }
  h = saida.join('').replace(/<!--G(\d+)-->/g, (_, n) => guarda[Number(n)]).replace(/<html([^>]*)\blang="[^"]*"/i, '<html$1lang="es"')
  return h
}
