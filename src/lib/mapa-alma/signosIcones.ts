// Ícones próprios dos 12 signos (traço desenhado, sem emoji). Usados no painel, no link do mapa e no PDF.
// Cada ícone é um SVG 24×24 com traço "currentColor": herda a cor do texto ao redor.

export const SIGNO_PATHS: Record<string, string> = {
  '♈': '<path d="M12 21V10"/><path d="M12 10c0-4.5-2.6-7-5.4-7C4.4 3 3 4.6 3 6.6c0 1.9 1.4 3.4 3.2 3.4"/><path d="M12 10c0-4.5 2.6-7 5.4-7C19.6 3 21 4.6 21 6.6c0 1.9-1.4 3.4-3.2 3.4"/>',
  '♉': '<circle cx="12" cy="15" r="5.5"/><path d="M3.5 3.5c1.2 4 4.4 6 8.5 6s7.3-2 8.5-6"/>',
  '♊': '<path d="M4 3.5c5 2 11 2 16 0"/><path d="M4 20.5c5-2 11-2 16 0"/><path d="M9 4.7v14.6"/><path d="M15 4.7v14.6"/>',
  '♋': '<circle cx="7" cy="9.5" r="2.6"/><path d="M4.4 9.5C4.4 5.6 8 3.5 12.2 3.5c3 0 5.6 1.2 7.6 3.3"/><circle cx="17" cy="14.5" r="2.6"/><path d="M19.6 14.5c0 3.9-3.6 6-7.8 6-3 0-5.6-1.2-7.6-3.3"/>',
  '♌': '<circle cx="7" cy="15.5" r="3"/><path d="M10 15.5c0-3-1.5-4.7-1.5-7.3a4.5 4.5 0 0 1 9 0c0 3.6-3 6-3 9.4a2.5 2.5 0 0 0 5 .4"/>',
  '♍': '<path d="M3 6c1.5 0 2.5 1 2.5 3v11"/><path d="M5.5 9c0-2 1.2-3 2.75-3S11 7 11 9v11"/><path d="M11 9c0-2 1.2-3 2.75-3S16.5 7 16.5 9v6.5c0 3 1.6 4.5 4.5 4.5"/><path d="M16.5 13c2-1.6 4.5-1.1 4.5 1.4 0 2.4-2.2 4.6-6 5.6"/>',
  '♎': '<path d="M3 20h18"/><path d="M3 15.5h5.3a4.6 4.6 0 1 1 7.4 0H21"/>',
  '♏': '<path d="M3 6c1.5 0 2.5 1 2.5 3v11"/><path d="M5.5 9c0-2 1.2-3 2.75-3S11 7 11 9v11"/><path d="M11 9c0-2 1.2-3 2.75-3S16.5 7 16.5 9v8.5c0 1.6 1 2.5 2.5 2.5H21"/><path d="M19 17.8l2.2 2.2-2.2 2.2"/>',
  '♐': '<path d="M4 20L20 4"/><path d="M12.5 4H20v7.5"/><path d="M7.5 11.5l5 5"/>',
  '♑': '<path d="M3 5c1.6 0 2.6 1 3.1 3L9 20"/><path d="M9 20l3.4-12.6c.7-2.6 4-2.5 4.4.1l.8 7.5"/><path d="M17.6 15a3 3 0 1 1 1 5.6c-2.1 0-4-1.5-5-3.2"/>',
  '♒': '<path d="M3 10l3-3 3 3 3-3 3 3 3-3 3 3"/><path d="M3 17l3-3 3 3 3-3 3 3 3-3 3 3"/>',
  '♓': '<path d="M5.5 3c3.8 4.2 3.8 13.8 0 18"/><path d="M18.5 3c-3.8 4.2-3.8 13.8 0 18"/><path d="M4.5 12h15"/>',
}

export const SIGNO_GLIFO: Record<string, string> = {
  'Áries': '♈', 'Touro': '♉', 'Gêmeos': '♊', 'Câncer': '♋', 'Leão': '♌', 'Virgem': '♍',
  'Libra': '♎', 'Escorpião': '♏', 'Sagitário': '♐', 'Capricórnio': '♑', 'Aquário': '♒', 'Peixes': '♓',
}

/** SVG de um signo (pelo glifo ♈…♓ ou pelo nome). */
export function svgSigno(sig: string, cls = 'zs'): string {
  const g = SIGNO_PATHS[sig] ? sig : SIGNO_GLIFO[sig]
  const d = g && SIGNO_PATHS[g]
  if (!d) return ''
  return `<svg class="${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-hidden="true" style="display:inline-block;vertical-align:-0.14em;overflow:visible">${d}</svg>`
}

/** Glifos dos signos (com ou sem seletor de variação). */
export const RE_GLIFO = /[♈-♓][︎️]?/g

/** Troca os glifos dos signos por ícones SVG, só no texto visível (não mexe em tags, atributos, <title>, <script>, <style>). */
export function trocarGlifos(html: string): string {
  let pular = 0
  return html.split(/(<[^>]*>)/).map(parte => {
    if (parte.startsWith('<')) {
      const t = parte.toLowerCase()
      if (/^<(title|script|style|textarea)\b/.test(t)) pular++
      else if (/^<\/(title|script|style|textarea)\b/.test(t)) pular = Math.max(0, pular - 1)
      return parte
    }
    return pular ? parte : parte.replace(RE_GLIFO, g => svgSigno(g[0]))
  }).join('')
}

/** Tira os glifos de um texto (para mensagens de WhatsApp, onde viram emoji). */
export const semGlifo = (t: string) => t.replace(RE_GLIFO, '').replace(/\s{2,}/g, ' ').trim()
