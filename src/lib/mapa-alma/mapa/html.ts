// HTML do mapa: modo "web" (link ao vivo, responsivo) e modo "pdf" (A4).
import type { Conteudo, Bloco } from './conteudo.ts'
import { ORIENTACAO_PARAGRAFOS, GLOSSARIO, AVISO_FINAL } from '../textos/biblioteca/orientacao.ts'
import { SIGNO_PATHS, trocarGlifos } from '../signosIcones.ts'
import { PIR_CSS } from './piramides.ts'
import { estiloCss, SCRIPT_ROLAGEM } from './estilo.ts'

export interface Marca {
  nome: string            // "Mapa da Alma"
  subtitulo: string       // "Estudo Numerológico & Astrológico"
  assinatura?: string     // texto da conclusão / assinatura
  whatsapp?: string
  fonteTitulo?: string    // chave de FONTES_TITULO
  fonteTexto?: string     // chave de FONTES_TEXTO
}

/** Fontes disponíveis (Google Fonts). Títulos com personalidade; textos fáceis de ler. */
export const FONTES_TITULO: Record<string, { nome: string; css: string; g: string }> = {
  cinzel: { nome: 'Cinzel (clássica, letras romanas)', css: "'Cinzel', Georgia, serif", g: 'Cinzel:wght@500;700' },
  cormorant: { nome: 'Cormorant Garamond (elegante)', css: "'Cormorant Garamond', Georgia, serif", g: 'Cormorant+Garamond:wght@600;700' },
  playfair: { nome: 'Playfair Display (sofisticada)', css: "'Playfair Display', Georgia, serif", g: 'Playfair+Display:wght@600;700' },
  marcellus: { nome: 'Marcellus (mística e legível)', css: "'Marcellus', Georgia, serif", g: 'Marcellus' },
  philosopher: { nome: 'Philosopher (esotérica)', css: "'Philosopher', Georgia, serif", g: 'Philosopher:wght@400;700' },
  lora: { nome: 'Lora (serifada suave)', css: "'Lora', Georgia, serif", g: 'Lora:wght@600;700' },
  dmserif: { nome: 'DM Serif Display (marcante)', css: "'DM Serif Display', Georgia, serif", g: 'DM+Serif+Display' },
}
export const FONTES_TEXTO: Record<string, { nome: string; css: string; g: string }> = {
  inter: { nome: 'Inter (moderna, muito legível)', css: "'Inter', 'Segoe UI', Arial, sans-serif", g: 'Inter:wght@400;600;700' },
  nunito: { nome: 'Nunito (arredondada, acolhedora)', css: "'Nunito', 'Segoe UI', Arial, sans-serif", g: 'Nunito:wght@400;600;700' },
  lato: { nome: 'Lato (limpa)', css: "'Lato', 'Segoe UI', Arial, sans-serif", g: 'Lato:wght@400;700' },
  sourceserif: { nome: 'Source Serif (de livro)', css: "'Source Serif 4', Georgia, serif", g: 'Source+Serif+4:wght@400;600;700' },
  merriweather: { nome: 'Merriweather (de livro, grande)', css: "'Merriweather', Georgia, serif", g: 'Merriweather:wght@400;700' },
}
function fontes(marca: Marca) {
  const t = FONTES_TITULO[marca.fonteTitulo || 'cinzel'] || FONTES_TITULO.cinzel
  const x = FONTES_TEXTO[marca.fonteTexto || 'inter'] || FONTES_TEXTO.inter
  return { link: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=${t.g}&family=${x.g}&display=swap" rel="stylesheet">`, css: `:root{--ft:${t.css};--fx:${x.css}}` }
}

export const MARCA_PADRAO: Marca = {
  nome: 'Mapa da Alma',
  subtitulo: 'Estudo Numerológico & Astrológico',
  assinatura: 'Com carinho, equipe Mapa da Alma',
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const ZODIACO = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']

/** Mandala original da capa (SVG gerado). */
function mandala(size = 420): string {
  const c = size / 2, r1 = c - 8, r2 = c - 52, r3 = c - 110
  let s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7b3fe4" stop-opacity=".55"/><stop offset="1" stop-color="#1a0b3d" stop-opacity="0"/></radialGradient></defs>
  <circle cx="${c}" cy="${c}" r="${r1}" fill="url(#g)"/>
  <g fill="none" stroke="#d9b45a" stroke-opacity=".85">
    <circle cx="${c}" cy="${c}" r="${r1}" stroke-width="1.5"/><circle cx="${c}" cy="${c}" r="${r2}" stroke-width="1"/>
    <circle cx="${c}" cy="${c}" r="${r3}" stroke-width="1"/><circle cx="${c}" cy="${c}" r="${r3 - 40}" stroke-width=".8" stroke-dasharray="2 6"/>`
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180
    s += `<line x1="${c + r2 * Math.cos(a)}" y1="${c + r2 * Math.sin(a)}" x2="${c + r1 * Math.cos(a)}" y2="${c + r1 * Math.sin(a)}" stroke-width=".8"/>`
  }
  // estrela de 9 pontas (os 9 números)
  const pts = Array.from({ length: 9 }, (_, i) => { const a = (i * 40 - 90) * Math.PI / 180; return [c + r3 * Math.cos(a), c + r3 * Math.sin(a)] })
  s += `<polygon points="${pts.map((_, i) => pts[(i * 4) % 9].join(',')).join(' ')}" stroke-width="1"/></g>`
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 75) * Math.PI / 180, rr = (r1 + r2) / 2
    s += `<text x="${c + rr * Math.cos(a)}" y="${c + rr * Math.sin(a)}" fill="#f3dfa2" font-size="22" text-anchor="middle" dominant-baseline="central" font-family="DejaVu Sans, Segoe UI Symbol, sans-serif">${ZODIACO[i]}&#xFE0E;</text>`; void SIGNO_PATHS
  }
  pts.forEach(([x, y], i) => {
    const a = (i * 40 - 90) * Math.PI / 180, rr = r3 + 22
    s += `<text x="${c + rr * Math.cos(a)}" y="${c + rr * Math.sin(a)}" fill="#f3dfa2" font-size="18" text-anchor="middle" dominant-baseline="central" font-family="Cinzel, Georgia, serif">${i + 1}</text>`
    void x; void y
  })
  s += `<circle cx="${c}" cy="${c}" r="6" fill="#f3dfa2"/></svg>`
  return s
}

const sub = (s: { classico?: string }) => s.classico ? `<div class="classico">na numerologia tradicional: ${esc(s.classico)}</div>` : ''
const intro = (t: string) => `<div class="intro">${t.split(/\n{2,}/).map(p => `<p>${par(p)}</p>`).join('')}</div>`

/** Parágrafo com **negrito** simples. */
const par = (p: string) => esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

function bloco(b: Bloco): string {
  let h = `<div class="bloco${b.novaPagina ? ' pg' : ''}">`
  if (b.rotulo || b.numero) h += `<div class="num-linha">${b.rotulo ? `<span class="rotulo">${esc(b.rotulo)}</span>` : ''}${b.numero ? `<span class="numero">${esc(b.numero)}</span>` : ''}</div>`
  if (b.destaque) h += `<p class="destaque">${esc(b.destaque)}</p>`
  for (const p of b.texto || []) h += /^O QUE FAZER/i.test(p) ? `<p class="fazer">${par(p).replace(/^O QUE FAZER:?/i, '<b>O QUE FAZER:</b>')}</p>` : `<p>${par(p)}</p>`
  if (b.triangulo) {
    const marcas = new Set(b.triangulo.marcas)
    h += '<div class="triangulo">' + b.triangulo.linhas.map((l, li) =>
      `<div class="tl">${l.map((d, i) => `<span${marcas.has(`${li}:${i}`) ? ' class="neg"' : li === 0 && b.triangulo!.arcano != null && (i === b.triangulo!.arcano || i === b.triangulo!.arcano! + 1) ? ' class="arc"' : ''}>${d}</span>`).join('')}</div>`).join('') + '</div>'
  }
  const lista = (titulo: string, cls: string, it?: string[]) => it?.length ? `<div class="lista ${cls}"><h4>${titulo}</h4><ul>${it.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''
  h += lista('Pontos positivos', 'luz', b.luz) + lista('Pontos de atenção', 'sombra', b.sombra) + lista('O que você deve fazer', 'conselho', b.conselho)
  if (b.plano && (b.plano.intro || b.plano.partes?.length)) {
    const pl = b.plano
    h += `<div class="plano"><h4>O que fazer: seu plano prático</h4>${pl.intro ? `<p class="pl-intro">${par(pl.intro)}</p>` : ''}${(pl.partes || []).map(pt =>
      `<div class="pl-parte"><h5>${esc(pt.titulo)}</h5>${pt.itens ? `<ol>${pt.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ol>` : `<p>${esc(pt.texto)}</p>`}</div>`).join('')}${pl.frase ? `<p class="pl-frase">“${esc(pl.frase)}”</p>` : ''}</div>`
  }
  return h + '</div>'
}

const ORIENTACAO = (_nome: string) => ORIENTACAO_PARAGRAFOS.map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${par(p)}</p>`).join('')

const GLOSSARIO_HTML = () => `<p>Para facilitar a sua leitura e a compreensão do seu mapa, veja o que significa cada parte que você vai encontrar a seguir:</p>
<dl class="glossario">${GLOSSARIO.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`

const TABELA_HTML = (c: Conteudo) => {
  let grupo = ''
  return `<table class="tabela"><thead><tr><th style="width:19%">Item</th><th style="width:10%">Número</th><th style="width:36%">O que significa</th><th style="width:35%">Seu aprendizado</th></tr></thead><tbody>${c.tabela.map(l => {
    const g = l.grupo !== grupo ? `<tr class="grupo"><td colspan="4">${esc((grupo = l.grupo))}</td></tr>` : ''
    return g + `<tr><td class="it">${esc(l.item)}</td><td class="v">${esc(l.valor)}</td><td>${esc(l.sentido)}</td><td class="ap">${esc(l.aprendizado || '')}</td></tr>`
  }).join('')}</tbody></table><p class="nota">${esc(AVISO_FINAL)}</p>`
}

/** Resumo final no link: cartões por grupo (lê bem no celular, sem colunas espremidas). */
const RESUMO_CARDS = (c: Conteudo) => {
  const grupos: { nome: string; linhas: Conteudo['tabela'] }[] = []
  for (const l of c.tabela) {
    const g = grupos[grupos.length - 1]
    if (g && g.nome === l.grupo) g.linhas.push(l); else grupos.push({ nome: l.grupo, linhas: [l] })
  }
  return grupos.map(g => `<div class="rf-grupo"><h3 class="rf-gt">${esc(g.nome)}</h3><div class="rf-lista">${g.linhas.map(l => `<article class="rf-item">
<header><span class="rf-nome">${esc(l.item)}</span><span class="rf-num">${esc(l.valor)}</span></header>
${l.sentido ? `<p class="rf-sent"><small>O que significa</small>${esc(l.sentido)}</p>` : ''}
${l.aprendizado ? `<p class="rf-apr"><small>✦ Seu aprendizado</small>${esc(l.aprendizado)}</p>` : ''}</article>`).join('')}</div></div>`).join('') + `<p class="nota">${esc(AVISO_FINAL)}</p>`
}

const CONCLUSAO = (nome: string, marca: Marca) => `
<p>${esc(nome.split(' ')[0])}, agora você tem em mãos um retrato da sua essência: seus talentos, seus desafios, seus ciclos e a energia do momento que você está vivendo.</p>
<p>Use este estudo como um guia. Releia as partes que mais tocaram você, observe como os números aparecem no seu dia a dia e coloque em prática os conselhos que fizeram sentido. Pequenas mudanças, feitas com consciência, transformam caminhos inteiros.</p>
<p>Que este mapa ilumine as suas escolhas e te lembre sempre da força que existe dentro de você.</p>
<p class="assinatura">${esc(marca.assinatura || '')}</p>`

const CSS_BASE = `
:root{--roxo:#2a1259;--roxo2:#4b1f8f;--ouro:#c9a24a;--ouro2:#f3dfa2;--tinta:#241a33;--suave:#6b5b7e;--fundo:#fbf8ff;--borda:#e7dcf5;--neg:#d23b3b}
*{box-sizing:border-box}body{margin:0;font-family:var(--fx,Inter,'Segoe UI',Arial,sans-serif);color:var(--tinta);line-height:1.65}
h1,h2,h3,.titulo-serif,.assinatura,.pl-frase{font-family:var(--ft,Cinzel,Georgia,serif)}
.secao h2{color:var(--roxo2);font-size:22px;letter-spacing:.04em;border-bottom:2px solid var(--roxo2);padding-bottom:8px;margin:0 0 12px}
.secao h2::before{content:'✦ ';color:var(--ouro)}
.intro{color:#3d2f55;background:#fbf8ff;border-left:3px solid var(--ouro);padding:4px 14px;border-radius:6px;margin:8px 0 12px}.intro p{margin:8px 0}
.classico{margin:-8px 0 10px;font-size:12px;color:var(--suave);text-transform:uppercase;letter-spacing:.08em}
.bloco{margin:18px 0 8px}
.num-linha{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(90deg,#f1e8ff,#fff);border-left:4px solid var(--ouro);padding:10px 14px;border-radius:8px}
.rotulo{font-weight:700;color:var(--roxo);text-transform:uppercase;font-size:13px;letter-spacing:.06em}
.numero{margin-left:auto;font-family:var(--ft,Cinzel,Georgia,serif);font-size:22px;color:var(--roxo2);font-weight:700}
.destaque{font-weight:600;color:var(--roxo2);margin:12px 0 4px}
.lista{margin:14px 0;border-radius:14px;padding:12px 16px 10px;border:1.5px solid var(--borda);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.lista h4{margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:8px}
.lista h4::before{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;color:#fff;font-size:13px;flex:none}
.lista.luz{background:#ecfbf3;border-color:#9fdcbc}.lista.luz h4{color:#15803d}.lista.luz h4::before{content:'✓';background:#16a34a}
.lista.sombra{background:#fff0f0;border-color:#f3b3b3}.lista.sombra h4{color:#c0262d}.lista.sombra h4::before{content:'!';background:#dc2626}
.lista.conselho{background:linear-gradient(135deg,#f3ecff,#e8fbf1);border-color:#c4b0f0}.lista.conselho h4{color:var(--roxo2)}.lista.conselho h4::before{content:'✦';background:linear-gradient(135deg,#7c3aed,#10b981)}
.lista ul{margin:0;padding-left:20px}.lista li{margin:3px 0}.lista.luz li::marker{color:#16a34a}.lista.sombra li::marker{color:#dc2626}
.triangulo{font-family:'DejaVu Sans Mono',Consolas,monospace;text-align:center;font-size:12px;letter-spacing:.18em;margin:12px 0;color:#5a4a72}
.triangulo .tl{white-space:nowrap}.triangulo .neg{color:var(--neg);font-weight:700}.triangulo .arc{color:#16a34a;font-weight:800}
.nota{font-size:13px;color:var(--suave);border-top:1px dashed var(--borda);padding-top:10px}
.assinatura{font-family:var(--ft,Cinzel,Georgia,serif);color:var(--roxo2);margin-top:28px}
.lead{font-size:18px;font-weight:600;color:var(--roxo)}
.resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:16px 0}
.resumo div{background:#fff;border:1px solid var(--borda);border-radius:10px;padding:10px 12px}
.resumo small{display:block;color:var(--suave);font-size:12px}.resumo b{color:var(--roxo2)}
.plano{margin:16px 0 8px;border:2px solid #b89cf0;background:linear-gradient(135deg,#f3ecff 0%,#fbf8ff 45%,#e6faef 100%);border-radius:14px;padding:14px 18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.plano h4{margin:0 0 6px;color:var(--roxo2);font-size:14px;text-transform:uppercase;letter-spacing:.05em}
.plano h5{margin:10px 0 3px;font-size:13px;color:var(--roxo)}.plano ol{margin:0;padding-left:20px}.plano li{margin:2px 0}.plano p{margin:4px 0}
.pl-intro{font-weight:600}.pl-frase{font-family:var(--ft,Cinzel,Georgia,serif);color:var(--roxo2);text-align:center;margin-top:10px!important}
.fazer{background:linear-gradient(135deg,#f1e8ff 0%,#faf7ff 50%,#e3f8ec 100%);border:2px solid #b89cf0;padding:12px 16px;border-radius:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fazer b{background:linear-gradient(90deg,#6d28d9,#059669);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.04em}
.glossario dt{font-weight:700;color:var(--roxo2);margin-top:10px}.glossario dd{margin:2px 0 0}
.tabela{width:100%;border-collapse:collapse;font-size:13px}.tabela th{background:var(--roxo2);color:#fff;text-align:left;padding:8px}
.tabela td{border-bottom:1px solid var(--borda);padding:7px 8px;vertical-align:top}.tabela td.v{font-weight:700;color:var(--roxo2)}.tabela td.it{font-weight:600}.tabela td.ap{color:#3f2a63;background:#fbf8ff}.tabela{table-layout:fixed}.tabela tr{break-inside:avoid}.tabela tr.grupo{break-after:avoid}
.tabela tr.grupo td{background:#f1e8ff;color:var(--roxo);font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
.sumario ol{columns:2;column-gap:28px;padding-left:20px}.sumario li{margin:4px 0;break-inside:avoid}
`

/** Capítulos do mapa (separam os assuntos no link e no menu). */
const CAPITULOS: { id: string; titulo: string; glifo: string; cor: string; secoes: string[] }[] = [
  { id: 'cap-astro', titulo: 'Astrologia', glifo: '☉', cor: '#c9821a', secoes: ['signo', 'compatSignos'] },
  { id: 'cap-nome', titulo: 'Os números do seu nome', glifo: '✦', cor: '#7a5af8', secoes: ['letras', 'motivacao', 'impressao', 'expressao'] },
  { id: 'cap-data', titulo: 'Os números da sua data', glifo: '☽', cor: '#4b1f8f', secoes: ['diaNascimento', 'destino', 'missao', 'talentoOculto', 'numeroPsiquico'] },
  { id: 'cap-carma', titulo: 'Carma e energias', glifo: '❋', cor: '#b0306a', secoes: ['licoesCarmicas', 'dividasCarmicas', 'tendenciasOcultas', 'respostaSubconsciente', 'cores', 'dias'] },
  { id: 'cap-tempo', titulo: 'Seu tempo e previsões', glifo: '⌛', cor: '#0f7a6a', secoes: ['anoPessoal', 'horoscopo', 'proximosAnos', 'mesAMes', 'mesPessoal', 'diaPessoal'] },
  { id: 'cap-ciclos', titulo: 'Ciclos e caminhos', glifo: '∞', cor: '#2f6feb', secoes: ['ciclos', 'desafios', 'momentos'] },
  { id: 'cap-amor', titulo: 'Amor', glifo: '♡', cor: '#d6336a', secoes: ['harmoniaConjugal', 'compatibilidade', 'pessoa-'] },
  { id: 'cap-arcanos', titulo: 'Arcanos e pirâmides', glifo: '△', cor: '#6b4b1f', secoes: ['arcanos', 'arcanosVida', 'triangulos'] },
]
/** Ícones desenhados de cada capítulo (traço branco, animados no link). */
const SVG = (d: string) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const ICONES: Record<string, string> = {
  'cap-astro': SVG('<circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="2.5" fill="currentColor"/>' + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${(24 + 12 * Math.cos(a)).toFixed(1)}" y1="${(24 + 12 * Math.sin(a)).toFixed(1)}" x2="${(24 + (i % 2 ? 16 : 19) * Math.cos(a)).toFixed(1)}" y2="${(24 + (i % 2 ? 16 : 19) * Math.sin(a)).toFixed(1)}"/>` }).join('')),
  'cap-nome': SVG('<path d="M24 5l4.2 12.4L41 18l-10.2 7.7L34.6 38 24 30.6 13.4 38l3.8-12.3L7 18l12.8-.6z"/><text x="24" y="27" fill="currentColor" stroke="none" font-size="10" font-family="Georgia,serif" text-anchor="middle" font-weight="700">A</text>'),
  'cap-data': SVG('<path d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z"/><path d="M36 12l1.2 2.8L40 16l-2.8 1.2L36 20l-1.2-2.8L32 16l2.8-1.2z" fill="currentColor"/>'),
  'cap-carma': SVG('<path d="M24 38c-6-4-9-10-9-17 4 2 7 5 9 9 2-4 5-7 9-9 0 7-3 13-9 17z"/><path d="M24 30c-1.5-6-1.5-12 0-18 1.5 6 1.5 12 0 18z"/><path d="M15 25c-4 0-7-1-9-3 4-1 7-1 10 1M33 25c4 0 7-1 9-3-4-1-7-1-10 1"/><path d="M12 42h24"/>'),
  'cap-tempo': SVG('<path d="M14 6h20M14 42h20"/><path d="M16 6c0 9 8 12 8 18s-8 9-8 18M32 6c0 9-8 12-8 18s8 9 8 18"/><path d="M20 38c1-3 3-5 4-5s3 2 4 5z" fill="currentColor"/>'),
  'cap-ciclos': SVG('<path d="M24 24c-4-5-7-8-11-8a8 8 0 0 0 0 16c4 0 7-3 11-8s7-8 11-8a8 8 0 0 1 0 16c-4 0-7-3-11-8z"/>'),
  'cap-amor': SVG('<path d="M24 40S7 30 7 18a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 12-17 22-17 22z"/><path d="M37 7l.9 2.1L40 10l-2.1.9L37 13l-.9-2.1L34 10l2.1-.9z" fill="currentColor"/>'),
  'cap-arcanos': SVG('<path d="M24 6L42 40H6z"/><path d="M15 29c3-4 6-5 9-5s6 1 9 5c-3 4-6 5-9 5s-6-1-9-5z"/><circle cx="24" cy="29" r="2.4" fill="currentColor"/>'),
  'cap-final': SVG('<path d="M8 36l4-20 8 9 4-13 4 13 8-9 4 20z"/><path d="M8 41h32"/><circle cx="24" cy="9" r="1.8" fill="currentColor"/>'),
}
const iconeCap = (id: string, glifo: string) => `<span class="cap-g">${ICONES[id] || glifo}<i class="fa1">✦</i><i class="fa2">✧</i><i class="fa3">·</i></span>`
const capDe = (id: string) => CAPITULOS.find(c => c.secoes.some(s => s.endsWith('-') ? id.startsWith(s) : s === id))

/** Tela de senha do mapa completo. */
export function telaSenha(nome: string, marca: Marca = MARCA_PADRAO, erro = false): string {
  const f = fontes(marca)
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(marca.nome)}</title><meta name="robots" content="noindex">${f.link}
<style>${f.css}${CSS_BASE}body{min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 65%,#0d0620);color:#fff;padding:16px}
.box{width:min(380px,100%);text-align:center}.box h1{color:#f3dfa2;letter-spacing:.12em;font-size:28px;margin:10px 0 4px}.box p{opacity:.85}
form{margin-top:18px;display:flex;flex-direction:column;gap:10px}input{height:52px;border-radius:14px;border:1.5px solid rgba(243,223,162,.5);background:rgba(255,255,255,.08);color:#fff;text-align:center;font-size:22px;letter-spacing:.3em;text-transform:uppercase;outline:0}
input:focus{border-color:#f3dfa2}button{height:50px;border:0;border-radius:14px;font-weight:700;font-size:16px;background:linear-gradient(135deg,#f3dfa2,#c9a24a);color:#2a1259;cursor:pointer}.erro{color:#ffb4b4;font-weight:600}.ico{font-size:40px}</style></head><body>
<div class="box"><div class="ico">🔐</div><h1>${esc(marca.nome.toUpperCase())}</h1><p>Mapa de <b>${esc(nome.split(' ')[0])}</b>. Digite a senha que você recebeu no WhatsApp para abrir o seu mapa completo.</p>
${erro ? '<p class="erro">Senha incorreta. Confira e tente de novo.</p>' : ''}
<form method="post"><input name="senha" autocomplete="one-time-code" autocapitalize="characters" maxlength="12" placeholder="SENHA" required autofocus><button type="submit">Abrir meu mapa ✨</button></form>
<p style="font-size:13px;margin-top:16px">Não encontrou a senha? É só pedir na nossa conversa do WhatsApp.</p></div></body></html>`
}

/** Página do link ao vivo (celular e computador). */
export function htmlWeb(c: Conteudo, marca: Marca = MARCA_PADRAO, opts: { pdfUrl?: string; bloqueado?: boolean; ctaUrl?: string; piramides?: string | null; piramidesTrancadas?: boolean; upgradeUrl?: string; estiloCss?: string } = {}): string {
  const ABERTAS = 3
  const f = fontes(marca)
  const flutuantes = ['✦', '♈', '☾', '✧', '♌', '☉', '✶', '♎', '✦', '♓', '✧', '☽'].map((g, i) =>
    `<span class="fl" style="left:${(i * 83) % 100}%;animation-delay:${(i * 1.7) % 12}s;animation-duration:${14 + (i % 5) * 3}s;font-size:${12 + (i % 4) * 6}px">${g}&#xFE0E;</span>`).join('')
  const cta = (titulo: string) => `<div class="cta"><div class="cta-ico">🔒</div><h3>${esc(titulo)}</h3>
    <p>Este é o seu Mapa da Alma em modo prévia. A leitura completa traz todas as seções explicadas, o seu signo integrado aos números, ciclos, desafios, carmas, arcanos, as 4 pirâmides do nome, previsões do ano e mês a mês, plano prático em cada número e a tabela-resumo final, com PDF para guardar.</p>
    ${opts.ctaUrl ? `<a class="btn btn-ouro" href="${esc(opts.ctaUrl)}">Liberar meu mapa completo ✨</a>` : '<p class="cta-wa">Para liberar o mapa completo, responda a nossa conversa no WhatsApp ✨</p>'}</div>`
  const secaoHtml = (s: Conteudo['secoes'][number], i: number) => {
    const cab = `<h2>${esc(s.titulo)}</h2>${sub(s)}`
    if (opts.bloqueado && i >= ABERTAS)
      return `<section class="card secao trancada" id="${s.id}" data-t="${esc(s.titulo)}">${cab}${intro(s.intro)}<div class="borrado" aria-hidden="true">${s.blocos.slice(0, 1).map(bloco).join('')}</div><div class="cadeado">🔒 Disponível no mapa completo</div></section>`
    return `<section class="card secao" id="${s.id}" data-t="${esc(s.titulo)}">${cab}${intro(s.intro)}${s.blocos.map(bloco).join('')}</section>`
  }
  // monta os capítulos na ordem das seções
  let corpo = '', capAtual = ''
  const indice: { cap: string; cor: string; glifo: string; itens: { id: string; t: string }[] }[] = []
  c.secoes.forEach((s, i) => {
    const cap = capDe(s.id)
    if (cap && cap.id !== capAtual) {
      capAtual = cap.id
      corpo += `<div class="capitulo" id="${cap.id}" data-t="${esc(cap.titulo)}" style="--c:${cap.cor}">${iconeCap(cap.id, cap.glifo)}<div><small>Capítulo ${indice.length + 1}</small><h2>${esc(cap.titulo)}</h2></div></div>`
      indice.push({ cap: cap.titulo, cor: cap.cor, glifo: cap.glifo, itens: [] })
    }
    if (!indice.length) indice.push({ cap: 'Seu mapa', cor: '#7a5af8', glifo: '✦', itens: [] })
    indice[indice.length - 1].itens.push({ id: s.id, t: s.titulo })
    corpo += secaoHtml(s, i) + (opts.bloqueado && i === ABERTAS - 1 ? cta('Continue a sua leitura') : '')
  })
  const menu = `<div class="ind-cab"><a href="#topo">Início</a>${opts.bloqueado ? '' : '<a href="#orientacao">Orientação inicial</a><a href="#guia">Como ler o seu mapa</a>'}<a href="#resumo">Resumo do mapa</a></div>` +
    indice.map(g => `<div class="ind-g" style="--c:${g.cor}"><h4>${g.glifo} ${esc(g.cap)}</h4>${g.itens.map(x => `<a href="#${x.id}" data-sec="${x.id}">${esc(x.t)}</a>`).join('')}</div>`).join('') +
    (opts.piramides || opts.piramidesTrancadas ? '<div class="ind-g" style="--c:#7a5af8"><h4>△ Pirâmides do nome</h4><a href="#piramides" data-sec="piramides">As 4 pirâmides + resumo geral</a></div>' : '') +
    (opts.bloqueado ? '' : '<div class="ind-cab"><a href="#tabela">Resumo final</a><a href="#conclusao">Conclusão</a></div>')
  return trocarGlifos(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.nome)} · ${esc(marca.nome)}</title><meta name="robots" content="noindex">${f.link}
<style>${f.css}${CSS_BASE}${opts.piramides ? PIR_CSS : ''}
:root{--fs:17px}
html{scroll-behavior:smooth;scroll-padding-top:70px}
body{background:var(--fundo);font-size:var(--fs)}
.hero{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 65%,#0d0620);color:#fff;text-align:center;padding:40px 16px 34px}
.hero::before{content:'';position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 30% 70%,#f3dfa2,transparent),radial-gradient(1.5px 1.5px at 70% 30%,#fff,transparent),radial-gradient(1px 1px at 85% 80%,#f3dfa2,transparent),radial-gradient(1px 1px at 50% 50%,#fff,transparent),radial-gradient(1.2px 1.2px at 20% 90%,#fff,transparent),radial-gradient(1px 1px at 90% 10%,#fff,transparent);background-size:300px 300px;animation:cintila 6s ease-in-out infinite alternate;opacity:.8}
@keyframes cintila{from{opacity:.45}to{opacity:.95}}
.hero svg{position:relative;width:min(240px,64vw);height:auto;animation:gira 120s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}
.hero h1,.hero .sub,.hero .nome,.hero p,.hero .selo{position:relative}
.hero h1{margin:8px 0 0;font-size:clamp(26px,6vw,40px);letter-spacing:.12em;color:var(--ouro2);text-shadow:0 0 18px rgba(243,223,162,.45)}
.hero .sub{opacity:.85;letter-spacing:.2em;text-transform:uppercase;font-size:12px}
.hero .nome{margin-top:14px;font-size:20px;font-weight:600}
.fl{position:absolute;bottom:-30px;color:#f3dfa2;opacity:0;animation:sobe linear infinite;pointer-events:none;font-family:'DejaVu Sans','Segoe UI Symbol',sans-serif}
@keyframes sobe{0%{transform:translateY(0) rotate(0);opacity:0}15%{opacity:.55}85%{opacity:.35}100%{transform:translateY(-520px) rotate(40deg);opacity:0}}
.selo{display:inline-block;margin-top:12px;padding:5px 12px;border-radius:999px;border:1px solid rgba(243,223,162,.6);color:#f3dfa2;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.wrap{max-width:780px;margin:0 auto;padding:0 16px 90px}
.card{background:#fff;border:1px solid var(--borda);border-radius:18px;padding:22px 22px 16px;margin:18px 0;box-shadow:0 4px 18px rgba(42,18,89,.05)}
.secao h2{font-size:1.45em;border-bottom:0;padding-bottom:0;margin-bottom:2px}
.secao h2::before{content:'✦ ';color:var(--ouro)}
.classico{margin:0 0 12px}
.bloco{margin:22px 0 10px;padding-top:4px}
.bloco + .bloco{border-top:1px dashed var(--borda);padding-top:20px}
.num-linha{padding:12px 16px}.rotulo{font-size:.8em}.numero{font-size:1.4em}
p{margin:.7em 0}
.capitulo{display:flex;align-items:center;gap:14px;margin:44px 0 6px;padding:18px 20px;border-radius:18px;color:#fff;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 55%,#1a0b3d));box-shadow:0 10px 26px color-mix(in srgb,var(--c) 30%,transparent)}
.capitulo small{opacity:.85;text-transform:uppercase;letter-spacing:.12em;font-size:.7em}.capitulo h2{margin:0;font-size:1.6em;color:#fff;border:0}
.cap-g{width:52px;height:52px;flex:none;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.16);font-size:26px}
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(251,248,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--borda)}
.tb-btn{border:1px solid var(--borda);background:#fff;border-radius:12px;height:38px;min-width:38px;padding:0 12px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;color:var(--roxo);font:inherit;font-size:14px}
.tb-atual{flex:1;min-width:0;justify-content:flex-start}.tb-atual span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tb-atual small{color:var(--suave);font-size:11px;display:block;line-height:1}
.tb-busca{display:none;flex:1}.tb-busca input{width:100%;height:38px;border-radius:12px;border:1.5px solid var(--roxo2);padding:0 12px;font:inherit;font-size:15px;outline:0}
.topbar.buscando .tb-atual{display:none}.topbar.buscando .tb-busca{display:block}
.tb-res{font-size:12px;color:var(--suave);white-space:nowrap}
.indice{position:fixed;inset:54px 10px auto 10px;max-width:520px;margin:0 auto;max-height:calc(100vh - 80px);overflow:auto;background:#fff;border:1px solid var(--borda);border-radius:18px;box-shadow:0 20px 50px rgba(42,18,89,.2);padding:12px 14px;z-index:30;display:none}
.indice.on{display:block}
.indice a{display:block;padding:6px 10px;border-radius:10px;text-decoration:none;color:var(--tinta);font-size:15px}.indice a:hover,.indice a.on{background:#f1e8ff;color:var(--roxo2);font-weight:600}
.ind-g{border-left:3px solid var(--c);padding-left:8px;margin:10px 0}.ind-g h4{margin:4px 0;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--c)}
.ind-cab{display:flex;flex-wrap:wrap;gap:4px}.ind-cab a{background:#f6f0ff}
.flutua{position:fixed;left:10px;bottom:12px;z-index:25;display:flex;flex-direction:column;gap:7px}
.flutua .fs{display:none}.flutua.fs-on .fs{display:grid}.flutua.fs-on .aa{background:#f1e8ff}
@media (max-width:820px){.flutua button,.flutua a{width:36px;height:36px;font-size:14px;background:rgba(255,255,255,.88);backdrop-filter:blur(6px)}}
.flutua button,.flutua a{width:40px;height:40px;border-radius:50%;border:1px solid var(--borda);background:#fff;color:var(--roxo2);display:grid;place-items:center;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(42,18,89,.14);cursor:pointer}
.flutua .fim{transition:opacity .2s}.flutua .fim.off{opacity:0;pointer-events:none}
.pulsa{animation:pulsa 2.2s ease-in-out infinite}
@keyframes pulsa{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(201,162,74,.55)}50%{transform:scale(1.04);box-shadow:0 0 0 10px rgba(201,162,74,0)}}
.tb-pdf{background:linear-gradient(135deg,#f3dfa2,#c9a24a);border:0;color:#2a1259;font-weight:700;text-decoration:none}
@media (max-width:340px){.tb-pdf span{display:none}}
.pdf-final{text-align:center;margin:26px 0 10px;padding:28px 20px;border-radius:20px;color:#fff;background:radial-gradient(circle at 50% 0,#5b2bb0,#1a0b3d 70%)}
.pdf-final h3{color:#f3dfa2;margin:6px 0;font-size:1.4em}.pdf-final p{opacity:.88}.pf-ico{font-size:34px}
/* ícones dos capítulos */
.cap-g{position:relative;color:#fff;overflow:visible}
.cap-g svg{width:32px;height:32px;animation:flutuar 4.5s ease-in-out infinite;filter:drop-shadow(0 0 6px rgba(255,255,255,.55))}
.cap-g::after{content:'';position:absolute;inset:-4px;border-radius:16px;border:1.5px solid rgba(255,255,255,.35);animation:halo 3.2s ease-out infinite}
.cap-g i{position:absolute;font-style:normal;color:#f3dfa2;pointer-events:none;animation:brilho 3s ease-in-out infinite}
.cap-g .fa1{top:-7px;right:-5px;font-size:12px}.cap-g .fa2{bottom:-6px;left:-6px;font-size:10px;animation-delay:1s}.cap-g .fa3{top:4px;left:-8px;font-size:18px;animation-delay:2s}
@keyframes flutuar{0%,100%{transform:translateY(2px) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}
@keyframes halo{0%{transform:scale(.92);opacity:.9}100%{transform:scale(1.22);opacity:0}}
@keyframes brilho{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}
/* resumo final em cartões */
.rf-dica{color:var(--suave);margin-top:4px}
.rf-grupo{margin:22px 0 6px}
.rf-gt{margin:0 0 10px;font-size:.78em;text-transform:uppercase;letter-spacing:.12em;color:#fff;background:linear-gradient(90deg,var(--roxo2),#7a5af8);display:inline-block;padding:6px 14px;border-radius:999px}
.rf-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.rf-item{border:1px solid var(--borda);border-radius:14px;padding:12px 14px;background:#fff;box-shadow:0 2px 10px rgba(42,18,89,.04)}
.rf-item header{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.rf-nome{font-weight:700;color:var(--roxo);flex:1;line-height:1.3}
.rf-num{flex:none;min-width:40px;height:40px;padding:0 8px;border-radius:12px;display:grid;place-items:center;font-family:var(--ft,Cinzel,Georgia,serif);font-weight:700;font-size:1.05em;color:#fff;background:linear-gradient(135deg,#7a5af8,#4b1f8f);text-align:center;line-height:1.1;max-width:55%;word-break:break-word}
.rf-item p{margin:6px 0 0;font-size:.94em;line-height:1.55}.rf-item small{display:block;font-size:.72em;text-transform:uppercase;letter-spacing:.08em;color:var(--suave);font-weight:700;margin-bottom:2px}
.rf-apr{background:linear-gradient(135deg,#f3ecff,#e8fbf1);border-radius:10px;padding:8px 10px;color:#3f2a63}.rf-apr small{color:#6d28d9}
@media (max-width:520px){.rf-lista{grid-template-columns:1fr}}
.flutua .topo{opacity:0;pointer-events:none;transition:opacity .2s}.flutua .topo.on{opacity:1;pointer-events:auto}
mark.achado{background:#ffe58a;color:inherit;border-radius:3px;padding:0 2px}
.btn{display:inline-block;background:var(--roxo2);color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700}
.btn-ouro{background:linear-gradient(135deg,#f3dfa2,#c9a24a);color:#2a1259;box-shadow:0 6px 24px rgba(201,162,74,.35)}
.triangulo{font-size:11px;letter-spacing:.12em;overflow-x:auto}
.trancada{position:relative}
.borrado{filter:blur(6px);user-select:none;pointer-events:none;max-height:220px;overflow:hidden}
.cadeado{position:absolute;left:50%;top:60%;transform:translate(-50%,-50%);background:#2a1259;color:#f3dfa2;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap}
.cta{text-align:center;background:radial-gradient(circle at 50% 0,#4b1f8f,#1a0b3d);color:#fff;border-radius:18px;padding:26px 20px;margin:20px 0}
.cta h3{color:#f3dfa2;margin:6px 0 8px;font-size:22px}.cta p{opacity:.9}.cta-ico{font-size:30px}.cta-wa{color:#f3dfa2;font-weight:600}
.tabela{font-size:.82em}
.pir-wrap h2::before{content:none!important}.pir-wrap .pmod h2{font-size:1.25em;margin:0}.pir-wrap .pmod .pintro h2{margin-bottom:4px}
@media (max-width:520px){.triangulo{font-size:8px;letter-spacing:.06em}.card{padding:18px 16px 12px}:root{--fs:16px}}
@media (prefers-reduced-motion:reduce){.fl,.hero svg,.hero::before,.pulsa,.cap-g svg,.cap-g::after,.cap-g i{animation:none!important}}
${opts.estiloCss || estiloCss(null, true)}
</style></head><body>
<header class="hero" id="topo">${flutuantes}${mandala(420)}<h1>${esc(marca.nome.toUpperCase())}</h1><div class="sub">${esc(marca.subtitulo)}</div><div class="nome">${esc(c.nome)}</div>
${opts.bloqueado ? '<div class="selo">✦ Prévia do seu mapa ✦</div>' : ''}
${opts.pdfUrl ? `<p style="margin-top:16px"><a class="btn btn-ouro pulsa" href="${esc(opts.pdfUrl)}">⤓ Baixar em PDF</a></p>` : ''}</header>
<nav class="topbar" id="barra" aria-label="Navegação do mapa">
  <button class="tb-btn tb-atual" id="tbAtual" aria-haspopup="true" aria-expanded="false"><b>☰</b><span><small id="tbCap">Seu mapa</small><span id="tbSec">Início</span></span></button>
  <div class="tb-busca"><input id="busca" type="search" placeholder="Buscar no mapa (ex.: amor, dinheiro, 2027)" aria-label="Buscar no mapa"></div>
  <span class="tb-res" id="buscaRes"></span>
  <button class="tb-btn" id="tbBusca" aria-label="Buscar">🔍</button>
  ${opts.pdfUrl ? `<a class="tb-btn tb-pdf pulsa" href="${esc(opts.pdfUrl)}" aria-label="Baixar em PDF">⤓ <span>PDF</span></a>` : ''}
</nav>
<div class="indice" id="indice" role="menu">${menu}</div>
<main class="wrap">
<section class="card" id="resumo" data-t="Resumo do mapa"><h2 class="titulo-serif" style="color:var(--roxo2);margin-top:0">Resumo do seu mapa</h2><div class="resumo">${c.resumo.map(r => `<div><small>${esc(r.rotulo)}</small><b>${esc(r.valor)}</b></div>`).join('')}</div></section>
${opts.bloqueado ? '' : `<section class="card secao" id="orientacao" data-t="Orientação inicial"><h2>Orientação inicial</h2>${ORIENTACAO(c.nome)}</section><section class="card secao" id="guia" data-t="Como ler o seu mapa"><h2>Importante: como ler o seu mapa</h2>${GLOSSARIO_HTML()}</section>`}
${corpo}
${opts.piramides || opts.piramidesTrancadas ? `<div class="capitulo" id="cap-piramides" data-t="Pirâmides do nome" style="--c:#7a5af8">${iconeCap('cap-arcanos', '△')}<div><small>Capítulo especial</small><h2>Pirâmides do nome + resumo geral</h2></div></div>
<section class="${opts.piramides ? 'secao pir-wrap' : 'card secao'}" id="piramides" data-t="Pirâmides do nome">${opts.piramides ? opts.piramides : `<h2>As 4 pirâmides do seu nome</h2><div class="intro"><p>As pirâmides (triângulos invertidos) mostram como a energia do seu nome corre pelas áreas da vida: dinheiro, amor, família, saúde e emoções, com os bloqueios que pedem atenção, o arcano que vibra agora e um resumo geral com o que fazer.</p></div><div class="borrado" aria-hidden="true"><p>Pirâmide da Vida · Pirâmide Pessoal · Pirâmide Social · Pirâmide do Destino · Resumo geral por tema · O que fazer agora</p><p>Dinheiro e trabalho · Amor e relacionamentos · Família e lar · Energia e bem-estar · Emoções e fé</p></div><div class="cta"><div class="cta-ico">△</div><h3>Desbloqueie as pirâmides do seu nome</h3><p>Disponível na versão completa do Mapa da Alma.</p>${opts.upgradeUrl ? `<a class="btn btn-ouro" href="${esc(opts.upgradeUrl)}">Quero a versão completa ✨</a>` : '<p class="cta-wa">É só pedir na nossa conversa do WhatsApp ✨</p>'}</div>`}</section>` : ''}
${opts.bloqueado ? cta('Libere o seu Mapa da Alma completo') : `<div class="capitulo" id="cap-final" data-t="Resumo final" style="--c:#2a1259">${iconeCap('cap-final', '✧')}<div><small>Fechamento</small><h2>Resumo final</h2></div></div><section class="card secao" id="tabela" data-t="Resumo final"><h2>Resumo final do seu mapa</h2><p class="rf-dica">Tudo o que o seu mapa mostrou, em um lugar só: cada número, o que ele significa e o que ele ensina para você.</p>${RESUMO_CARDS(c)}</section><section class="card secao" id="conclusao" data-t="Conclusão"><h2>Conclusão</h2>${CONCLUSAO(c.nome, marca)}</section>
${opts.pdfUrl ? `<section class="pdf-final"><div class="pf-ico">📜</div><h3>Guarde o seu mapa</h3><p>Baixe a versão em PDF para ler quando quiser, mesmo sem internet.</p><a class="btn btn-ouro pulsa" href="${esc(opts.pdfUrl)}">⤓ Baixar meu mapa em PDF</a></section>` : ''}`}
</main>
<div class="flutua" aria-label="Ferramentas de leitura">
  <button class="topo" id="fTopo" title="Voltar ao topo" aria-label="Voltar ao topo">↑</button>
  <button class="fim" id="fFim" title="Ir para o final (resumo)" aria-label="Ir para o final da página">↓</button>
  <button class="fs" id="fMais" title="Aumentar a letra" aria-label="Aumentar a letra">A+</button>
  <button class="fs" id="fMenos" title="Diminuir a letra" aria-label="Diminuir a letra">A−</button>
  <button class="aa" id="fAa" title="Tamanho da letra" aria-label="Tamanho da letra">Aa</button>
</div>
<script>
(function(){
  var raiz=document.documentElement, fs=17;
  try{var g=parseFloat(localStorage.getItem('mapa_fs'));if(g)fs=g;}catch(e){}
  function aplica(){raiz.style.setProperty('--fs',fs+'px');try{localStorage.setItem('mapa_fs',fs)}catch(e){}}
  if(fs!==17)aplica();
  document.getElementById('fAa').onclick=function(){document.querySelector('.flutua').classList.toggle('fs-on')};
  document.getElementById('fMais').onclick=function(){fs=Math.min(26,fs+1.5);aplica()};
  document.getElementById('fMenos').onclick=function(){fs=Math.max(13,fs-1.5);aplica()};
  var topo=document.getElementById('fTopo');
  topo.onclick=function(){window.scrollTo({top:0,behavior:'smooth'})};
  var fim=document.getElementById('fFim');
  fim.onclick=function(){var alvo=document.getElementById('cap-final');window.scrollTo({top:alvo?alvo.offsetTop-60:document.documentElement.scrollHeight,behavior:'smooth'})};
  addEventListener('scroll',function(){topo.classList.toggle('on',scrollY>600);fim.classList.toggle('off',innerHeight+scrollY>=document.documentElement.scrollHeight-400)},{passive:true});
  // menu (índice)
  var ind=document.getElementById('indice'), bt=document.getElementById('tbAtual');
  bt.onclick=function(e){e.stopPropagation();var on=ind.classList.toggle('on');bt.setAttribute('aria-expanded',on)};
  ind.addEventListener('click',function(e){if(e.target.tagName==='A'){ind.classList.remove('on');bt.setAttribute('aria-expanded',false)}});
  document.addEventListener('click',function(e){if(!ind.contains(e.target)&&e.target!==bt)ind.classList.remove('on')});
  // acompanha o assunto que está sendo lido
  var cap=document.getElementById('tbCap'), sec=document.getElementById('tbSec');
  var alvos=[].slice.call(document.querySelectorAll('.capitulo,.secao,#resumo'));
  var links={};[].forEach.call(ind.querySelectorAll('a[data-sec]'),function(a){links[a.dataset.sec]=a});
  function atualiza(){
    var y=scrollY+90, capT='Seu mapa', secT='Início', secId=null;
    for(var i=0;i<alvos.length;i++){var el=alvos[i];if(el.offsetTop<=y){if(el.classList.contains('capitulo')){capT=el.dataset.t;secT=el.dataset.t}else{secT=el.dataset.t;secId=el.id}}else break}
    cap.textContent=capT;sec.textContent=secT;
    for(var k in links)links[k].classList.toggle('on',k===secId);
  }
  addEventListener('scroll',function(){requestAnimationFrame(atualiza)},{passive:true});atualiza();
  // busca discreta
  var barra=document.getElementById('barra'), bb=document.getElementById('tbBusca'), inp=document.getElementById('busca'), res=document.getElementById('buscaRes');
  var achados=[], pos=-1, ultimo='';
  function norm(t){return t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
  function limpa(){[].forEach.call(document.querySelectorAll('mark.achado'),function(m){m.replaceWith(document.createTextNode(m.textContent))});document.body.normalize()}
  function busca(q){
    limpa();achados=[];pos=-1;res.textContent='';if(q.length<2)return;
    var nq=norm(q), w=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT,null), n, lista=[];
    while(n=w.nextNode()){if(n.parentElement.closest('.borrado'))continue;if(norm(n.nodeValue).indexOf(nq)>-1)lista.push(n)}
    lista.forEach(function(t){var i=norm(t.nodeValue).indexOf(nq);if(i<0)return;var r=document.createRange();r.setStart(t,i);r.setEnd(t,i+q.length);var m=document.createElement('mark');m.className='achado';try{r.surroundContents(m);achados.push(m)}catch(e){}});
    res.textContent=achados.length?achados.length+' achado(s)':'nada encontrado';
  }
  function proximo(){if(!achados.length)return;pos=(pos+1)%achados.length;achados[pos].scrollIntoView({behavior:'smooth',block:'center'});res.textContent=(pos+1)+'/'+achados.length}
  bb.onclick=function(){var on=barra.classList.toggle('buscando');if(on){inp.focus()}else{limpa();res.textContent='';inp.value=''}};
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();if(inp.value!==ultimo){ultimo=inp.value;busca(inp.value)}proximo()}if(e.key==='Escape'){bb.click()}});
})();
</script>
${SCRIPT_ROLAGEM}
</body></html>`)
}

/** Seções que começam em página nova no PDF (início dos grandes capítulos). */
const NOVA_PAGINA = new Set(['signo', 'compatSignos', 'letras', 'motivacao', 'licoesCarmicas', 'cores', 'anoPessoal', 'proximosAnos', 'ciclos', 'harmoniaConjugal', 'arcanos', 'triangulos', 'compatibilidade'])

/** Documento A4 para o PDF. */
export function htmlPdf(c: Conteudo, marca: Marca = MARCA_PADRAO, opts: { piramides?: string | null; estiloCss?: string } = {}): string {
  const f = fontes(marca)
  return trocarGlifos(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(c.nome)} · ${esc(marca.nome)}</title>
${f.link}
<style>${f.css}${CSS_BASE}${opts.piramides ? PIR_CSS + '.pmod .pir{--cel:min(15px,calc(150mm / var(--n)))}.pmod .tri,.pmod .presumo,.pmod .pintro{break-inside:auto}' : ''}
${opts.estiloCss || estiloCss(null, false)}
@page{size:A4;margin:20mm 18mm 18mm 0}
@page capa{margin:0}
body{font-size:12.5px;background:#fff}
.capa{page:capa;width:210mm;height:297mm;background:radial-gradient(circle at 50% 38%,#4b1f8f 0,#1a0b3d 62%,#0d0620 100%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;break-after:page;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.capa::before{content:'';position:absolute;inset:10mm;border:1.5px solid rgba(217,180,90,.7);border-radius:6px}
.capa::after{content:'';position:absolute;inset:13mm;border:.6px solid rgba(217,180,90,.45);border-radius:4px}
.capa h1{font-size:54px;letter-spacing:.14em;margin:18px 0 4px;color:var(--ouro2)}
.capa .sub{letter-spacing:.32em;text-transform:uppercase;font-size:13px;color:#e8d9ff}
.capa .nome{position:absolute;bottom:34mm;font-size:24px;font-weight:600;letter-spacing:.04em}
.capa .data{position:absolute;bottom:26mm;font-size:13px;color:#e8d9ff;letter-spacing:.1em}
.faixa{position:fixed;left:0;top:-20mm;bottom:-18mm;width:9mm;background:linear-gradient(#4b1f8f,#2a1259);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.secao{break-before:auto;padding-left:26mm;margin-top:24px}
.secao.np{break-before:page;margin-top:0}
.secao h2{break-after:avoid}.classico{break-after:avoid}.num-linha{break-after:avoid;break-inside:avoid}.plano{break-inside:avoid}.lista{break-inside:avoid}
p{orphans:3;widows:3}
.num-linha,.lista,.resumo div{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bloco{break-inside:auto}.num-linha{break-after:avoid}.triangulo{break-inside:avoid;font-size:10.5px}
.resumo{grid-template-columns:repeat(3,1fr)}

</style></head><body>
<div class="capa">${mandala(430)}<h1>${esc(marca.nome.toUpperCase())}</h1><div class="sub">${esc(marca.subtitulo)}</div>
<div class="nome">${esc(c.nome)}</div><div class="data">${esc(c.resumo[0].valor)} · ${esc(c.signo)}</div></div>
<div class="faixa"></div>
<section class="secao" style="break-before:auto"><h2>Orientação inicial — leia com atenção</h2>${ORIENTACAO(c.nome)}</section>
<section class="secao sumario np"><h2>O que você vai encontrar neste mapa</h2><ol>${c.secoes.map(s => `<li>${esc(s.titulo)}</li>`).join('')}<li>Tabela-resumo do seu mapa</li><li>Conclusão final</li></ol></section>
<section class="secao np"><h2>Importante: como ler o seu mapa</h2>${GLOSSARIO_HTML()}</section>
<section class="secao np"><h2>Resumo do seu mapa</h2><div class="resumo">${c.resumo.map(r => `<div><small>${esc(r.rotulo)}</small><b>${esc(r.valor)}</b></div>`).join('')}</div></section>
${c.secoes.map(s => `<section class="secao${NOVA_PAGINA.has(s.id) ? ' np' : ''}"><h2>${esc(s.titulo)}</h2>${sub(s)}${intro(s.intro)}${s.blocos.map(bloco).join('')}</section>`).join('')}
${opts.piramides ? `<section class="secao np"><h2>Pirâmides do nome + resumo geral</h2>${opts.piramides}</section>` : ''}
<section class="secao np"><h2>Conclusão final</h2>${CONCLUSAO(c.nome, marca)}</section>
<section class="secao np"><h2>Tabela-resumo do seu mapa</h2>${TABELA_HTML(c)}</section>
</body></html>`)
}

/** Rodapé com número da página (usado pelo gerador de PDF). */
export const RODAPE_PDF = `<div style="width:100%;font-size:9px;color:#7b5ea7;text-align:right;padding-right:16mm;font-family:Arial"><span class="pageNumber"></span></div>`
