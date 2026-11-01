// Telas do painel administrativo.
import { db, config } from '../lib/db.ts'
import { layout, esc, brl, dataBr, etapaTag } from './ui.ts'
import { linkMapa } from '../lib/mapas.ts'
import { PERSONA_PADRAO } from '../lib/atendimento.ts'
import { MARCA_PADRAO } from '../lib/mapa/html.ts'
import { SECOES } from '../lib/textos/essencias.ts'
import { listarUsuarios } from '../lib/auth.ts'

const aviso = (q: URLSearchParams) => q.get('ok') ? `<div class="okmsg">${esc(q.get('ok'))}</div>` : q.get('erro') ? `<div class="erro">${esc(q.get('erro'))}</div>` : ''
const mesSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) // AAAA-MM no horário de Brasília
const inicioMes = (mes = mesSP()) => new Date(`${mes}-01T00:00:00-03:00`).toISOString()
const proximoMes = (mes: string) => { const [a, m] = mes.split('-').map(Number); return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}` }
const hoje0 = () => new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T03:00:00Z').toISOString()

/* ---------- Visão geral ---------- */
export async function visaoGeral(q: URLSearchParams) {
  const [pagosMes, despMes, conversasHoje, mapasMes, precisa, pendentes] = await Promise.all([
    db.select('pagamentos', { status: 'eq.pago', pago_em: `gte.${inicioMes()}` }, 'valor'),
    db.select('despesas', { data: `gte.${mesSP()}-01` }, 'valor'),
    db.count('clientes', { ultima_msg_em: `gte.${hoje0()}` }),
    db.count('mapas', { criado_em: `gte.${inicioMes()}` }),
    db.select('clientes', { precisa_humano: 'eq.true', order: 'ultima_msg_em.desc', limit: 10 }),
    db.count('pagamentos', { status: 'eq.pendente' }),
  ])
  const receita = pagosMes.reduce((s: number, p: any) => s + Number(p.valor), 0)
  const gastos = despMes.reduce((s: number, p: any) => s + Number(p.valor), 0)
  const funil = await Promise.all(['novo', 'conversando', 'dados', 'pix', 'pago', 'entregue'].map(async e => [e, await db.count('clientes', { etapa: `eq.${e}` })] as const))
  return layout('Visão geral', '/painel', `<h1>Visão geral</h1>${aviso(q)}
<div class="grid">
  <div class="card kpi"><small>Receita do mês</small><b>${brl(receita)}</b></div>
  <div class="card kpi"><small>Gastos do mês</small><b>${brl(gastos)}</b></div>
  <div class="card kpi"><small>Lucro do mês</small><b style="color:${receita - gastos >= 0 ? 'var(--ok)' : 'var(--alerta)'}">${brl(receita - gastos)}</b></div>
  <div class="card kpi"><small>Vendas no mês</small><b>${pagosMes.length}</b></div>
  <div class="card kpi"><small>Conversas hoje</small><b>${conversasHoje}</b></div>
  <div class="card kpi"><small>Mapas no mês</small><b>${mapasMes}</b></div>
  <div class="card kpi"><small>Pix aguardando</small><b>${pendentes}</b></div>
</div>
<div class="card"><h2>⚠️ Precisa de você</h2>${precisa.length ? `<table>${precisa.map((c: any) => `<tr><td><a href="/painel/conversas/${c.id}">${esc(c.nome || c.whatsapp)}</a></td><td>${etapaTag(c.etapa)}</td><td class="suave">${esc(c.resumo || '')}</td></tr>`).join('')}</table>` : '<p class="suave">Tudo tranquilo por aqui. A IA está dando conta. ✨</p>'}</div>
<div class="card"><h2>Funil</h2><div class="grid">${funil.map(([e, n]) => `<div class="kpi">${etapaTag(e)}<b style="display:block;margin-top:6px">${n}</b></div>`).join('')}</div></div>`)
}

/* ---------- Conversas ---------- */
export async function conversas(q: URLSearchParams) {
  const busca = q.get('q') || ''
  const lista = await db.select('clientes', { order: 'ultima_msg_em.desc.nullslast', limit: 100, ...(busca ? { or: `(nome.ilike.*${busca}*,whatsapp.ilike.*${busca}*,nome_completo.ilike.*${busca}*)` } : {}) })
  return layout('Conversas', '/painel/conversas', `<h1>Conversas</h1>
