import { getSettings } from './settings'
/**
 * RESGATE DE CONVERSAS (rede de segurança): a cada ~60 s procura atendimentos que ficaram parados
 * (reinício do Easypanel/servidor, queda no meio da resposta, trava) e devolve para a fila, para a IA
 * continuar de onde parou. Sem isso, uma resposta "pega" que morre no meio some: o horário é limpo e ninguém retoma.
 * Cobre: (1) cliente esperando resposta, (2) leitura do mapa/consulta que deveria voltar, (3) Fluxo parado,
 * (4) retomada pendente. Cada situação é tentada no máximo 2 vezes (nunca fica em laço nem responde em dobro).
 */
import { admin as db } from './supabase/admin'
import { logEvent, connectedNumber, sendAndRecord } from './engine'

const MAX_TENTATIVAS = 2

export async function resgatarConversas(): Promise<number> {
  if ((await getSettings(db())).paused) return 0 // parada geral
  const agora = Date.now()
  const iso = (t: number) => new Date(t).toISOString()
  const { data, error } = await db()
    .from('leads')
    .select('id,name,memory,needs_human,last_inbound_at,last_outbound_at,reply_due_at,reply_lock_until')
    .eq('ai_enabled', true)
    .eq('ai_locked', false)
    .eq('opted_out', false)
    .is('reply_due_at', null)
    .or(`reply_lock_until.is.null,reply_lock_until.lt.${iso(agora)}`)
    .gt('last_inbound_at', iso(agora - 5 * 86400_000))
    .order('last_inbound_at', { ascending: false })
    .limit(80)
  if (error || !data) return 0
  let n = 0
  let antigas = 0 // respostas atrasadas (mais de 3 h): sai poucas por minuto, nunca todas de uma vez (evita bloqueio do WhatsApp)
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
    const atrasada = motivo === 'cliente sem resposta' && agora - inAt > 3 * 3600_000
    if (atrasada && antigas >= 3) continue
    // limite de tentativas por situação
    const chave = `${motivo}|${inAt}|${Number(fx?.i ?? 0)}|${Number(mem.consulta_pendente?.ate || 0)}`
    const r = mem.resgate || {}
    const tent = r.chave === chave ? Number(r.n || 0) : 0
    if (tent >= MAX_TENTATIVAS) {
      // desistiu em silêncio = cliente no vácuo: avisa a equipe uma vez (alerta "Precisa de você")
      if (!l.needs_human && !r.avisou && r.chave === chave) {
        await db().from('leads').update({ needs_human: `A IA não conseguiu responder ${l.name || 'este cliente'} depois de ${MAX_TENTATIVAS} tentativas automáticas. Ele está sem resposta: responda você.`, memory: { ...mem, resgate: { ...r, avisou: true } } }).eq('id', l.id)
        await logEvent(l.id, 'resgate', 'warn', `Sem resposta após ${MAX_TENTATIVAS} tentativas: equipe avisada (Precisa de você)`).catch(() => {})
      }
      continue
    }
    // (1) com cliente esperando: só reentra se a última mensagem NÃO foi respondida de fato
    const novaMem = { ...mem, resgate: { chave, n: tent + 1, em: agora } }
    const { data: ok } = await db().from('leads').update({ reply_due_at: iso(agora), memory: novaMem }).eq('id', l.id).is('reply_due_at', null).select('id')
    if (ok?.length) {
      n++
      if (atrasada) antigas++
      await logEvent(l.id, 'resgate', 'ai', `Resgate: atendimento de ${l.name} estava parado (${motivo}); a IA continua de onde parou (tentativa ${tent + 1})`).catch(() => {})
    }
  }
  n += await resgatarPromessas(agora)
  n += await lembrarPagamentos(agora)
  return n
}

