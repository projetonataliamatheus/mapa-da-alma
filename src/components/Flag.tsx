'use client'
import type { ReactNode } from 'react'
import { nomePais } from '@/lib/ddi'

const R = (x: number, y: number, w: number, h: number, c: string) => <rect x={x} y={y} width={w} height={h} fill={c} />
const H = (cs: string[], pesos?: number[]) => { let y = 0; const t = (pesos || cs.map(() => 1)).reduce((a, b) => a + b, 0); return cs.map((c, i) => { const h = ((pesos || [])[i] || 1) / t * 64; const e = R(0, y, 64, h + 0.5, c); y += h; return <g key={i}>{e}</g> }) }
const V = (cs: string[]) => cs.map((c, i) => <g key={i}>{R((i * 64) / cs.length, 0, 64 / cs.length + 0.5, 64, c)}</g>)
const estrela = (cx: number, cy: number, r: number, c: string) => <polygon fill={c} points={Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.4 : r; return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}` }).join(' ')} />

const FLAGS: Record<string, ReactNode> = {
  BR: <>{R(0, 0, 64, 64, '#009c3b')}<polygon points="32,10 58,32 32,54 6,32" fill="#ffdf00" /><circle cx="32" cy="32" r="12" fill="#002776" /><path d="M20.5 30c8-2.5 17-1 23 4" stroke="#fff" strokeWidth="2.2" fill="none" /></>,
  AR: <>{H(['#74acdf', '#fff', '#74acdf'])}<circle cx="32" cy="32" r="5" fill="#f6b40e" /></>,
  CL: <>{R(0, 0, 64, 32, '#fff')}{R(0, 32, 64, 32, '#d52b1e')}{R(0, 0, 26, 32, '#0039a6')}{estrela(13, 16, 8, '#fff')}</>,
  CO: <>{H(['#fcd116', '#003893', '#ce1126'], [2, 1, 1])}</>,
  EC: <>{H(['#ffdd00', '#034ea2', '#ed1c24'], [2, 1, 1])}<circle cx="32" cy="30" r="5" fill="#8b6b2c" opacity=".8" /></>,
  PE: <>{V(['#d91023', '#fff', '#d91023'])}</>,
  PY: <>{H(['#d52b1e', '#fff', '#0038a8'])}<circle cx="32" cy="32" r="5" fill="none" stroke="#2f8f3a" strokeWidth="1.5" /></>,
  BO: <>{H(['#d52b1e', '#f9e300', '#007934'])}</>,
  UY: <>{H(['#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff'])}{R(0, 0, 29, 29, '#fff')}<circle cx="14" cy="14" r="6" fill="#fcd116" /></>,
  MX: <>{V(['#006847', '#fff', '#ce1126'])}<circle cx="32" cy="32" r="6" fill="#9a6b2a" opacity=".75" /></>,
  VE: <>{H(['#fcd116', '#00247d', '#cf142b'])}{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <circle key={i} cx={32 + 14 * Math.cos(Math.PI + (i * Math.PI) / 7)} cy={34 + 12 * Math.sin(Math.PI + (i * Math.PI) / 7) * -1} r="1.6" fill="#fff" />)}</>,
  US: <>{H(['#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234'])}{R(0, 0, 30, 36, '#3c3b6e')}{[[8, 8], [16, 8], [24, 8], [12, 16], [20, 16], [8, 24], [16, 24], [24, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" />)}</>,
  ES: <>{H(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1])}</>,
  PT: <>{R(0, 0, 26, 64, '#046a38')}{R(26, 0, 38, 64, '#da291c')}<circle cx="26" cy="32" r="8" fill="#ffe000" /><circle cx="26" cy="32" r="4.5" fill="#fff" /></>,
  PA: <>{R(0, 0, 32, 32, '#fff')}{R(32, 0, 32, 32, '#d21034')}{R(0, 32, 32, 32, '#005293')}{R(32, 32, 32, 32, '#fff')}{estrela(16, 16, 7, '#005293')}{estrela(48, 48, 7, '#d21034')}</>,
  CR: <>{H(['#002b7f', '#fff', '#ce1126', '#fff', '#002b7f'], [1, 1, 2, 1, 1])}</>,
  DO: <>{R(0, 0, 64, 64, '#fff')}{R(0, 0, 28, 28, '#002d62')}{R(36, 0, 28, 28, '#ce1126')}{R(0, 36, 28, 28, '#ce1126')}{R(36, 36, 28, 28, '#002d62')}</>,
  GT: <>{V(['#4997d0', '#fff', '#4997d0'])}</>,
}

/** Bandeira em ícone redondo com brilho e sombra (efeito 3D). iso = código do país (BR, AR, ES...). */
export function Flag({ iso, size = 22, title, ring = true }: { iso?: string | null; size?: number; title?: string; ring?: boolean }) {
  const k = String(iso || '').toUpperCase()
  const id = `fg-${k || 'xx'}-${size}`
  const conteudo = FLAGS[k]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title || nomePais(k)} style={{ flex: 'none', filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,.35))', verticalAlign: 'middle' }}>
      <title>{title || nomePais(k)}</title>
      <defs>
        <clipPath id={`${id}-c`}><circle cx="32" cy="32" r="30" /></clipPath>
        <radialGradient id={`${id}-g`} cx="32%" cy="24%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity=".62" /><stop offset=".35" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".38" /></radialGradient>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        {conteudo || <><rect width="64" height="64" fill="#5b6b8c" /><circle cx="32" cy="32" r="18" fill="none" stroke="#dfe7f7" strokeWidth="2" /><path d="M14 32h36M32 14c-10 10-10 26 0 36M32 14c10 10 10 26 0 36" stroke="#dfe7f7" strokeWidth="2" fill="none" /></>}
        <rect width="64" height="64" fill={`url(#${id}-g)`} />
        <ellipse cx="24" cy="14" rx="17" ry="8" fill="#fff" opacity=".22" transform="rotate(-18 24 14)" />
      </g>
      {ring && <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2.4" />}
      <circle cx="32" cy="32" r="31" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
    </svg>
  )
}

/** Idioma de atendimento: bolinha com a bandeira do Brasil (português) ou da Espanha (espanhol). */
export const FlagIdioma = ({ idioma, size = 18 }: { idioma?: string | null; size?: number }) => <Flag iso={idioma === 'es' ? 'ES' : 'BR'} size={size} title={idioma === 'es' ? 'Atendimento em Espanhol' : 'Atendimento em Português (Brasil)'} />
