// Estilo dos cards do mapa (Master escolhe em Gerador de mapas › Aparência): efeito, cores, moldura, largura, ícone e texto
// de cada tipo de card. Gera o CSS que vai no link publicado (com animação) e no PDF (sem animação).

export type CardId = 'fazer' | 'plano' | 'luz' | 'sombra' | 'conselho'
export interface EstiloCard {
  efeito: string; duracao: number                 // efeito (EFEITOS) e velocidade em segundos
  cor1: string; cor2: string                       // moldura (gradiente da borda / brilho)
  fundo1: string; fundo2: string                   // fundo (gradiente)
  texto: string                                    // cor do texto
  borda: number; raio: number; largura: number     // espessura da moldura (px), cantos (px), largura do card (%)
  icone: string; tamanho: number; negrito: boolean; alinhamento: 'left' | 'center' | 'justify'
}
export interface EstiloMapa { cards: Record<CardId, EstiloCard> }

export const NOMES_CARD: Record<CardId, string> = {
  fazer: '"O que fazer" (dentro do texto)', plano: 'Plano prático (O que fazer)', luz: 'Pontos positivos', sombra: 'Pontos de atenção (negativos)', conselho: 'O que você deve fazer (lista)',
}

const base = (o: Partial<EstiloCard>): EstiloCard => ({ efeito: 'nenhum', duracao: 3, cor1: '#7c3aed', cor2: '#10b981', fundo1: '#f1e8ff', fundo2: '#e3f8ec', texto: '#2a1f3d', borda: 2, raio: 14, largura: 100, icone: '✦', tamanho: 100, negrito: false, alinhamento: 'left', ...o })

export const ESTILO_PADRAO: EstiloMapa = {
  cards: {
    fazer: base({ efeito: 'pulsar', duracao: 3 }),
    plano: base({ efeito: 'pulsar', duracao: 3.4 }),
    luz: base({ cor1: '#86d9b0', cor2: '#16a34a', fundo1: '#ecfbf3', fundo2: '#ecfbf3', texto: '#1d3a2a', borda: 1.5, icone: '✓' }),
    sombra: base({ cor1: '#f3b3b3', cor2: '#dc2626', fundo1: '#fff0f0', fundo2: '#fff0f0', texto: '#4a1d1d', borda: 1.5, icone: '!' }),
    conselho: base({ efeito: 'respirar', icone: '✦' }),
  },
}

