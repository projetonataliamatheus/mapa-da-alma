// Prévia do mapa com bloqueios: o cliente recebe o mapa inteiro, mas só as seções que a IA já comentou ficam abertas;
// o resto mostra só um pedacinho + cadeado. Faixa fixa (topo e rodapé) com contagem regressiva e proteção contra cópia.
import { admin as db } from '../supabase/admin'

export interface PreviaCfg {
  ativo: boolean
  minutos: number
  texto: string            // frase da faixa (a contagem entra no fim)
  cor_fundo: string
  cor_texto: string
  cor_borda: string
  piscar: number           // intensidade do pisca (0 = fixo, 100 = forte)
  velocidade: number       // segundos de cada pisca
  fonte_px: number
  altura_linha: number     // line-height
  espaco_px: number        // espaço interno (alto/baixo)
  topo: boolean
  rodape: boolean
  preco: string            // "R$ 49,00"
  preco_nota: string       // "(Pagamento Único)"
  titulo_cadeado: string
  msg_cadeado: string
  msg_vida: string
  msg_bloqueio: string     // aparece ao tentar imprimir/baixar/copiar
  proteger: boolean
  amostra_chars: number    // quanto texto de cada seção bloqueada o cliente consegue ler antes do esmaecer
}

export const PREVIA_PADRAO: PreviaCfg = {
  ativo: true,
  minutos: 30,
  texto: 'Esse Mapa Ainda Não Recebeu o Pagamento no Sistema. Ele Será Excluído em',
  cor_fundo: '#ffe3e3',
  cor_texto: '#b42318',
  cor_borda: '#f04438',
  piscar: 45,
  velocidade: 1.6,
  fonte_px: 13,
  altura_linha: 1.3,
  espaco_px: 6,
  topo: true,
  rodape: true,
  preco: 'R$ 49,00',
  preco_nota: '(Pagamento Único)',
  titulo_cadeado: 'Liberação do Mapa Completo Após Pagamento',
  msg_cadeado: 'Esta parte do seu mapa já está pronta e guardada para você. Ela é liberada assim que o pagamento é confirmado.',
  msg_vida: 'O seu mapa só precisa ser feito uma única vez e vale para a vida toda. Não precisa refazer: ele acompanha você para sempre.',
  msg_bloqueio: 'Prévia Bloqueada! Faça o Pagamento para Desbloquear o Mapa Completo',
  proteger: true,
  amostra_chars: 700,
}

const cor = (v: any, def: string) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v || '')) ? String(v) : def)
const num = (v: any, def: number, min: number, max: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def
}
const txt = (v: any, def: string, max = 400) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : def)

export function normalizaCfg(raw: any): PreviaCfg {
  const r = raw || {}
  const d = PREVIA_PADRAO
  return {
    ativo: typeof r.ativo === 'boolean' ? r.ativo : d.ativo,
    minutos: Math.round(num(r.minutos, d.minutos, 1, 1440)),
    texto: txt(r.texto, d.texto),
    cor_fundo: cor(r.cor_fundo, d.cor_fundo),
    cor_texto: cor(r.cor_texto, d.cor_texto),
    cor_borda: cor(r.cor_borda, d.cor_borda),
    piscar: num(r.piscar, d.piscar, 0, 100),
    velocidade: num(r.velocidade, d.velocidade, 0.4, 6),
    fonte_px: num(r.fonte_px, d.fonte_px, 9, 28),
    altura_linha: num(r.altura_linha, d.altura_linha, 1, 2.4),
    espaco_px: num(r.espaco_px, d.espaco_px, 0, 30),
    topo: typeof r.topo === 'boolean' ? r.topo : d.topo,
    rodape: typeof r.rodape === 'boolean' ? r.rodape : d.rodape,
    preco: txt(r.preco, d.preco, 40),
    preco_nota: typeof r.preco_nota === 'string' ? r.preco_nota.trim().slice(0, 60) : d.preco_nota,
    titulo_cadeado: txt(r.titulo_cadeado, d.titulo_cadeado, 120),
    msg_cadeado: txt(r.msg_cadeado, d.msg_cadeado),
    msg_vida: txt(r.msg_vida, d.msg_vida),
    msg_bloqueio: txt(r.msg_bloqueio, d.msg_bloqueio, 200),
    proteger: typeof r.proteger === 'boolean' ? r.proteger : d.proteger,
    amostra_chars: Math.round(num(r.amostra_chars, d.amostra_chars, 150, 2500)),
  }
}

export async function previaCfg(): Promise<PreviaCfg> {
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle()
  return normalizaCfg((data as any)?.data?.previa_mapa)
}