/** Frases em que NÓS prometemos voltar/entregar algo ("dame un momento", "vou olhar o seu mapa", "já te mando"). */
const PROMESSA = /(dame un momento|un momentito|un momento|ya (te )?(vuelvo|respondo|cuento|paso|mando|env[ií]o)|te (respondo|cuento|paso|mando|env[ií]o|escribo) (en|ya|ahora|luego|enseguida)|voy a (mirar|abrir|revisar|ver|preparar|generar|consultar|armar)|miro tu mapa|abro tu mapa|tengo que mirar|d[aá]me (unos|un par)|enseguida|en breve|ahora (te|lo|la)|aguarda|espera(me)? (un|que)|um momento|um instante|j[aá] (volto|te (respondo|conto|mando|passo))|em instantes|vou (olhar|abrir|ver|conferir|preparar|gerar|consultar|montar)|j[aá] te (respondo|conto|mando|passo)|me d[aá] (um|uns)|d[aá] um (momento|minutinho)|calma[^.?!]{0,30}(momento|instante)|respondo com calma)/i
const LINK_PROMESSA = /(te (env[ií]o|mando|paso|dejo|enviar[eé]|mandar[eé]|envio|passo)|voy a (enviar|mandar|pasar)|ya te (env[ií]o|mando|paso)|vou (te )?(enviar|mandar|passar)|j[aá] te (envio|mando|passo)|aqu[ií] (est[aá]|va) (el|tu)|preparando)[^.?!]{0,50}(enlace|link|vista previa|pr[eé]via|previa|mapa)/i
const NAO_PROMESSA = /(enlace|link|pix|pago|comprobante|comprovante)[^.?!]{0,30}$/i


/**
 * LEMBRETE DE PAGAMENTO: o link/Pix de pagamento saiu há 40 min a 20 h, o cliente não pagou nem respondeu depois.
 * Manda UMA vez o áudio de retomada (biblioteca, intuito "retomada") e um texto curto e claro (link de PAGAMENTO, não o do mapa).
 */
async function lembrarPagamentos(agora: number): Promise<number> {
  const iso = (t: number) => new Date(t).toISOString()
  const { data: pays } = await db().from('payments').select('lead_id,created_at').eq('status', 'pendente').lt('created_at', iso(agora - 40 * 60_000)).gt('created_at', iso(agora - 20 * 3600_000)).order('created_at', { ascending: true }).limit(40)
  let n = 0
  const vistos = new Set<string>()
  for (const p of (pays || []) as any[]) {
    if (n >= 4) break
    if (vistos.has(p.lead_id)) continue
    vistos.add(p.lead_id)
    const { data: l } = await db().from('leads').select('*').eq('id', p.lead_id).maybeSingle()
    if (!l || !l.ai_enabled || l.ai_locked || l.opted_out || l.stage === 'pago' || l.cortesia || l.reply_due_at) continue
    if (l.memory?.lembrete_pagto) continue
    const payAt = new Date(p.created_at).getTime()
    if (l.last_inbound_at && new Date(l.last_inbound_at).getTime() > payAt) continue // ele escreveu depois do link: a IA já atende
    if (l.last_outbound_at && agora - new Date(l.last_outbound_at).getTime() < 30 * 60_000) continue
    const number = await connectedNumber(l.number_id)
    if (!number) continue
    const es = l.idioma === 'es'
    try {
      // marca antes de enviar: nunca duas vezes
      await db().from('leads').update({ memory: { ...(l.memory || {}), lembrete_pagto: agora } }).eq('id', l.id)
      const { listarAudios, enviarAudioPronto } = await import('./mapa-alma/audios')
      const au = (await listarAudios(true)).find((a) => /retomada/i.test(`${a.intuito || ''} ${a.nome}`) && (a.idioma || 'pt') === (es ? 'es' : 'pt'))
      if (au) await enviarAudioPronto(number, l, au, 'ai').catch(() => {})
      const nome = String(l.memory?.nome_cliente || l.name || '').split(' ')[0]
      const msg = es
        ? `${nome ? nome + ', ' : ''}te dejo un recordatorio. Arriba está tu enlace de PAGO (US$ 10 hoy, en vez de US$ 19). Apenas se confirme el pago, te envío por aquí el enlace de acceso a tu mapa completo y la contraseña. Si prefieres pagar con Pix o tienes alguna duda para pagar, dime y te ayudo ahora.`
        : `${nome ? nome + ', ' : ''}passando para lembrar. Acima está o seu link de PAGAMENTO. Assim que o pagamento for confirmado, te envio aqui o link de acesso ao seu mapa completo e a senha. Se preferir outra forma de pagar ou tiver dúvida, me diz que eu te ajudo agora.`
      await sendAndRecord(number, l, msg, 'ai', true, { lembrete_pagto: true })
      await logEvent(l.id, 'resgate', 'ok', `Lembrete de pagamento enviado a ${l.name}${au ? ' (com o áudio de retomada)' : ''}`).catch(() => {})
      n++
    } catch (e: any) {
      await logEvent(l.id, 'resgate', 'warn', `Falha no lembrete de pagamento: ${e?.message || e}`).catch(() => {})
    }
  }
  return n
}

