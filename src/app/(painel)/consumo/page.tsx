'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { api, toast } from '@/components/ui';

const COR: Record<string, string> = { anthropic: '#7c5cff', elevenlabs: '#e8562a', browserless: '#1aa86b', grok: '#555', google: '#2b7de9' };
const usd = (n: number) => 'US$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 });

export default function Consumo() {
  const [d, setD] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  async function load() {
    try { setD(await api('/api/consumo', 'GET')); } catch (e: any) { toast(e.message); }
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
        {d.servicos.map((s: any) => (
          <div key={s.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ color: COR[s.id] }}>{s.nome}</b>
              <button className="refresh-btn" onClick={() => setEdit({ service: s.id, nome: s.nome, limite_usd: s.limite_usd, custo_unidade: s.custo_unidade, saldo_usd: '', obs: s.obs })}>Ajustar</button></div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{usd(s.mes)} <span className="mut" style={{ fontSize: 13 }}>{brl(s.mes)}</span></div>
            <div className="mut" style={{ fontSize: 12 }}>mês · hoje {usd(s.hoje)} · 7 dias {usd(s.semana)}</div>
            <div className="mut" style={{ fontSize: 12 }}>{s.calls_mes} chamadas · {Math.round(s.qtd_mes).toLocaleString('pt-BR')} {s.unidade}</div>
            {s.limite_usd > 0 && (<>
              <div style={{ height: 8, background: 'rgba(128,128,128,.2)', borderRadius: 6, margin: '8px 0 2px' }}>
                <div style={{ height: 8, borderRadius: 6, width: Math.min(100, s.pct * 100) + '%', background: s.pct >= 1 ? '#d33' : s.pct > 0.8 ? '#e8a22a' : COR[s.id] }} />
              </div>
              <div className="mut" style={{ fontSize: 12 }}>{Math.round(s.pct * 100)}% do limite mensal de {usd(s.limite_usd)}</div></>)}
            {s.saldo_restante != null && <div style={{ marginTop: 6, fontSize: 13 }}>Saldo estimado: <b>{usd(s.saldo_restante)}</b> <span className="mut">({brl(s.saldo_restante)}) · desde que você informou {usd(s.saldo_inicial)}</span></div>}
            {s.id === 'elevenlabs' && d.eleven && <div style={{ marginTop: 6, fontSize: 13 }}>Conta real: <b>{Number(d.eleven.usado).toLocaleString('pt-BR')}</b> de {Number(d.eleven.limite).toLocaleString('pt-BR')} créditos ({d.eleven.plano}) ✓ sincronizado</div>}
            {s.id === 'grok' && s.mes === 0 && <div className="mut" style={{ fontSize: 12, marginTop: 6 }}>O sistema ainda não usa o Grok; quando usar, aparece aqui.</div>}
          </div>
        ))}
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

      {edit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={() => setEdit(null)}>
          <div className="card" style={{ padding: 18, width: 380, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
            <b>{edit.nome}</b>
            {[['limite_usd', 'Limite mensal (US$)'], ['saldo_usd', 'Saldo atual na conta (US$) — informe para sincronizar'], ['custo_unidade', 'Custo por unidade (US$, ex.: por PDF)']].map(([k, t]) => (
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
