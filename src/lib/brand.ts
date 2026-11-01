/** Marca do painel (nome, ícone, cores, textos e nomes dos menus). Só o Master altera, em Configurações › Marca do painel. */

export type Brand = {
  name: string;
  tagline: string;
  /** imagem do logo (PNG/SVG); vazio = usa o ícone */
  logo: string;
  /** ícone embutido quando não há logo */
  icon: string;
  /** cor principal (botões, destaques, menu ativo) */
  color: string;
  /** degradê no ícone da marca */
  gradient: boolean;
  /** arredondamento: compacto, padrao, suave */
  radius: 'compacto' | 'padrao' | 'suave';
  /** título e subtítulo da tela de login */
  login_title: string;
  login_sub: string;
  /** novos nomes de menus e grupos: chave = endereço (/conversas) ou "g:Nome do grupo" */
  menu: Record<string, string>;
};

export const DEFAULT_BRAND: Brand = {
  name: 'Mapa da Alma',
  tagline: 'Numerologia & Astrologia',
  logo: '',
  icon: 'star',
  color: '#7a5af8',
  gradient: true,
  radius: 'padrao',
  login_title: 'Entrar no painel',
  login_sub: 'Use o e-mail e a senha da sua equipe.',
  menu: {},
};

export const BRAND_COLORS: [string, string][] = [
  ['#7a5af8', 'Roxo Mapa da Alma'],
  ['#e8562a', 'Laranja'],
  ['#dc2626', 'Vermelho'],
  ['#db2777', 'Rosa'],
  ['#2f6feb', 'Azul'],
  ['#0891b2', 'Ciano'],
  ['#12a150', 'Verde'],
  ['#ca8a04', 'Dourado'],
  ['#111827', 'Grafite'],
];

export const BRAND_ICONS = ['radar', 'flame', 'spark', 'bolt', 'target', 'chat', 'msgs', 'wa', 'robot', 'globe', 'pulse', 'trend', 'money', 'tag', 'bulb', 'star', 'shield', 'users', 'phone', 'link'];

const HEX = /^#[0-9a-f]{6}$/i;
const clean = (v: any, max: number, def: string) => {
  const t = String(v ?? '').trim().slice(0, max);
  return t || def;
};

/** Junta o que foi salvo com o padrão e limpa valores inválidos. */
export function brandOf(saved: any): Brand {
  const b = saved && typeof saved === 'object' ? saved : {};
  let color = String(b.color || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(color)) color = '#' + color.slice(1).split('').map((c) => c + c).join('');
  const menu: Record<string, string> = {};
  if (b.menu && typeof b.menu === 'object')
    for (const [k, v] of Object.entries(b.menu)) {
      const t = String(v || '').trim().slice(0, 40);
      if (t && /^(\/|g:)/.test(k)) menu[k] = t;
    }
  const logo = String(b.logo || '').trim();
  return {
    name: clean(b.name, 40, DEFAULT_BRAND.name),
    tagline: String(b.tagline ?? DEFAULT_BRAND.tagline).trim().slice(0, 60),
    logo: /^https?:\/\//.test(logo) ? logo.slice(0, 500) : '',
    icon: BRAND_ICONS.includes(b.icon) ? b.icon : DEFAULT_BRAND.icon,
    color: HEX.test(color) ? color.toLowerCase() : DEFAULT_BRAND.color,
    gradient: b.gradient !== false,
    radius: ['compacto', 'padrao', 'suave'].includes(b.radius) ? b.radius : 'padrao',
    login_title: clean(b.login_title, 60, DEFAULT_BRAND.login_title),
    login_sub: clean(b.login_sub, 140, DEFAULT_BRAND.login_sub),
    menu,
  };
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Luminância relativa (0 escuro … 1 claro). */
function lum(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.04045) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** CSS que troca as cores do painel pela cor da marca (claro e escuro). */
export function brandCss(b: Brand) {
  const c = b.color;
  const light = lum(c) > 0.45; // cor clara: texto escuro por cima
  const ink = light ? '#111827' : '#ffffff';
  const r = b.radius === 'compacto' ? ['6px', '8px', '11px'] : b.radius === 'suave' ? ['10px', '16px', '22px'] : null;
  const rad = r ? `--r-sm:${r[0]};--r:${r[1]};--r-lg:${r[2]};` : '';
  // escuro: a cor fica um pouco mais clara para aparecer bem no fundo escuro
  const dark = lum(c) < 0.06 ? '#e5e7eb' : `color-mix(in srgb, ${c} 82%, #fff)`;
  return (
    `:root{--accent:${c};--accent-hover:color-mix(in srgb, ${c} 86%, #000);--accent-ink:${ink};--accent-soft:color-mix(in srgb, ${c} 8%, #fff);--accent-line:color-mix(in srgb, ${c} 28%, #fff);--hot:${c};${rad}}` +
    `:root[data-theme='dark']{--accent:${dark};--accent-hover:color-mix(in srgb, ${dark} 88%, #fff);--accent-ink:${lum(c) < 0.06 ? '#111827' : '#140a05'};--accent-soft:color-mix(in srgb, ${c} 16%, #0b0e13);--accent-line:color-mix(in srgb, ${c} 40%, #0b0e13);}` +
    (b.gradient ? '' : `.brand-mark{background:var(--accent)!important}`)
  );
}

/** Nome do menu (com a troca feita pelo Master, se houver). */
export function menuLabel(b: Brand | null | undefined, key: string, def: string) {
  return (b?.menu && b.menu[key]) || def;
}