<form class="card linha"><input name="q" value="${esc(busca)}" placeholder="Buscar por nome ou número" style="flex:1"><button>Buscar</button></form>
<div class="card"><table><tr><th>Cliente</th><th>Etapa</th><th>Resumo</th><th>Última mensagem</th></tr>
${lista.map((c: any) => `<tr><td><a href="/painel/conversas/${c.id}">${esc(c.nome || c.whatsapp)}</a>${c.precisa_humano ? ' <span class="tag alerta">precisa de você</span>' : ''}${c.ia_pausada ? ' <span class="tag aviso">IA pausada</span>' : ''}<div class="suave">${esc(c.whatsapp)}</div></td><td>${etapaTag(c.etapa)}</td><td class="suave">${esc((c.resumo || '').slice(0, 140))}</td><td>${dataBr(c.ultima_msg_em, true)}</td></tr>`).join('') || '<tr><td colspan="4" class="suave">Nenhuma conversa ainda.</td></tr>'}
</table></div>`)
}

export async function conversa(id: string, q: URLSearchParams) {
  const c = await db.one('clientes', { id: `eq.${id}` })
  if (!c) return null
  const msgs = await db.select('mensagens', { cliente_id: `eq.${id}`, order: 'criado_em.asc', limit: 300 })
  const ultimo = msgs.length ? msgs[msgs.length - 1].id : 0
  const bolha = (m: any) => `<div class="msg ${m.autor}">${esc(m.texto)}<small>${m.autor === 'ia' ? 'IA · ' : m.autor === 'humano' ? 'Você · ' : ''}${dataBr(m.criado_em, true)}</small></div>`
  return layout('Conversa', '/painel/conversas', `<div class="linha"><h1>${esc(c.nome || c.whatsapp)}</h1>${etapaTag(c.etapa)}<a class="btn sec dir" href="/painel/clientes/${c.id}">Ficha do cliente</a></div>${aviso(q)}
<div class="duas"><div class="card"><div class="chat" id="chat">${msgs.map(bolha).join('')}</div>
<form method="post" action="/painel/conversas/${c.id}/enviar" class="linha" style="margin-top:10px"><textarea name="texto" placeholder="Escreva como você (a IA não responde por cima enquanto estiver pausada)" style="min-height:60px;flex:1" required></textarea><button>Enviar</button></form></div>
<div><div class="card"><h2>Controle</h2>
<form method="post" action="/painel/conversas/${c.id}/ia" class="linha"><input type="hidden" name="pausar" value="${c.ia_pausada ? '0' : '1'}">
<button class="${c.ia_pausada ? '' : 'sec btn'}">${c.ia_pausada ? '▶ Devolver para a IA' : '⏸ Pausar IA e assumir'}</button></form>
${c.precisa_humano ? `<form method="post" action="/painel/conversas/${c.id}/resolvido" style="margin-top:8px"><button class="btn sec">✓ Marcar como resolvido</button></form>` : ''}
</div>
<div class="card"><h2>Resumo da IA</h2><p>${esc(c.resumo || '—')}</p><h2>Memória</h2><ul>${(c.memoria || []).map((m: string) => `<li>${esc(m)}</li>`).join('') || '<li class="suave">nada ainda</li>'}</ul>
<p class="suave">Nome completo: ${esc(c.nome_completo || '—')}<br>Nascimento: ${dataBr(c.nascimento)}<br>CPF: ${c.cpf ? 'informado' : '—'}</p></div></div></div>
<script>
const chat=document.getElementById('chat');chat.scrollTop=chat.scrollHeight;let ultimo=${Number(ultimo)};
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
setInterval(async()=>{try{const r=await fetch('/painel/api/mensagens/${c.id}?depois='+ultimo);const l=await r.json();for(const m of l){ultimo=m.id;const d=document.createElement('div');d.className='msg '+m.autor;d.innerHTML=e(m.texto)+'<small>'+new Date(m.criado_em).toLocaleString('pt-BR')+'</small>';chat.appendChild(d);chat.scrollTop=chat.scrollHeight}}catch{}},5000);
</script>`)
}

/* ---------- Clientes ---------- */
export async function clientes(q: URLSearchParams) {
  const etapa = q.get('etapa') || ''
  const lista = await db.select('clientes', { order: 'criado_em.desc', limit: 200, ...(etapa ? { etapa: `eq.${etapa}` } : {}) })
  return layout('Clientes', '/painel/clientes', `<h1>Clientes</h1>
