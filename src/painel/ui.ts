// Layout e componentes do painel (HTML no servidor, sem framework).

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export const brl = (v: number | string) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const dataBr = (iso?: string | null, hora = false) => !iso ? '—' : new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleString('pt-BR', {
  timeZone: iso.length === 10 ? 'UTC' : 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', ...(hora ? { hour: '2-digit', minute: '2-digit' } : {}),
})

const MENU: [string, string, string][] = [
  ['/painel', 'Visão geral', '◈'],
  ['/painel/conversas', 'Conversas', '💬'],
  ['/painel/clientes', 'Clientes', '👤'],
  ['/painel/mapas', 'Mapas', '✦'],
  ['/painel/financeiro', 'Financeiro', '₿'],
  ['/painel/ia', 'IA e aprendizado', '✺'],
  ['/painel/textos', 'Textos do mapa', '❦'],
  ['/painel/whatsapp', 'WhatsApp', '☏'],
  ['/painel/config', 'Configurações', '⚙'],
]

const CSS = `
:root{--roxo:#2a1259;--roxo2:#5b2bb0;--ouro:#c9a24a;--fundo:#f6f3fb;--card:#fff;--borda:#e6def2;--txt:#231a33;--suave:#6f6283;--ok:#1f8a5b;--alerta:#c0392b;--aviso:#b7791f}
@media (prefers-color-scheme:dark){:root{--fundo:#130d1f;--card:#1d1530;--borda:#33274d;--txt:#ece6f7;--suave:#a597bf}}
*{box-sizing:border-box}body{margin:0;font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;background:var(--fundo);color:var(--txt);font-size:14px}
a{color:var(--roxo2)}
.app{display:flex;min-height:100vh}
aside{width:230px;background:linear-gradient(180deg,#2a1259,#1a0b3d);color:#fff;padding:18px 12px;flex-shrink:0}
aside .logo{font-family:Cinzel,Georgia,serif;font-size:20px;letter-spacing:.08em;color:#f3dfa2;margin:4px 8px 18px}
aside a{display:flex;gap:10px;align-items:center;color:#e9e0ff;text-decoration:none;padding:9px 10px;border-radius:8px;margin:2px 0}
aside a.on,aside a:hover{background:rgba(255,255,255,.12);color:#fff}
aside .sair{margin-top:20px;opacity:.7}
main{flex:1;padding:22px;min-width:0}
h1{font-size:22px;margin:0 0 16px}h2{font-size:16px;margin:0 0 12px}
.card{background:var(--card);border:1px solid var(--borda);border-radius:14px;padding:16px;margin-bottom:16px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
.kpi small{color:var(--suave);display:block}.kpi b{font-size:24px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--borda);vertical-align:top}th{color:var(--suave);font-weight:600;font-size:12px;text-transform:uppercase}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:#efe7fb;color:#5b2bb0}
.tag.ok{background:#e3f5ec;color:var(--ok)}.tag.alerta{background:#fde8e6;color:var(--alerta)}.tag.aviso{background:#fdf2dc;color:var(--aviso)}
input,select,textarea{width:100%;padding:9px 10px;border:1px solid var(--borda);border-radius:8px;background:var(--card);color:var(--txt);font:inherit}
textarea{min-height:110px}label{display:block;font-weight:600;margin:10px 0 4px}
button,.btn{display:inline-block;background:var(--roxo2);color:#fff;border:0;border-radius:8px;padding:9px 14px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
.btn.sec{background:transparent;color:var(--roxo2);border:1px solid var(--borda)}.btn.perigo{background:var(--alerta)}
.linha{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.dir{margin-left:auto}
.suave{color:var(--suave)}.erro{background:#fde8e6;color:var(--alerta);padding:10px;border-radius:8px}.okmsg{background:#e3f5ec;color:var(--ok);padding:10px;border-radius:8px;margin-bottom:12px}
.chat{display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto;padding:8px;background:var(--fundo);border-radius:10px}
.msg{max-width:75%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}
.msg.cliente{background:var(--card);border:1px solid var(--borda);align-self:flex-start}
.msg.ia{background:#5b2bb0;color:#fff;align-self:flex-end}.msg.humano{background:#1f8a5b;color:#fff;align-self:flex-end}
.msg.sistema{align-self:center;font-size:12px;color:var(--suave);background:transparent}
.msg small{display:block;opacity:.7;font-size:11px;margin-top:3px}
.duas{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media (max-width:860px){aside{position:fixed;bottom:0;left:0;right:0;width:auto;height:auto;display:flex;overflow-x:auto;padding:6px;z-index:5}aside .logo,aside .sair{display:none}aside a{flex-direction:column;font-size:10px;gap:2px;padding:6px 8px;white-space:nowrap}main{padding:14px 14px 90px}.duas{grid-template-columns:1fr}}
`

export function layout(titulo: string, atual: string, corpo: string, extraHead = ''): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · Mapa da Alma</title><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>${extraHead}</head><body><div class="app">
<aside><div class="logo">✦ Mapa da Alma</div>${MENU.map(([h, t, i]) => `<a href="${h}" class="${atual === h ? 'on' : ''}"><span>${i}</span>${t}</a>`).join('')}<a class="sair" href="/logout">↩ Sair</a></aside>
<main>${corpo}</main></div></body></html>`
}

export function paginaSimples(titulo: string, corpo: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>
<style>${CSS} body{display:grid;place-items:center;min-height:100vh;background:radial-gradient(circle at 50% 20%,#4b1f8f,#1a0b3d 70%)} .card{width:min(380px,92vw)} .logo{font-family:Cinzel,Georgia,serif;text-align:center;color:#f3dfa2;font-size:26px;margin-bottom:14px;letter-spacing:.1em}</style>
</head><body><div><div class="logo">✦ MAPA DA ALMA</div><div class="card">${corpo}</div></div></body></html>`
}

export const etapaTag = (e: string) => {
  const cls: Record<string, string> = { pago: 'ok', entregue: 'ok', pix: 'aviso', sem_interesse: 'alerta' }
  const nome: Record<string, string> = { novo: 'Novo', conversando: 'Conversando', dados: 'Enviando dados', pix: 'Pix enviado', pago: 'Pago', entregue: 'Mapa entregue', sem_interesse: 'Sem interesse' }
  return `<span class="tag ${cls[e] || ''}">${esc(nome[e] || e)}</span>`
}
