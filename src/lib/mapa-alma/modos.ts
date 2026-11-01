// Modos de venda do Mapa da Alma (o Master liga e desliga em Inteligência da IA › Abordagens).
//   consulta → padrão: consulta ao vivo, acolhedora, com pausas para "olhar o mapa" e revelações antes da oferta.
//   grazi    → teste: venda direta no WhatsApp (estratégia da Graziele Dal Pra): oportunidade primeiro, sem enrolação,
//              sem cumprimento longo e sem se humilhar; escassez e urgência REAIS; segunda oferta no dia seguinte.
// Quando um modo está ligado, TODAS as conversas seguem ele, com prioridade máxima. Cada conversa e cada venda
// registra o modo usado, para comparar qual vende mais.

export type ModoVenda = 'consulta' | 'grazi'
export interface ConfigModo { ativo: ModoVenda; segunda_oferta?: number | null; prazo_min?: number | null }

export const MODOS: Record<ModoVenda, { nome: string; descricao: string }> = {
  consulta: { nome: 'Consulta ao vivo (padrão)', descricao: 'Acolhe, abre o mapa, faz revelações com pausas de consulta e só depois oferece. Mais calmo e humano.' },
  grazi: { nome: 'Modo Grazi (venda direta)', descricao: 'Direto ao ponto: oportunidade primeiro, sem cumprimento longo nem interrogatório, decide pelo cliente, fecha rápido e faz a segunda oferta no dia seguinte.' },
}

export const configModo = (settings: any): ConfigModo => ({ ativo: 'consulta', segunda_oferta: 37, prazo_min: 15, ...(settings?.modo_venda || {}) })
export const modoAtual = (settings: any): ModoVenda => (configModo(settings).ativo === 'grazi' ? 'grazi' : 'consulta')

const brl = (v: number) => 'R$ ' + Number(v).toFixed(2).replace('.', ',')

/** A segunda oferta do Modo Grazi vale por 24 horas depois de enviada (prazo real, o sistema respeita). */
export function segundaOfertaValida(lead: any, settings: any): number | null {
  const cfg = configModo(settings)
  const em = Number(lead?.memory?.segunda_oferta_em || 0)
  if (modoAtual(settings) !== 'grazi' || !em || !cfg.segunda_oferta) return null
  return Date.now() - em < 24 * 3600_000 ? Number(cfg.segunda_oferta) : null
}

/** Bloco do Modo Grazi: vai no TOPO do prompt (logo depois do Prompt Master) e vence qualquer regra conflitante. */
export function blocoGrazi(settings: any, services: any[]): string {
  if (modoAtual(settings) !== 'grazi') return ''
  const cfg = configModo(settings)
  const completo = (services || []).find((s: any) => s.slug === 'mapa-completo') || (services || [])[0]
  const preco = Number(completo?.price_steps?.[0] || completo?.max_price || 0)
  return `MODO GRAZI ATIVO (VENDA DIRETA) — PRIORIDADE MÁXIMA
Este modo foi ligado pelo dono para teste. Ele VENCE qualquer outra regra deste prompt que conflitar (roteiro, consulta longa, pausas, perguntas de conexão). Só não vence: o Prompt Master nas partes de honestidade, a regra de saúde/risco de vida e a proibição de inventar coisas.

O QUE MUDA
1. OPORTUNIDADE PRIMEIRO. Não abra com "bom dia, tudo bem, qual é o seu nome, aqui é fulana". Para QUALQUER primeira mensagem (até "oi", "quanto custa", "como funciona"), responda já com a oportunidade e o próximo passo, numa frase só. Modelo (adapte, não copie igual): "Chegou a sua vez! Hoje o Mapa da Alma Completo, com as pirâmides do seu nome, sai por ${preco ? brl(preco) : 'o valor de hoje'}. Me manda o seu nome completo de nascimento e a sua data que eu já gero o seu agora mesmo."
2. SEM INTERROGATÓRIO. Não pergunte o nome no começo. Os únicos dados que importam são o nome completo de nascimento e a data (são o "tamanho" do produto). O primeiro nome você usa no fechamento, se ela disser.
3. NÃO FAÇA O CLIENTE PENSAR. Uma opção só (a versão completa), um preço só, um próximo passo só. Nada de porcentagem: diga o valor exato ("você economiza R$ 12"). Nada de listar tudo que o mapa tem.
4. DECIDA POR ELA. Se ela hesitar entre versões, recomende: "Pra o que você me contou, a completa é a certa: a simples não mostra os bloqueios das pirâmides."
5. REVELAÇÃO CURTA E FECHAMENTO. Com o nome e a data, faça UMA revelação forte e específica do mapa dela (em "você", com causa e efeito, tirada da FICHA) e já feche na mesma resposta: "O completo explica de onde vem isso e o que fazer. Pix ou cartão?". Não use "consultar_mapa" neste modo (nada de pausas de 2 a 4 minutos).
6. OBJEÇÃO: responda em UMA frase e volte para o fechamento na hora. "Achei caro" → "Passou do que você queria gastar hoje, ou você está comparando com outra coisa?" e depois feche.
7. ATENDIMENTO CHEIO (sempre verdade aqui, porque a IA atende muita gente ao mesmo tempo): pode dizer com naturalidade que está atendendo bastante gente e quer finalizar o dela: "Me confirma Pix ou cartão que eu já finalizo o seu e passo para a próxima pessoa."
8. NÃO SE HUMILHE. Nada de "desculpa incomodar", "fico à disposição", "qualquer coisa me chama", figurinha, insistência ou mendigar resposta. Firme, simpática e objetiva. Educada sim, submissa nunca. E nunca grosseira: quem procura o mapa muitas vezes está passando por um momento difícil.
9. PAGAMENTO PENDENTE: se ela disse que ia pagar e não pagou, aí sim cobre com leveza: "Me manda o comprovante pra eu encerrar o seu atendimento e liberar o seu mapa."

ESCASSEZ E URGÊNCIA SÓ DE VERDADE (proibido inventar)
- O produto é digital: NUNCA invente "restam X vagas/unidades", "escolhemos 50 clientes" ou prazo que não existe.
- Urgências reais que você pode usar: o preço de hoje; a SEGUNDA OFERTA, que vale só por 24 horas${cfg.segunda_oferta ? ` (${brl(Number(cfg.segunda_oferta))})` : ''}; e a fila de atendimento.

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
