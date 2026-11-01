import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SETTINGS = {
  paused: false,
  company_name: 'Mapa da Alma',
  company: { legal_name: '', document: '', phone: '', email: '', address: '', city: '' },
  receipts: { enabled: true, message: 'Aqui está o seu recibo. Obrigada pela confiança! 💜' },
  assistant_name: 'Clara',
  hours: { start: '08:00', end: '19:00', days: [1, 2, 3, 4, 5, 6] },
  reply_24h: true,
  reply_delay: { min: 20, max: 90 },
  reply_speed: 'media',
  read_receipts: true,
  typing_speed: 'normal', // lenta | normal | rapida
  bubble_gap: { min: 2, max: 5 }, // segundos entre um balão e outro (além do digitando)
  send_gap: { min: 4, max: 10 }, // anti-bloqueio: intervalo mínimo entre mensagens do mesmo número
  max_bubbles: 3,
  pause_ai_on_human: true,
  // respostas em áudio com a voz clonada da equipe (ElevenLabs)
  voice: {
    enabled: false,
    model: 'eleven_multilingual_v2', // o mais fiel para voz clonada (Flash custa metade, mas parece menos com a pessoa)
    // 'tts' = texto para fala normal; 'narracao' = estilo audiobook (frase a frase, mais estável, não trava em textos longos)
    mode: 'narracao' as 'tts' | 'narracao',
    narr_stability: 0.6,
    max_pct: 10, // no máximo 10% das mensagens da IA em áudio
    max_per_conversation: 4,
    on_client_audio: true, // (antigo) cliente mandou áudio → pode responder em áudio
    on_closing: true, // (antigo) fechamento
    // momentos em que a IA fala por áudio (cada um liga/desliga). As frases fixas não gastam IA e ficam guardadas (o mesmo áudio é reaproveitado).
    moments: {
      boas_vindas: {
        on: true,
        scripts: [
          'Oi, tudo bem? Aqui é a {atendente}, do Mapa da Alma! Que bom que você chegou. Pode me contar com calma o que você quer descobrir sobre você, que eu vou te respondendo por aqui, tá?',
          'Olá! {atendente} aqui, do Mapa da Alma. Fica à vontade pra me mandar suas dúvidas sobre o mapa, que eu te respondo com carinho, combinado?',
        ],
      },
      link_pagamento: {
        on: true,
        scripts: [
          'Prontinho! Deixei o link aqui embaixo pra você. Assim que o pagamento cair, o seu mapa completo chega aqui no WhatsApp, tá bom?',
          'Perfeito! Te mandei o link aqui embaixo. Quando concluir, eu já te envio o seu Mapa da Alma completo, com o PDF pra guardar!',
        ],
      },
      pagamento_confirmado: {
        on: true,
        scripts: [
          'Pagamento confirmado! Muito obrigada pela confiança. O seu Mapa da Alma completo já está chegando aqui, com o link pra ver no celular e o PDF pra guardar. Lê com calma, tá?',
          'Oba, recebi o seu pagamento! Obrigada de coração. Já te mando o seu mapa completo aqui, e qualquer dúvida sobre ele é só me chamar!',
        ],
      },
      fechamento: { on: true }, // a IA escreve na hora: "ficou com alguma dúvida? entendeu tudo certinho? bora fechar então?"
      cliente_audio: { on: true }, // o cliente mandou áudio → a IA pode responder em áudio
    } as Record<string, { on: boolean; scripts?: string[] }>,
    default_voice: null as string | null,
    stability: 0.45,
    similarity: 0.9,
    style: 0.1,
    speed: 1,
  }, // equipe respondeu pelo celular = IA sai da conversa
  turn_gap: 25, // segundos mínimos entre uma resposta da IA e a próxima (dá tempo do cliente ler e escrever)
  typing: true,
  followup_days: [1, 3, 7, 15],
  limits: { week1: 20, week2: 40, mature: 70 },
  interval_min: { min: 2, max: 6 },
  long_pause_every: 12,
  long_pause_min: { min: 15, max: 30 },
  auto_pause_pct: 2,
  ig_daily_limit: 60,
  ig_templates: [
    'Oi, tudo bem? Estou com uma dúvida, poderia me esclarecer?',
    'Oi! Vi seu story aqui e fiquei com uma dúvida, posso te perguntar uma coisa?',
    'Oi, tudo bom? Posso te fazer uma pergunta rapidinha?',
    'Olá! Achei seu perfil pelo Google, posso tirar uma dúvida com você?',
    'Oi! Você atende aqui na região? Posso te perguntar uma coisa?',
  ],
  weights: { nosite: 35, weak: 20, fewrev: 5, lowrate: 10, photos: 10, incomplete: 10, wa: 10, ig: 10, estab: 25 },
  temp: { warm: 35, hot: 65 },
  alert_hot: true,
  pix: { provider: 'asaas', validity_hours: 24 },
  payments: { mode: 'link' },
  checkout: {
    base_url: '',
    brand: '',
    accent: '#7a5af8',
    logo_url: '',
    max_installments: 6,
    methods: ['pix', 'card'],
    expiry_days: 7,
    unico_note: 'Pagamento único · seu mapa para sempre',
    mensal_note: 'Cobrança mensal · cancele quando quiser',
    success_message: 'Pagamento confirmado! ✨ Em instantes o seu Mapa da Alma completo chega no seu WhatsApp.',
    footer: 'Pagamento processado com segurança pelo Asaas.',
  },
  budget: {
    ai_usd: 8, // teto mensal da IA em US$ (passou: só Haiku; passou 20%: IA para)
    usd_brl: 5.6,
    smart_for_hot: true, // usa o Sonnet só nas conversas quentes/negociando
    google_ent_cap: 950, // buscas de negócios (cota grátis: 1.000/mês)
    google_pro_cap: 4800, // localização de cidades (cota grátis: 5.000/mês)
    monthly_brl: 300,
    fixed_brl: 190, // VPS + assinatura do Claude
  },
  // domínios próprios já conferidos (página Domínios). null = usa o endereço do Easypanel
  domains: { painel: null as string | null, checkout: null as string | null, previa: null as string | null, bio: null as string | null, packs: null as string | null, catalogo: null as string | null, orcamento: null as string | null, relatorio: null as string | null },
  previews: {
    explain: 'Essa é uma prévia do seu mapa: já dá pra ver os seus números principais e o começo da leitura. O estudo completo tem todas as seções explicadas, o seu signo, os ciclos, os carmas e os triângulos, com o PDF pra guardar. O que mais chamou a sua atenção até aqui?',
    auto: true, premium: false, send_examples: false, message: '{nome}, preparei a prévia do seu Mapa da Alma com muito carinho ✨👇\n{url}',
    // a prévia sai alguns minutos depois do pedido (parece trabalho feito com calma)
    delay_on: true, delay_min: 90, delay_max: 150 },
  // número salvo na agenda do celular do chip: a IA não atende (a equipe liga manualmente na conversa).
  // A detecção depende da Evolution; se errar, ligue "IA atende todos" no Painel rápido.
  ai_on_saved_contacts: false,
  // saudação que abre SEMPRE a primeira resposta da conversa (o horário define o bom dia/boa tarde/boa noite)
  greeting: {
    on: true,
    template: '{saudacao}, tudo bem? Aqui é {artigo} {nome}, do {empresa} ✨',
    fallback: 'Olá',
    rules: [
      { from: '06:00', to: '11:59', text: 'Bom dia' },
      { from: '12:00', to: '18:30', text: 'Boa tarde' },
      { from: '18:31', to: '23:59', text: 'Boa noite' },
    ],
  },
  // depois da prévia do site, o sistema monta e manda a prévia do Link na bio com a oferta (sem gastar IA)
  bio_upsell: {
    on: false,
    delay_s: 180,
    message:
      'Aproveitando que te mandei a prévia do site, também montei uma prévia do seu *Link na bio* 👇\n{url}\n\nÉ aquela página com todos os seus contatos num lugar só: WhatsApp, Instagram, localização, horários e o link do site. Fica pronta pra colocar na bio do Instagram e passa muito mais confiança pros seus clientes 😉',
    question: 'Qual dessas opções faz mais sentido pra você hoje?',
  },
  // textos prontos que os anúncios do Meta mandam quando a pessoa clica (um por linha)
  ad_messages: 'Olá! Posso ter mais informações sobre isso?\nQuero fazer o meu Mapa da Alma\nQuero o mapa do casal',
  // horário COMERCIAL por dia da semana: só nele o sistema chama por conta própria (follow-up, recuperação, prospecção, retomar quem escreveu de madrugada)
  commercial: {
    '0': { on: false, start: '10:00', end: '14:00' },
    '1': { on: true, start: '09:00', end: '18:00' },
    '2': { on: true, start: '09:00', end: '18:00' },
    '3': { on: true, start: '09:00', end: '18:00' },
    '4': { on: true, start: '09:00', end: '18:00' },
    '5': { on: true, start: '09:00', end: '18:00' },
    '6': { on: true, start: '09:00', end: '13:00' },
  } as Record<string, { on: boolean; start: string; end: string }>,
  // aviso automático para quem escreve fora do horário de atendimento ({inicio}, {fim}, {empresa})
  // renovações (domínio, hospedagem, mensalidade): cobrança automática no WhatsApp
  renewal: {
    text: 'Oi, {nome}! Tudo bem? 😊 Passando pra avisar que {servico} vence em {vencimento}, no valor de {valor}. Pra deixar tudo em dia é só pagar pelo link 👇\n{link}',
    due_text: 'Oi, {nome}! Hoje é o vencimento de {servico} ({valor}). Se já pagou, pode desconsiderar 🙂 O link continua aqui 👇\n{link}',
  },
  // pedido de depoimento depois da entrega
  testimonial: {
    on: true,
    days: 3,
    link: '',
    text: 'Oi, {nome}! Conseguiu ler o seu Mapa da Alma com calma? 💜 Se puder, me conta o que mais fez sentido pra você, ajuda demais o nosso trabalho 🙏\n{link}',
  },
  after_hours: { on: true, text: 'Oi! Recebi sua mensagem ✨ Nosso atendimento funciona das {inicio} às {fim}. Assim que abrirmos, eu te respondo com calma por aqui!' },
  // retomada de quem parou de responder (sem se apresentar de novo); um por tentativa, o último encerra
  followup_texts: [
    'Oii, {saudacao}! Ainda quer descobrir o que o seu Mapa da Alma revela sobre você? ✨',
    'Vou deixar o seu atendimento em pausa por aqui, tá? Quando sentir que é o momento, é só me chamar que eu te ajudo com carinho 💜',
  ] as string[],
  // combo no link de pagamento: desconto padrão (%)
  combo_discount: 15,
  // recuperação: quem viu a prévia e sumiu recebe uma mensagem leve no 1º lembrete
  recovery: { on: true },
  // respostas rápidas da equipe na conversa: digite /atalho
  quick_replies: [
    { k: 'preco', t: 'O Mapa da Alma completo sai por um valor único: estudo de numerologia cabalística + o seu signo, com link pra ler no celular e o PDF pra guardar ✨' },
    { k: 'prazo', t: 'Assim que o pagamento cai, o seu mapa completo chega aqui no WhatsApp em poucos minutos 💜' },
    { k: 'pix', t: 'Te mando agora o link seguro de pagamento, lá você escolhe Pix ou cartão 😊' },
    { k: 'dados', t: 'Pra montar o seu mapa eu preciso do seu nome completo de nascimento (como está na certidão, com acentos) e da sua data de nascimento 🙂' },
    { k: 'obrigado', t: 'Eu que agradeço, {nome}! Qualquer dúvida sobre o seu mapa é só me chamar aqui 💜' },
  ] as { k: string; t: string }[],
  // relatório semanal no WhatsApp (toda segunda de manhã)
  report: { on: true, to: '', last: '' },
  ab_auto: true,
  remarketing_after_followups_days: 60,
};

export type Settings = typeof DEFAULT_SETTINGS;

function isObj(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

export function deepMerge<T>(base: T, extra: any): T {
  if (!isObj(extra)) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(extra)) {
    const v = extra[k];
    out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

export async function getSettings(db: SupabaseClient): Promise<Settings> {
  const { data } = await db.from('settings').select('data').eq('id', 1).maybeSingle();
  return deepMerge(DEFAULT_SETTINGS, data?.data || {});
}
