// Atendimento no WhatsApp com IA: calmo, acolhedor e focado só em mapas.
import { db, config } from './db.ts'
import { claude, whatsapp, digitando, cobrarPix, cpfValido, consultarPagamento, PAGO } from './integracoes.ts'
import { criarMapa, enviarMapa, linkMapa } from './mapas.ts'

export interface Cliente {
  id: string; whatsapp: string; nome: string | null; nome_completo: string | null; nascimento: string | null; cpf: string | null
  etapa: string; resumo: string | null; memoria: string[]; ia_pausada: boolean; precisa_humano: boolean
}

export const PERSONA_PADRAO = {
  nome: 'Clara',
  apresentacao: 'consultora do Mapa da Alma',
  tom: 'calmo, acolhedor, gentil e sem pressa; fala como uma pessoa real no WhatsApp, com frases curtas e emojis suaves de vez em quando (✨💜🌙), sem exagero',
  regras_extras: '',
}

const ETAPAS = ['novo', 'conversando', 'dados', 'pix', 'pago', 'entregue', 'sem_interesse'] as const

const ESQUEMA = {
  type: 'object',
  properties: {
    mensagens: { type: 'array', items: { type: 'string' }, description: '1 a 3 mensagens curtas, na ordem de envio. Use [] só se não houver nada a dizer.' },
    etapa: { type: 'string', enum: [...ETAPAS] },
    dados: {
      type: 'object', description: 'Somente o que o cliente informou de forma clara. Datas no formato AAAA-MM-DD.',
      properties: {
        produto: { type: 'string', enum: ['pessoal', 'casal'] },
        nome_completo: { type: 'string' }, nascimento: { type: 'string' },
        nome_completo_2: { type: 'string' }, nascimento_2: { type: 'string' },
        cpf: { type: 'string' },
      },
    },
    acao: { type: 'string', enum: ['nenhuma', 'gerar_pix', 'chamar_humano'], description: 'gerar_pix só quando o cliente confirmou que quer comprar e todos os dados (produto, nome(s), data(s) e CPF) estão completos e conferidos com ele.' },
    resumo: { type: 'string', description: 'Resumo atualizado da conversa em até 3 linhas.' },
    memoria_nova: { type: 'array', items: { type: 'string' }, description: 'Fatos novos e úteis sobre o cliente (ex.: "procura entender a vida amorosa", "é de Áries"). [] se nada novo.' },
  },
  required: ['mensagens', 'etapa', 'acao', 'resumo', 'memoria_nova'],
}

async function promptSistema(c: Cliente): Promise<string> {
  const cfg = await config()
  const p = { ...PERSONA_PADRAO, ...(cfg.persona || {}) }
  const produtos = await db.select('produtos', { ativo: 'eq.true', order: 'ordem.asc' })
  const aprendizados = await db.select('aprendizados', { ativo: 'eq.true', order: 'criado_em.desc', limit: 15 })
  return `Você é ${p.nome}, ${p.apresentacao}. Atende pelo WhatsApp pessoas interessadas em mapas de numerologia cabalística e astrologia (signo solar).

SEU JEITO: ${p.tom}.
- Atenda com calma: nada de pressa, pressão ou insistência. Escute, acolha e explique.
- Mensagens curtas (no máximo 3 por vez, cada uma com até 3 linhas). Normalmente termine com uma pergunta leve.
- Fale SOMENTE sobre mapas de numerologia, astrologia e os produtos abaixo. Se pedirem outra coisa, diga com gentileza que só trabalha com os mapas.
- Nunca invente resultados do mapa antes da compra. Pode explicar o que o mapa revela e dar curiosidades gerais sobre números e signos.
- Não faça promessas de cura, dinheiro garantido ou previsões absolutas. Numerologia é autoconhecimento.
- Você não consegue ouvir áudios: se receber "[áudio]", peça com carinho para a pessoa escrever.
- Se a pessoa estiver em sofrimento emocional sério, acolha com empatia e sugira procurar ajuda profissional (CVV 188); não tente vender nesse momento.
- Peça ajuda humana (acao "chamar_humano") se o cliente estiver irritado, pedir reembolso, relatar problema no pagamento ou fizer algo que você não sabe resolver.

PRODUTOS (preço fixo, sem descontos):
${produtos.map((x: any) => `- ${x.slug}: ${x.nome} — R$ ${Number(x.preco).toFixed(2).replace('.', ',')}. ${x.descricao}`).join('\n')}

COMO FUNCIONA A COMPRA:
1. Entenda o que a pessoa busca e indique o mapa certo (pessoal ou do casal).
2. Peça o NOME COMPLETO DE NASCIMENTO (como está na certidão, com acentos) e a DATA DE NASCIMENTO. No mapa do casal, os dados das duas pessoas.
3. Repita os dados para o cliente conferir. Nome escrito errado muda o mapa inteiro.
4. Peça o CPF (é obrigatório para gerar o Pix) e então use acao "gerar_pix". O sistema envia o Pix copia e cola logo depois das suas mensagens, então não escreva código Pix nem links.
5. Depois do pagamento, o sistema gera e envia o mapa automaticamente (link para ver no celular + PDF).
${aprendizados.length ? `\nO QUE JÁ APRENDEMOS COM VENDAS ANTERIORES:\n${aprendizados.map((a: any) => `- ${a.texto}`).join('\n')}` : ''}
${p.regras_extras ? `\nREGRAS EXTRAS DO DONO:\n${p.regras_extras}` : ''}

Responda SEMPRE pela ferramenta "responder".`
}