/**
 * PROMESSA PENDENTE (a cada ~5 min): a IA disse "dame un momento / vou olhar o seu mapa" e a conversa ficou parada.
 * A última mensagem é NOSSA, prometeu algo e o cliente não escreveu depois: força a IA a ENTREGAR o que ficou pendente
 * (em português ou espanhol), com no máximo 3 toques por promessa e aviso para a equipe se ainda assim não resolver.
 */
async function resgatarPromessas(agora: number): Promise<number> {
  const iso = (t: number) => new Date(t).toISOString()
  const { data } = await db()
    .from('leads')
    .select('id,name,stage,memory,last_inbound_at,last_outbound_at,needs_human,reply_lock_until,cortesia')
    .eq('ai_enabled', true)
    .eq('ai_locked', false)
    .eq('opted_out', false)
    .is('reply_due_at', null)
    .or(`reply_lock_until.is.null,reply_lock_until.lt.${iso(agora)}`)
    .lt('last_outbound_at', iso(agora - 5 * 60_000))
    .gt('last_outbound_at', iso(agora - 12 * 3600_000))
    .gt('last_inbound_at', iso(agora - 24 * 3600_000))
    .order('last_outbound_at', { ascending: true })
    .limit(60)
  let n = 0
  for (const l of (data || []) as any[]) {
    if (n >= 6) break // poucos por rodada: nada de rajada (anti-bloqueio)
    if (l.stage === 'pago') continue
    const mem = l.memory || {}
    const inAt = new Date(l.last_inbound_at).getTime()
    const outAt = new Date(l.last_outbound_at).getTime()
    if (inAt > outAt) continue // cliente esperando: é o caso (1) acima
    if (mem.consulta_pendente && Number(mem.consulta_pendente.ate || 0) > agora - 30_000) continue // ainda no prazo combinado
    const fx = mem.fluxo
    if (fx && !fx.fim) continue
    const { data: ult } = await db().from('messages').select('direction,author,body,created_at').eq('lead_id', l.id).order('created_at', { ascending: false }).limit(2)
    const u = ult?.[0]
    if (!u || u.direction !== 'out' || u.author === 'human') continue
    const texto = String(u.body || '')
    if ((!PROMESSA.test(texto) && !LINK_PROMESSA.test(texto)) || /[?¿]\s*$/.test(texto.trim())) continue // pergunta no fim = esperando o cliente, não é promessa
    // PROMESSA DE LINK/PRÉVIA ("te envío el enlace", "já te mando o link"): o sistema ENVIA o link de verdade, com prazo e horário
    if (LINK_PROMESSA.test(texto) && !/https?:\/\//i.test(texto)) {
      const slug = mem.mapa_slug || (l as any).mapa_slug || (l as any).preview_slug
      const { data: lz } = await db().from('leads').select('*').eq('id', l.id).maybeSingle()
      const slugL = (lz as any)?.mapa_slug || (lz as any)?.preview_slug || slug
      if (lz && slugL) {
        const { data: mp } = await db().from('mapas').select('id,slug,liberado').eq('slug', slugL).maybeSingle()
        if (mp && !mp.liberado) {
          const chaveL = `linkprom|${outAt}`
          if (mem.resgate_link === chaveL) continue // já tentado para esta promessa
          const number = await connectedNumber((lz as any).number_id)
          if (!number) continue
          try {
            const { linkMapa } = await import('./mapa-alma/servico')
            const { avisoValidadePrevia, iniciarContagemPrevia } = await import('./mapa-alma/previa')
            const es = (lz as any).idioma === 'es'
            await iniciarContagemPrevia(slugL)
            const url = linkMapa({ slug: slugL, idioma: es ? 'es' : 'pt' })
            const aviso = await avisoValidadePrevia(lz)
            const nome = String((lz as any).memory?.nome_cliente || '').split(' ')[0]
            const msg = es
              ? `${nome ? nome + ', aquí' : 'Aquí'} está el enlace de tu vista previa 👇\n${url}\n\n${aviso}\n\nEs una vista previa con partes bloqueadas; el mapa completo, con todo liberado, el paso a paso y el PDF, se libera con el pago. Mírala y cuéntame qué parte te llamó más la atención.`
              : `${nome ? nome + ', aqui' : 'Aqui'} está o link da sua prévia 👇\n${url}\n\n${aviso}\n\nÉ uma prévia com partes bloqueadas; o mapa completo, com tudo liberado, o passo a passo e o PDF, é liberado após o pagamento. Dá uma olhada e me conta qual parte chamou mais a atenção.`
            await db().from('leads').update({ memory: { ...mem, resgate_link: chaveL, previa_reenvio_em: Date.now() } }).eq('id', l.id)
            await sendAndRecord(number, lz, msg, 'ai', true, { preview: slugL, reenvio_previa: true })
            await logEvent(l.id, 'resgate', 'ok', `Promessa de link cumprida: a IA tinha dito "${texto.slice(0, 60)}" e não mandou; o sistema enviou o link da prévia (válido por 60 min)`).catch(() => {})
            n++
          } catch (e: any) {
            await logEvent(l.id, 'resgate', 'warn', `Falha ao cumprir a promessa de link: ${e?.message || e}`).catch(() => {})
          }
          continue
        }
      }
    }
    const chave = `promessa|${outAt}`
    const r = mem.resgate_promessa || {}
    const tent = r.chave === chave ? Number(r.n || 0) : 0
    if (tent >= 3) {
      if (!l.needs_human && r.chave === chave && !r.avisou) {
        await db().from('leads').update({ needs_human: `Prometemos voltar ("${texto.slice(0, 60)}") e a IA não conseguiu entregar depois de 3 tentativas. Responda ${l.name} agora.`, memory: { ...mem, resgate_promessa: { ...r, avisou: true } } }).eq('id', l.id)
        await logEvent(l.id, 'resgate', 'warn', `Promessa pendente de ${l.name} sem solução após 3 tentativas: equipe avisada`).catch(() => {})
      }
      continue
    }
    if (tent > 0 && agora - Number(r.em || 0) < 5 * 60_000) continue // 5 min entre uma tentativa e outra
    const novaMem = { ...mem, resgate_promessa: { chave, n: tent + 1, em: agora }, entregar_pendente: { texto: texto.slice(0, 300), em: agora } }
    const { data: ok } = await db().from('leads').update({ reply_due_at: iso(agora), memory: novaMem }).eq('id', l.id).is('reply_due_at', null).select('id')
    if (ok?.length) {
      n++
      await logEvent(l.id, 'resgate', 'ai', `Promessa pendente: a IA tinha dito "${texto.slice(0, 70)}" e não voltou; entrega forçada (tentativa ${tent + 1})`).catch(() => {})
    }
  }
  return n
}

/** Ao ligar: solta travas de respostas que morreram junto com o processo anterior. */
export async function soltarTravasAoLigar() {
  await db().from('leads').update({ reply_lock_until: null }).not('reply_lock_until', 'is', null).then(() => {}, () => {})
}
