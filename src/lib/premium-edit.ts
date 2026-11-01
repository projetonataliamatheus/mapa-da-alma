/**
 * Editor visual dos modelos premium (usado no servidor e no navegador).
 * Cada texto/imagem do conteúdo (src/content.ts do modelo) ganha um número pela ordem em que aparece.
 * No modo edição, o número vai escondido no próprio texto (caracteres invisíveis) ou na imagem (#rp=N),
 * assim um clique na página sabe exatamente qual campo do conteúdo editar.
 */
export type Leaf = { i: number; path: (string | number)[]; value: string; kind: 'image' | 'text' | 'other' };

const IMG = /^(https?:)?\/\/\S+\.(png|jpe?g|webp|gif|avif|svg)(\?\S*)?$|^https?:\/\/(images\.unsplash\.com|images\.pexels\.com|\S*cloudinary\.com|\S*\/storage\/v1\/object\/public\/)\S*$/i;

export function kindOf(v: string): Leaf['kind'] {
  const t = v.trim();
  if (IMG.test(t)) return 'image';
  // texto que aparece na tela: tem espaço e não é link, âncora, cor, e-mail ou classe
  if (/\s/.test(t) && !/^(https?:|mailto:|tel:|#|\/|\.|[a-z-]+:)/i.test(t) && !/^[\w.+-]+@[\w-]+\.\w/.test(t)) return 'text';
  return 'other';
}

export function leaves(content: any): Leaf[] {
  const out: Leaf[] = [];
  const walk = (v: any, path: (string | number)[]) => {
    if (typeof v === 'string') out.push({ i: out.length, path, value: v, kind: kindOf(v) });
    else if (Array.isArray(v)) v.forEach((x, k) => walk(x, [...path, k]));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], [...path, k]);
  };
  walk(content, []);
  return out;
}

const ZW = ['​', '‌', '‍', '⁠'];
export const MARK_START = '⁣';
export const MARK_END = '⁤';

export function encodeMark(i: number) {
  let s = '';
  let n = i;
  do {
    s = ZW[n % 4] + s;
    n = Math.floor(n / 4);
  } while (n > 0);
  return MARK_START + s + MARK_END;
}

export function decodeMark(s: string): number | null {
  const m = s.match(/⁣([​‌‍⁠]+)⁤/);
  if (!m) return null;
  let n = 0;
  for (const ch of m[1]) n = n * 4 + ZW.indexOf(ch);
  return n;
}

/** Conteúdo com as marcas de edição (textos e imagens clicáveis). */
export function markContent(content: any) {
  const ls = leaves(content);
  const copy = JSON.parse(JSON.stringify(content));
  for (const l of ls) {
    let v: string | null = null;
    if (l.kind === 'image' && !l.value.includes('#')) v = `${l.value}#rp=${l.i}`;
    else if (l.kind === 'text') v = encodeMark(l.i) + l.value;
    if (v === null) continue;
    let o = copy;
    for (const k of l.path.slice(0, -1)) o = o[k as any];
    o[l.path[l.path.length - 1] as any] = v;
  }
  return copy;
}

/** Troca o valor de um campo pelo caminho. */
export function setAt(content: any, path: (string | number)[], value: any) {
  const copy = JSON.parse(JSON.stringify(content));
  let o = copy;
  for (const k of path.slice(0, -1)) o = o[k as any];
  o[path[path.length - 1] as any] = value;
  return copy;
}

export function pathLabel(path: (string | number)[]) {
  return path.map((p) => (typeof p === 'number' ? `#${p + 1}` : p)).join(' › ');
}
