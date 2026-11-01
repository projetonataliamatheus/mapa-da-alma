/** Aparência e textos do checkout, editados no Editor visual (só Master). */

export const BLOCKS: [string, string][] = [
  ['desc', 'Descrição do serviço'],
  ['includes', 'O que está incluso'],
  ['total', 'Valor total'],
  ['installments', 'Parcelamento'],
  ['image', 'Imagem'],
  ['guarantee', 'Garantia'],
  ['testimonial', 'Depoimento'],
  ['badges', 'Selos de confiança'],
];

export const FONTS = ['Geist', 'Inter', 'Poppins', 'Montserrat', 'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Lora'];

export const DEFAULT_DESIGN = {
  v: 2,
  theme: {
    bg: '#f4f5f9',
    bg_style: 'blobs' as 'blobs' | 'solid' | 'gradient' | 'image',
    bg_image: '',
    bg2: '#ffffff',
    font: 'Geist',
    radius: 20,
    btn_radius: 12,
    layout: 'split' as 'split' | 'stack',
    shadow: true,
    show_secure: true,
    show_steps: true,
  },
  texts: {
    secure: 'Pagamento seguro',
    eyebrow: 'Você está contratando',
    total_label: 'Total',
    monthly_label: 'Mensalidade',
    inst_text: 'ou em até {n}x de {parcela} no cartão',
    step1: 'Seus dados',
    step2: 'Pagamento',
    name_label: 'Nome completo',
    doc_label: 'CPF ou CNPJ',
    phone_label: 'WhatsApp',
    cta1: 'Continuar para o pagamento',
    fine1: 'O recibo do pagamento também será enviado para o seu WhatsApp.',
    pix_info: 'Aprovação na hora. Você paga pelo app do banco com QR Code ou Pix copia e cola.',
    pix_cta: 'Gerar Pix de {valor}',
    pix_wait: 'Aguardando o pagamento…',
    card_cta: 'Pagar {valor}',
    card_fine: 'Os dados do cartão vão direto para o processamento do pagamento e não ficam guardados.',
    done_title: 'Pagamento confirmado',
  },
  blocks: BLOCKS.map(([id]) => ({ id, on: !['image', 'guarantee', 'testimonial', 'badges'].includes(id) })),
  image: { url: '', caption: '' },
  guarantee: { title: 'Satisfação garantida', text: 'Se o resultado não ficar como combinamos, ajustamos até ficar do seu jeito.' },
  testimonial: { text: 'Atendimento rápido e o site ficou lindo. Recomendo de olhos fechados!', name: 'Cliente satisfeito', role: 'Dono de negócio local', photo: '' },
  badges: ['Pagamento seguro', 'Dados protegidos', 'Recibo no WhatsApp'],
};

export type Design = typeof DEFAULT_DESIGN;

export function fill(t: string, vars: Record<string, string | number>) {
  return String(t || '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Junta o salvo com o padrão, mantendo blocos novos que não existiam ainda. */
export function mergeDesign(saved: any): Design {
  const d: any = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
  if (!saved || typeof saved !== 'object') return d;
  for (const k of ['theme', 'texts', 'image', 'guarantee', 'testimonial']) d[k] = { ...d[k], ...(saved[k] || {}) };
  if (Array.isArray(saved.badges)) d.badges = saved.badges;
  if (Array.isArray(saved.blocks)) {
    const known = new Set(BLOCKS.map((b) => b[0]));
    const list = saved.blocks.filter((b: any) => known.has(b?.id));
    for (const [id] of BLOCKS) if (!list.some((b: any) => b.id === id)) list.push(d.blocks.find((b: any) => b.id === id));
    d.blocks = list;
  }
  // versão 2: selos de confiança desligados e frase nova do recibo (quem religar no editor continua com eles)
  if ((saved.v || 1) < 2) {
    d.blocks = d.blocks.map((b: any) => (b.id === 'badges' ? { ...b, on: false } : b));
    if (/^Usamos seus dados/.test(d.texts.fine1 || '')) d.texts.fine1 = DEFAULT_DESIGN.texts.fine1;
  }
  d.v = 2;
  return d;
}
