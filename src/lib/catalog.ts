/** Catálogo digital (cardápio com QR Code): tipos, limites, temas e cardápio de exemplo por tipo de negócio. */
import { nicheKey } from './bio-icons';

export type CatCategory = { id: string; name: string; emoji?: string };
export type CatProduct = { id: string; cat: string; name: string; desc: string; price: number | null; promo: number | null; photos: string[]; on: boolean; tags: string[] };
export type CatalogData = {
  name: string;
  tagline: string;
  logo: string;
  cover: string;
  theme: string;
  color: string;
  color2: string;
  font: string;
  niche: string;
  floating: boolean;
  whatsapp: string;
  instagram: string;
  phone: string;
  address: string;
  hours: string;
  notice: string;
  categories: CatCategory[];
  products: CatProduct[];
  footer: boolean;
};

export const CAT_LIMITS = { products: 100, categories: 30, photos: 3 };

/** [chave, nome, descrição] */
export const CAT_THEMES: [string, string, string][] = [
  ['claro', 'Claro', 'Fundo branco, fotos em destaque e detalhes na cor da marca'],
  ['escuro', 'Escuro', 'Fundo escuro e elegante, ótimo para bares e hamburguerias'],
  ['marca', 'Cor da marca', 'Topo e abas na cor da marca, alegre e chamativo'],
];

export const TAGS: [string, string][] = [
  ['novo', '✨ Novo'],
  ['mais', '🔥 Mais pedido'],
  ['promo', '🏷️ Promoção'],
  ['veg', '🌱 Vegetariano'],
  ['vegano', '🥑 Vegano'],
  ['sg', '🌾 Sem glúten'],
  ['picante', '🌶️ Picante'],
  ['chef', '👨‍🍳 Sugestão da casa'],
];

export const newId = () => Math.random().toString(36).slice(2, 9);

export function catDefault(name = 'Seu estabelecimento'): CatalogData {
  return {
    name,
    tagline: '',
    logo: '',
    cover: '',
    theme: 'claro',
    color: '#e8562a',
    color2: '#f5b301',
    font: 'Poppins',
    niche: 'comida',
    floating: true,
    whatsapp: '',
    instagram: '',
    phone: '',
    address: '',
    hours: '',
    notice: 'Escolha à vontade e chame o garçom para fazer o pedido 😊',
    categories: [],
    products: [],
    footer: true,
  };
}

export function catMerge(d: any): CatalogData {
  const o = { ...catDefault(), ...(d || {}) } as CatalogData;
  o.categories = (Array.isArray(o.categories) ? o.categories : []).slice(0, CAT_LIMITS.categories).map((c: any) => ({ id: c.id || newId(), name: String(c.name || 'Categoria').slice(0, 40), emoji: c.emoji ? String(c.emoji).slice(0, 4) : '' }));
  const cats = new Set(o.categories.map((c) => c.id));
  o.products = (Array.isArray(o.products) ? o.products : []).slice(0, CAT_LIMITS.products).map((p: any) => ({
    id: p.id || newId(),
    cat: cats.has(p.cat) ? p.cat : o.categories[0]?.id || '',
    name: String(p.name || '').slice(0, 80),
    desc: String(p.desc || '').slice(0, 400),
    price: p.price === '' || p.price == null || isNaN(Number(p.price)) ? null : Number(p.price),
    promo: p.promo === '' || p.promo == null || isNaN(Number(p.promo)) ? null : Number(p.promo),
    photos: (Array.isArray(p.photos) ? p.photos : []).filter(Boolean).slice(0, CAT_LIMITS.photos),
    on: p.on !== false,
    tags: (Array.isArray(p.tags) ? p.tags : []).filter((t: string) => TAGS.some((x) => x[0] === t)),
  }));
  return o;
}

