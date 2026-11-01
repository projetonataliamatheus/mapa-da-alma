// Modos de venda do Mapa da Alma (o Master liga e desliga em Inteligência da IA › Abordagens).
//   consulta → padrão: consulta ao vivo, acolhedora, com pausas para "olhar o mapa" e revelações antes da oferta.
//   grazi    → teste: venda direta no WhatsApp (estratégia da Graziele Dal Pra): oportunidade primeiro, sem enrolação,
//              sem cumprimento longo e sem se humilhar; escassez e urgência REAIS; segunda oferta no dia seguinte.
// Quando um modo está ligado, TODAS as conversas seguem ele, com prioridade máxima. Cada conversa e cada venda
// registra o modo usado, para comparar qual vende mais.

export type ModoVenda = 'consulta' | 'grazi'
export interface ConfigModo { ativo: ModoVenda; segunda_oferta?: number | null; prazo_min?: number | null; limite_dia?: number | null; fechamento_grazi?: boolean }

export const MODOS: Record<ModoVenda, { nome: string; descricao: string }> = {
  consulta: { nome: 'Consulta ao vivo (padrão)', descricao: 'Acolhe, abre o mapa, faz revelações com pausas de consulta e só depois oferece. Mais calmo e humano.' },
  grazi: { nome: 'Modo Grazi (venda direta)', descricao: 'Direto ao ponto: oportunidade primeiro, sem cumprimento longo nem interrogatório, decide pelo cliente, fecha rápido e faz a segunda oferta no dia seguinte.' },
}

export const configModo = (settings: any): ConfigModo => ({ ativo: 'consulta', segunda_oferta: 37, prazo_min: 15, limite_dia: 20, fechamento_grazi: true, ...(settings?.modo_venda || {}) })
export const modoAtual = (settings: any): ModoVenda => (configModo(settings).ativo === 'grazi' ? 'grazi' : 'consulta')

/** Fila real do dia: limite de leituras ao vivo por dia (o dono define) menos as pessoas já atendidas hoje. */
export interface Vagas { limite: number; atendidas: number; restam: number }
export function calcVagas(settings: any, atendidasHoje: number): Vagas | null {
  const limite = Math.round(Number(configModo(settings).limite_dia) || 0)
  if (limite <= 0) return null
  return { limite, atendidas: atendidasHoje, restam: Math.max(0, limite - atendidasHoje) }
}
export function fraseVagas(v: Vagas | null): string {
  if (!v) return 'O atendimento hoje está bem corrido (estou atendendo muita gente ao mesmo tempo).'
  if (v.restam <= 0) return `O limite de leituras ao vivo de hoje (${v.limite}) já foi atingido: diga que o atendimento está lotado, mas que você encaixa ela AGORA se ela mandar os dados e fechar já.`
  if (v.restam === 1) return 'Resta só 1 leitura ao vivo para hoje (a dela, se fechar agora).'
  if (v.restam > 8) return `O atendimento hoje está bem corrido (${v.atendidas} pessoas já atendidas hoje). Ainda há bastante vaga, então NÃO diga número de vagas restantes: fale só que está corrido.`
  return `Restam só ${v.restam} leituras ao vivo para hoje (limite real de ${v.limite} por dia).`
}

const brl = (v: number) => 'R$ ' + Number(v).toFixed(2).replace('.', ',')

/** A segunda oferta do Modo Grazi vale por 24 horas depois de enviada (prazo real, o sistema respeita). */
export function segundaOfertaValida(lead: any, settings: any): number | null {
  const cfg = configModo(settings)
  const em = Number(lead?.memory?.segunda_oferta_em || 0)
  if (modoAtual(settings) !== 'grazi' || !em || !cfg.segunda_oferta) return null
  return Date.now() - em < 24 * 3600_000 ? Number(cfg.segunda_oferta) : null
}