/** Os 20 efeitos. {S} = seletor do card; {D} = duração; {A}/{B} = cores da moldura. */
export const EFEITOS: { id: string; nome: string; css: string }[] = [
  { id: 'nenhum', nome: 'Sem efeito (parado)', css: '' },
  { id: 'pulsar', nome: 'Pulsar suave', css: '{S}{animation:mfPulsar {D} ease-in-out infinite}@keyframes mfPulsar{0%,100%{transform:scale(1);box-shadow:0 0 0 0 {A}55}50%{transform:scale(1.012);box-shadow:0 0 0 8px {A}00,0 6px 22px {B}33}}' },
  { id: 'respirar', nome: 'Respirar (brilho que vai e volta)', css: '{S}{animation:mfResp {D} ease-in-out infinite}@keyframes mfResp{0%,100%{box-shadow:0 0 0 {A}00}50%{box-shadow:0 0 18px {A}55,0 0 30px {B}33}}' },
  { id: 'borda-viva', nome: 'Borda viva (gradiente girando)', css: '@property --mfAng{syntax:"<angle>";inherits:false;initial-value:0deg}{S}{border-color:transparent!important;background:linear-gradient(135deg,var(--f1),var(--f2)) padding-box,conic-gradient(from var(--mfAng),{A},{B},{A}) border-box!important;animation:mfGira {D} linear infinite}@keyframes mfGira{to{--mfAng:360deg}}' },
  { id: 'aura', nome: 'Aura de duas cores', css: '{S}{animation:mfAura {D} ease-in-out infinite}@keyframes mfAura{0%,100%{box-shadow:0 0 16px {A}66}50%{box-shadow:0 0 16px {B}66}}' },
  { id: 'onda', nome: 'Onda (anel que se expande)', css: '{S}{position:relative}{S}::after{content:"";position:absolute;inset:-2px;border-radius:inherit;border:2px solid {A};animation:mfOnda {D} ease-out infinite;pointer-events:none}@keyframes mfOnda{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}' },
  { id: 'flutuar', nome: 'Flutuar', css: '{S}{animation:mfFlut {D} ease-in-out infinite}@keyframes mfFlut{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px);box-shadow:0 10px 22px {A}33}}' },
  { id: 'batimento', nome: 'Batimento de coração', css: '{S}{animation:mfBat {D} ease-in-out infinite}@keyframes mfBat{0%,40%,100%{transform:scale(1)}10%,30%{transform:scale(1.012)}20%{transform:scale(1.004)}}' },
  { id: 'brilho-passando', nome: 'Brilho passando (reflexo)', css: '{S}{position:relative;overflow:hidden}{S}::before{content:"";position:absolute;top:0;bottom:0;width:40%;left:-60%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent);animation:mfReflexo {D} ease-in-out infinite;pointer-events:none}@keyframes mfReflexo{0%{left:-60%}60%,100%{left:130%}}' },
  { id: 'neon', nome: 'Neon', css: '{S}{animation:mfNeon {D} ease-in-out infinite alternate}@keyframes mfNeon{from{box-shadow:0 0 4px {A}88,inset 0 0 4px {A}44}to{box-shadow:0 0 14px {A},0 0 28px {B}88,inset 0 0 10px {A}55}}' },
  { id: 'gradiente-vivo', nome: 'Fundo com gradiente em movimento', css: '{S}{background:linear-gradient(120deg,var(--f1),var(--f2),var(--f1))!important;background-size:240% 240%!important;animation:mfFundo {D} ease-in-out infinite}@keyframes mfFundo{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}' },
  { id: 'tracejado', nome: 'Contorno tracejado pulsando', css: '{S}{outline:2px dashed {A};outline-offset:3px;animation:mfTrac {D} ease-in-out infinite}@keyframes mfTrac{0%,100%{outline-offset:3px;outline-color:{A}}50%{outline-offset:6px;outline-color:{B}}}' },
  { id: 'chamar', nome: 'Chamar atenção (balanço leve)', css: '{S}{animation:mfBal {D} ease-in-out infinite;transform-origin:center}@keyframes mfBal{0%,88%,100%{transform:rotate(0)}91%{transform:rotate(-.6deg)}94%{transform:rotate(.6deg)}97%{transform:rotate(-.3deg)}}' },
  { id: 'surgir', nome: 'Surgir ao rolar a página', css: '{S}{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}{S}.mf-vis{opacity:1;transform:none}' },
  { id: 'deslizar', nome: 'Deslizar da esquerda ao rolar', css: '{S}{opacity:0;transform:translateX(-26px);transition:opacity .7s ease,transform .7s ease}{S}.mf-vis{opacity:1;transform:none}' },
  { id: 'virar', nome: 'Virar como carta ao rolar', css: '{S}{opacity:0;transform:perspective(700px) rotateX(35deg);transform-origin:top;transition:opacity .8s ease,transform .8s ease}{S}.mf-vis{opacity:1;transform:none}' },
  { id: 'estrelas', nome: 'Estrelinhas piscando no canto', css: '{S}{position:relative}{S}::after{content:"✦ ✧";position:absolute;top:-10px;right:10px;color:{A};font-size:14px;letter-spacing:4px;animation:mfEstr {D} ease-in-out infinite;pointer-events:none}@keyframes mfEstr{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}' },
  { id: 'sombra-dupla', nome: 'Sombra dupla colorida', css: '{S}{animation:mfSomb {D} ease-in-out infinite}@keyframes mfSomb{0%,100%{box-shadow:-4px -4px 0 {A}33,4px 4px 0 {B}33}50%{box-shadow:-7px -7px 0 {A}44,7px 7px 0 {B}44}}' },
  { id: 'anel-duplo', nome: 'Anel duplo pulsando', css: '{S}{animation:mfAnel {D} ease-in-out infinite}@keyframes mfAnel{0%,100%{box-shadow:0 0 0 2px {A}55,0 0 0 5px {B}22}50%{box-shadow:0 0 0 4px {A}77,0 0 0 9px {B}33}}' },
  { id: 'mistico', nome: 'Místico (cores mudando)', css: '{S}{animation:mfMist {D} linear infinite}@keyframes mfMist{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}' },
]