<form class="card linha"><select name="etapa" style="max-width:240px"><option value="">Todas as etapas</option>${['novo', 'conversando', 'dados', 'pix', 'pago', 'entregue', 'sem_interesse'].map(e => `<option ${e === etapa ? 'selected' : ''} value="${e}">${e}</option>`).join('')}</select><button>Filtrar</button></form>
<div class="card"><table><tr><th>Cliente</th><th>Nome do mapa</th><th>Nascimento</th><th>Etapa</th><th>Desde</th></tr>
${lista.map((c: any) => `<tr><td><a href="/painel/clientes/${c.id}">${esc(c.nome || c.whatsapp)}</a><div class="suave">${esc(c.whatsapp)}</div></td><td>${esc(c.nome_completo || '—')}</td><td>${dataBr(c.nascimento)}</td><td>${etapaTag(c.etapa)}</td><td>${dataBr(c.criado_em)}</td></tr>`).join('') || '<tr><td colspan="5" class="suave">Nenhum cliente ainda.</td></tr>'}
</table></div>`)
}

export async function cliente(id: string, q: URLSearchParams) {
  const c = await db.one('clientes', { id: `eq.${id}` })
  if (!c) return null
  const [mapas, pags] = await Promise.all([
    db.select('mapas', { cliente_id: `eq.${id}`, order: 'criado_em.desc' }),
    db.select('pagamentos', { cliente_id: `eq.${id}`, order: 'criado_em.desc' }),
  ])
  const total = pags.filter((p: any) => p.status === 'pago').reduce((s: number, p: any) => s + Number(p.valor), 0)
  return layout('Cliente', '/painel/clientes', `<div class="linha"><h1>${esc(c.nome || c.whatsapp)}</h1>${etapaTag(c.etapa)}<a class="btn dir" href="/painel/conversas/${c.id}">Abrir conversa</a></div>${aviso(q)}
<div class="duas"><form class="card" method="post" action="/painel/clientes/${c.id}"><h2>Dados</h2>
<label>Nome no WhatsApp</label><input name="nome" value="${esc(c.nome || '')}">
<label>Nome completo de nascimento</label><input name="nome_completo" value="${esc(c.nome_completo || '')}">
<label>Data de nascimento</label><input type="date" name="nascimento" value="${esc(c.nascimento || '')}">
<label>E-mail</label><input name="email" value="${esc(c.email || '')}">
<label>Etapa</label><select name="etapa">${['novo', 'conversando', 'dados', 'pix', 'pago', 'entregue', 'sem_interesse'].map(e => `<option ${e === c.etapa ? 'selected' : ''}>${e}</option>`).join('')}</select>
<label>Memória (um fato por linha)</label><textarea name="memoria">${esc((c.memoria || []).join('\n'))}</textarea>
<p><button>Salvar</button></p></form>
<div><div class="card"><h2>Resumo</h2><p>${esc(c.resumo || '—')}</p><p class="suave">WhatsApp: ${esc(c.whatsapp)} · Cliente desde ${dataBr(c.criado_em)} · Total comprado: <b>${brl(total)}</b></p></div>
<div class="card"><h2>Mapas</h2>${mapas.length ? `<table>${mapas.map((m: any) => `<tr><td>${esc(m.tipo === 'casal' ? `${m.nome} & ${m.nome2}` : m.nome)}</td><td>${m.status === 'enviado' ? '<span class="tag ok">enviado</span>' : '<span class="tag">gerado</span>'}</td><td><a href="${esc(linkMapa(m))}" target="_blank">ver</a> · <a href="/m/${esc(m.slug)}.pdf">PDF</a></td></tr>`).join('')}</table>` : '<p class="suave">Nenhum mapa ainda.</p>'}
<form method="post" action="/painel/mapas" style="margin-top:10px"><input type="hidden" name="cliente_id" value="${c.id}"><input type="hidden" name="tipo" value="pessoal"><input type="hidden" name="nome" value="${esc(c.nome_completo || '')}"><input type="hidden" name="nascimento" value="${esc(c.nascimento || '')}"><input type="hidden" name="enviar" value="1">
${c.nome_completo && c.nascimento ? '<button class="btn sec">Gerar mapa pessoal e enviar no WhatsApp</button>' : '<p class="suave">Preencha nome completo e nascimento para gerar o mapa manualmente.</p>'}</form></div>
<div class="card"><h2>Pagamentos</h2>${pags.length ? `<table>${pags.map((p: any) => `<tr><td>${esc(p.produto)}</td><td>${brl(p.valor)}</td><td>${p.status === 'pago' ? '<span class="tag ok">pago</span>' : `<span class="tag aviso">${esc(p.status)}</span>`}</td><td>${dataBr(p.pago_em || p.criado_em, true)}</td></tr>`).join('')}</table>` : '<p class="suave">Nenhum pagamento.</p>'}</div></div></div>`)
}

/* ---------- Mapas ---------- */
export async function mapas(q: URLSearchParams) {
  const lista = await db.select('mapas', { order: 'criado_em.desc', limit: 200 })
  return layout('Mapas', '/painel/mapas', `<h1>Mapas</h1>${aviso(q)}
