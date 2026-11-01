import Anthropic from '@anthropic-ai/sdk';
import { pickModel, recordAI } from './usage';

export const STAGE_KEYS = ['novo', 'abordado', 'respondeu', 'interessado', 'negociando', 'pix', 'pago', 'sem', 'remarketing'] as const;

let client: Anthropic | null = null;
function ai() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('IA não configurada: falta ANTHROPIC_API_KEY');
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 2 });
  return client;
}
export const model = () => process.env.AI_MODEL || 'claude-sonnet-5-5';

export type AiOpts = { task?: string; tier?: 'fast' | 'smart'; leadId?: string | null };

/**
 * Chama o Claude obrigando a resposta num formato fixo (ferramenta).
 * Padrão: modelo rápido e barato (Haiku). tier 'smart' usa o Sonnet (só conversas quentes).
 */
const noForcedTool = new Set<string>();

export type SystemPrompt = string | { cached: string; rest: string };

export async function structured<T = any>(system: SystemPrompt, user: string, name: string, schema: any, maxTokens = 1500, opts: AiOpts = {}): Promise<T> {
  const chosen = await pickModel(opts.tier || 'fast');
  // a parte fixa (regras, serviços e cérebros) fica em cache na Anthropic: custa ~10% nas próximas chamadas
  const sys =
    typeof system === 'string'
      ? system
      : [
          { type: 'text', text: system.cached, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: system.rest },
        ];
  const base: any = {
    model: chosen,
    max_tokens: maxTokens,
    system: sys,
    messages: [{ role: 'user', content: user }],
    tools: [{ name, description: 'Registra o resultado no sistema. Use SEMPRE esta ferramenta para responder.', input_schema: schema }],
  };
  let r: any;
  const auto = () =>
    ai().messages.create({
      ...base,
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: `${user}\n\nResponda chamando a ferramenta "${name}" com todos os campos. Não escreva nada fora dela.` }],
    });
  if (noForcedTool.has(chosen)) r = await auto();
  else
    try {
      r = await ai().messages.create({ ...base, tool_choice: { type: 'tool', name } });
    } catch (e: any) {
      // alguns modelos não aceitam ferramenta obrigatória: lembra e pede para usar a ferramenta por conta própria
      if (!/tool_choice/i.test(String(e?.message || ''))) throw e;
      noForcedTool.add(chosen);
      r = await auto();
    }
  await recordAI(opts.task || name, r.model || chosen, r.usage?.input_tokens || 0, r.usage?.output_tokens || 0, opts.leadId, r.usage?.cache_creation_input_tokens || 0, r.usage?.cache_read_input_tokens || 0);
  const block = (r.content || []).find((c: any) => c.type === 'tool_use');
  if (block) return fixShape(block.input, schema) as T;
  // último recurso: JSON escrito no texto
  const txt = (r.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return fixShape(JSON.parse(m[0]), schema) as T;
    } catch {}
  }
  throw new Error('A IA não devolveu a resposta no formato esperado');
}

/** Conserta respostas fora do formato (ex.: lista que veio como texto JSON). */
export function fixShape(v: any, schema: any): any {
  if (!schema || v == null) return v;
  const types = ([] as string[]).concat(schema.type || []);
  if (types.includes('array')) {
    let arr = v;
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch {
        arr = arr.trim() ? [arr] : [];
      }
    }
    if (arr && !Array.isArray(arr) && typeof arr === 'object') arr = Object.values(arr);
    if (!Array.isArray(arr)) return types.includes('null') ? null : [];
    return arr.map((x: any) => fixShape(x, schema.items));
  }
  if (types.includes('object') && schema.properties) {
    let obj = v;
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch {
        return types.includes('null') ? null : {};
      }
    }
    if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const out: any = { ...obj };
    for (const k of Object.keys(schema.properties)) if (k in out) out[k] = fixShape(out[k], schema.properties[k]);
    return out;
  }
  if ((types.includes('integer') || types.includes('number')) && typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  if (types.includes('boolean') && typeof v === 'string') return v === 'true';
  return v;
}

const nullable = (type: string, description: string) => ({ type: [type, 'null'], description });

