'use client';
/* Ilha do código trazido do Lovable: estilos (Tailwind preso a .lv), janelas e avisos dele.
   No painel (panel), as cores, a fonte e o modo claro/escuro vêm do nosso tema (inclusive a cor da marca). */
import './lv.css';
import { useEffect, useRef, useState } from 'react';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';

/** Cor do nosso tema (qualquer formato, inclusive color-mix) → "15 80% 54%" (formato do Tailwind do Lovable). */
let probe: HTMLSpanElement | null = null;
function triplet(cssVar: string) {
  if (!probe) {
    probe = document.createElement('span');
    probe.style.display = 'none';
    document.body.appendChild(probe);
  }
  probe.style.color = '';
  probe.style.color = `var(${cssVar})`;
  const v = getComputedStyle(probe).color; // rgb(…) ou color(srgb …)
  const n = (v.match(/[\d.]+/g) || []).map(Number);
  let [r, g, b] = n;
  if (v.startsWith('color(')) [r, g, b] = [r * 255, g * 255, b * 255];
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const MAP: [string, string][] = [
  ['--background', '--bg'],
  ['--foreground', '--ink'],
  ['--card', '--surface'],
  ['--card-foreground', '--ink'],
  ['--popover', '--surface'],
  ['--popover-foreground', '--ink'],
  ['--primary', '--accent'],
  ['--primary-foreground', '--accent-ink'],
  ['--secondary', '--surface-2'],
  ['--secondary-foreground', '--ink'],
  ['--muted', '--surface-2'],
  ['--muted-foreground', '--muted'],
  ['--accent', '--accent-soft'],
  ['--accent-foreground', '--accent'],
  ['--destructive', '--bad'],
  ['--border', '--line'],
  ['--input', '--line-strong'],
  ['--ring', '--accent'],
];

function useThemeBridge(get: () => (HTMLElement | null)[], on: boolean) {
  useEffect(() => {
    if (!on) return;
    const apply = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      for (const el of get()) {
        if (!el) continue;
        for (const [lv, ours] of MAP) {
          el.style.setProperty(lv, triplet(ours));
        }
        el.style.setProperty('--radius', '12px');
        el.classList.toggle('dark', dark);
      }
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
}

export default function LvRoot({ children, className = '', panel = false }: { children: React.ReactNode; className?: string; panel?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(!panel);
  useEffect(() => {
    if (!panel) return;
    // endereços públicos (orcamento., relatorio., pagamento.) para os links copiados
    const t = setTimeout(() => setReady(true), 2500);
    fetch('/api/lv/domains', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => ((window as any).__LV_DOMAINS = d || {}))
      .catch(() => {})
      .finally(() => (clearTimeout(t), setReady(true)));
  }, [panel]);
  const portal = useRef<HTMLDivElement>(null);
  useThemeBridge(() => [root.current, portal.current], panel);
  return (
    <>
      <div ref={root} className={`lv ${panel ? 'lv-admin' : ''} ${className}`}>
        {ready ? children : null}
        <Toaster />
        <Sonner />
      </div>
      <div ref={portal} id="lv-portal" className={`lv ${panel ? 'lv-admin' : ''}`} />
    </>
  );
}
