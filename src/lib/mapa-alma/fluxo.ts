// Menu Fluxo: sequência de passos (texto, áudio, imagem, PDF, espera, aguardar resposta) que roda no começo da conversa,
// antes da IA. O relógio do fluxo é o mesmo "reply_due_at" das respostas: o worker chama handleReply, que chama runFluxo.
// Estado na memória da conversa: memory.fluxo = { id, i, desde?, agendado?, fim? }.
import { admin as db } from '../supabase/admin'
import { evo } from '../evolution'
import { greetingWord } from '../prompts'
import { spNow } from '../util'

export type TipoPasso = 'texto' | 'audio' | 'imagem' | 'pdf' | 'espera' | 'aguardar' | 'ia'
export interface Passo {
  id: string
  tipo: TipoPasso
  texto?: string            // texto (ou legenda da imagem/PDF)
  url?: string              // arquivo (áudio, imagem, PDF)
  nome_arquivo?: string
  transcricao?: string      // o que o áudio diz (a IA lê isso para saber o que já foi falado)
  atraso?: [number, number] // segundos antes de enviar
  minutos?: [number, number] // espera: minutos parados antes do próximo passo
  apos_resposta?: [number, number] // aguardar/ia: minutos depois que o cliente responde
  limite?: number | null    // aguardar: segue sozinho depois de X min sem resposta (vazio = espera a resposta)
}
export interface Fluxo { id: string; nome: string; descricao?: string; ativo: boolean; padrao: boolean; passos: Passo[]; iniciados?: number; concluidos?: number }

export const TIPOS: Record<TipoPasso, string> = {
  texto: 'Mensagem de texto',
  audio: 'Áudio (gravado)',
  imagem: 'Imagem',
  pdf: 'PDF',
  espera: 'Esperar um tempo',
  aguardar: 'Aguardar resposta',
  ia: 'Passar para a IA',
}

const rnd = (r?: [number, number] | number[] | null, def: [number, number] = [0, 0]) => {
  const [a, b] = Array.isArray(r) && r.length ? [Number(r[0]) || 0, Number(r[1] ?? r[0]) || 0] : def
  return a + Math.random() * Math.max(0, b - a)
}
const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Troca as variáveis do texto: {saudacao} {atendente} {empresa} {nome}. */
export function variaveis(t: string, settings: any, lead: any, atendente: string) {
  const es = lead?.idioma === 'es'
  const hr = Math.floor(spNow().minutes / 60)
  const saludo = hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches'
  const g = es ? saludo : greetingWord(settings, spNow().minutes) || 'Olá'
  const nome = String(lead?.memory?.nome_cliente || '').split(' ')[0]
  return String(t || '')
    .replace(/\{saludo\}/gi, saludo)
    .replace(/\{saudacao\}/gi, g.charAt(0).toUpperCase() + g.slice(1))
    .replace(/\{atendente\}/gi, atendente || settings?.assistant_name || '')
    .replace(/\{empresa\}/gi, settings?.company_name || '')
    .replace(/\{nome\}/gi, nome)
    .replace(/\s+([!?.,])/g, '$1')
    .trim()
}

/** Qual fluxo de abertura usar: o da campanha do contato (se ligado) ou o padrão ligado. */
export async function fluxoDoLead(lead: any): Promise<Fluxo | null> {
  const lang = lead?.idioma === 'es' ? 'es' : 'pt'
  const ok = (f: any) => ((f?.idioma as string) || 'pt') === lang
  if (lead.campanha_id) {
    const { data: c } = await db().from('campanhas').select('fluxo_id').eq('id', lead.campanha_id).maybeSingle()
    if (c?.fluxo_id) {
      const { data: f } = await db().from('fluxos').select('*').eq('id', c.fluxo_id).eq('ativo', true).maybeSingle()
      if (f && ok(f)) return f as Fluxo
    }
  }
  const { data } = await db().from('fluxos').select('*').eq('ativo', true).eq('padrao', true)
  return (((data || []) as any[]).find(ok) as Fluxo) || null
}

async function baixar(url: string): Promise<{ b64: string; mime: string }> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('arquivo não abriu (' + r.status + ')')
  return { b64: Buffer.from(await r.arrayBuffer()).toString('base64'), mime: r.headers.get('content-type')?.split(';')[0] || '' }
}

