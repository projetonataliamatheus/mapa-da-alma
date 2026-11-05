// Teste gratuito da página de vendas (mapadelalma.site) e rastreio site → WhatsApp → pagamento.
import { randomInt } from 'node:crypto'
import { admin as db } from './supabase/admin'
import { chaveNome, nomeProprio } from './mapa-alma/nome.ts'
import { montarConteudo, type Bloco } from './mapa-alma/mapa/conteudo.ts'
import { montarAnalise } from './mapa-alma/analise.ts'
import { traduzirTextos } from './i18n'

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const novoRef = () => Array.from({ length: 6 }, () => ALFA[randomInt(ALFA.length)]).join('')
export const refDoTexto = (t: string) => (String(t || '').match(/\bref\s*[:#.\-]?\s*([A-HJ-NP-Z2-9]{6})\b/i)?.[1] || '').toUpperCase()
export const dataBR = (iso: string) => iso.split('-').reverse().join('/')

/** Frases que dão conselho/solução ficam de fora do teste: aqui só o que o mapa aponta, a resposta fica no mapa completo. */
const CONSELHO = /^(o caminho|o ideal|procure|evite|cuide|aprenda|é importante|o segredo|a saída|a solução|o melhor)/i
const frases = (t: string) => String(t || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
const semConselho = (t: string) => frases(t).filter((f) => !CONSELHO.test(f)).join(' ')

export interface Teaser {
  nome: string; nascimento: string; signo: string
  numeros: { rotulo: string; valor: string }[]
  nascimentoTxt: { dia: string; titulo: string; texto: string[] }
  signoTxt: { nome: string; texto: string[] }
  triangulos: { id: string; nome: string; linhas: number[][]; arcano: string; arcanoTexto: string; sequencias: { codigo: string; texto: string }[] }[]
  sombras: string[]
  financeiro: string[]
}

function brutos(nome: string, nasc: string, hoje: string) {
  const c = montarConteudo(nome, nasc, {}, hoje)
  const a = montarAnalise(nome, nasc, {}, hoje)
  const sec = (id: string) => c.secoes.find((s) => s.id === id)
  const b0 = (id: string): Bloco | undefined => sec(id)?.blocos[0]
  const dia = b0('diaNascimento'), signo = sec('signo')
  const sombras = [...new Set(['destino', 'expressao', 'missao', 'motivacao', 'impressao'].flatMap((id) => b0(id)?.sombra || []))].slice(0, 8)
  // frases do mapa que falam de dinheiro/trabalho de forma desafiadora (nunca o "o que fazer")
  const dinheiro = /(financ|dinheiro|dívida|gast|perda|prejuíz|instabilidade|escass)/i
  const alerta = /(dificuldade|perda|instab|tendência|excesso|bloqueio|prejuíz|dívida|escass|desequil)/i
  const cand: string[] = []
  for (const t of a.triangulos) for (const s of t.sequencias) cand.push(semConselho(s.texto.replace(/^Sequência \d+:\s*/i, '')))
  for (const s of c.secoes) {
    if (['signo', 'compatSignos', 'mesAMes', 'proximosAnos', 'horoscopo', 'harmoniaConjugal'].includes(s.id)) continue
    for (const b of s.blocos) for (const p of b.texto || []) if (!/^O QUE FAZER/i.test(p)) for (const f of frases(p)) if (dinheiro.test(f) && alerta.test(f) && !CONSELHO.test(f)) cand.push(f)
  }
  const financeiro = [...new Set(cand.flatMap((x) => frases(x)).filter((f) => dinheiro.test(f) && alerta.test(f)))].slice(0, 3)
  return {
    nome: c.nome, nascimento: c.nascimento, signo: c.signo,
    numeros: ['destino', 'motivacao', 'expressao'].map((id) => ({ rotulo: id, valor: b0(id)?.numero || '' })).filter((x) => x.valor),
    nascimentoTxt: { dia: dia?.numero || '', titulo: dia?.destaque || '', texto: (dia?.texto || []).slice(0, 2) },
    signoTxt: { nome: c.signo, texto: (signo?.blocos[0]?.texto || []).slice(0, 1) },
    triangulos: a.triangulos.map((t) => ({
      id: t.id, nome: t.nome, linhas: t.linhas, arcano: t.arcano.nome, arcanoTexto: t.arcano.texto,
      sequencias: t.sequencias.map((s) => ({ codigo: s.codigo, texto: semConselho(s.texto.replace(/^Sequência \d+:\s*/i, '')) })).filter((s) => s.texto),
    })),
    sombras, financeiro,
  } as Teaser
}

/** Monta o resultado do teste e traduz para o espanhol (cache). Devolve null se a tradução não ficou completa. */
export async function montarTeaser(nome: string, nasc: string, idioma: 'es' | 'pt' = 'es'): Promise<Teaser | null> {
  const t = brutos(nome, nasc, new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10))
  if (idioma === 'pt') return t as Teaser // texto original do mapa, em português (sem tradução)
  const textos: string[] = [t.nascimentoTxt.titulo, ...t.nascimentoTxt.texto, ...t.signoTxt.texto, t.signo, ...t.sombras, ...t.financeiro]
  for (const g of t.triangulos) { textos.push(g.nome, g.arcano, g.arcanoTexto); for (const s of g.sequencias) textos.push(s.texto) }
  const tr = await traduzirTextos(textos.filter(Boolean), { limiteMs: 45_000 })
  const es = (x: string) => (x ? tr.get(x) || '' : '')
  const faltou = textos.filter(Boolean).some((x) => !tr.get(x))
  if (faltou) return null
  return {
    ...t, signo: es(t.signo),
    nascimentoTxt: { dia: t.nascimentoTxt.dia, titulo: es(t.nascimentoTxt.titulo), texto: t.nascimentoTxt.texto.map(es) },
    signoTxt: { nome: es(t.signo), texto: t.signoTxt.texto.map(es) },
    triangulos: t.triangulos.map((g) => ({ ...g, nome: es(g.nome), arcano: es(g.arcano), arcanoTexto: es(g.arcanoTexto), sequencias: g.sequencias.map((s) => ({ codigo: s.codigo, texto: es(s.texto) })) })),
    sombras: t.sombras.map(es), financeiro: t.financeiro.map(es),
  }
}

export const chaveSite = (nome: string) => chaveNome(nome)

/** O contato do WhatsApp veio do site? 1º pelo código (Ref) da mensagem; depois por nome completo + data; por fim, clique recente (provável). */
export async function atribuirSite(lead: any, opts: { texto?: string; nome?: string; nascimentoISO?: string; provavel?: boolean }): Promise<boolean> {
  if (!lead || lead.memory?.site?.ref) return false
  const d = db()
  let sl: any = null, como = ''
  const ref = refDoTexto(opts.texto || '')
  if (ref) { sl = (await d.from('site_leads').select('*').eq('ref', ref).maybeSingle()).data; como = 'codigo' }
  if (!sl && opts.nome && opts.nascimentoISO) {
    const { data } = await d.from('site_leads').select('*').eq('nome_chave', chaveNome(opts.nome)).eq('nascimento', opts.nascimentoISO).is('lead_id', null).order('created_at', { ascending: false }).limit(1)
    sl = data?.[0] || null; if (sl) como = 'nome_data'
  }
  if (!sl && opts.provavel) {
    const desde = new Date(Date.now() - 20 * 60_000).toISOString()
    const { data } = await d.from('site_leads').select('*').is('lead_id', null).gte('wa_click_at', desde).limit(3)
    if (data?.length === 1) { sl = data[0]; como = 'clique_recente' }
  }
  if (!sl || (sl.lead_id && sl.lead_id !== lead.id)) return false
  const provavel = como === 'clique_recente'
  const mem: any = { ...(lead.memory || {}), site: { ref: sl.ref, nome: sl.nome, nascimento: dataBR(sl.nascimento), como, provavel, utm: sl.utm || {} } }
  if (!provavel) { if (!mem.mapa_nome_completo) mem.mapa_nome_completo = sl.nome; if (!mem.mapa_nascimento) mem.mapa_nascimento = dataBR(sl.nascimento) }
  const up: any = { memory: mem }
  if (!provavel && lead.source === 'whatsapp' && !lead.campaign) { up.source = 'site'; up.campaign = sl.idioma === 'pt' ? 'Site mapadaalma.site (teste gratuito)' : 'Site mapadelalma.site (teste gratuito)' }
  await d.from('leads').update(up).eq('id', lead.id)
  lead.memory = mem; if (up.source) { lead.source = up.source; lead.campaign = up.campaign }
  await d.from('site_leads').update({ lead_id: lead.id, matched_by: como }).eq('id', sl.id)
  if (sl.mapa_slug && !provavel) {
    await d.from('mapas').update({ lead_id: lead.id }).eq('slug', sl.mapa_slug).is('lead_id', null).then(() => {}, () => {})
    if (!lead.mapa_slug) { await d.from('leads').update({ mapa_slug: sl.mapa_slug }).eq('id', lead.id); lead.mapa_slug = sl.mapa_slug }
  }
  await d.from('lead_events').insert({ lead_id: lead.id, type: 'site_origem', channel: 'acc', text: `${provavel ? 'Provável origem: ' : ''}veio do site mapadelalma.site (teste gratuito de ${sl.nome}, ${dataBR(sl.nascimento)}) — identificado por ${como === 'codigo' ? 'código da mensagem' : como === 'nome_data' ? 'nome completo e data' : 'clique recente no botão do WhatsApp'}`, meta: { ref: sl.ref, como } }).then(() => {}, () => {})
  if (!provavel) import('./meta-capi').then((m) => m.enviarEvento(lead.id, 'Contact')).catch(() => {})
  return true
}

export { nomeProprio }