/** Variáveis de estilo da faixa (trocadas ao vivo pelo script, sem recarregar a página). */
export const faixaVars = (c: PreviaCfg) => ({
  '--pv-bg': c.cor_fundo, '--pv-tx': c.cor_texto, '--pv-bd': c.cor_borda,
  '--pv-fs': c.fonte_px + 'px', '--pv-lh': String(c.altura_linha), '--pv-pad': c.espaco_px + 'px',
  '--pv-int': String(c.piscar / 100), '--pv-vel': c.velocidade + 's',
})
const varsCss = (c: PreviaCfg) => Object.entries(faixaVars(c)).map(([k, v]) => `${k}:${v}`).join(';')

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))

export const mmss = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000))
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')
}

export const PREVIA_CSS = `
:root{${''}}
.pv-faixa{position:fixed;left:0;right:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;text-align:center;
 background:var(--pv-bg);color:var(--pv-tx);border:0 solid var(--pv-bd);font:700 var(--pv-fs)/var(--pv-lh) system-ui,Arial,sans-serif;padding:var(--pv-pad) 12px;
 animation:pvPisca var(--pv-vel) ease-in-out infinite}
.pv-topo{top:0;border-bottom-width:2px}.pv-rodape{bottom:0;border-top-width:2px}
.pv-faixa b.pv-tempo{font-variant-numeric:tabular-nums;background:var(--pv-tx);color:var(--pv-bg);border-radius:6px;padding:0 8px;letter-spacing:.04em}
@keyframes pvPisca{0%,100%{filter:none;box-shadow:0 0 0 0 transparent}50%{filter:saturate(calc(1 + var(--pv-int)*1.2)) brightness(calc(1 - var(--pv-int)*.07));box-shadow:0 0 calc(var(--pv-int)*22px) calc(var(--pv-int)*3px) var(--pv-bd)}}
body.pv{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
body.pv img{-webkit-user-drag:none;pointer-events:none}
body.pv.pv-t{padding-top:calc(var(--pv-fs)*var(--pv-lh) + var(--pv-pad)*2 + 6px)}
body.pv.pv-r{padding-bottom:calc(var(--pv-fs)*var(--pv-lh) + var(--pv-pad)*2 + 6px)}
.trav{margin:14px 0 4px;padding:18px 16px;border:2px dashed #c9a24a;border-radius:16px;background:linear-gradient(180deg,#fffaf0,#f7efe0);text-align:center}
.trav .trav-ico{font-size:30px}.trav b{display:block;font-size:1.05em;color:#4b1f8f;margin:4px 0}
.trav .trav-preco{font-size:1.5em;font-weight:800;color:#2a1259;margin:6px 0 2px}.trav .trav-preco small{font-size:.5em;font-weight:600;color:#6b5b7e}
.trav p{margin:6px 0;font-size:.92em;color:#4a3d5c}.trav .vida{font-weight:700;color:#2a1259}
.trav .esboco{margin:0 0 10px;padding:12px 14px;border-radius:12px;background:#fff;color:#4a3d5c;font-size:.95em;text-align:left;position:relative;overflow:hidden}.trav .esboco p{margin:0 0 .6em}.trav .esboco p:last-child{margin:0}
.trav .esboco::after{content:'';position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 92%)}
.trav .barras i{display:block;height:9px;border-radius:6px;background:#e3d9f2;margin:7px 0}.trav .barras i:nth-child(2){width:88%}.trav .barras i:nth-child(3){width:64%}
.pv-aviso{position:fixed;inset:0;z-index:2147483600;display:none;place-items:center;background:rgba(20,8,40,.94);color:#fff;text-align:center;padding:24px;font:800 24px/1.35 system-ui,Arial,sans-serif}
.pv-aviso.on{display:grid}.pv-aviso small{display:block;font:500 15px/1.4 system-ui;margin-top:10px;opacity:.85}
@media print{body *{display:none!important}html,body{background:#fff!important}body::before{content:"Prévia Bloqueada! Faça o Pagamento para Desbloquear o Mapa Completo";display:block!important;font:800 28px system-ui;padding:60px 30px;text-align:center;color:#b42318}}
`

