// Relatório só das PIRÂMIDES (triângulos invertidos): as 4 pirâmides desenhadas, o arcano que vibra em cada uma,
// os bloqueios explicados e um resumo geral com os pontos mais importantes do mapa. Serve no link e em PDF.
import type { Analise, TrianguloAnalise } from '../analise.ts'
import { MARCA_PADRAO, type Marca } from './html.ts'
import { ARCANOS } from '../textos/biblioteca/arcanos.ts'
import { trocarGlifos } from '../signosIcones.ts'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const limpa = (t: string) => t.replace(/\*\*/g, '')
const frase1 = (t?: string) => { const s = limpa(t || '').trim(); const m = s.match(/^.+?[.!?](\s|$)/); return (m ? m[0] : s).trim() }
const caminho = (t: string) => { const m = t.match(/O caminho é ([^.]+)\./i); return m ? m[1] : '' }

/** Área da vida que cada sequência negativa costuma pesar (visão simples para o resumo). */
const AREA_SEQ: Record<number, { area: string; temas: string[] }> = {
  1: { area: 'iniciativa e realização pessoal', temas: ['saude'] },
  2: { area: 'amor, parcerias e autoestima', temas: ['amor'] },
  3: { area: 'comunicação, imagem e vida social', temas: [] },
  4: { area: 'trabalho, esforço e dinheiro', temas: ['dinheiro', 'saude'] },
  5: { area: 'estabilidade e decisões por impulso', temas: ['dinheiro'] },
  6: { area: 'família, lar e vida afetiva', temas: ['familia', 'amor'] },
  7: { area: 'solidão, decepções e fé', temas: ['emocoes'] },
  8: { area: 'dinheiro, justiça e equilíbrio', temas: ['dinheiro'] },
  9: { area: 'perdas, finais e recomeços', temas: ['emocoes'] },
}

const PIR_ORDEM = ['vida', 'pessoal', 'social', 'destino']
const PIR_ICONE: Record<string, string> = { vida: '△', pessoal: '♡', social: '✦', destino: '☉' }
const PIR_COR: Record<string, string> = { vida: '#7a5af8', pessoal: '#d6336a', social: '#0f7a6a', destino: '#c9821a' }

function desenho(t: TrianguloAnalise) {
  const n = Math.max(t.linhas[0]?.length || 1, t.letras.length)
  const marcas = new Set(t.marcas)
  const linha = (l: (number | string)[], li: number, cls = '') => `<div class="pl${cls}">${l.map((d, i) => {
    const c = cls ? '' : marcas.has(`${li}:${i}`) ? 'neg' : li === 0 && (i === t.arcano.pos || i === t.arcano.pos + 1) ? 'arc' : ''
    return `<span${c ? ` class="${c}"` : ''}>${esc(d)}</span>`
  }).join('')}</div>`
  return `<div class="pir" style="--n:${n}">${linha(t.letras.map(x => x.l), -1, ' letras')}${t.linhas.map((l, li) => linha(l, li)).join('')}</div>`
}