export const money = (v: number | null | undefined) => (v == null ? '' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/* ---------- cardápio de exemplo (a prévia já sai cheia, sem gastar IA) ---------- */
type Sample = { cats: [string, string][]; items: [number, string, string, number][] };
const SAMPLES: Record<string, Sample> = {
  hamburgueria: {
    cats: [['Burgers', '🍔'], ['Porções', '🍟'], ['Bebidas', '🥤'], ['Sobremesas', '🍫']],
    items: [
      [0, 'Clássico da casa', 'Pão brioche, blend 160g, queijo cheddar, alface, tomate e molho especial', 32.9],
      [0, 'Bacon duplo', 'Dois blends de 120g, muito bacon crocante, cheddar e cebola caramelizada', 42.9],
      [0, 'Frango crispy', 'Sobrecoxa empanada, maionese de ervas, alface e picles', 29.9],
      [1, 'Batata frita', 'Porção de 400g com sal e alecrim', 22.0],
      [1, 'Onion rings', 'Anéis de cebola empanados com molho barbecue', 24.0],
      [2, 'Refrigerante lata', '350ml', 6.5],
      [2, 'Milkshake', 'Chocolate, morango ou ovomaltine — 400ml', 18.0],
      [3, 'Brownie com sorvete', 'Brownie quentinho com uma bola de creme', 19.0],
    ],
  },
  pizzaria: {
    cats: [['Pizzas tradicionais', '🍕'], ['Pizzas especiais', '⭐'], ['Pizzas doces', '🍫'], ['Bebidas', '🥤']],
    items: [
      [0, 'Mussarela', 'Molho de tomate, mussarela e orégano', 49.9],
      [0, 'Calabresa', 'Calabresa fatiada, cebola e azeitonas', 52.9],
      [0, 'Margherita', 'Mussarela, tomate e manjericão fresco', 54.9],
      [1, 'Quatro queijos', 'Mussarela, provolone, parmesão e gorgonzola', 64.9],
      [1, 'Portuguesa', 'Presunto, ovos, cebola, ervilha e mussarela', 59.9],
      [2, 'Chocolate com morango', 'Chocolate ao leite e morangos frescos', 54.9],
      [3, 'Refrigerante 2L', '', 14.0],
    ],
  },
  padaria: {
    cats: [['Cafés', '☕'], ['Salgados', '🥐'], ['Doces e bolos', '🍰'], ['Lanches', '🥪']],
    items: [
      [0, 'Café expresso', '', 6.0],
      [0, 'Cappuccino', 'Com canela e chocolate', 11.0],
      [1, 'Pão de queijo', 'Unidade', 4.5],
      [1, 'Coxinha', 'Frango com catupiry', 8.0],
      [2, 'Bolo de cenoura', 'Fatia com cobertura de chocolate', 9.0],
      [2, 'Sonho', 'Recheio de creme', 7.5],
      [3, 'Misto quente', 'Pão de forma, presunto e queijo', 12.0],
    ],
  },
  bar: {
    cats: [['Petiscos', '🍢'], ['Chopes e cervejas', '🍺'], ['Drinks', '🍹'], ['Sem álcool', '🥤']],
    items: [
      [0, 'Batata com cheddar e bacon', 'Porção grande para compartilhar', 39.9],
      [0, 'Isca de frango', 'Com molho da casa', 42.9],
      [0, 'Bolinho de mandioca com carne seca', '10 unidades', 36.9],
      [1, 'Chope pilsen', '300ml', 11.0],
      [1, 'Cerveja long neck', 'Consulte as marcas', 12.0],
      [2, 'Caipirinha', 'Limão, morango ou maracujá', 22.0],
      [2, 'Gin tônica', 'Com especiarias', 29.0],
      [3, 'Suco natural', 'Laranja, limão ou abacaxi', 9.0],
    ],
  },
  acai: {
    cats: [['Açaí', '🍇'], ['Sorvetes', '🍦'], ['Adicionais', '➕'], ['Bebidas', '🥤']],
    items: [
      [0, 'Açaí 300ml', 'Com 2 acompanhamentos', 16.0],
      [0, 'Açaí 500ml', 'Com 3 acompanhamentos', 22.0],
      [0, 'Açaí 700ml', 'Com 4 acompanhamentos', 28.0],
      [1, 'Casquinha', 'Baunilha, chocolate ou misto', 7.0],
      [2, 'Leite em pó', '', 2.0],
      [2, 'Nutella', '', 5.0],
      [3, 'Água mineral', '500ml', 4.0],
    ],
  },
  japones: {
    cats: [['Combinados', '🍱'], ['Temakis', '🍣'], ['Quentes', '🔥'], ['Bebidas', '🥤']],
    items: [
      [0, 'Combinado 20 peças', 'Sashimi, niguiri, uramaki e hossomaki', 69.9],
      [0, 'Combinado 40 peças', 'Para duas pessoas', 129.9],
      [1, 'Temaki salmão', 'Salmão, cream cheese e cebolinha', 29.9],
      [2, 'Hot roll', '10 unidades', 32.9],
      [2, 'Yakisoba', 'Legumes e frango', 39.9],
      [3, 'Chá gelado', '', 8.0],
    ],
  },
  restaurante: {
    cats: [['Entradas', '🥗'], ['Pratos principais', '🍽️'], ['Sobremesas', '🍮'], ['Bebidas', '🥤']],
    items: [
      [0, 'Salada da casa', 'Folhas, tomate cereja, palmito e molho de mostarda e mel', 28.0],
      [0, 'Bruschetta', 'Tomate, manjericão e azeite', 24.0],
      [1, 'Filé à parmegiana', 'Com arroz e fritas', 59.9],
      [1, 'Frango grelhado', 'Com legumes e arroz integral', 42.9],
      [1, 'Risoto de cogumelos', '', 54.9],
      [2, 'Pudim', 'Fatia', 14.0],
      [3, 'Suco natural', '', 9.0],
      [3, 'Refrigerante lata', '', 6.5],
    ],
  },
};

function sampleKey(niche: string) {
  const t = String(niche || '').toLowerCase();
  if (/hamburg|burger|lanch|smash/.test(t)) return 'hamburgueria';
  if (/pizza/.test(t)) return 'pizzaria';
  if (/padar|caf[eé]|confeit|doce|bolo|panific/.test(t)) return 'padaria';
  if (/\bbar\b|bares|boteco|pub|cervej|chopp|choper|petisc/.test(t)) return 'bar';
  if (/a[cç]a[ií]|sorvet|gelat/.test(t)) return 'acai';
  if (/japon|sushi|temak|oriental/.test(t)) return 'japones';
  return 'restaurante';
}

/** Primeira versão do catálogo a partir do lead: dados da loja + cardápio de exemplo do tipo de negócio (o dono troca depois). */
export function catFromLead(lead: any): CatalogData {
  const d = catDefault(lead?.name || 'Seu estabelecimento');
  const k = sampleKey(`${lead?.niche || ''} ${lead?.name || ''}`);
  const s = SAMPLES[k];
  d.niche = nicheKey(lead?.niche) === 'padaria' ? 'padaria' : 'comida';
  d.theme = k === 'bar' || k === 'hamburgueria' || k === 'japones' ? 'escuro' : 'claro';
  d.tagline = lead?.niche ? `${String(lead.niche).replace(/^./, (c: string) => c.toUpperCase())}${lead?.city ? ' · ' + lead.city : ''}` : '';
  d.whatsapp = lead?.whatsapp || lead?.phone || '';
  d.phone = lead?.phone || '';
  d.instagram = lead?.instagram || '';
  d.address = lead?.address || '';
  d.categories = s.cats.map(([name, emoji]) => ({ id: newId(), name, emoji }));
  d.products = s.items.map(([ci, name, desc, price], i) => ({ id: newId(), cat: d.categories[ci].id, name, desc, price, promo: null, photos: [], on: true, tags: i === 1 ? ['mais'] : [] }));
  return d;
}

export const CAT_ASK_TEXT = `Para montar o seu cardápio digital, me envie por aqui:

1. Sua logo (de preferência PNG sem fundo)
2. Uma foto do espaço ou da fachada (opcional)
3. A lista de produtos com nome, descrição/ingredientes e preço
4. As categorias (ex.: Lanches, Porções, Bebidas)
5. Fotos dos produtos (até 3 por produto; pode mandar só as principais)
6. WhatsApp, Instagram, endereço e horário de funcionamento
7. Cor da marca (se tiver)

Pode mandar foto do cardápio impresso que a gente passa tudo para o digital 😉`;