export const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    understanding: {
      type: 'object',
      description:
        'PREENCHA ANTES DE TUDO. Interprete o cliente como uma pessoa experiente leria: pelo contexto da conversa inteira, não só pelas palavras. Gírias, abreviações, erros de digitação, áudio transcrito errado, respostas curtas ("e aí?", "manda", "kd", "e o azul?") e emojis têm sentido pelo que veio antes.',
      properties: {
        client_meant: { type: 'string', description: 'O que o cliente QUIS dizer nas mensagens desde a sua última resposta, em palavras claras (ex.: "kd o link" → "está cobrando o link da prévia que você prometeu e não chegou"; "e o azul?" → "quer ver a prévia na cor azul que pediu").' },
        refers_to: nullable('string', 'Se a mensagem é curta ou depende do contexto: a que mensagem ou promessa anterior ela se refere.'),
        intents: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['quer_ver_previa', 'quer_mudar_previa', 'cobrando_algo_prometido', 'repetiu_pedido', 'quer_pagar', 'pergunta_preco', 'pergunta_servico_ou_prazo', 'objecao', 'vai_pensar', 'mandou_material', 'elogio_ou_concordou', 'reclamacao_ou_irritado', 'quer_falar_com_pessoa', 'perguntou_se_e_robo', 'nao_quer_mais', 'conversa_social', 'outro'],
          },
          description: 'Todas as intenções presentes (pode ser mais de uma).',
        },
        mood: { type: 'string', enum: ['animado', 'neutro', 'apressado', 'desconfiado', 'impaciente', 'irritado', 'triste'], description: 'Humor do cliente agora.' },
        confidence: { type: 'integer', minimum: 0, maximum: 100, description: 'Quanto você tem certeza de que entendeu o cliente (0 a 100). Abaixo de 60 = ambíguo.' },
        promises: {
          type: 'array',
          items: { type: 'string', enum: ['enviar_previa', 'ajustar_previa', 'chamar_equipe', 'nenhuma'] },
          description: 'O que a SUA resposta promete fazer agora. Toda promessa é cumprida pelo sistema na hora; nunca prometa sem marcar aqui.',
        },
      },
      required: ['client_meant', 'intents', 'mood', 'confidence', 'promises'],
    },
    reread: {
      type: 'object',
      description: 'PREENCHA PRIMEIRO. Releitura da conversa inteira e da memória antes de escrever.',
      properties: {
        pending_questions: { type: 'array', items: { type: 'string' }, description: 'Perguntas ou pedidos do cliente que ainda NÃO foram respondidos (de todas as mensagens dele desde a sua última resposta).' },
        already_said: { type: 'array', items: { type: 'string' }, description: 'Informações, ofertas, bônus, preços e perguntas que VOCÊ já disse nesta conversa (não repita nenhum).' },
        missing_info: { type: 'array', items: { type: 'string' }, description: 'O que ainda falta saber antes de gerar a prévia ou propor (o que a pessoa busca, nome completo de nascimento, data de nascimento, dados do parceiro no mapa do casal…).' },
        plan: { type: 'string', description: 'O que esta resposta vai fazer, em 1 frase (responder X e perguntar Y).' },
      },
      required: ['pending_questions', 'already_said', 'missing_info', 'plan'],
    },
    memory: {
      type: 'object',
      description: 'FICHA DO CLIENTE: preencha SÓ o que é NOVO ou MUDOU nesta resposta (o que já estava fica guardado sozinho; não repita). Campos sem novidade: deixe de fora ou null.',
      properties: {
        nome_cliente: { type: ['string', 'null'], description: 'Nome que a PESSOA disse que tem (nunca o nome do perfil do WhatsApp). null até ela dizer.' },
        genero_cliente: { type: ['string', 'null'], enum: ['masculino', 'feminino', null], description: 'Se quem está falando é homem ou mulher, deduzido pelo nome que ELE/ELA disse ou pelo jeito que fala de si ("obrigada", "estou cansada", "sou dono"). NUNCA pergunte. null se não der para saber.' },
        mapa_tipo: { type: ['string', 'null'], enum: ['pessoal', 'casal', null], description: 'Qual mapa o cliente quer: pessoal ou casal.' },
        mapa_nome_completo: { type: ['string', 'null'], description: 'NOME COMPLETO DE NASCIMENTO de quem vai receber o mapa, exatamente como o cliente escreveu (com acentos). Só preencha quando ele passar o nome completo (nome e sobrenomes).' },
        mapa_nascimento: { type: ['string', 'null'], description: 'Data de nascimento dessa pessoa no formato DD/MM/AAAA.' },
        mapa_nome_2: { type: ['string', 'null'], description: 'Mapa do casal: nome completo de nascimento da outra pessoa.' },
        mapa_nascimento_2: { type: ['string', 'null'], description: 'Mapa do casal: data de nascimento da outra pessoa (DD/MM/AAAA).' },
        taro_pergunta: { type: ['string', 'null'], description: 'Tarô: a pergunta que a pessoa quer fazer às cartas, nas palavras dela.' },
        taro_tipo: { type: ['string', 'null'], enum: ['3cartas', 'cruz', null], description: 'Tarô: tiragem escolhida (3cartas = Passado, Presente e Futuro; cruz = Cruz Celta).' },
        interesse: { type: ['string', 'null'], description: 'O que a pessoa quer descobrir ou está vivendo (ex.: "entender o propósito", "vida amorosa", "carreira travada", "curiosidade").' },
        signo: { type: ['string', 'null'], description: 'Signo solar, se a pessoa disse ou se dá para saber pela data.' },
        negocio: { type: ['string', 'null'], description: '(não usado no Mapa da Alma)' },
        nome_negocio: { type: ['string', 'null'] },
        cidade: { type: ['string', 'null'] },
        tem_site: { type: ['string', 'null'], description: 'sim (qual), não, ou null se não se sabe.' },
        canais: { type: ['string', 'null'], description: 'Como os clientes chegam hoje (indicação, Instagram, Google…).' },
        objetivo: { type: ['string', 'null'], description: 'O que o cliente quer.' },
        ja_ofereceu: { type: 'array', items: { type: 'string' }, description: 'Ofertas/bônus/prévia já oferecidos.' },
        precos_ditos: { type: 'array', items: { type: 'string' } },
        perguntas_feitas: { type: 'array', items: { type: 'string' }, description: 'Perguntas que você já fez ao cliente.' },
        nome_no_site: { type: ['string', 'null'], description: 'Nome que o cliente quer no site.' },
        cor_preferida: { type: ['string', 'null'], description: 'Cores pedidas para o site, a principal primeiro (ex.: "verde e azul clarinho", "azul marinho"). Atualize sempre que o cliente pedir outra cor.' },
        servicos_principais: { type: ['string', 'null'], description: 'Serviços/especialidades que o site deve mostrar.' },
        pedidos_previa: { type: 'array', items: { type: 'string' }, description: 'Ajustes que o cliente pediu na prévia, cada um curto e específico (ex.: "trocar a cor para azul marinho", "nome: Studio Bella Nails", "tirar a seção de planos", "usar as fotos que o cliente enviou").' },
        endereco: { type: ['string', 'null'], description: 'Endereço ou bairro que o cliente informou para aparecer no site.' },
        horarios: { type: ['string', 'null'], description: 'Horário e dias de atendimento que o cliente informou (ex.: "seg a sex 9h às 18h, sáb 9h às 13h").' },
        area_atendimento: { type: ['string', 'null'], description: 'Até onde atende: só o bairro/cidade, a região, todo o estado, o Brasil todo ou só online.' },
        local_fisico: { type: ['string', 'null'], description: '"sim" (tem endereço onde recebe clientes), "não" (atende em domicílio/online) ou null.' },
        instagram: { type: ['string', 'null'], description: '@ do Instagram do negócio, se o cliente informou.' },
        observacoes: { type: ['string', 'null'], description: 'Algo importante para lembrar (preferências, restrições, tom do cliente).' },
        email: { type: ['string', 'null'], description: 'E-mail que o cliente informou.' },
        outros_contatos: { type: ['string', 'null'], description: 'Outro telefone/WhatsApp, site atual ou contato que o cliente passou.' },
        negociacao: { type: 'array', items: { type: 'string' }, description: 'Fatos da negociação com data curta, um por item, só os novos (ex.: "30/10: ofereci R$ 149 vitalício", "30/10: pediu R$ 120, ficou de pensar").' },
        prazos: { type: 'array', items: { type: 'string' }, description: 'Datas e prazos combinados, só os novos (ex.: "paga na sexta 07/11", "quer o site pronto antes de 15/11", "falar de novo na segunda").' },
        ultima_tratativa: { type: ['string', 'null'], description: 'Em 1 frase: em que ponto a conversa parou agora e o que ficou combinado (para retomar dias depois sem esquecer nada).' },
      },
    },
    sales_step: {
      type: 'string',
      enum: ['conexao', 'descoberta', 'diagnostico', 'proposta', 'prova', 'oferta', 'objecao', 'fechamento', 'pos_venda'],
      description: 'Em qual passo do roteiro de vendas ESTA resposta está (avance um passo quando possível; nunca volte para descoberta depois de um sinal de compra).',
    },
    buying_signal: { type: 'boolean', description: 'true se o cliente deu sinal de compra (perguntou preço, pagamento, prazo, como começar, disse que gostou/quer).' },
    preview_update: {
      type: 'boolean',
      description: 'true quando a prévia do mapa já foi enviada e o cliente CORRIGIU o nome ou a data (ou pediu o mapa de outra pessoa). O mapa é refeito e o novo link vai na hora.',
    },
    preview_ok: {
      type: 'boolean',
      description: 'true quando você já tem o NOME COMPLETO DE NASCIMENTO e a DATA DE NASCIMENTO (e os da outra pessoa, no mapa do casal) e o cliente quer ver a prévia do mapa (ou reclamou que o link não chegou). O sistema gera a prévia e manda o link NA HORA.',
    },
    preview_message: nullable(
      'string',
      'Quando preview_ok ou preview_update for true: a mensagem curta (1 a 2 frases) que vai junto com o link, acolhedora e personalizada (use o primeiro nome e o que a pessoa quer descobrir). Diga com leveza que é a prévia do mapa dela. Não escreva o link (ele entra sozinho no final).',
    ),
    messages: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
      description:
        'De 1 a 3 balões curtos para mandar agora no WhatsApp, na ordem, como uma pessoa digitando (cada um com 1 frase ou 2 bem curtas). O ÚLTIMO termina com uma pergunta. Lista vazia se não for preciso responder.',
    },
    temperature: { type: 'integer', minimum: 0, maximum: 100, description: 'Temperatura da conversa: engajamento e interesse, 0 frio, 100 pronto para pagar.' },
    close_probability: { type: 'integer', minimum: 0, maximum: 100, description: 'Probabilidade realista (%) de este lead pagar nos próximos 7 dias, considerando interesse, objeções, orçamento e etapa.' },
    techniques_used: { type: 'array', items: { type: 'integer' }, description: 'Números (#) das técnicas da lista que você aplicou nesta resposta. Vazio se não usou nenhuma.' },
    stage: { type: 'string', enum: STAGE_KEYS as any, description: 'Etapa do funil depois desta resposta.' },
    summary: { type: 'string', description: 'Resumo da conversa inteira em até 3 frases curtas, para a equipe.' },
    next_step: { type: 'string', description: 'O próximo passo de venda, em uma frase.' },
    pains: { type: 'array', items: { type: 'string' }, description: 'Dores do cliente ditas por ele (curtas).' },
    lost_reason: nullable('string', 'Só quando o cliente recusou de vez (stage "sem"): o motivo em poucas palavras (ex.: "achou caro", "não acredita em numerologia", "sem interesse agora"). null nos outros casos.'),
    objection: nullable('string', 'Objeção feita na última mensagem do lead, em poucas palavras (ex.: "está caro"). null se não houve.'),
    offered_service: nullable('string', 'Slug do serviço em negociação, se houver.'),
    offered_price: nullable('number', 'Preço que você ofereceu nesta resposta, se ofereceu.'),
    price_request: nullable('number', 'Valor que o CLIENTE pediu/propôs pagar nesta conversa, quando ele pediu desconto (ex.: "faz por 499?" → 499). null se não pediu.'),
    accepted: {
      type: ['object', 'null'],
      description: 'Preencha só quando o cliente aceitou claramente comprar. O sistema envia o Pix.',
      properties: { service_slug: { type: 'string' }, price: { type: 'number' } },
      required: ['service_slug', 'price'],
    },
    document: nullable('string', 'CPF ou CNPJ que o cliente informou nesta conversa, só os números. null se não informou.'),
    opt_out: { type: 'boolean', description: 'true se a pessoa pediu para não receber mais mensagens ou recusou de vez.' },
    needs_human: { type: 'boolean', description: 'true se precisa de uma pessoa da equipe (desconto abaixo do permitido, pedido fora do padrão, irritação, o próprio cliente pediu ligação).' },
    human_reason: nullable('string', 'Motivo curto para a equipe.'),
    asked_if_bot: { type: 'boolean', description: 'true se o cliente perguntou diretamente se está falando com robô, IA ou atendimento automático. A conversa passa na hora para uma pessoa da equipe.' },
    consultar_mapa: { type: ['string', 'null'], description: 'Mapa da Alma: tema da pergunta (ex.: "dinheiro", "amor", "família", "saúde", "trabalho") quando você vai CONSULTAR O MAPA antes de responder (regra 3). Aí "messages" leva só o aviso curto de que vai olhar o mapa. null nas demais respostas.' },
    as_audio: { type: 'boolean', description: 'true só se esta resposta deve ir como ÁUDIO de voz (ver a seção VOZ, quando existir). Senão false.' },
    remarketing_date: nullable('string', 'Se o cliente quer só mais pra frente: data AAAA-MM-DD para retomar.'),
  },
  required: ['messages', 'temperature', 'stage', 'summary', 'next_step', 'opt_out', 'needs_human'],
};

