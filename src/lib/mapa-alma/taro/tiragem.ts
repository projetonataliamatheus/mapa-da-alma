// Tiragem de tarô: sorteia as cartas (aleatório de verdade, crypto), grava, monta a página do cliente e a ficha para a IA.
import { randomInt, randomBytes } from 'node:crypto'
import { BARALHO, NAIPES, TIRAGENS, cartaPorId, type Carta } from './cartas.ts'

export interface Tiragem {
  id?: string; slug: string; lead_id?: string | null; tipo: string; pergunta?: string | null; nome?: string | null
  cartas: { pos: number; id: string }[]; liberado: boolean; created_at?: string
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Sorteia N cartas diferentes do baralho de 78 (embaralhamento Fisher-Yates com números aleatórios seguros). */
export function sortear(tipo: string): { pos: number; id: string }[] {
  const n = TIRAGENS[tipo]?.posicoes.length || 3
  const ids = BARALHO.map(c => c.id)
  for (let i = ids.length - 1; i > 0; i--) { const j = randomInt(i + 1); [ids[i], ids[j]] = [ids[j], ids[i]] }
  return ids.slice(0, n).map((id, pos) => ({ pos, id }))
}

export const novoSlugTiragem = (nome?: string | null) => `${String(nome || 'taro').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'taro'}-${randomBytes(4).toString('hex')}`

const ROMANO = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']

/** Desenho próprio da carta (SVG): moldura, número, símbolo do naipe ou estrela dos arcanos maiores, e o nome. */
export function svgCarta(c: Carta): string {
  const maior = c.tipo === 'maior'
  const cor = maior ? '#c9a24a' : NAIPES[c.naipe!].cor
  const topo = maior ? ROMANO[c.numero] : c.numero === 1 ? 'Ás' : c.numero <= 10 ? String(c.numero) : ['Valete', 'Cavaleiro', 'Rainha', 'Rei'][c.numero - 11]
  const simbolo = (x: number, y: number, s: number) => {
    if (maior) {
      const pts = Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8 - Math.PI / 2, r = i % 2 ? s * 0.42 : s; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}` }).join(' ')
      return `<polygon points="${pts}" fill="${cor}" opacity=".9"/><circle cx="${x}" cy="${y}" r="${s * 0.3}" fill="#1a0b3d"/><circle cx="${x}" cy="${y}" r="${s * 0.14}" fill="${cor}"/>`
    }
    if (c.naipe === 'copas') return `<path d="M${x - s * 0.6} ${y - s * 0.6}h${s * 1.2}c0 ${s * 0.8}-${s * 0.3} ${s * 1.1}-${s * 0.6} ${s * 1.1}s-${s * 0.6}-${s * 0.3}-${s * 0.6}-${s * 1.1}z M${x} ${y + s * 0.5}v${s * 0.4} M${x - s * 0.35} ${y + s * 0.95}h${s * 0.7}" stroke="${cor}" stroke-width="${s * 0.12}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    if (c.naipe === 'ouros') return `<circle cx="${x}" cy="${y}" r="${s * 0.75}" stroke="${cor}" stroke-width="${s * 0.12}" fill="none"/><polygon points="${Array.from({ length: 5 }, (_, i) => { const a = (i * 144 - 90) * Math.PI / 180; return `${(x + s * 0.55 * Math.cos(a)).toFixed(1)},${(y + s * 0.55 * Math.sin(a)).toFixed(1)}` }).join(' ')}" stroke="${cor}" stroke-width="${s * 0.08}" fill="none" stroke-linejoin="round"/>`
    if (c.naipe === 'espadas') return `<path d="M${x} ${y - s}v${s * 1.6} M${x - s * 0.45} ${y + s * 0.35}h${s * 0.9} M${x} ${y + s * 0.6}v${s * 0.35}" stroke="${cor}" stroke-width="${s * 0.13}" fill="none" stroke-linecap="round"/><path d="M${x} ${y - s}l${s * 0.18} ${s * 0.35}h-${s * 0.36}z" fill="${cor}"/>`
    return `<path d="M${x - s * 0.15} ${y + s}L${x + s * 0.15} ${y - s}" stroke="${cor}" stroke-width="${s * 0.16}" stroke-linecap="round"/><path d="M${x + s * 0.1} ${y - s * 0.6}q${s * 0.4} -${s * 0.1} ${s * 0.45} -${s * 0.45}M${x - s * 0.02} ${y}q-${s * 0.4} -${s * 0.05} -${s * 0.5} -${s * 0.4}" stroke="${cor}" stroke-width="${s * 0.09}" fill="none" stroke-linecap="round"/>`
  }
  const brilhos = [[22, 40], [98, 52], [30, 150], [92, 140], [60, 26]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${1 + (i % 2)}" fill="#f3dfa2" opacity=".7"/>`).join('')
  return `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(c.nome)}">
<defs><linearGradient id="fd${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1259"/><stop offset="1" stop-color="#120630"/></linearGradient></defs>
<rect x="1" y="1" width="118" height="198" rx="10" fill="url(#fd${c.id})" stroke="#c9a24a" stroke-width="2"/>
<rect x="7" y="7" width="106" height="186" rx="7" fill="none" stroke="#c9a24a" stroke-opacity=".5"/>
${brilhos}
<text x="60" y="30" text-anchor="middle" fill="#f3dfa2" font-family="Cinzel, Georgia, serif" font-size="${topo.length > 4 ? 11 : 15}" font-weight="700">${esc(topo)}</text>
${simbolo(60, 98, 26)}
<text x="60" y="${c.nome.length > 16 ? 170 : 176}" text-anchor="middle" fill="#fff" font-family="Cinzel, Georgia, serif" font-size="${c.nome.length > 18 ? 8.5 : 10}" font-weight="700">${esc(c.nome)}</text>
</svg>`
}

/** Página da tiragem para o cliente (link no WhatsApp). */
export function htmlTiragem(t: Tiragem, marca: { nome: string } = { nome: 'Mapa da Alma' }): string {
  const def = TIRAGENS[t.tipo] || TIRAGENS['3cartas']
  const cartas = t.cartas.map(x => ({ ...x, c: cartaPorId(x.id)!, p: def.posicoes[x.pos] })).filter(x => x.c)
  const primeiro = String(t.nome || '').split(' ')[0]
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(def.nome)} · ${esc(marca.nome)}</title><meta name="robots" content="noindex">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#241a33;background:#fbf8ff;line-height:1.65;font-size:16px}
header{background:radial-gradient(circle at 50% 10%,#5b2bb0,#1a0b3d 70%);color:#fff;text-align:center;padding:30px 16px 26px}
header h1{font-family:Cinzel,Georgia,serif;color:#f3dfa2;margin:0;font-size:24px;letter-spacing:.08em}header p{margin:6px 0 0;opacity:.9}
.perg{display:inline-block;margin-top:12px;background:rgba(255,255,255,.1);border:1px solid rgba(243,223,162,.4);border-radius:12px;padding:8px 14px;font-style:italic}
.wrap{max-width:820px;margin:0 auto;padding:16px}
.mesa{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:8px 0 18px}
.mesa figure{margin:0;width:88px;text-align:center;animation:vira .8s ease both}.mesa figure:nth-child(n){animation-delay:calc(var(--i) * .25s)}
.mesa svg{width:88px;height:auto;filter:drop-shadow(0 6px 14px rgba(42,18,89,.35))}.mesa figcaption{font-size:11px;color:#6b5b7e;margin-top:4px;line-height:1.2}
@keyframes vira{from{transform:rotateY(90deg);opacity:0}to{transform:none;opacity:1}}
.carta{background:#fff;border:1px solid #e7dcf5;border-radius:18px;padding:16px;margin:14px 0;display:grid;grid-template-columns:96px 1fr;gap:16px;align-items:start}
.carta svg{width:96px;height:auto}
.carta small{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#6b5b7e;font-weight:700}
.carta h2{margin:2px 0 4px;font-family:Cinzel,Georgia,serif;color:#4b1f8f;font-size:19px}.carta .kw{color:#6b5b7e;font-size:13.5px;margin:0 0 8px}
.carta p{margin:6px 0}
.temas{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.temas div{border-radius:10px;padding:8px 10px;font-size:13.5px}
.temas .a{background:#fff0f5;border:1px solid #f5b8cc}.temas .d{background:#fff8e6;border:1px solid #f0d58c}.temas b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.fazer{background:linear-gradient(135deg,#f1e8ff,#faf7ff 50%,#e3f8ec);border:2px solid #b89cf0;border-radius:12px;padding:8px 12px;margin-top:8px}
@media (max-width:560px){.carta{grid-template-columns:1fr}.carta svg{width:120px;margin:0 auto;display:block}.temas{grid-template-columns:1fr}}
footer{text-align:center;color:#8a7aa0;font-size:13px;padding:20px}
</style></head><body>
<header><h1>${esc(def.nome.replace('Tarô: ', ''))}</h1><p>${primeiro ? `Tiragem de ${esc(primeiro)}` : 'A sua tiragem'} · ${esc(marca.nome)}</p>${t.pergunta ? `<div class="perg">“${esc(t.pergunta)}”</div>` : ''}</header>
<main class="wrap">
<div class="mesa">${cartas.map((x, i) => `<figure style="--i:${i}">${svgCarta(x.c)}<figcaption>${i + 1}. ${esc(x.p.nome)}</figcaption></figure>`).join('')}</div>
${cartas.map((x, i) => `<section class="carta"><div>${svgCarta(x.c)}</div><div><small>${i + 1}. ${esc(x.p.nome)} · ${esc(x.p.sentido)}</small><h2>${esc(x.c.nome)}</h2><p class="kw">${esc(x.c.palavras)}</p><p>${esc(x.c.texto)}</p>
<div class="temas"><div class="a"><b>♥ No amor</b>${esc(x.c.temas.amor)}</div><div class="d"><b>◆ No dinheiro</b>${esc(x.c.temas.dinheiro)}</div></div>
<div class="fazer"><b>✦ O que fazer:</b> ${esc(x.c.conselho)}</div></div></section>`).join('')}
</main>
<footer>O tarô é uma ferramenta de reflexão e autoconhecimento: mostra tendências, e as escolhas continuam sendo suas. Com carinho, ${esc(marca.nome)} 💜</footer>
</body></html>`
}

/** Ficha da tiragem para a IA fazer a leitura ao vivo na conversa. */
export function fichaTiragem(t: Tiragem): string {
  const def = TIRAGENS[t.tipo] || TIRAGENS['3cartas']
  return `FICHA DA TIRAGEM DE TARÔ (${def.nome}) — cartas sorteadas de verdade pelo sistema; use SOMENTE estas cartas
Pergunta da pessoa: ${t.pergunta || '(não disse; leia para a vida em geral, com foco no que ela contou na conversa)'}
${t.cartas.map(x => { const c = cartaPorId(x.id)!, p = def.posicoes[x.pos]; return `${x.pos + 1}. ${p.nome} (${p.sentido}): ${c.nome} — ${c.palavras}. ${c.texto} Amor: ${c.temas.amor} Dinheiro: ${c.temas.dinheiro} Conselho: ${c.conselho}` }).join('\n')}
COMO LER: uma ou duas cartas por resposta, na ordem, ligando cada uma à pergunta e ao que a pessoa contou; termine com uma pergunta. Na última, faça uma síntese com o conselho principal. Tom acolhedor, nunca assustar, nunca prever morte, doença ou tragédia.`
}