function contextoCliente(c: Cliente, pendente: any) {
  return `[DADOS DO CLIENTE NO SISTEMA]
WhatsApp: ${c.nome || 'sem nome'} | Etapa: ${c.etapa}
Nome completo: ${c.nome_completo || '—'} | Nascimento: ${c.nascimento || '—'} | CPF: ${c.cpf ? 'informado' : '—'}
Resumo: ${c.resumo || '—'}
Memória: ${(c.memoria || []).join('; ') || '—'}
${pendente ? `Pix pendente: ${pendente.produto} R$ ${pendente.valor} (criado em ${new Date(pendente.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})` : ''}`
}

/* ------------- fila: junta mensagens seguidas antes de responder ------------- */
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const ocupado = new Set<string>()

export async function receberMensagem(numero: string, texto: string, nomeWa: string | null, waId: string | null) {
  let c = await db.one<Cliente>('clientes', { whatsapp: `eq.${numero}` })
  if (!c) {
    try { c = await db.insert<Cliente>('clientes', { whatsapp: numero, nome: nomeWa, etapa: 'novo' }) }
    catch { c = await db.one<Cliente>('clientes', { whatsapp: `eq.${numero}` }) } // criado ao mesmo tempo por outra entrega
    if (!c) return
  } else if (nomeWa && !c.nome) await db.update('clientes', { id: `eq.${c.id}` }, { nome: nomeWa })
  try {
    await db.insert('mensagens', { cliente_id: c.id, autor: 'cliente', texto, wa_id: waId })
  } catch (e: any) {
    if (/duplicate|23505/.test(String(e.message))) return // mensagem repetida pela Evolution
    throw e
  }
  await db.update('clientes', { id: `eq.${c.id}` }, { ultima_msg_em: new Date().toISOString() })
  if (c.ia_pausada) return
  const espera = Number((await config()).espera_ms ?? 9000)
  clearTimeout(timers.get(c.id))
  timers.set(c.id, setTimeout(() => { timers.delete(c!.id); responder(c!.id).catch(e => console.error('[ia]', e)) }, espera))
}

export async function responder(clienteId: string) {
  if (ocupado.has(clienteId)) { setTimeout(() => responder(clienteId).catch(() => {}), 4000); return }
  ocupado.add(clienteId)
  try {
    const c = await db.one<Cliente>('clientes', { id: `eq.${clienteId}` })
    if (!c || c.ia_pausada) return
    const hist = (await db.select('mensagens', { cliente_id: `eq.${c.id}`, order: 'criado_em.desc', limit: 30 })).reverse()
    if (!hist.length || hist[hist.length - 1].autor !== 'cliente') return
    const pendente = await db.one('pagamentos', { cliente_id: `eq.${c.id}`, status: 'eq.pendente', order: 'criado_em.desc' })

    // histórico no formato da API (mensagens seguidas do mesmo lado são unidas)
    const msgs: { role: 'user' | 'assistant'; content: string }[] = []
    for (const m of hist) {
      const role = m.autor === 'cliente' ? 'user' : 'assistant'
      const t = m.autor === 'sistema' ? `(sistema: ${m.texto})` : m.texto
      if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + t
      else msgs.push({ role, content: t })
    }
    if (msgs[0]?.role === 'assistant') msgs.unshift({ role: 'user', content: '(início da conversa)' })
    msgs[msgs.length - 1].content = `${contextoCliente(c, pendente)}\n\n[MENSAGEM DO CLIENTE]\n${msgs[msgs.length - 1].content}`

    const r = await claude({
      system: await promptSistema(c), mensagens: msgs, maxTokens: 900,
      ferramenta: { nome: 'responder', descricao: 'Envia a resposta ao cliente e atualiza o sistema.', schema: ESQUEMA },
    })
    await db.insert('uso_ia', { tarefa: 'atendimento', modelo: r.uso.modelo, entrada: r.uso.entrada, saida: r.uso.saida, cliente_id: c.id }).catch(() => {})
    const out = r.dados
    if (!out) return

    // atualiza o cliente
    const d = out.dados || {}
    const upd: any = { etapa: out.etapa || c.etapa, resumo: out.resumo || c.resumo }
    if (out.memoria_nova?.length) upd.memoria = [...(c.memoria || []), ...out.memoria_nova].slice(-30)
    if (d.nome_completo) upd.nome_completo = d.nome_completo
    if (d.nascimento && /^\d{4}-\d{2}-\d{2}$/.test(d.nascimento)) upd.nascimento = d.nascimento
    const cpf = d.cpf ? cpfValido(d.cpf) : null
    if (cpf) upd.cpf = cpf
    if (out.acao === 'chamar_humano') { upd.precisa_humano = true; upd.ia_pausada = true }
    await db.update('clientes', { id: `eq.${c.id}` }, upd)

    // envia as mensagens com "digitando…"
    for (const t of (out.mensagens || []).slice(0, 3)) {
      await whatsapp.texto(c.whatsapp, t, digitando(t))
      await db.insert('mensagens', { cliente_id: c.id, autor: 'ia', texto: t })
    }

    if (out.acao === 'gerar_pix') await gerarPix(c.id, d, d.cpf && !cpf)
  } finally {
    ocupado.delete(clienteId)
  }
}

async function gerarPix(clienteId: string, d: any, cpfInvalido: boolean) {
  const c = await db.one<Cliente>('clientes', { id: `eq.${clienteId}` })
  if (!c) return
  const avisar = async (t: string) => { await whatsapp.texto(c.whatsapp, t, digitando(t)); await db.insert('mensagens', { cliente_id: c.id, autor: 'ia', texto: t }) }
  if (cpfInvalido || !c.cpf) return avisar('Hmm, acho que o CPF ficou com algum número trocado 🙈 Pode me mandar de novo, por favor?')
  const produto = await db.one('produtos', { slug: `eq.${d.produto || 'pessoal'}`, ativo: 'eq.true' })
  if (!produto) return
  const dados = {
    tipo: produto.slug, nome: d.nome_completo || c.nome_completo, nascimento: d.nascimento || c.nascimento,
    nome2: d.nome_completo_2 || null, nascimento2: d.nascimento_2 || null,
  }
  if (!dados.nome || !dados.nascimento || (produto.slug === 'casal' && (!dados.nome2 || !dados.nascimento2))) return
  const pend = await db.one('pagamentos', { cliente_id: `eq.${c.id}`, status: 'eq.pendente', produto: `eq.${produto.slug}` })
  try {
    const pag = pend || await db.insert('pagamentos', { cliente_id: c.id, produto: produto.slug, valor: produto.preco, dados })
    let copia = pend?.pix_copia_cola
    if (!copia) {
      const pix = await cobrarPix({ clienteId: c.id, nome: dados.nome, cpf: c.cpf, whatsapp: c.whatsapp, valor: Number(produto.preco), descricao: produto.nome, ref: pag.id })
      await db.update('pagamentos', { id: `eq.${pag.id}` }, { asaas_id: pix.id, pix_copia_cola: pix.copiaCola, link: pix.link, dados })
      copia = pix.copiaCola
    }
    await db.update('clientes', { id: `eq.${c.id}` }, { etapa: 'pix' })
    await avisar(`Prontinho! Aqui está o Pix de R$ ${Number(produto.preco).toFixed(2).replace('.', ',')} para o ${produto.nome} 💜\n\nÉ só copiar o código abaixo e colar no app do seu banco, na opção Pix copia e cola:`)
    await whatsapp.texto(c.whatsapp, copia!, 1500)
    await db.insert('mensagens', { cliente_id: c.id, autor: 'sistema', texto: '(Pix copia e cola enviado)' })
    await avisar('Assim que o pagamento cair, eu já te envio o seu mapa por aqui, tá? ✨')
  } catch (e: any) {
    console.error('[pix]', e)
    await db.update('clientes', { id: `eq.${c.id}` }, { precisa_humano: true })
    await avisar('Tive um probleminha para gerar o Pix agora 😕 Já chamei a equipe e em instantes alguém te ajuda por aqui.')
  }
}

/** Pagamento confirmado (webhook do Asaas ou conferência manual): gera e envia o mapa. */
export async function pagamentoConfirmado(asaasId: string) {
  const pag = await db.one('pagamentos', { asaas_id: `eq.${asaasId}` })
  if (!pag || pag.status === 'pago') return
  const st = await consultarPagamento(asaasId)
  if (!PAGO.includes(st.status)) return
  await db.update('pagamentos', { id: `eq.${pag.id}` }, { status: 'pago', pago_em: new Date().toISOString() })
  const c = pag.cliente_id ? await db.one<Cliente>('clientes', { id: `eq.${pag.cliente_id}` }) : null
  if (c) await db.update('clientes', { id: `eq.${c.id}` }, { etapa: 'pago' })
  const d = pag.dados || {}
  const mapa = await criarMapa({ clienteId: pag.cliente_id, tipo: d.tipo === 'casal' ? 'casal' : 'pessoal', nome: d.nome, nascimento: d.nascimento, nome2: d.nome2, nascimento2: d.nascimento2 })
  await db.update('pagamentos', { id: `eq.${pag.id}` }, { mapa_id: mapa.id })
  if (c) {
    await whatsapp.texto(c.whatsapp, 'Pagamento recebido! Muito obrigada pela confiança 💜 Estou preparando o seu mapa com todo carinho, já já ele chega aqui.', 2500)
    await db.insert('mensagens', { cliente_id: c.id, autor: 'ia', texto: 'Pagamento recebido! Muito obrigada pela confiança 💜 Estou preparando o seu mapa com todo carinho, já já ele chega aqui.' })
    try { await enviarMapa(mapa, c.whatsapp) } catch (e) {
      console.error('[entrega]', e)
      await db.update('clientes', { id: `eq.${c.id}` }, { precisa_humano: true })
      await db.insert('mensagens', { cliente_id: c.id, autor: 'sistema', texto: `⚠️ Falha ao enviar o mapa automaticamente. Link: ${linkMapa(mapa)}` })
    }
    aprenderComVenda(c.id).catch(e => console.error('[aprendizado]', e))
  }
}

/** Estuda a conversa que virou venda e guarda um aprendizado curto. */
async function aprenderComVenda(clienteId: string) {
  const hist = await db.select('mensagens', { cliente_id: `eq.${clienteId}`, order: 'criado_em.asc', limit: 60 })
  const conversa = hist.map((m: any) => `${m.autor}: ${m.texto}`).join('\n').slice(-12000)
  const r = await claude({
    system: 'Você analisa conversas de venda de mapas de numerologia pelo WhatsApp e extrai aprendizados práticos para a atendente.',
    mensagens: [{ role: 'user', content: `Esta conversa terminou em venda. Escreva de 1 a 2 aprendizados curtos (uma linha cada) sobre o que ajudou o cliente a decidir, para repetir em outras conversas. Nada de dados pessoais.\n\n${conversa}` }],
    ferramenta: { nome: 'aprendizados', descricao: 'Registra os aprendizados.', schema: { type: 'object', properties: { itens: { type: 'array', items: { type: 'string' } } }, required: ['itens'] } },
    maxTokens: 300,
  })
  for (const t of (r.dados?.itens || []).slice(0, 2)) await db.insert('aprendizados', { texto: t, origem: 'venda' })
}