export type ReplyResult = {
  understanding?: { client_meant: string; refers_to?: string | null; intents: string[]; mood: string; confidence: number; promises: string[] };
  reread?: { pending_questions: string[]; already_said: string[]; missing_info: string[]; plan: string };
  memory?: Record<string, any>;
  messages: string[];
  sales_step?: string;
  buying_signal?: boolean;
  preview_ok?: boolean;
  preview_update?: boolean;
  preview_message?: string | null;
  reply?: string;
  temperature: number;
  close_probability?: number;
  techniques_used?: number[];
  stage: string;
  summary: string;
  next_step: string;
  pains?: string[];
  objection?: string | null;
  lost_reason?: string | null;
  offered_service?: string | null;
  offered_price?: number | null;
  accepted?: { service_slug: string; price: number } | null;
  document?: string | null;
  opt_out: boolean;
  needs_human: boolean;
  human_reason?: string | null;
  asked_if_bot?: boolean;
  as_audio?: boolean;
  consultar_mapa?: string | null;
  remarketing_date?: string | null;
};

export const MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    messages: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: { type: 'string' },
      description: '1 ou 2 balões curtos, na ordem. O último termina com uma pergunta simples de responder.',
    },
    techniques_used: { type: 'array', items: { type: 'integer' }, description: 'Números (#) das técnicas aplicadas.' },
  },
  required: ['messages'],
};

