'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { api, toast } from '@/components/ui';

const COR: Record<string, string> = { anthropic: '#7c5cff', elevenlabs: '#e8562a', browserless: '#1aa86b', grok: '#555' };
const usd = (n: number) => 'US$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 });

export default function Consumo() {
  const [d, setD] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [px, setPx] = useState<any>(null);
  async function load() {
    try { setD(await api('/api/consumo', 'GET')); fetch('/api/consumo/alertas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ler' }) }).catch(() => {}); } catch (e: any) { toast(e.message); }
    api('/api/meta/conferencia', 'GET').then(setPx).catch(() => {});
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  const brl = (n: number) => 'R$ ' + ((n || 0) * (d?.brl || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const head = (
    <PageHead title="Consumo" sub="Gasto de todos os serviços, em US$ e R$" icon="trend" tone="mut" help="custos">
      <button className="refresh-btn" onClick={load}>↻ Atualizar</button> <a className="refresh-btn" href="/api/usage/export?dias=30">⬇ Exportar</a>
    </PageHead>
  );
  if (!d) return head;
  const max = Math.max(0.0001, ...d.dias.map((x: any) => x.total));
  const maxSem = Math.max(0.0001, ...d.semanas.map((x: any) => x.usd));
  async function salvar() {
    try { await api('/api/consumo', 'POST', edit); toast('Salvo'); setEdit(null); load(); } catch (e: any) { toast(e.message); }
  }
  return (
    <div>
      {head}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[['Hoje', d.total.hoje], ['Últimos 7 dias', d.total.semana], ['Este mês', d.total.mes]].map(([t, v]: any) => (
            <div key={t}><div className="mut" style={{ fontSize: 12 }}>{t}</div><b style={{ fontSize: 22 }}>{usd(v)}</b><div className="mut">{brl(v)}</div></div>
          ))}
          <div><div className="mut" style={{ fontSize: 12 }}>Média por resposta da IA</div><b style={{ fontSize: 22 }}>{usd(d.por_resposta)}</b><div className="mut">{brl(d.por_resposta)}</div></div>
          <div><div className="mut" style={{ fontSize: 12 }}>Dólar</div><b style={{ fontSize: 22 }}>R$ {Number(d.brl).toFixed(2)}</b><div className="mut">{d.cambio_ao_vivo ? 'cotação do dia' : 'aproximado'}</div></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12, marginBottom: 12 }}>
        {d.servicos.map((s: any) => {
          const v = (d.vivo || []).find((x: any) => x.id === s.id) || {};
          const alerta = !!v.ativo_alerta;
          const acabou = v.restante != null && v.restante <= 0;
          return (
          <div key={s.id} className="card" style={{ padding: 14, border: alerta ? '2px solid #d33' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ color: alerta ? '#d33' : COR[s.id] }}>{alerta ? '🚨 ' : ''}{s.nome}</b>
              {s.id === 'anthropic' || s.id === 'grok' ? <button className="refresh-btn" onClick={() => setEdit({ service: s.id, nome: s.nome, saldo_usd: '', obs: s.obs })}>Informar saldo</button> : null}
              {s.id === 'browserless' ? <button className="refresh-btn" onClick={() => setEdit({ service: s.id, nome: s.nome, limite_unidades: v.limite || 1000, custo_unidade: s.custo_unidade, obs: s.obs })}>Plano</button> : null}</div>
            {s.id === 'anthropic' && (v.restante != null
              ? <div style={{ fontSize: 22, fontWeight: 700, color: alerta ? '#d33' : undefined }}>{usd(v.restante)} <span className="mut" style={{ fontSize: 13 }}>{brl(v.restante)} restantes</span></div>
              : <div style={{ fontSize: 13, color: '#d33' }}>Informe o saldo atual da conta para o painel acompanhar e avisar.</div>)}
            {s.id === 'elevenlabs' && (v.restante != null
              ? <div style={{ fontSize: 22, fontWeight: 700, color: alerta ? '#d33' : undefined }}>{Number(v.restante).toLocaleString('pt-BR')} <span className="mut" style={{ fontSize: 13 }}>créditos restantes (≈ {usd(v.restante * 5 / 30000)} · {brl(v.restante * 5 / 30000)})</span></div>
              : <div className="mut" style={{ fontSize: 12 }}>Sem leitura da conta agora.</div>)}
            {s.id === 'browserless' && <div style={{ fontSize: 22, fontWeight: 700, color: alerta ? '#d33' : undefined }}>{Number(v.restante ?? 0).toLocaleString('pt-BR')} <span className="mut" style={{ fontSize: 13 }}>PDFs restantes de {v.limite}</span></div>}
            {acabou && <div style={{ color: '#d33', fontWeight: 700, fontSize: 13 }}>SALDO ACABOU — automação parada.</div>}
            <div style={{ marginTop: 6, fontSize: 14 }}>Gasto no mês: <b>{usd(s.mes)}</b> <span className="mut">{brl(s.mes)}</span></div>
            <div className="mut" style={{ fontSize: 12 }}>hoje {usd(s.hoje)} · 7 dias {usd(s.semana)}</div>
            <div className="mut" style={{ fontSize: 12 }}>{s.calls_mes} chamadas · {Math.round(s.qtd_mes).toLocaleString('pt-BR')} {s.unidade}</div>
            {s.id === 'anthropic' && d.conta_anthropic != null && <div style={{ marginTop: 6, fontSize: 12 }}>Conta inteira (todas as chaves) no mês: <b>{usd(d.conta_anthropic)}</b> <span className="mut">{brl(d.conta_anthropic)}</span></div>}
            {s.id === 'elevenlabs' && d.eleven && <div style={{ marginTop: 6, fontSize: 12 }}>✓ Sincronizado com a conta: {Number(d.eleven.usado).toLocaleString('pt-BR')} de {Number(d.eleven.limite).toLocaleString('pt-BR')} créditos · plano {d.eleven.plano}{d.eleven.renova ? ` · renova ${new Date(d.eleven.renova).toLocaleDateString('pt-BR')}` : ''}</div>}
            {s.id === 'grok' && s.mes === 0 && <div className="mut" style={{ fontSize: 12, marginTop: 6 }}>O sistema ainda não usa o Grok; quando usar, aparece aqui.</div>}
          </div>);
        })}
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <b>Por dia (30 dias)</b>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, marginTop: 8 }}>
          {d.dias.map((x: any) => (
            <div key={x.day} title={`${x.day}: ${usd(x.total)} (${brl(x.total)})`} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: '100%' }}>
              {Object.keys(COR).map((k) => x[k] ? <div key={k} style={{ height: (x[k] / max) * 100 + '%', background: COR[k], minHeight: 1 }} /> : null)}
            </div>
          ))}
        </div>
        <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>{Object.entries(COR).map(([k, c]) => <span key={k} style={{ marginRight: 10 }}><span style={{ color: c }}>■</span> {k}</span>)}</div>
        <b style={{ display: 'block', marginTop: 12 }}>Por semana</b>
        {d.semanas.map((w: any) => (
          <div key={w.sem} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, margin: '3px 0' }}>
            <span style={{ width: 80 }}>{w.sem.slice(8)}/{w.sem.slice(5, 7)}</span>
            <div style={{ flex: 1 }}><div style={{ height: 8, borderRadius: 4, background: '#7c5cff', width: (w.usd / maxSem) * 100 + '%' }} /></div>
            <span style={{ width: 170, textAlign: 'right' }}>{usd(w.usd)} · {brl(w.usd)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <b>Por tipo de tarefa (30 dias)</b>
          <table style={{ width: '100%', fontSize: 12, marginTop: 6 }}><tbody>
            <tr className="mut"><td>Tarefa</td><td>Chamadas</td><td>Médio</td><td>Total</td></tr>
            {d.tarefas.map((t: any) => <tr key={t.id}><td>{t.nome}</td><td>{t.calls}</td><td>{usd(t.medio)}</td><td>{usd(t.usd)}<br /><span className="mut">{brl(t.usd)}</span></td></tr>)}
          </tbody></table>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <b>Por modelo de IA</b>
          <table style={{ width: '100%', fontSize: 12, marginTop: 6 }}><tbody>
            {d.modelos.map((t: any) => <tr key={t.id}><td>{t.id}</td><td>{t.calls}</td><td>{usd(t.usd)} · {brl(t.usd)}</td></tr>)}
          </tbody></table>
          <b style={{ display: 'block', marginTop: 12 }}>Conversas que mais gastaram</b>
          <table style={{ width: '100%', fontSize: 12, marginTop: 6 }}><tbody>
            {d.leads.map((t: any) => <tr key={t.id}><td><a href={`/conversas?lead=${t.id}`}>{t.nome}</a></td><td>{t.calls}</td><td>{usd(t.usd)} · {brl(t.usd)}</td></tr>)}
          </tbody></table>
        </div>
      </div>

      {px && (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <b>Conferência do Pixel Meta (30 dias)</b>
          <div className="mut" style={{ fontSize: 12, margin: '4px 0 8px' }}>Só confere: não envia nada ao Meta e não duplica eventos.</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
            <div>Vendas confirmadas<br /><b style={{ fontSize: 20 }}>{px.vendas}</b> <span className="mut">{Object.entries(px.por_gateway || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span></div>
            <div>Compras enviadas ao Meta<br /><b style={{ fontSize: 20 }}>{px.compras_enviadas}</b></div>
            <div>Compradores com e-mail<br /><b style={{ fontSize: 20 }}>{px.com_email}</b> <span className="mut">de {px.vendas}</span></div>
            <div>Compras duplicadas<br /><b style={{ fontSize: 20, color: px.duplicadas?.length ? '#d33' : undefined }}>{px.duplicadas?.length || 0}</b></div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}><b>Dados que cada evento levou</b> ({px.eventos_enviados} eventos)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {Object.entries(px.cobertura || {}).map(([k, v]: any) => <span key={k} className="chip" style={{ fontSize: 11 }}>{k}: {v}%</span>)}
          </div>
          {px.sem_compra?.length > 0 && <div style={{ marginTop: 10, fontSize: 12 }}><b>Vendas sem Compra no Meta</b>{px.sem_compra.map((x: any, i: number) => <div key={i} className="mut">{x.nome} · {x.motivo}</div>)}</div>}
          {px.recusados?.length > 0 && <div style={{ marginTop: 10, fontSize: 12 }}><b>Recusados pelo Meta</b>{px.recusados.map((x: any, i: number) => <div key={i} className="mut">{x.evento} · {x.motivo}</div>)}</div>}
        </div>
      )}

      {edit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={() => setEdit(null)}>
          <div className="card" style={{ padding: 18, width: 380, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
            <b>{edit.nome}</b>
            {(edit.service === 'browserless' ? [['limite_unidades', 'PDFs do plano por mês'], ['custo_unidade', 'Custo por PDF (US$, opcional)']] : [['saldo_usd', 'Saldo atual na conta (US$)']]).map(([k, t]) => (
              <label key={k} style={{ display: 'block', marginTop: 10, fontSize: 12 }}>{t}
                <input className="input" style={{ width: '100%' }} inputMode="decimal" value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></label>
            ))}
            <label style={{ display: 'block', marginTop: 10, fontSize: 12 }}>Observação
              <input className="input" style={{ width: '100%' }} value={edit.obs || ''} onChange={(e) => setEdit({ ...edit, obs: e.target.value })} /></label>
            <p className="mut" style={{ fontSize: 11 }}>O saldo informado vale a partir de agora: o sistema desconta tudo o que gastar daqui pra frente.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setEdit(null)}>Cancelar</button><button className="btn primary" onClick={salvar}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