<form class="card" method="post" action="/painel/mapas"><h2>Criar mapa</h2>
<div class="duas"><div><label>Tipo</label><select name="tipo" onchange="document.getElementById('p2').style.display=this.value==='casal'?'block':'none'"><option value="pessoal">Pessoal</option><option value="casal">Casal</option></select>
<label>Nome completo de nascimento</label><input name="nome" required><label>Data de nascimento</label><input type="date" name="nascimento" required></div>
<div id="p2" style="display:none"><label>&nbsp;</label><p class="suave">Segunda pessoa</p><label>Nome completo</label><input name="nome2"><label>Data de nascimento</label><input type="date" name="nascimento2"></div></div>
<label>WhatsApp para enviar (opcional, com DDD)</label><input name="whatsapp" placeholder="11999998888">
<p><button>Gerar mapa</button></p></form>
<div class="card"><table><tr><th>Mapa</th><th>Tipo</th><th>Status</th><th>Visualizações</th><th>Criado</th><th></th></tr>
${lista.map((m: any) => `<tr><td>${esc(m.tipo === 'casal' ? `${m.nome} & ${m.nome2}` : m.nome)}<div class="suave">${dataBr(m.nascimento)}${m.nascimento2 ? ' · ' + dataBr(m.nascimento2) : ''}</div></td><td>${esc(m.tipo)}</td>
<td>${m.status === 'enviado' ? `<span class="tag ok">enviado ${dataBr(m.enviado_em)}</span>` : '<span class="tag">gerado</span>'}</td><td>${m.visualizacoes}</td><td>${dataBr(m.criado_em, true)}</td>
<td class="linha"><a class="btn sec" href="/m/${esc(m.slug)}" target="_blank">Ver ao vivo</a><a class="btn sec" href="/m/${esc(m.slug)}.pdf">PDF</a><form method="post" action="/painel/mapas/${m.id}/pdf"><button class="btn sec" title="Gerar o PDF de novo com os textos atuais">↻ PDF</button></form></td></tr>`).join('') || '<tr><td colspan="6" class="suave">Nenhum mapa ainda.</td></tr>'}
</table></div>`)
}

/* ---------- Financeiro ---------- */
export async function financeiro(q: URLSearchParams) {
  const mes = /^\d{4}-\d{2}$/.test(q.get('mes') || '') ? q.get('mes')! : mesSP()
  const ini = inicioMes(mes), fim = inicioMes(proximoMes(mes))
  const [pags, desp, pend] = await Promise.all([
    db.select('pagamentos', { status: 'eq.pago', and: `(pago_em.gte.${ini},pago_em.lt.${fim})`, order: 'pago_em.desc' }, '*,clientes(nome,whatsapp)'),
    db.select('despesas', { and: `(data.gte.${mes}-01,data.lt.${proximoMes(mes)}-01)`, order: 'data.desc' }),
    db.select('pagamentos', { status: 'eq.pendente', order: 'criado_em.desc', limit: 50 }, '*,clientes(nome,whatsapp)'),
  ])
  const rec = pags.reduce((s: number, p: any) => s + Number(p.valor), 0), gas = desp.reduce((s: number, p: any) => s + Number(p.valor), 0)
  const porCat: Record<string, number> = {}
  for (const d of desp) porCat[d.categoria] = (porCat[d.categoria] || 0) + Number(d.valor)
  return layout('Financeiro', '/painel/financeiro', `<div class="linha"><h1>Financeiro</h1><form class="dir linha"><input type="month" name="mes" value="${esc(mes)}"><button class="btn sec">Ver</button></form></div>${aviso(q)}