const SEL: Record<CardId, string> = { fazer: '.fazer', plano: '.plano', luz: '.lista.luz', sombra: '.lista.sombra', conselho: '.lista.conselho' }

/** Junta o estilo salvo com o padrão (o que não foi salvo fica no padrão). */
export function estiloCompleto(e?: Partial<EstiloMapa> | null): EstiloMapa {
  const cards = {} as Record<CardId, EstiloCard>
  for (const k of Object.keys(ESTILO_PADRAO.cards) as CardId[]) cards[k] = { ...ESTILO_PADRAO.cards[k], ...((e?.cards as any)?.[k] || {}) }
  return { cards }
}

const cssStr = (v: string) => JSON.stringify(String(v || '').slice(0, 4))

/** CSS dos cards. animar=false no PDF. */
export function estiloCss(e0?: Partial<EstiloMapa> | null, animar = true): string {
  const e = estiloCompleto(e0)
  let css = ''
  const usados = new Set<string>()
  for (const k of Object.keys(e.cards) as CardId[]) {
    const c = e.cards[k], s = SEL[k]
    const al = c.alinhamento === 'center' ? 'center' : c.alinhamento === 'justify' ? 'justify' : 'left'
    css += `${s}{--f1:${c.fundo1};--f2:${c.fundo2};background:linear-gradient(135deg,${c.fundo1},${c.fundo2})!important;border:${Math.max(0, Math.min(8, c.borda))}px solid ${c.cor1}!important;border-radius:${Math.max(0, Math.min(40, c.raio))}px!important;color:${c.texto};width:${Math.max(50, Math.min(100, c.largura))}%;margin-left:auto;margin-right:auto;text-align:${al};font-size:${Math.max(70, Math.min(160, c.tamanho)) / 100}em;font-weight:${c.negrito ? 700 : 'inherit'};animation:none}`
    if (k === 'luz' || k === 'sombra' || k === 'conselho') css += `${s} h4{color:${c.cor2}!important;justify-content:${al === 'center' ? 'center' : 'flex-start'}}${s} h4::before{content:${cssStr(c.icone)}!important;background:${c.cor2}!important}${s} li::marker{color:${c.cor2}}${s} ul{${al === 'center' ? 'list-style-position:inside;padding-left:0' : ''}}`
    if (k === 'plano') css += `${s} h4,.plano .pl-frase{background:linear-gradient(90deg,${c.cor1},${c.cor2});-webkit-background-clip:text;background-clip:text;color:transparent}${s} h4::before{content:${cssStr(c.icone + ' ')}}`
    if (k === 'fazer') css += `${s} b{background:linear-gradient(90deg,${c.cor1},${c.cor2});-webkit-background-clip:text;background-clip:text;color:transparent}${s} b::before{content:${cssStr(c.icone + ' ')}}`
    if (!animar) continue
    const ef = EFEITOS.find(x => x.id === c.efeito)
    if (!ef || !ef.css) continue
    // cada card ganha nomes de animação próprios (o mesmo efeito com cores diferentes em cards diferentes)
    let t = ef.css.replace(/\{S\}/g, s).replace(/\{D\}/g, `${Math.max(0.6, Math.min(12, c.duracao))}s`).replace(/\{A\}/g, c.cor1.slice(0, 7)).replace(/\{B\}/g, c.cor2.slice(0, 7))
    t = t.replace(/mf(?!Ang)([A-Z][a-z]+)/g, `mf$1${k}`)
    if (t.includes('@property')) { if (usados.has('prop')) t = t.replace(/@property[^}]+\}/, ''); usados.add('prop') }
    css += t
  }
  if (animar) css += '@media (prefers-reduced-motion:reduce){.fazer,.plano,.lista{animation:none!important;opacity:1!important;transform:none!important}}'
  return css
}

/** Precisa do "observador" de rolagem (efeitos que aparecem ao rolar)? */
export const usaRolagem = (e0?: Partial<EstiloMapa> | null) => Object.values(estiloCompleto(e0).cards).some(c => ['surgir', 'deslizar', 'virar'].includes(c.efeito))
export const SCRIPT_ROLAGEM = `<script>(function(){var els=document.querySelectorAll('.fazer,.plano,.lista');if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('mf-vis')});return}var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('mf-vis');io.unobserve(x.target)}})},{threshold:.15});els.forEach(function(e){io.observe(e)})})();</script>`