/**
 * Roda o fluxo desta conversa. Devolve true se o fluxo cuidou deste momento (a IA NÃO responde agora)
 * ou false se a IA deve responder (sem fluxo, fluxo terminou ou chegou no passo "Passar para a IA").
 */
export async function runFluxo(lead: any, number: any, settings: any, history: any[], force = false): Promise<boolean> {
  const { sendAndRecord, logEvent, withAgent } = await import('../engine')
  let st: any = lead.memory?.fluxo || null
  if (st?.fim) return false
  if (force) {
    if (st) await salvar(lead, { ...st, fim: Date.now(), motivo: 'responder agora' })
    return false
  }
  let fl: Fluxo | null = null
  if (!st) {
    // só em conversa nova: ninguém da nossa parte falou ainda
    if (history.some((m) => m.direction === 'out' && m.author !== 'system')) return false
    fl = await fluxoDoLead(lead)
    if (!fl || !(fl.passos || []).length) return false
    st = { id: fl.id, i: 0, inicio: Date.now() }
    await salvar(lead, st)
    await db().from('fluxos').update({ iniciados: (Number(fl.iniciados) || 0) + 1 }).eq('id', fl.id).then(() => {}, () => {})
    await logEvent(lead.id, 'fluxo', 'ai', `Fluxo "${fl.nome}" começou para ${lead.name}`)
  } else {
    const { data } = await db().from('fluxos').select('*').eq('id', st.id).maybeSingle()
    fl = (data as Fluxo) || null
    if (!fl || !fl.ativo) {
      await salvar(lead, { ...st, fim: Date.now(), motivo: 'fluxo desligado' })
      return false
    }
  }
  const atendente = withAgent(settings, number).assistant_name || settings.assistant_name || ''
  const passos = fl.passos || []
  const ultimaEntrada = () => {
    const ins = history.filter((m) => m.direction === 'in')
    return ins.length ? new Date(ins[ins.length - 1].created_at).getTime() : 0
  }
  const agenda = async (quando: number | null) => {
    await db().from('leads').update({ reply_due_at: quando ? new Date(quando).toISOString() : null }).eq('id', lead.id)
  }
  const termina = async (motivo: string) => {
    st = { ...st, fim: Date.now(), motivo }
    await salvar(lead, st)
    await db().from('fluxos').update({ concluidos: (Number(fl!.concluidos) || 0) + 1 }).eq('id', fl!.id).then(() => {}, () => {})
    await logEvent(lead.id, 'fluxo_fim', 'ai', `Fluxo "${fl!.nome}" terminou para ${lead.name}: a IA assume`)
  }

  while (st.i < passos.length) {
    const p = passos[st.i]
    const agora = Date.now()
    if (['texto', 'audio', 'imagem', 'pdf'].includes(p.tipo)) {
      await dorme(Math.min(25, rnd(p.atraso, [1, 3])) * 1000)
      try {
        if (p.tipo === 'texto') {
          const t = variaveis(p.texto || '', settings, lead, atendente)
          if (t) await sendAndRecord(number, lead, t, 'ai', true, { fluxo: fl.id })
        } else if (p.tipo === 'audio' && p.url && ((lead.memory?.audios_enviados || []) as string[]).some((x) => x === p.url || x === (p as any).audio_id)) {
          await logEvent(lead.id, 'fluxo_aviso', 'acc', `Fluxo "${fl.nome}": o áudio do passo ${st.i + 1} já tinha sido enviado para ${lead.name} e foi pulado`)
        } else if (!p.url) {
          await logEvent(lead.id, 'fluxo_aviso', 'warn', `Fluxo "${fl.nome}": o passo ${st.i + 1} (${TIPOS[p.tipo]}) está sem arquivo e foi pulado`)
        } else {
          const f = await baixar(p.url)
          const leg = variaveis(p.texto || '', settings, lead, atendente)
          const { enviarMidia } = await import('./midia')
          const corpo = p.tipo === 'audio' ? `🎤 ${p.transcricao || '[áudio do fluxo]'}` : p.tipo === 'imagem' ? `[imagem] ${leg}`.trim() : `[PDF ${p.nome_arquivo || ''}] ${leg}`.trim()
          await enviarMidia(number, lead, { tipo: p.tipo as any, b64: f.b64, mime: f.mime, nome: p.nome_arquivo, legenda: leg, body: corpo, transcript: p.tipo === 'audio' ? p.transcricao || null : null, meta: { fluxo: fl.id, url: p.url, audio_id: (p as any).audio_id || null } })
          if (p.tipo === 'audio') await marcarAudio(lead, (p as any).audio_id || null, p.url)
        }
      } catch (e: any) {
        await logEvent(lead.id, 'fluxo_erro', 'warn', `Fluxo "${fl.nome}", passo ${st.i + 1}: ${e?.message || e}`)
      }
      st = { i: st.i + 1, id: st.id, inicio: st.inicio, envio: Date.now() }
      await salvar(lead, st)
      continue
    }
    if (p.tipo === 'espera') {
      const ate = st.ate || agora + rnd(p.minutos, [1, 2]) * 60_000
      if (agora < ate) {
        await salvar(lead, { ...st, ate })
        await agenda(ate)
        return true
      }
      st = { i: st.i + 1, id: st.id, inicio: st.inicio, envio: st.envio }
      await salvar(lead, st)
      continue
    }
    // aguardar resposta / passar para a IA
    // conta qualquer resposta que chegou depois da nossa última mensagem do fluxo
    const desde = st.desde || Number(st.envio) || agora
    const resp = ultimaEntrada()
    if (resp > desde) {
      // o cliente respondeu: espera o intervalo combinado antes de seguir (parece atendimento cheio)
      const alvo = st.agendado || Math.max(resp, desde) + rnd(p.apos_resposta, [0, 0]) * 60_000
      if (agora < alvo - 2_000) {
        await salvar(lead, { ...st, desde, agendado: alvo })
        await agenda(alvo)
        return true
      }
      if (p.tipo === 'ia') {
        await termina('passou para a IA')
        return false
      }
      st = { i: st.i + 1, id: st.id, inicio: st.inicio, envio: st.envio }
      await salvar(lead, st)
      continue
    }
    // ainda sem resposta
    // "Passar para a IA" sem resposta: a IA NÃO fica esperando para sempre; depois de uns minutos ela retoma sozinha
    const lim = Number(p.limite) || (p.tipo === 'ia' ? 6 : 0)
    if ((p.tipo === 'aguardar' || p.tipo === 'ia') && lim > 0) {
      if (agora >= desde + lim * 60_000) {
        if (p.tipo === 'ia') {
          await termina('silêncio: a IA retomou')
          await pedirRetomada(lead)
          return false
        }
        st = { i: st.i + 1, id: st.id, inicio: st.inicio, envio: st.envio }
        await salvar(lead, st)
        continue
      }
      await salvar(lead, { ...st, desde })
      await agenda(desde + lim * 60_000)
      return true
    }
    // espera a resposta do cliente (sem prazo): quando ele escrever, a chegada da mensagem chama de novo
    await salvar(lead, { ...st, desde })
    await agenda(null)
    return true
  }
  await termina('acabaram os passos')
  // se o cliente já escreveu depois da última mensagem nossa, a IA responde agora
  if (ultimaEntrada() > Number(st.envio || st.inicio || 0)) return false
  // o cliente ficou quieto depois do último passo: a IA retoma sozinha em alguns minutos (nunca fica parada)
  await pedirRetomada(lead)
  await agenda(Date.now() + 6 * 60_000)
  return true
}

/** Marca que a próxima resposta da IA é uma retomada (o cliente não respondeu ao último passo do fluxo). */
async function pedirRetomada(lead: any) {
  const mem = { ...(lead.memory || {}), retomar: Date.now() }
  lead.memory = mem
  await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {})
}

async function salvar(lead: any, st: any) {
  const mem = { ...(lead.memory || {}), fluxo: st }
  lead.memory = mem
  await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {})
}

/** Áudio já enviado nesta conversa (nunca manda o mesmo duas vezes). */
export async function marcarAudio(lead: any, audioId: string | null, url?: string | null) {
  const ja: string[] = Array.isArray(lead.memory?.audios_enviados) ? lead.memory.audios_enviados : []
  const novos = [audioId, url].filter(Boolean) as string[]
  const mem = { ...(lead.memory || {}), audios_enviados: [...new Set([...ja, ...novos])].slice(-60) }
  lead.memory = mem
  await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {})
}