/** Faixas (topo/rodapé), aviso de bloqueio e script (contagem, atualização ao vivo e proteção). */
export function previaExtras(cfg: PreviaCfg, o: { slug: string; restanteMs: number; vers: string; expirouUrl?: string }): string {
  const faixa = (pos: string) => `<div class="pv-faixa pv-${pos}" role="status" aria-live="off"><span class="pv-txt">${esc(cfg.texto)}</span> <b class="pv-tempo">${mmss(o.restanteMs)}</b></div>`
  const boot = JSON.stringify({ slug: o.slug, restante: o.restanteMs, vers: o.vers, proteger: cfg.proteger, aviso: cfg.msg_bloqueio })
  return `<style>${PREVIA_CSS}</style>
<style id="pv-vars">:root{${varsCss(cfg)}}</style>
${cfg.topo ? faixa('topo') : ''}${cfg.rodape ? faixa('rodape') : ''}
<div class="pv-aviso" id="pvAviso"><div><span id="pvAvisoT">${esc(cfg.msg_bloqueio)}</span><small>Depois do pagamento o seu mapa completo é liberado para ler com calma e baixar.</small></div></div>
<script>(function(){var B=${boot.replace(/</g, '\\u003c')};var t0=Date.now(),R=B.restante;
var b=document.body;b.classList.add('pv');
function fx(c){b.classList.toggle('pv-t',!!document.querySelector('.pv-topo'));b.classList.toggle('pv-r',!!document.querySelector('.pv-rodape'))}fx();
function fmt(ms){var s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function tick(){var left=R-(Date.now()-t0);document.querySelectorAll('.pv-tempo').forEach(function(e){e.textContent=fmt(left)});if(left<=0&&B.restante>0&&!window.__rl){window.__rl=1;location.reload()}}
setInterval(tick,500);tick();
var AV=document.getElementById('pvAviso'),AT=document.getElementById('pvAvisoT'),tm;
function aviso(){AV.classList.add('on');clearTimeout(tm);tm=setTimeout(function(){AV.classList.remove('on')},2600)}
if(B.proteger){
 ['contextmenu','copy','cut','dragstart','selectstart'].forEach(function(ev){document.addEventListener(ev,function(e){e.preventDefault();if(ev!=='selectstart'&&ev!=='dragstart')aviso()},true)});
 document.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase();
  if(k==='printscreen'){try{navigator.clipboard&&navigator.clipboard.writeText('')}catch(_){}aviso();e.preventDefault();return}
  if((e.ctrlKey||e.metaKey)&&['p','s','c','x','u','a'].indexOf(k)>-1||k==='f12'||(e.ctrlKey&&e.shiftKey&&['i','j','c','s'].indexOf(k)>-1)){e.preventDefault();aviso()}},true);
 document.addEventListener('keyup',function(e){if((e.key||'').toLowerCase()==='printscreen'){try{navigator.clipboard&&navigator.clipboard.writeText('')}catch(_){}aviso()}},true);
 window.addEventListener('beforeprint',aviso);
}
// atualiza ao vivo: estilo da faixa, texto, tempo e seções liberadas (recarrega se a IA liberou algo novo)
function poll(){fetch('/mapa/'+B.slug+'/faixa',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
 if(!j||j.erro)return;var c=j.cfg||{};var css=':root{';for(var k in j.vars)css+=k+':'+j.vars[k]+';';css+='}';var s=document.getElementById('pv-vars');if(s&&s.textContent!==css)s.textContent=css;
 document.querySelectorAll('.pv-txt').forEach(function(e){if(c.texto&&e.textContent!==c.texto)e.textContent=c.texto});
 if(AT&&c.msg_bloqueio)AT.textContent=c.msg_bloqueio;
 document.querySelectorAll('.pv-topo').forEach(function(e){e.style.display=c.topo===false?'none':''});document.querySelectorAll('.pv-rodape').forEach(function(e){e.style.display=c.rodape===false?'none':''});
 R=j.restante_ms;t0=Date.now();
 if(j.liberado||(j.expirou&&B.restante>0)||(j.vers&&j.vers!==B.vers)||j.ativo===false)location.reload()}).catch(function(){})}
setInterval(poll,8000);
})();</script>`
}

/** Quanto falta da contagem. Sem início ainda = tempo cheio (a contagem começa quando o cliente abre o link). */
export function restanteMs(cfg: PreviaCfg, inicio?: string | null): { ms: number; expirou: boolean } {
  const total = cfg.minutos * 60_000
  if (!inicio) return { ms: total, expirou: false }
  const ms = new Date(inicio).getTime() + total - Date.now()
  return { ms: Math.max(0, ms), expirou: ms <= 0 }
}

/** Seções que a IA já comentou (e pirâmides enviadas): ficam abertas na prévia. */
export async function liberadasDoMapa(m: { lead_id?: string | null }): Promise<{ secoes: string[]; piramides: string[] }> {
  if (!m.lead_id) return { secoes: [], piramides: [] }
  const { data } = await db().from('leads').select('memory').eq('id', m.lead_id).maybeSingle()
  const mem: any = (data as any)?.memory || {}
  return {
    secoes: Array.isArray(mem.secoes_liberadas) ? mem.secoes_liberadas : [],
    piramides: [...new Set([...(Array.isArray(mem.piramides_enviadas) ? mem.piramides_enviadas : []), ...(Array.isArray(mem.piramides_liberadas) ? mem.piramides_liberadas : [])])],
  }
}

export const IDS_SECAO = ['signo', 'motivacao', 'impressao', 'expressao', 'diaNascimento', 'destino', 'missao', 'talentoOculto', 'numeroPsiquico', 'respostaSubconsciente', 'licoesCarmicas', 'dividasCarmicas', 'tendenciasOcultas', 'anoPessoal', 'harmoniaConjugal', 'ciclos', 'desafios', 'momentos', 'cores', 'dias']
