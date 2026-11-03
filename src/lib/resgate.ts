/**
 * RESGATE DE CONVERSAS (rede de segurança): a cada ~60 s procura atendimentos que ficaram parados
 * (reinício do Easypanel/servidor, queda no meio da resposta, trava) e devolve para a fila, para a IA
 * continuar de onde parou. Sem isso, uma resposta "pega" que morre no meio some: o horário é limpo e ninguém retoma.
 * Cobre: (1) cliente esperando resposta, (2) leitura do mapa/consulta que deveria voltar, (3) Fluxo parado,
 * (4) retomada pendente. Cada situação é tentada no máximo 2 vezes (nunca fica em laço nem responde em dobro).
 */
import { admin as db } from './supabase/admin'
import { logEvent } from './engine'

const MAX_TENTATIVAS = 2

export async function resgatarConversas(): Promise<number> {
  const agora = Date.now()
  const iso = (t: number) => new Date(t).toISOString()
  const { data, error } = await db()
    .from('leads')
    .select('id,name,memory,last_inbound_at,last_outbound_at,reply_due_at,reply_lock_until')
    .eq('ai_enabled', true)
    .eq('ai_locked', false)
    .eq('opted_out', false)
    .is('reply_due_at', null)
    .or(`reply_lock_until.is.null,reply_lock_until.lt.${iso(agora)}`)
    .gt('last_inbound_at', iso(agora - 48 * 3600_000))
    .limit(60)
  if (error || !data) return 0
  let n = 0
  for (const l of data as any[]) {
    const mem = l.memory || {}
    const inAt = l.last_inbound_at ? new Date(l.last_inbound_at).getTime() : 0
    const outAt = l.last_outbound_at ? new Date(l.last_outbound_at).getTime() : 0
    const fx = mem.fluxo
    let motivo = ''
    // (1) o cliente escreveu e nada respondeu depois (esperou pelo menos 90 s)
    if (inAt > outAt && agora - inAt > 90_000) motivo = 'cliente sem resposta'
    // (2) a leitura/consulta combinada já deveria ter voltado
    else if (mem.consulta_pendente && Number(mem.consulta_pendente.ate || 0) < agora - 30_000) motivo = 'consulta pendente'
    // (3) fluxo em andamento parado (o horário do passo já passou ou ficou sem relógio por mais de 10 min)
    else if (fx && !fx.fim) {
      const marco = Math.max(Number(fx.ate || 0), Number(fx.agendado || 0))
      const ult = Math.max(Number(fx.envio || 0), Number(fx.desde || 0), Number(fx.inicio || 0))
      if ((marco && marco < agora - 30_000) || (!marco && ult && agora - ult > 10 * 60_000)) motivo = 'fluxo parado'
    }
    // (4) retomada pedida e ainda não feita
    else if (mem.retomar && agora - Number(mem.retomar) > 60_000) motivo = 'retomada pendente'
    if (!motivo) continue
    // limite de tentativas por situação
    const chave = `${motivo}|${inAt}|${Number(fx?.i ?? 0)}|${Number(mem.consulta_pendente?.ate || 0)}`
    const r = mem.resgate || {}
    const tent = r.chave === chave ? Number(r.n || 0) : 0
    if (tent >= MAX_TENTATIVAS) continue
    // (1) com cliente esperando: só reentra se a última mensagem NÃO foi respondida de fato
    const novaMem = { ...mem, resgate: { chave, n: tent + 1, em: agora } }
    const { data: ok } = await db().from('leads').update({ reply_due_at: iso(agora), memory: novaMem }).eq('id', l.id).is('reply_due_at', null).select('id')
    if (ok?.length) {
      n++
      await logEvent(l.id, 'resgate', 'ai', `Resgate: atendimento de ${l.name} estava parado (${motivo}); a IA continua de onde parou (tentativa ${tent + 1})`).catch(() => {})
    }
  }
  return n
}

/** Ao ligar: solta travas de respostas que morreram junto com o processo anterior. */
export async function soltarTravasAoLigar() {
  await db().from('leads').update({ reply_lock_until: null }).not('reply_lock_until', 'is', null).then(() => {}, () => {})
}
