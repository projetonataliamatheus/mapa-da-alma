// HTML do mapa: modo "web" (link ao vivo, responsivo) e modo "pdf" (A4).
import type { Conteudo, Bloco } from './conteudo.ts'
import { ORIENTACAO_PARAGRAFOS, GLOSSARIO, AVISO_FINAL } from '../textos/biblioteca/orientacao.ts'

export interface Marca {
  nome: string            // "Mapa da Alma"
  subtitulo: string       // "Estudo Numerológico & Astrológico"
  assinatura?: string     // texto da conclusão / assinatura
  whatsapp?: string
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
    s += `<text x="${c + rr * Math.cos(a)}" y="${c + rr * Math.sin(a)}" fill="#f3dfa2" font-size="22" text-anchor="middle" dominant-baseline="central" font-family="DejaVu Sans, Segoe UI Symbol, sans-serif">${ZODIACO[i]}&#xFE0E;</text>`
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
    h += `<div class="plano"><h4>✦ O que fazer: seu plano prático</h4>${pl.intro ? `<p class="pl-intro">${par(pl.intro)}</p>` : ''}${(pl.partes || []).map(pt =>
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

const CONCLUSAO = (nome: string, marca: Marca) => `
<p>${esc(nome.split(' ')[0])}, agora você tem em mãos um retrato da sua essência: seus talentos, seus desafios, seus ciclos e a energia do momento que você está vivendo.</p>
<p>Use este estudo como um guia. Releia as partes que mais tocaram você, observe como os números aparecem no seu dia a dia e coloque em prática os conselhos que fizeram sentido. Pequenas mudanças, feitas com consciência, transformam caminhos inteiros.</p>
<p>Que este mapa ilumine as suas escolhas e te lembre sempre da força que existe dentro de você.</p>
<p class="assinatura">${esc(marca.assinatura || '')}</p>`

const CSS_BASE = `
:root{--roxo:#2a1259;--roxo2:#4b1f8f;--ouro:#c9a24a;--ouro2:#f3dfa2;--tinta:#241a33;--suave:#6b5b7e;--fundo:#fbf8ff;--borda:#e7dcf5;--neg:#d23b3b}
*{box-sizing:border-box}body{margin:0;font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;color:var(--tinta);line-height:1.65}
h1,h2,h3,.titulo-serif{font-family:Cinzel,Georgia,'Times New Roman',serif}
.secao h2{color:var(--roxo2);font-size:22px;letter-spacing:.04em;border-bottom:2px solid var(--roxo2);padding-bottom:8px;margin:0 0 12px}
.secao h2::before{content:'✦ ';color:var(--ouro)}
.intro{color:#3d2f55;background:#fbf8ff;border-left:3px solid var(--ouro);padding:4px 14px;border-radius:6px;margin:8px 0 12px}.intro p{margin:8px 0}
.classico{margin:-8px 0 10px;font-size:12px;color:var(--suave);text-transform:uppercase;letter-spacing:.08em}
.bloco{margin:18px 0 8px}
.num-linha{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(90deg,#f1e8ff,#fff);border-left:4px solid var(--ouro);padding:10px 14px;border-radius:8px}
.rotulo{font-weight:700;color:var(--roxo);text-transform:uppercase;font-size:13px;letter-spacing:.06em}
.numero{margin-left:auto;font-family:Cinzel,Georgia,serif;font-size:22px;color:var(--roxo2);font-weight:700}
.destaque{font-weight:600;color:var(--roxo2);margin:12px 0 4px}
.lista h4{margin:14px 0 4px;font-size:14px;text-transform:uppercase;letter-spacing:.05em}
.lista.luz h4{color:#1f8a5b}.lista.sombra h4{color:#c0392b}.lista.conselho h4{color:var(--roxo2)}
.lista ul{margin:0;padding-left:20px}
.triangulo{font-family:'DejaVu Sans Mono',Consolas,monospace;text-align:center;font-size:12px;letter-spacing:.18em;margin:12px 0;color:#5a4a72}
.triangulo .tl{white-space:nowrap}.triangulo .neg{color:var(--neg);font-weight:700}.triangulo .arc{color:#16a34a;font-weight:800}
.nota{font-size:13px;color:var(--suave);border-top:1px dashed var(--borda);padding-top:10px}
.assinatura{font-family:Cinzel,Georgia,serif;color:var(--roxo2);margin-top:28px}
.lead{font-size:18px;font-weight:600;color:var(--roxo)}
.resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:16px 0}
.resumo div{background:#fff;border:1px solid var(--borda);border-radius:10px;padding:10px 12px}
.resumo small{display:block;color:var(--suave);font-size:12px}.resumo b{color:var(--roxo2)}
.plano{margin:14px 0 6px;border:1px solid #d9c8f5;background:linear-gradient(180deg,#f7f1ff,#fff);border-radius:12px;padding:12px 16px}
.plano h4{margin:0 0 6px;color:var(--roxo2);font-size:14px;text-transform:uppercase;letter-spacing:.05em}
.plano h5{margin:10px 0 3px;font-size:13px;color:var(--roxo)}.plano ol{margin:0;padding-left:20px}.plano li{margin:2px 0}.plano p{margin:4px 0}
.pl-intro{font-weight:600}.pl-frase{font-family:Cinzel,Georgia,serif;color:var(--roxo2);text-align:center;margin-top:10px!important}
.fazer{background:#f6f0ff;border-left:4px solid var(--roxo2);padding:10px 14px;border-radius:8px}.fazer b{color:var(--roxo2)}
.glossario dt{font-weight:700;color:var(--roxo2);margin-top:10px}.glossario dd{margin:2px 0 0}
.tabela{width:100%;border-collapse:collapse;font-size:13px}.tabela th{background:var(--roxo2);color:#fff;text-align:left;padding:8px}
.tabela td{border-bottom:1px solid var(--borda);padding:7px 8px;vertical-align:top}.tabela td.v{font-weight:700;color:var(--roxo2)}.tabela td.it{font-weight:600}.tabela td.ap{color:#3f2a63;background:#fbf8ff}.tabela{table-layout:fixed}.tabela tr{break-inside:avoid}.tabela tr.grupo{break-after:avoid}
.tabela tr.grupo td{background:#f1e8ff;color:var(--roxo);font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
.sumario ol{columns:2;column-gap:28px;padding-left:20px}.sumario li{margin:4px 0;break-inside:avoid}
`

/** Página do link ao vivo (celular e computador). */
export function htmlWeb(c: Conteudo, marca: Marca = MARCA_PADRAO, opts: { pdfUrl?: string; bloqueado?: boolean; ctaUrl?: string } = {}): string {
  // na prévia: resumo + signo + 3 seções liberadas; o resto aparece desfocado com o convite para liberar
  const ABERTAS = 3
  const flutuantes = ['✦', '♈', '☾', '✧', '♌', '☉', '✶', '♎', '✦', '♓', '✧', '☽'].map((g, i) =>
    `<span class="fl" style="left:${(i * 83) % 100}%;animation-delay:${(i * 1.7) % 12}s;animation-duration:${14 + (i % 5) * 3}s;font-size:${12 + (i % 4) * 6}px">${g}&#xFE0E;</span>`).join('')
  const cta = (titulo: string) => `<div class="cta"><div class="cta-ico">🔒</div><h3>${esc(titulo)}</h3>
    <p>Este é o seu Mapa da Alma em modo prévia. A leitura completa traz todas as seções explicadas, o seu signo integrado aos números, ciclos, desafios, carmas, arcanos, os 4 triângulos do nome e a tabela-resumo final, com PDF para guardar.</p>
    ${opts.ctaUrl ? `<a class="btn btn-ouro" href="${esc(opts.ctaUrl)}">Liberar meu mapa completo ✨</a>` : '<p class="cta-wa">Para liberar o mapa completo, responda a nossa conversa no WhatsApp ✨</p>'}</div>`
  const secao = (s: Conteudo['secoes'][number], i: number) => {
    if (opts.bloqueado && i >= ABERTAS)
      return `<section class="card secao trancada" id="${s.id}"><h2>${esc(s.titulo)}</h2>${sub(s)}${intro(s.intro)}<div class="borrado" aria-hidden="true">${s.blocos.slice(0, 1).map(bloco).join('')}</div><div class="cadeado">🔒 Disponível no mapa completo</div></section>`
    return `<section class="card secao" id="${s.id}"><h2>${esc(s.titulo)}</h2>${sub(s)}${intro(s.intro)}${s.blocos.map(bloco).join('')}</section>`
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.nome)} · ${esc(marca.nome)}</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS_BASE}
body{background:var(--fundo)}
.hero{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 65%,#0d0620);color:#fff;text-align:center;padding:40px 16px 34px}
.hero::before{content:'';position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 30% 70%,#f3dfa2,transparent),radial-gradient(1.5px 1.5px at 70% 30%,#fff,transparent),radial-gradient(1px 1px at 85% 80%,#f3dfa2,transparent),radial-gradient(1px 1px at 50% 50%,#fff,transparent),radial-gradient(1.2px 1.2px at 20% 90%,#fff,transparent),radial-gradient(1px 1px at 90% 10%,#fff,transparent);background-size:300px 300px;animation:cintila 6s ease-in-out infinite alternate;opacity:.8}
@keyframes cintila{from{opacity:.45}to{opacity:.95}}
.hero svg{position:relative;width:min(260px,70vw);height:auto;animation:gira 120s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}
.hero h1,.hero .sub,.hero .nome,.hero p{position:relative}
.hero h1{margin:8px 0 0;font-size:clamp(26px,6vw,40px);letter-spacing:.12em;color:var(--ouro2);text-shadow:0 0 18px rgba(243,223,162,.45)}
.hero .sub{opacity:.85;letter-spacing:.2em;text-transform:uppercase;font-size:12px}
.hero .nome{margin-top:14px;font-size:20px;font-weight:600}
.fl{position:absolute;bottom:-30px;color:#f3dfa2;opacity:.0;animation:sobe linear infinite;pointer-events:none;font-family:'DejaVu Sans','Segoe UI Symbol',sans-serif}
@keyframes sobe{0%{transform:translateY(0) rotate(0);opacity:0}15%{opacity:.55}85%{opacity:.35}100%{transform:translateY(-520px) rotate(40deg);opacity:0}}
.selo{display:inline-block;margin-top:12px;padding:5px 12px;border-radius:999px;border:1px solid rgba(243,223,162,.6);color:#f3dfa2;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.wrap{max-width:820px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid var(--borda);border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 4px 18px rgba(42,18,89,.05)}
nav.indice{display:flex;gap:8px;overflow-x:auto;padding:8px 0;position:sticky;top:0;background:var(--fundo);z-index:2}
nav.indice a{white-space:nowrap;text-decoration:none;color:var(--roxo2);border:1px solid var(--borda);border-radius:999px;padding:6px 12px;font-size:13px;background:#fff}
.btn{display:inline-block;background:var(--roxo2);color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700}
.btn-ouro{background:linear-gradient(135deg,#f3dfa2,#c9a24a);color:#2a1259;box-shadow:0 6px 24px rgba(201,162,74,.35)}
.triangulo{font-size:11px;letter-spacing:.12em;overflow-x:auto}
.trancada{position:relative}
.borrado{filter:blur(6px);user-select:none;pointer-events:none;max-height:220px;overflow:hidden}
.cadeado{position:absolute;left:50%;top:60%;transform:translate(-50%,-50%);background:#2a1259;color:#f3dfa2;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap}
.cta{text-align:center;background:radial-gradient(circle at 50% 0,#4b1f8f,#1a0b3d);color:#fff;border-radius:18px;padding:26px 20px;margin:20px 0}
.cta h3{font-family:Cinzel,Georgia,serif;color:#f3dfa2;margin:6px 0 8px;font-size:22px}.cta p{opacity:.9}.cta-ico{font-size:30px}.cta-wa{color:#f3dfa2;font-weight:600}
@media (max-width:520px){.triangulo{font-size:8px;letter-spacing:.06em}}
@media (prefers-reduced-motion:reduce){.fl,.hero svg,.hero::before{animation:none}}
</style></head><body>
<header class="hero">${flutuantes}${mandala(420)}<h1>${esc(marca.nome.toUpperCase())}</h1><div class="sub">${esc(marca.subtitulo)}</div><div class="nome">${esc(c.nome)}</div>
${opts.bloqueado ? '<div class="selo">✦ Prévia do seu mapa ✦</div>' : ''}
${opts.pdfUrl ? `<p style="margin-top:16px"><a class="btn btn-ouro" href="${esc(opts.pdfUrl)}">Baixar em PDF</a></p>` : ''}</header>
<main class="wrap">
<nav class="indice">${c.secoes.map(s => `<a href="#${s.id}">${esc(s.titulo)}</a>`).join('')}</nav>
<section class="card"><h2 class="titulo-serif" style="color:var(--roxo2);margin-top:0">Resumo do seu mapa</h2><div class="resumo">${c.resumo.map(r => `<div><small>${esc(r.rotulo)}</small><b>${esc(r.valor)}</b></div>`).join('')}</div></section>
${opts.bloqueado ? '' : `<section class="card secao"><h2>Orientação inicial</h2>${ORIENTACAO(c.nome)}</section><section class="card secao"><h2>Importante: como ler o seu mapa</h2>${GLOSSARIO_HTML()}</section>`}
${c.secoes.map((s, i) => secao(s, i) + (opts.bloqueado && i === ABERTAS - 1 ? cta('Continue a sua leitura') : '')).join('')}
${opts.bloqueado ? cta('Libere o seu Mapa da Alma completo') : `<section class="card secao" id="tabela"><h2>Tabela-resumo do seu mapa</h2><div style="overflow-x:auto">${TABELA_HTML(c)}</div></section><section class="card secao"><h2>Conclusão</h2>${CONCLUSAO(c.nome, marca)}</section>`}
</main></body></html>`
}

/** Seções que começam em página nova no PDF (início dos grandes capítulos). */
const NOVA_PAGINA = new Set(['signo', 'compatSignos', 'letras', 'motivacao', 'licoesCarmicas', 'cores', 'anoPessoal', 'proximosAnos', 'ciclos', 'harmoniaConjugal', 'arcanos', 'triangulos', 'compatibilidade'])

/** Documento A4 para o PDF. */
export function htmlPdf(c: Conteudo, marca: Marca = MARCA_PADRAO): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(c.nome)} · ${esc(marca.nome)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS_BASE}
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
<section class="secao np"><h2>Conclusão final</h2>${CONCLUSAO(c.nome, marca)}</section>
<section class="secao np"><h2>Tabela-resumo do seu mapa</h2>${TABELA_HTML(c)}</section>
</body></html>`
}

/** Rodapé com número da página (usado pelo gerador de PDF). */
export const RODAPE_PDF = `<div style="width:100%;font-size:9px;color:#7b5ea7;text-align:right;padding-right:16mm;font-family:Arial"><span class="pageNumber"></span></div>`