/** Bloco do Modo Grazi: vai no TOPO do prompt (logo depois do Prompt Master) e vence qualquer regra conflitante. */
export function blocoGrazi(settings: any, services: any[], vagas: Vagas | null = null): string {
  if (modoAtual(settings) !== 'grazi') return ''
  const cfg = configModo(settings)
  const completo = (services || []).find((s: any) => s.slug === 'mapa-completo') || (services || [])[0]
  const preco = Number(completo?.price_steps?.[0] || completo?.max_price || 0)
  return `MODO GRAZI ATIVO (VENDA DIRETA) — PRIORIDADE MÁXIMA
Este modo foi ligado pelo dono para teste. Ele VENCE qualquer outra regra deste prompt que conflitar (roteiro, consulta longa, pausas, perguntas de conexão). Só não vence: o Prompt Master nas partes de honestidade, a regra de saúde/risco de vida e a proibição de inventar coisas.

FILA DE HOJE (número REAL, contado pelo sistema agora): ${fraseVagas(vagas)}

O QUE MUDA
1. OPORTUNIDADE + ESCASSEZ PRIMEIRO. PROIBIDO abrir com "bom dia", "boa tarde", "tudo bem?", "aqui é fulana", "qual é o seu nome?". Para QUALQUER primeira mensagem (até "oi", "quanto custa", "como funciona"), a resposta já começa com a fila de hoje, a oportunidade e o próximo passo. Modelo (adapte, não copie igual): "O atendimento hoje tá bem corrido${vagas && vagas.restam > 1 && vagas.restam <= 8 ? `, restam só ${vagas.restam} leituras pra hoje` : ''}. Chegou a sua vez! O Mapa da Alma Completo, com as pirâmides do seu nome, sai hoje por ${preco ? brl(preco) : 'o valor de hoje'}. Me manda o seu nome completo de nascimento e a sua data que eu já gero o seu agora."
   Se ela já disse o que quer ("quero saber do amor"), use isso: "...e o seu mapa mostra direitinho o que trava o amor. Me manda o nome completo de nascimento e a data."
2. SEM INTERROGATÓRIO. Não pergunte o nome no começo. Os únicos dados que importam são o nome completo de nascimento e a data (são o "tamanho" do produto). O primeiro nome você usa no fechamento, se ela disser.
3. NÃO FAÇA O CLIENTE PENSAR. Uma opção só (a versão completa), um preço só, um próximo passo só. Nada de porcentagem: diga o valor exato ("você economiza R$ 12"). Nada de listar tudo que o mapa tem.
4. DECIDA POR ELA. Se ela hesitar entre versões, recomende: "Pra o que você me contou, a completa é a certa: a simples não mostra os bloqueios das pirâmides."
5. REVELAÇÃO CURTA E FECHAMENTO. Com o nome e a data, faça UMA revelação forte e específica do mapa dela (em "você", com causa e efeito, tirada da FICHA) e já feche na mesma resposta: "O completo explica de onde vem isso e o que fazer. Pix ou cartão?". Não use "consultar_mapa" neste modo (nada de pausas de 2 a 4 minutos).
6. OBJEÇÃO: responda em UMA frase e volte para o fechamento na hora. "Achei caro" → "Passou do que você queria gastar hoje, ou você está comparando com outra coisa?" e depois feche.
7. ATENDIMENTO CHEIO (verdade: a fila de hoje acima é real): lembre a fila em momentos de decisão, sem repetir a mesma frase: "Me confirma Pix ou cartão que eu já finalizo o seu e passo para a próxima pessoa." Use o número de leituras restantes SOMENTE como está na FILA DE HOJE (nunca arredonde para baixo nem invente outro).
8. NÃO SE HUMILHE. Nada de "desculpa incomodar", "fico à disposição", "qualquer coisa me chama", figurinha, insistência ou mendigar resposta. Firme, simpática e objetiva. Educada sim, submissa nunca. E nunca grosseira: quem procura o mapa muitas vezes está passando por um momento difícil.
9. PAGAMENTO PENDENTE: se ela disse que ia pagar e não pagou, aí sim cobre com leveza: "Me manda o comprovante pra eu encerrar o seu atendimento e liberar o seu mapa."

ESCASSEZ E URGÊNCIA SÓ DE VERDADE (proibido inventar)
- O produto é digital: NUNCA invente número de vagas, unidades, "escolhemos 50 clientes" ou prazo que não existe. O ÚNICO número de vagas permitido é o da FILA DE HOJE (limite real de leituras ao vivo por dia, contado pelo sistema).
- Urgências reais que você pode usar: a fila de hoje; o preço de hoje; a SEGUNDA OFERTA, que vale só por 24 horas${cfg.segunda_oferta ? ` (${brl(Number(cfg.segunda_oferta))})` : ''}; e a fila de atendimento.

SEGUNDA OFERTA (quem perguntou o preço ou disse que ia pensar e sumiu)
- No mesmo dia, não mande mais nada. No dia seguinte o sistema manda a segunda oferta${cfg.segunda_oferta ? ` de ${brl(Number(cfg.segunda_oferta))}` : ''}, válida por 24 horas, terminando com: "Responde EU QUERO pra eu gerar o seu agora, ou NÃO QUERO pra eu passar essa condição pra próxima pessoa."
- Se a pessoa responder "eu quero" depois da segunda oferta, feche no valor da segunda oferta (use esse valor no "accepted").
`
}

