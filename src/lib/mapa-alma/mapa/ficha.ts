// Ficha do mapa em 1 página (resumo de todos os números) — para mandar junto com a prévia ou imprimir.
import type { Analise } from '../analise.ts'
import { MARCA_PADRAO, type Marca } from './html.ts'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function htmlFicha(a: Analise, marca: Marca = MARCA_PADRAO): string {
  const grupo = (g: Analise['grupos'][number]) => `<section class="g"><h2>${esc(g.titulo)}</h2>${g.subgrupos.map(sg =>
    `${sg.titulo ? `<h3>${esc(sg.titulo)}</h3>` : ''}<div class="itens">${sg.itens.map(it =>
      `<div class="it"><b>${esc(it.valor)}</b><span>${esc(it.rotulo)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</div>`).join('')}</div>`).join('')}</section>`
  const t = a.triangulos[0]
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ficha · ${esc(a.nome)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:10mm}
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#241a33;background:#fbf8ff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:900px;margin:0 auto;padding:14px}
header{background:radial-gradient(circle at 20% 0,#5b2bb0,#1a0b3d 70%);color:#fff;border-radius:14px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
header h1{margin:0;font-family:Cinzel,Georgia,serif;font-size:20px;color:#f3dfa2;letter-spacing:.08em}
header .n{font-size:16px;font-weight:700}header .d{font-size:12px;opacity:.85}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
@media screen and (max-width:640px){.grid{grid-template-columns:1fr}}
.bottom{display:grid;grid-template-columns:1.2fr 1fr;gap:8px;margin-top:8px}
.g{background:#fff;border:1px solid #e7dcf5;border-radius:12px;padding:10px 12px;break-inside:avoid}
.g h2{margin:0 0 6px;font-size:13px;color:#4b1f8f;text-transform:uppercase;letter-spacing:.06em}
.g h3{margin:8px 0 4px;font-size:10.5px;color:#6b5b7e;text-transform:uppercase;letter-spacing:.05em}
.itens{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px}
.it{display:flex;flex-direction:column;padding:3px 0}.it b{color:#4b1f8f;font-size:11px}.it span{font-size:9.5px}.it small{font-size:8.5px;color:#8a7aa0}
.pir{background:#fff;border:1px solid #e7dcf5;border-radius:12px;padding:10px;text-align:center;font-family:ui-monospace,Consolas,monospace;font-size:7px;letter-spacing:.02em;line-height:1.3;color:#5a4a72;break-inside:avoid;margin-top:0}
.pir h2{font-family:Inter,Arial;letter-spacing:.06em;margin:0 0 6px;font-size:13px;color:#4b1f8f;text-transform:uppercase}
.pir .neg{color:#d23b3b;font-weight:800}.pir .arc{color:#16a34a;font-weight:800}
footer{text-align:center;font-size:10px;color:#8a7aa0;margin-top:8px}
</style></head><body><div class="wrap">
<header><div><h1>${esc(marca.nome.toUpperCase())}</h1><div class="d">Ficha do mapa · numerologia cabalística + signo</div></div><div style="text-align:right"><div class="n">${esc(a.nome)}</div><div class="d">${esc(a.nascimentoTxt)} · ${esc(a.signo)}</div></div></header>
<div class="grid">${a.grupos.filter(g => !['energias', 'fases'].includes(g.id)).map(grupo).join('')}</div>
<div class="grid">${a.grupos.filter(g => ['energias', 'fases'].includes(g.id)).map(grupo).join('')}
<div class="pir"><h2>${esc(t.nome)}</h2>${t.linhas.map((l, li) => `<div>${l.map((d, i) => `<span${t.marcas.includes(`${li}:${i}`) ? ' class="neg"' : li === 0 && (i === t.arcano.pos || i === t.arcano.pos + 1) ? ' class="arc"' : ''}>${d}</span>`).join(' ')}</div>`).join('')}</div></div>
<footer>As explicações completas de cada número estão no seu Mapa da Alma.</footer>
</div></body></html>`
}