export function htmlPiramides(a: Analise, marca: Marca = MARCA_PADRAO, opts: { pdfUrl?: string } = {}): string {
  const tri = PIR_ORDEM.map(id => a.triangulos.find(t => t.id === id)!).filter(Boolean)
  const nome1 = a.nome.split(' ')[0]
  const item = (id: string) => a.grupos.flatMap(g => g.subgrupos.flatMap(s => s.itens)).find(i => i.id === id)
  const txtItem = (id: string) => frase1(item(id)?.detalhe.blocos[0]?.texto?.[0])

  // ---- leitura geral das pirâmides
  const livres = tri.filter(t => !t.sequencias.length)
  const presas = tri.filter(t => t.sequencias.length)
  const contagem: Record<number, string[]> = {}
  for (const t of tri) for (const s of t.sequencias) (contagem[s.digito] ||= []).push(t.nome)
  const repetidos = Object.entries(contagem).filter(([, v]) => v.length > 1)
  const temas: Record<string, string[]> = { dinheiro: [], amor: [], familia: [], saude: [], emocoes: [] }
  for (const d of Object.keys(contagem).map(Number)) for (const tm of AREA_SEQ[d]?.temas || []) temas[tm].push(String(d).repeat(3))
  const vida = tri[0]
  const arcVida = ARCANOS[vida.arcano.base]

  const TEMA_TXT: Record<string, { titulo: string; ico: string; com: (c: string) => string; sem: string }> = {
    dinheiro: { titulo: 'Dinheiro e trabalho', ico: '◈', com: c => `As sequências ${c} mostram que o dinheiro tende a pedir mais esforço do que deveria: entra, mas escapa; o trabalho cansa e nem sempre é reconhecido. Não é castigo, é aprendizado: organizar as contas, não decidir no impulso e cobrar o valor justo pelo que você faz destrava muito.`, sem: 'Nenhuma pirâmide trava diretamente o dinheiro. Quando ele falta, a causa costuma estar em escolhas e hábitos que podem ser ajustados, e não em um bloqueio do nome: é uma área com caminho livre para crescer.' },
    amor: { titulo: 'Amor e relacionamentos', ico: '♡', com: c => `As sequências ${c} apontam que o amor é onde você mais sente: entrega demais, espera demais ou repete o mesmo tipo de relação. A virada vem quando você se coloca em primeiro lugar sem culpa e escolhe quem caminha no mesmo ritmo que você.`, sem: 'O amor não aparece bloqueado nas pirâmides. As dificuldades afetivas, quando surgem, vêm mais do momento e das escolhas do que do nome: há abertura real para viver uma relação leve e recíproca.' },
    familia: { titulo: 'Família e lar', ico: '⌂', com: c => `A sequência ${c} mostra peso na família: cobranças, responsabilidades que caem no seu colo e a sensação de carregar todo mundo. Cuidar é bonito, mas você não precisa se anular: diálogo e limites com carinho mudam o clima da casa.`, sem: 'A família não aparece como bloqueio nas pirâmides: os conflitos de casa tendem a ser passageiros e se resolvem com conversa franca.' },
    saude: { titulo: 'Energia e bem-estar', ico: '✚', com: c => `As sequências ${c} pedem atenção ao corpo e ao cansaço: é o tipo de energia que segura tudo até o corpo reclamar. Descanso, rotina e check-ups em dia são parte do seu caminho (o mapa não substitui o médico, mas aponta onde cuidar com mais carinho).`, sem: 'Nenhuma pirâmide pesa diretamente sobre a sua energia física. Mesmo assim, sono, alimentação e pausas são o combustível que mantém o resto da vida funcionando.' },
    emocoes: { titulo: 'Emoções e fé', ico: '☾', com: c => `As sequências ${c} mostram momentos de solidão, decepção ou finais que doem. Eles passam: cada encerramento abre espaço para algo mais alinhado com você. Fé, apoio de pessoas de confiança e paciência consigo mesmo(a) são o remédio.`, sem: 'As emoções fluem sem bloqueio forte nas pirâmides: você tem capacidade natural de se recuperar das quedas.' },
  }

  const listaSeq = (v: string[]) => v.length > 1 ? v.slice(0, -1).join(', ') + ' e ' + v[v.length - 1] : v[0]

  const resumoTemas = Object.entries(TEMA_TXT).map(([k, t]) => {
    const c = [...new Set(temas[k])]
    return `<div class="tema ${c.length ? 'atencao' : 'livre'}"><h4><span>${t.ico}</span>${t.titulo}<em>${c.length ? 'pede atenção' : 'caminho livre'}</em></h4><p>${esc(c.length ? t.com(listaSeq(c)) : t.sem)}</p></div>`
  }).join('')

  const pontos: [string, string, string][] = []
  const add = (id: string, titulo: string) => { const it = item(id); if (it) pontos.push([titulo, it.valor, txtItem(id)]) }
  add('des', 'Caminho de Vida'); add('mis', 'Propósito da Alma'); add('mot', 'Desejo da Alma'); add('exp', 'Talentos Naturais'); add('ano', 'Energia do Ano')
  const lic = item('lic'), div = item('div')
  if (lic && lic.valor !== '—') pontos.push(['Aprendizados da Alma', lic.valor, 'Números que faltam no seu nome: são as lições que a vida vai repetir até você dominar. Quanto antes você trabalhar essas qualidades, mais leve fica o caminho.'])
  if (div && div.valor !== '—') pontos.push(['Padrões a Curar', div.valor, 'Padrões antigos que pedem atenção: costumam aparecer como situações que se repetem. Reconhecer o padrão já é metade da cura.'])

  const passos = [...arcVida.fazer.slice(0, 2), ...presas.slice(0, 2).map(t => { const c = caminho(t.sequencias[0].texto); return c ? `Na ${t.nome.toLowerCase()}: ${c}.` : '' }).filter(Boolean)]
  if (passos.length < 3) passos.push(arcVida.fazer[2] || 'Releia este relatório daqui a 30 dias e veja o que já mudou.')

  const secao = (t: TrianguloAnalise) => `<section class="tri" style="--c:${PIR_COR[t.id]}">
<div class="tri-h"><span class="tri-i">${PIR_ICONE[t.id]}</span><div><h2>${esc(t.nome)}</h2><p>${esc(t.sobre)}</p></div></div>
${desenho(t)}
<div class="leg"><span class="arc">■</span> arcano que vibra agora <span class="neg">■</span> bloqueio (três números iguais seguidos)</div>
<div class="arcano"><h3><b>${t.arcano.numero}${t.arcano.numero !== t.arcano.base ? ` → ${t.arcano.base}` : ''}</b> ${esc(t.arcano.nome)}</h3><p>${esc(t.arcano.texto)}</p><p>${esc(t.arcano.periodo)}</p></div>
${t.sequencias.length ? t.sequencias.map(s => `<div class="bloq"><h4>Bloqueio ${esc(s.codigo)}</h4><p>${esc(limpa(s.texto))}</p></div>`).join('') : '<div class="flui"><h4>Energia livre</h4><p>Nenhum bloqueio nesta pirâmide: esta área da sua vida flui bem quando você age com consciência.</p></div>'}
</section>`

  return trocarGlifos(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pirâmides · ${esc(a.nome)}</title><meta name="robots" content="noindex">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:12mm}
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#241a33;background:#fbf8ff;line-height:1.6;font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:860px;margin:0 auto;padding:16px}
header{background:radial-gradient(circle at 20% 0,#5b2bb0,#1a0b3d 70%);color:#fff;border-radius:18px;padding:22px 20px;text-align:center}
header h1{margin:0;font-family:Cinzel,Georgia,serif;font-size:24px;color:#f3dfa2;letter-spacing:.1em}
header .n{font-size:19px;font-weight:700;margin-top:8px}header .d{font-size:13px;opacity:.85}
h2,h3{font-family:Cinzel,Georgia,serif}
.intro,.tri,.resumo{background:#fff;border:1px solid #e7dcf5;border-radius:16px;padding:18px;margin-top:14px;break-inside:avoid}
.intro p{margin:6px 0}
.tri{border-top:5px solid var(--c)}
.tri-h{display:flex;gap:12px;align-items:center}.tri-h h2{margin:0;color:var(--c);font-size:20px}.tri-h p{margin:2px 0 0;color:#6b5b7e;font-size:13.5px}
.tri-i{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;font-size:22px;color:#fff;background:var(--c)}
.pir{--cel:min(18px,calc((100vw - 64px) / var(--n)));margin:14px 0 6px;font-family:ui-monospace,Consolas,monospace;overflow-x:auto}
.pl{display:flex;justify-content:center}.pl span{width:var(--cel);flex:none;text-align:center;font-size:calc(var(--cel) * .72);line-height:1.5;color:#5a4a72}
.pl.letras span{color:#16a34a;font-weight:700}
.pl span.neg,.leg .neg{color:#dc2626;font-weight:800}.pl span.arc,.leg .arc{color:#16a34a;font-weight:800}
.pl span.neg{background:#ffe9e9;border-radius:3px}.pl span.arc{background:#e3f8ec;border-radius:3px}
.leg{text-align:center;font-size:12px;color:#6b5b7e}
.arcano{background:linear-gradient(135deg,#ecfbf3,#fff);border:1.5px solid #9fdcbc;border-radius:12px;padding:10px 14px;margin-top:12px}
.arcano h3{margin:0 0 4px;color:#15803d;font-size:16px}.arcano h3 b{background:#16a34a;color:#fff;border-radius:8px;padding:1px 8px;margin-right:6px;font-family:Inter,Arial}
.arcano p,.bloq p,.flui p{margin:6px 0}
.bloq{background:#fff0f0;border:1.5px solid #f3b3b3;border-radius:12px;padding:10px 14px;margin-top:10px}.bloq h4{margin:0;color:#c0262d}
.flui{background:#ecfbf3;border:1.5px solid #9fdcbc;border-radius:12px;padding:10px 14px;margin-top:10px}.flui h4{margin:0;color:#15803d}
.resumo h2{margin:0 0 6px;color:#4b1f8f}
.res-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0}
.res-top div{background:#f6f0ff;border-radius:12px;padding:10px;text-align:center}.res-top b{display:block;font-size:22px;color:#4b1f8f}.res-top small{color:#6b5b7e}
.temas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px}
.tema{border-radius:12px;padding:10px 14px;border:1.5px solid;break-inside:avoid}
.tema h4{margin:0 0 4px;display:flex;align-items:center;gap:8px;font-size:14.5px}.tema h4 span{font-size:18px}.tema h4 em{margin-left:auto;font-style:normal;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:999px}
.tema p{margin:0;font-size:14px}
.tema.livre{background:#ecfbf3;border-color:#9fdcbc}.tema.livre h4{color:#15803d}.tema.livre em{background:#16a34a;color:#fff}
.tema.atencao{background:#fff0f0;border-color:#f3b3b3}.tema.atencao h4{color:#c0262d}.tema.atencao em{background:#dc2626;color:#fff}
.pontos{display:grid;gap:8px;margin-top:10px}
.ponto{display:flex;gap:12px;align-items:flex-start;border:1px solid #e7dcf5;border-radius:12px;padding:10px 12px}
.ponto b.v{flex:none;min-width:46px;height:40px;padding:0 6px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#7a5af8,#4b1f8f);font-size:14px}
.ponto h4{margin:0;color:#4b1f8f;font-size:14px}.ponto p{margin:2px 0 0;font-size:14px}
.passos{background:linear-gradient(135deg,#f1e8ff,#faf7ff 50%,#e3f8ec);border:2px solid #b89cf0;border-radius:14px;padding:12px 16px;margin-top:12px}
.passos h3{margin:0 0 6px;color:#4b1f8f;font-size:16px}.passos ol{margin:0;padding-left:20px}.passos li{margin:4px 0}
.alerta{margin-top:10px;font-size:14px;background:#fff8e6;border:1.5px solid #f0d58c;border-radius:12px;padding:10px 14px}
.bt-pdf{display:inline-block;margin-top:12px;background:linear-gradient(135deg,#f3dfa2,#c9a24a);color:#2a1259;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:12px;animation:pulsa 2.2s ease-in-out infinite}
@keyframes pulsa{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(201,162,74,.55)}50%{transform:scale(1.04);box-shadow:0 0 0 10px rgba(201,162,74,0)}}
footer{text-align:center;font-size:12px;color:#8a7aa0;margin:16px 0 6px}
@media print{body{font-size:12.5px}.wrap{padding:0}.pir{--cel:min(16px,calc(170mm / var(--n)))}}
</style></head><body><div class="wrap">
<header><h1>${esc(marca.nome.toUpperCase())}</h1><div class="d">As 4 pirâmides do nome + resumo geral</div><div class="n">${esc(a.nome)}</div><div class="d">${esc(a.nascimentoTxt)} · ${esc(a.signo)}</div>${opts.pdfUrl ? `<a class="bt-pdf" href="${esc(opts.pdfUrl)}">⤓ Baixar em PDF</a>` : ''}</header>
<section class="intro"><h2 style="margin:0 0 4px;color:#4b1f8f">O que são as pirâmides do nome</h2>
<p>${esc(nome1)}, cada letra do seu nome tem um número. Somando os números vizinhos, linha por linha, forma-se uma pirâmide de cabeça para baixo. Ela mostra como a energia do seu nome corre pelas áreas da vida.</p>
<p>São quatro pirâmides: a <b>da Vida</b> (o geral), a <b>Pessoal</b> (o seu mundo íntimo), a <b>Social</b> (você com os outros) e a <b>do Destino</b> (as grandes escolhas). Em cada uma, o número em <b style="color:#16a34a">verde</b> é o arcano que vibra no seu momento atual e os números em <b style="color:#dc2626">vermelho</b> são bloqueios: três números iguais seguidos, que pedem atenção naquela área.</p></section>
${tri.map(secao).join('')}
<section class="resumo"><h2>Resumo geral</h2>
<div class="res-top"><div><b>${livres.length}</b><small>pirâmide(s) com energia livre</small></div><div><b>${presas.length}</b><small>pirâmide(s) com bloqueio</small></div><div><b>${a.arcano.atual}º</b><small>arcano atual (${esc(a.arcano.inicio)} – ${esc(a.arcano.fim)})</small></div><div><b>${vida.arcano.base}</b><small>${esc(vida.arcano.nome)} vibrando agora</small></div></div>
<p><b>Energia do momento:</b> ${esc(arcVida.periodo)}</p>
${repetidos.length ? `<div class="alerta"><b>Bloqueio que se repete:</b> ${repetidos.map(([d, v]) => `a sequência ${String(d).repeat(3)} aparece em ${v.length} pirâmides (${esc(v.join(', '))}), na área de ${esc(AREA_SEQ[+d]?.area || '')}`).join('; ')}. Quando um bloqueio aparece em mais de uma pirâmide, ele é o ponto principal a trabalhar: é ali que a vida vai insistir.</div>` : ''}
<div class="temas">${resumoTemas}</div>
<h3 style="margin:16px 0 0;color:#4b1f8f;font-size:16px">Pontos importantes do seu mapa</h3>
<div class="pontos">${pontos.map(([t, v, x]) => `<div class="ponto"><b class="v">${esc(v)}</b><div><h4>${esc(t)}</h4><p>${esc(x)}</p></div></div>`).join('')}</div>
<div class="passos"><h3>✦ O que fazer agora</h3><ol>${passos.slice(0, 4).map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
</section>
<footer>As explicações completas de cada número estão no seu Mapa da Alma. ${esc(marca.assinatura || '')}</footer>
</div></body></html>`)
}