<div class="grid"><div class="card kpi"><small>Recebimentos</small><b>${brl(rec)}</b></div><div class="card kpi"><small>Gastos</small><b>${brl(gas)}</b></div>
<div class="card kpi"><small>Resultado</small><b style="color:${rec - gas >= 0 ? 'var(--ok)' : 'var(--alerta)'}">${brl(rec - gas)}</b></div><div class="card kpi"><small>Ticket médio</small><b>${brl(pags.length ? rec / pags.length : 0)}</b></div></div>
<div class="duas"><div class="card"><h2>Recebimentos</h2><table>${pags.map((p: any) => `<tr><td>${esc(p.clientes?.nome || p.clientes?.whatsapp || '—')}</td><td>${esc(p.produto)}</td><td>${brl(p.valor)}</td><td>${dataBr(p.pago_em, true)}</td></tr>`).join('') || '<tr><td class="suave">Nenhum recebimento no mês.</td></tr>'}</table></div>
<div class="card"><h2>Gastos</h2><form method="post" action="/painel/financeiro/despesa" class="linha"><input name="descricao" placeholder="Descrição (ex.: tráfego Meta)" required style="flex:2"><select name="categoria" style="flex:1"><option>tráfego</option><option>ferramentas</option><option>servidor</option><option>outros</option></select><input name="valor" placeholder="Valor" required style="width:100px"><input type="date" name="data" value="${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}" style="width:150px"><button>Adicionar</button></form>
<p class="suave">${Object.entries(porCat).map(([k, v]) => `${esc(k)}: ${brl(v)}`).join(' · ')}</p>
<table>${desp.map((d: any) => `<tr><td>${esc(d.descricao)}</td><td><span class="tag">${esc(d.categoria)}</span></td><td>${brl(d.valor)}</td><td>${dataBr(d.data)}</td><td><form method="post" action="/painel/financeiro/despesa/${d.id}/apagar"><button class="btn sec" title="Apagar">✕</button></form></td></tr>`).join('')}</table></div></div>
<div class="card"><h2>Pix aguardando pagamento</h2><table>${pend.map((p: any) => `<tr><td>${esc(p.clientes?.nome || p.clientes?.whatsapp || '—')}</td><td>${esc(p.produto)}</td><td>${brl(p.valor)}</td><td>${dataBr(p.criado_em, true)}</td><td>${p.asaas_id ? `<form method="post" action="/painel/pagamentos/${p.id}/conferir"><button class="btn sec">Conferir no Asaas</button></form>` : ''}</td></tr>`).join('') || '<tr><td class="suave">Nenhum.</td></tr>'}</table></div>`)
}

/* ---------- IA ---------- */
export async function ia(q: URLSearchParams) {
  const cfg = await config()
  const p = { ...PERSONA_PADRAO, ...(cfg.persona || {}) }
  const [aps, prods, uso] = await Promise.all([
    db.select('aprendizados', { order: 'criado_em.desc', limit: 100 }),
    db.select('produtos', { order: 'ordem.asc' }),
    db.select('uso_ia', { criado_em: `gte.${inicioMes()}` }, 'entrada,saida'),
  ])
  const tok = uso.reduce((s: number, u: any) => s + u.entrada + u.saida, 0)
  return layout('IA e aprendizado', '/painel/ia', `<h1>IA e aprendizado</h1>${aviso(q)}
