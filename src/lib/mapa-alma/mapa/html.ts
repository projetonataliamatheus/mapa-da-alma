// HTML do mapa: modo "web" (link ao vivo, responsivo) e modo "pdf" (A4).
import type { Conteudo, Bloco } from './conteudo.ts'

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

function bloco(b: Bloco): string {
  let h = '<div class="bloco">'
  if (b.rotulo || b.numero) h += `<div class="num-linha">${b.rotulo ? `<span class="rotulo">${esc(b.rotulo)}</span>` : ''}${b.numero ? `<span class="numero">${esc(b.numero)}</span>` : ''}</div>`
  if (b.destaque) h += `<p class="destaque">${esc(b.destaque)}</p>`
  for (const p of b.texto || []) h += `<p>${esc(p)}</p>`
  if (b.triangulo) {
    const marcas = new Set(b.triangulo.marcas)
    h += '<div class="triangulo">' + b.triangulo.linhas.map((l, li) =>
      `<div class="tl">${l.map((d, i) => `<span${marcas.has(`${li}:${i}`) ? ' class="neg"' : ''}>${d}</span>`).join('')}</div>`).join('') + '</div>'
  }
  const lista = (titulo: string, cls: string, it?: string[]) => it?.length ? `<div class="lista ${cls}"><h4>${titulo}</h4><ul>${it.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''
  h += lista('Pontos positivos', 'luz', b.luz) + lista('Pontos de atenção', 'sombra', b.sombra) + lista('O que você deve fazer', 'conselho', b.conselho)
  return h + '</div>'
}

const ORIENTACAO = (nome: string) => `
<p class="lead">Olá, ${esc(nome.split(' ')[0])}! Seja muito bem-vindo(a) ao seu estudo personalizado.</p>
<p>Este mapa foi calculado a partir do seu nome completo de nascimento e da sua data de nascimento. Cada letra e cada número carregam uma vibração, e juntos eles formam um retrato único de quem você é, do que veio aprender e dos caminhos que se abrem à sua frente.</p>
<p><strong>Leia com calma e sem pressa.</strong> Pense neste estudo como um manual de instruções feito só para você: volte a ele sempre que precisar de orientação.</p>
<p>Algumas coisas podem parecer não fazer sentido agora. Lembre-se de que o mapa fala da sua vida inteira: há traços que já se manifestaram, outros que estão acontecendo e alguns que ainda vão despertar.</p>
<p>Você também vai encontrar pontos de atenção. Eles não são sentenças: são convites ao crescimento. Conhecer as próprias sombras é o primeiro passo para transformá-las em força.</p>
<p class="nota">A numerologia e a astrologia são ferramentas de autoconhecimento. Elas não substituem orientação médica, psicológica, jurídica ou financeira.</p>`

const CONCLUSAO = (nome: string, marca: Marca) => `
<p>${esc(nome.split(' ')[0])}, agora você tem em mãos um retrato da sua essência: seus talentos, seus desafios, seus ciclos e a energia do momento que você está vivendo.</p>
<p>Use este estudo como um guia. Releia as partes que mais tocaram você, observe como os números aparecem no seu dia a dia e coloque em prática os conselhos que fizeram sentido. Pequenas mudanças, feitas com consciência, transformam caminhos inteiros.</p>
<p>Que este mapa ilumine as suas escolhas e te lembre sempre da força que existe dentro de você.</p>
<p class="assinatura">${esc(marca.assinatura || '')}</p>`

const CSS_BASE = `
:root{--roxo:#2a1259;--roxo2:#4b1f8f;--ouro:#c9a24a;--ouro2:#f3dfa2;--tinta:#241a33;--suave:#6b5b7e;--fundo:#fbf8ff;--borda:#e7dcf5;--neg:#d23b3b}
*{box-sizing:border-box}body{margin:0;font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;color:var(--tinta);line-height:1.65}
h1,h2,h3,.titulo-serif{font-family:Cinzel,Georgia,'Times New Roman',serif}
.secao h2{color:var(--roxo2);font-size:22px;letter-spacing:.04em;border-bottom:2px solid var(--roxo2);padding-bottom:8px;margin:0 0 14px}
.secao h2::before{content:'✦ ';color:var(--ouro)}
.intro{color:var(--suave);font-style:italic}
.bloco{margin:18px 0 8px}
.num-linha{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(90deg,#f1e8ff,#fff);border-left:4px solid var(--ouro);padding:10px 14px;border-radius:8px}
.rotulo{font-weight:700;color:var(--roxo);text-transform:uppercase;font-size:13px;letter-spacing:.06em}
.numero{margin-left:auto;font-family:Cinzel,Georgia,serif;font-size:22px;color:var(--roxo2);font-weight:700}
.destaque{font-weight:600;color:var(--roxo2);margin:12px 0 4px}
.lista h4{margin:14px 0 4px;font-size:14px;text-transform:uppercase;letter-spacing:.05em}
.lista.luz h4{color:#1f8a5b}.lista.sombra h4{color:#c0392b}.lista.conselho h4{color:var(--roxo2)}
.lista ul{margin:0;padding-left:20px}
.triangulo{font-family:'DejaVu Sans Mono',Consolas,monospace;text-align:center;font-size:12px;letter-spacing:.18em;margin:12px 0;color:#5a4a72}
.triangulo .tl{white-space:nowrap}.triangulo .neg{color:var(--neg);font-weight:700}
.nota{font-size:13px;color:var(--suave);border-top:1px dashed var(--borda);padding-top:10px}
.assinatura{font-family:Cinzel,Georgia,serif;color:var(--roxo2);margin-top:28px}
.lead{font-size:18px;font-weight:600;color:var(--roxo)}
.resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:16px 0}
.resumo div{background:#fff;border:1px solid var(--borda);border-radius:10px;padding:10px 12px}
.resumo small{display:block;color:var(--suave);font-size:12px}.resumo b{color:var(--roxo2)}
`

/** Página do link ao vivo (celular e computador). */
export function htmlWeb(c: Conteudo, marca: Marca = MARCA_PADRAO, opts: { pdfUrl?: string } = {}): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.nome)} · ${esc(marca.nome)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS_BASE}
body{background:var(--fundo)}
.hero{background:radial-gradient(circle at 50% 20%,#4b1f8f,#1a0b3d 70%);color:#fff;text-align:center;padding:36px 16px 28px}
.hero svg{width:min(260px,70vw);height:auto}
.hero h1{margin:8px 0 0;font-size:clamp(26px,6vw,40px);letter-spacing:.12em;color:var(--ouro2)}
.hero .sub{opacity:.85;letter-spacing:.2em;text-transform:uppercase;font-size:12px}
.hero .nome{margin-top:14px;font-size:20px;font-weight:600}
.wrap{max-width:820px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid var(--borda);border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 4px 18px rgba(42,18,89,.05)}
nav.indice{display:flex;gap:8px;overflow-x:auto;padding:8px 0;position:sticky;top:0;background:var(--fundo);z-index:2}
nav.indice a{white-space:nowrap;text-decoration:none;color:var(--roxo2);border:1px solid var(--borda);border-radius:999px;padding:6px 12px;font-size:13px;background:#fff}
.btn{display:inline-block;background:var(--roxo2);color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600}
.triangulo{font-size:11px;letter-spacing:.12em;overflow-x:auto}
@media (max-width:520px){.triangulo{font-size:8px;letter-spacing:.06em}}
</style></head><body>
<header class="hero">${mandala(420)}<h1>${esc(marca.nome.toUpperCase())}</h1><div class="sub">${esc(marca.subtitulo)}</div><div class="nome">${esc(c.nome)}</div>
${opts.pdfUrl ? `<p style="margin-top:16px"><a class="btn" style="background:var(--ouro);color:#2a1259" href="${esc(opts.pdfUrl)}">Baixar em PDF</a></p>` : ''}</header>
<main class="wrap">
<nav class="indice">${c.secoes.map(s => `<a href="#${s.id}">${esc(s.titulo)}</a>`).join('')}</nav>
<section class="card"><h2 class="titulo-serif" style="color:var(--roxo2);margin-top:0">Resumo do seu mapa</h2><div class="resumo">${c.resumo.map(r => `<div><small>${esc(r.rotulo)}</small><b>${esc(r.valor)}</b></div>`).join('')}</div></section>
<section class="card secao"><h2>Orientação inicial</h2>${ORIENTACAO(c.nome)}</section>
${c.secoes.map(s => `<section class="card secao" id="${s.id}"><h2>${esc(s.titulo)}</h2><p class="intro">${esc(s.intro)}</p>${s.blocos.map(bloco).join('')}</section>`).join('')}
<section class="card secao"><h2>Conclusão</h2>${CONCLUSAO(c.nome, marca)}</section>
</main></body></html>`
}

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
.secao{break-before:page;padding-left:26mm}
.secao.cont{break-before:auto}
.num-linha,.lista,.resumo div{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bloco{break-inside:auto}.num-linha{break-after:avoid}.triangulo{break-inside:avoid;font-size:10.5px}
.resumo{grid-template-columns:repeat(3,1fr)}
</style></head><body>
<div class="capa">${mandala(430)}<h1>${esc(marca.nome.toUpperCase())}</h1><div class="sub">${esc(marca.subtitulo)}</div>
<div class="nome">${esc(c.nome)}</div><div class="data">${esc(c.resumo[0].valor)} · ${esc(c.signo)}</div></div>
<div class="faixa"></div>
<section class="secao" style="break-before:auto"><h2>Orientação inicial — leia com atenção</h2>${ORIENTACAO(c.nome)}</section>
<section class="secao"><h2>Resumo do seu mapa</h2><div class="resumo">${c.resumo.map(r => `<div><small>${esc(r.rotulo)}</small><b>${esc(r.valor)}</b></div>`).join('')}</div></section>
${c.secoes.map(s => `<section class="secao"><h2>${esc(s.titulo)}</h2><p class="intro">${esc(s.intro)}</p>${s.blocos.map(bloco).join('')}</section>`).join('')}
<section class="secao"><h2>Conclusão final</h2>${CONCLUSAO(c.nome, marca)}</section>
</body></html>`
}

/** Rodapé com número da página (usado pelo gerador de PDF). */
export const RODAPE_PDF = `<div style="width:100%;font-size:9px;color:#7b5ea7;text-align:right;padding-right:16mm;font-family:Arial"><span class="pageNumber"></span></div>`