/** Normaliza os balões: tira vazios, junta excesso e garante no máximo 3. */
export function bubbles(v: any, max = 3): string[] {
  let list: string[] = Array.isArray(v?.messages) ? v.messages : typeof v?.messages === 'string' ? [v.messages] : v?.reply ? [v.reply] : v?.message ? [v.message] : [];
  // bloco de preços (🟢 / *Valor…:*) fica inteiro num balão, com as linhas em branco
  const priceBlock = (t: string) => /🟢|\*[^*\n]{2,40}:\*/.test(t);
  list = list.flatMap((t) => (priceBlock(String(t || '')) ? [String(t)] : String(t || '').split(/\n{2,}/))).map((t) => t.replace(/^["“]|["”]$/g, '').trim()).filter(Boolean);
  // balão que é só o link (ou começa por ele) junta com o anterior: a frase com 👇 e o link ficam no mesmo balão
  list = list.reduce((acc: string[], t) => {
    if (acc.length && /^(https?:\/\/|www\.)\S+/i.test(t)) acc[acc.length - 1] = `${acc[acc.length - 1]}\n${t}`;
    else acc.push(t);
    return acc;
  }, []);
  if (list.length > max) list = [...list.slice(0, max - 1), list.slice(max - 1).join(list.slice(max - 1).some(priceBlock) ? '\n\n' : ' ')];
  return list;
}