<div class="duas"><form class="card" method="post" action="/painel/ia/persona"><h2>Personalidade da atendente</h2>
<label>Nome</label><input name="nome" value="${esc(p.nome)}"><label>Como se apresenta</label><input name="apresentacao" value="${esc(p.apresentacao)}">
<label>Tom de voz</label><textarea name="tom">${esc(p.tom)}</textarea><label>Regras extras (opcional)</label><textarea name="regras_extras" placeholder="Ex.: sempre perguntar como a pessoa conheceu a gente">${esc(p.regras_extras)}</textarea>
<label>Esperar antes de responder (segundos) — junta mensagens seguidas</label><input name="espera" type="number" min="2" max="60" value="${Math.round(Number(cfg.espera_ms ?? 9000) / 1000)}">
<p><button>Salvar</button></p><p class="suave">Uso da IA neste mês: ${tok.toLocaleString('pt-BR')} tokens.</p></form>
<div><form class="card" method="post" action="/painel/produtos"><h2>Produtos e preços</h2>
${prods.map((x: any) => `<div class="linha" style="margin-bottom:8px"><input type="hidden" name="slug" value="${esc(x.slug)}"><input name="nome" value="${esc(x.nome)}" style="flex:2"><input name="preco" value="${esc(x.preco)}" style="width:90px"><label class="linha" style="margin:0;font-weight:400"><input type="checkbox" name="ativo_${esc(x.slug)}" ${x.ativo ? 'checked' : ''} style="width:auto"> ativo</label></div><textarea name="descricao" style="min-height:50px;margin-bottom:12px">${esc(x.descricao)}</textarea>`).join('')}
<button>Salvar produtos</button></form>
<div class="card"><h2>O que a IA aprendeu</h2><p class="suave">A cada venda, a IA estuda a conversa e anota o que funcionou. Os aprendizados ativos entram no atendimento.</p>
<form method="post" action="/painel/ia/aprendizado" class="linha"><input name="texto" placeholder="Ensinar algo à IA manualmente" required style="flex:1"><button>Adicionar</button></form>
<table>${aps.map((a: any) => `<tr><td>${esc(a.texto)}<div class="suave">${esc(a.origem)} · ${dataBr(a.criado_em)}</div></td><td><form method="post" action="/painel/ia/aprendizado/${a.id}"><button class="btn sec">${a.ativo ? 'Desativar' : 'Ativar'}</button></form></td></tr>`).join('') || '<tr><td class="suave">Ainda nada. Os aprendizados aparecem depois das primeiras vendas.</td></tr>'}</table></div></div></div>`)
}

/* ---------- Textos ---------- */
const CATEGORIAS: [string, string, string[]][] = [
  ['motivacao', 'Motivação', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['impressao', 'Impressão', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['expressao', 'Expressão', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['diaNascimento', 'Dia de nascimento', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['destino', 'Destino', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['missao', 'Missão', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['talentoOculto', 'Talento oculto', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['numeroPsiquico', 'Número psíquico', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['respostaSubconsciente', 'Resposta subconsciente', ['2', '3', '4', '5', '6', '7', '8', '9']],
  ['licoesCarmicas', 'Lições cármicas', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['dividasCarmicas', 'Dívidas cármicas', ['13', '14', '16', '19']],
  ['anoPessoal', 'Ano pessoal', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['cores', 'Cores', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['ciclo', 'Ciclos de vida', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['momento', 'Momentos decisivos', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['signo', 'Signos', ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes']],
]
export async function textos(q: URLSearchParams) {
  const cat = q.get('categoria') || 'motivacao'
  const def = CATEGORIAS.find(c => c[0] === cat) || CATEGORIAS[0]
  const num = q.get('numero') || def[2][0]
  const atual = await db.one('textos', { categoria: `eq.${def[0]}`, numero: `eq.${num}` })
  const todos = await db.select('textos', { categoria: `eq.${def[0]}` }, 'numero')
  const feitos = new Set(todos.map((t: any) => t.numero))
  return layout('Textos do mapa', '/painel/textos', `<h1>Textos do mapa</h1>${aviso(q)}