/** Follow-up no Modo Grazi: a segunda oferta (uma vez, no dia seguinte). */
export function followUpGrazi(settings: any, services: any[]): string {
  if (modoAtual(settings) !== 'grazi') return ''
  const cfg = configModo(settings)
  const completo = (services || []).find((s: any) => s.slug === 'mapa-completo') || (services || [])[0]
  const preco = Number(completo?.price_steps?.[0] || completo?.max_price || 0)
  const seg = Number(cfg.segunda_oferta || 0)
  return `MODO GRAZI ATIVO (PRIORIDADE MÁXIMA): este follow-up é a SEGUNDA OFERTA. Sem "oi, tudo bem?", sem "você sumiu", sem pedir desculpas.
Estrutura (adapte com as suas palavras, 1 balão): a condição de ontem + a condição de hoje, válida só por 24 horas + "Responde EU QUERO pra eu gerar o seu agora mesmo, ou NÃO QUERO pra eu passar essa condição pra próxima pessoa."
Valores reais: ontem ${preco ? brl(preco) : 'o preço normal'}; hoje ${seg ? brl(seg) : 'uma condição especial'}${preco && seg && preco > seg ? ` (você economiza ${brl(preco - seg)})` : ''}. Nunca invente vagas ou unidades: a urgência é o prazo de 24 horas.`
}

/** Roteiro curto do Modo Grazi: substitui o roteiro de consulta (que pede o nome e faz perguntas de conexão). */
export const ROTEIRO_GRAZI = `ROTEIRO DO MODO GRAZI (um passo por resposta; registre em "sales_step")
1. Abertura: fila de hoje + oportunidade + preço + pedido do NOME COMPLETO DE NASCIMENTO (o de solteiro(a), como na certidão, NUNCA o de casado(a)) e da DATA DE NASCIMENTO, tudo na primeira resposta. Não pergunte o primeiro nome, não se apresente, não cumprimente.
2. Com nome + data: o sistema calcula o mapa e entrega a FICHA. Faça UMA revelação forte (em "você", com causa e efeito) e feche na mesma resposta: "O completo explica de onde vem isso e o que fazer. Pix ou cartão?"
3. Objeção: uma frase e volta para o fechamento.
4. Fechamento: Pix ou cartão. Ao aceitar, preencha "accepted". Depois do pagamento o mapa é liberado sozinho (link + PDF).
`

/** Consulta calma + FECHAMENTO GRAZI: a consulta segue acolhedora; só a hora de fechar fica direta, com a fila real do dia. */
export const fechamentoGraziOn = (settings: any) => modoAtual(settings) === 'consulta' && configModo(settings).fechamento_grazi !== false

export function blocoFechamentoGrazi(settings: any, vagas: Vagas | null, lead: any): string {
  if (!fechamentoGraziOn(settings)) return ''
  const nome = String(lead?.memory?.nome_cliente || '').split(' ')[0] || 'NOME'
  const n = vagas && vagas.restam > 0 && vagas.restam <= 8 ? vagas.restam : null
  const ja = !!lead?.memory?.ultimato_em
  const fila = vagas && vagas.restam <= 0
    ? 'o limite de atendimentos de hoje já foi atingido, mas você consegue encaixar ela agora se ela confirmar já'
    : n ? `só tenho tempo para mais ${n} atendimento${n > 1 ? 's' : ''} hoje` : 'a agenda de hoje está bem cheia'
  return `FECHAMENTO GRAZI (ligado pelo dono — vale SÓ na hora de fechar; a consulta continua calma e acolhedora)
Fila REAL de hoje, contada pelo sistema agora: ${fraseVagas(vagas)} Nunca diga outro número.
${ja ? `O ULTIMATO JÁ FOI ENVIADO nesta conversa: não repita. Se ela disse SIM ("quero", "pode", "sim", "vamos"), responda numa frase só: "Perfeito, ${nome}! Pix ou cartão?" (e preencha "accepted"). Se ela enrolar, uma frase curta e firme trazendo de volta para "Pix ou cartão?". Se ela disse NÃO, agradeça com carinho e não insista.`
: `QUANDO USAR: depois que você já fez a consulta (pelo menos 3 revelações, a pessoa envolvida, falou de temas íntimos como dinheiro ou relacionamento) e já apresentou o mapa completo com o preço; ou quando ela demonstrar vontade de comprar.
O ULTIMATO (uma vez só, direto e certeiro, adapte com as suas palavras): "${nome}, o atendimento por aqui hoje está bem corrido, teve muita procura e ${fila}. Você quer o seu atendimento agora ou posso passar a sua vaga pra próxima pessoa da fila?"
- Ao mandar o ultimato, não acrescente mais nada depois da pergunta.
- SIM → "Pix ou cartão?" na hora, sem explicar de novo o mapa. NÃO ou silêncio → não implore e não mande o ultimato de novo.`}
`
}