export const SALE_SCHEMA = {
  type: 'object',
  properties: {
    pains: { type: 'array', items: { type: 'string' }, description: 'Dores do cliente.' },
    decisive_factor: { type: 'string', description: 'O fator que decidiu a compra, em até 5 palavras (ex.: "Prévia do site", "Entrega em 48h", "Sem mensalidade", "Preço").' },
    hook: { type: 'string', description: 'O que chamou a atenção do cliente no começo da conversa.' },
    objections: {
      type: 'array',
      items: { type: 'object', properties: { objection: { type: 'string' }, response: { type: 'string' } }, required: ['objection', 'response'] },
      description: 'Objeções e a resposta que funcionou.',
    },
    notes: { type: 'string', description: 'Lição principal desta venda para as próximas conversas, em 1 ou 2 frases.' },
  },
  required: ['pains', 'decisive_factor', 'hook', 'objections', 'notes'],
};

export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    next_step: { type: 'string' },
    temperature: { type: 'integer', minimum: 0, maximum: 100 },
    close_probability: { type: 'integer', minimum: 0, maximum: 100, description: 'Probabilidade realista (%) de pagar nos próximos 7 dias.' },
  },
  required: ['summary', 'next_step', 'temperature', 'close_probability'],
};

export const PLAYBOOK_SCHEMA = {
  type: 'object',
  properties: { content: { type: 'string', description: 'Playbook em texto simples com tópicos curtos.' } },
  required: ['content'],
};