<p class="suave">O sistema já vem com textos próprios para todos os números. Aqui você pode personalizar qualquer um: o texto salvo substitui o padrão no link ao vivo e nos próximos PDFs. Deixe vazio e salve para voltar ao padrão.</p>
<div class="card linha">${CATEGORIAS.map(c => `<a class="btn ${c[0] === def[0] ? '' : 'sec'}" href="?categoria=${c[0]}">${esc(c[1])}</a>`).join('')}</div>
<div class="card"><h2>${esc(def[1])}${SECOES[def[0]] ? ` <span class="suave" style="font-weight:400">— ${esc(SECOES[def[0]].intro.slice(0, 120))}…</span>` : ''}</h2>
<div class="linha">${def[2].map(n => `<a class="btn ${n === num ? '' : 'sec'}" href="?categoria=${def[0]}&numero=${encodeURIComponent(n)}">${esc(n)}${feitos.has(n) ? ' •' : ''}</a>`).join('')}</div>
<form method="post" action="/painel/textos" style="margin-top:12px"><input type="hidden" name="categoria" value="${esc(def[0])}"><input type="hidden" name="numero" value="${esc(num)}">
<label>Texto personalizado para ${esc(def[1])} ${esc(num)} (parágrafos separados por uma linha em branco)</label>
<textarea name="conteudo" style="min-height:260px" placeholder="Usando o texto padrão do sistema.">${esc(atual?.conteudo || '')}</textarea><p><button>Salvar texto</button></p></form></div>`)
}

/* ---------- WhatsApp ---------- */
export async function paginaWhatsapp(q: URLSearchParams, estado: any, qr: string | null) {
  const st = estado?.instance?.state || estado?.state || 'desconhecido'
  return layout('WhatsApp', '/painel/whatsapp', `<h1>WhatsApp</h1>${aviso(q)}
<div class="card"><h2>Status: ${st === 'open' ? '<span class="tag ok">conectado</span>' : `<span class="tag aviso">${esc(st)}</span>`}</h2>
${qr ? `<p>Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho e leia o QR Code:</p><img src="${esc(qr)}" alt="QR Code" style="width:280px;max-width:100%;background:#fff;padding:8px;border-radius:10px">` : ''}
<div class="linha" style="margin-top:12px"><form method="post" action="/painel/whatsapp/conectar"><button>${st === 'open' ? 'Reconfigurar webhook' : 'Conectar / mostrar QR Code'}</button></form>
${st === 'open' ? '<form method="post" action="/painel/whatsapp/sair"><button class="btn perigo">Desconectar</button></form>' : ''}</div>
<p class="suave">Use um número só para o Mapa da Alma. A IA responde automaticamente todas as conversas novas.</p></div>`)
}

/* ---------- Configurações ---------- */
export async function configuracoes(q: URLSearchParams) {
  const cfg = await config()
  const m = { ...MARCA_PADRAO, ...(cfg.marca || {}) }
  const admins = await listarUsuarios()
  return layout('Configurações', '/painel/config', `<h1>Configurações</h1>${aviso(q)}
<div class="duas"><form class="card" method="post" action="/painel/config/marca"><h2>Marca do mapa</h2>
<label>Nome</label><input name="nome" value="${esc(m.nome)}"><label>Subtítulo da capa</label><input name="subtitulo" value="${esc(m.subtitulo)}">
<label>Assinatura (fim do mapa)</label><input name="assinatura" value="${esc(m.assinatura || '')}"><p><button>Salvar</button></p></form>
<div class="card"><h2>Acessos ao painel</h2><p class="suave">Os acessos ficam no Supabase (Authentication → Users), igual ao Radar.</p><table>${admins.map((a: any) => `<tr><td>${esc(a.nome || '—')}</td><td>${esc(a.email)}</td></tr>`).join('')}</table>
<form method="post" action="/painel/config/admin"><label>Nome</label><input name="nome" required><label>E-mail</label><input name="email" type="email" required><label>Senha (mínimo 8)</label><input name="senha" type="password" minlength="8" required><p><button>Adicionar acesso</button></p></form></div></div>`)
}
