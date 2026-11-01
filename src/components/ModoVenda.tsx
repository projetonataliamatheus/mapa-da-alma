'use client';
/* Inteligência da IA › Abordagens: liga/desliga o modo de venda (Consulta x Modo Grazi) e compara os resultados. Só o Master muda. */
import { useEffect, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, brl } from '@/components/ui';

export function ModoVenda({ master }: { master: boolean }) {
  const [d, setD] = useState<any>(null);
  const [seg, setSeg] = useState('');
  const load = () => api('/api/modos', 'GET').then((r: any) => { setD(r); setSeg(String(r.config.segunda_oferta ?? '')); }).catch((e: any) => toast(e.message));
  useEffect(() => { load(); }, []);
  async function salvar(patch: any, msg: string) {
    try {
      await api('/api/settings', 'PATCH', { modo_venda: { ...d.config, ...patch } });
      toast(msg);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  if (!d) return <div className="card" style={{ marginBottom: 16 }}><span className="spin" /></div>;
  const ativo = d.config.ativo === 'grazi' ? 'grazi' : 'consulta';
  return (
    <div className="card" style={{ marginBottom: 16, borderColor: ativo === 'grazi' ? '#e8590c' : undefined }}>
      <div className="card-h">
        <Ib name="bolt" tone={ativo === 'grazi' ? 'warn' : 'ai'} size="sm" />
        <h2>Modo de venda</h2>
        <div className="sp" />
        <span className="chip" style={{ ['--t' as any]: ativo === 'grazi' ? '#e8590c' : 'var(--ai)' }}>Ativo agora: {d.modos[ativo].nome}</span>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>O modo ligado vale para TODAS as conversas da automação, com prioridade máxima sobre as outras regras. Cada conversa e cada venda fica registrada com o modo usado, para você comparar qual vende mais.</p>
      <div className="mv-grid">
        {(['consulta', 'grazi'] as const).map((m) => {
          const r = d.resultados[m] || {};
          const on = ativo === m;
          return (
            <div key={m} className={'mv-card' + (on ? ' on' : '')} style={{ ['--c' as any]: m === 'grazi' ? '#e8590c' : '#7a5af8' }}>
              <div className="mv-top">
                <b>{d.modos[m].nome}</b>
                <label className="mv-sw" title={master ? '' : 'Só o Master muda o modo'}>
                  <input type="checkbox" checked={on} disabled={!master} onChange={(e) => salvar({ ativo: e.target.checked ? m : m === 'grazi' ? 'consulta' : 'grazi' }, e.target.checked ? `${d.modos[m].nome} ligado para todas as conversas` : 'Modo trocado')} />
                  <span>{on ? 'Ligado' : 'Desligado'}</span>
                </label>
              </div>
              <p>{d.modos[m].descricao}</p>
              <div className="mv-num">
                <div><b>{r.conversas || 0}</b><small>conversas</small></div>
                <div><b>{r.vendas || 0}</b><small>vendas</small></div>
                <div><b>{r.conversao || 0}%</b><small>conversão</small></div>
                <div><b>{brl(r.valor || 0)}</b><small>vendido</small></div>
              </div>
            </div>
          );
        })}
      </div>
      {master && (
        <div className="row" style={{ gap: 8, alignItems: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="mv-seg">Modo Grazi: valor da segunda oferta (dia seguinte, vale 24 h)</label>
            <input id="mv-seg" className="input" inputMode="decimal" value={seg} onChange={(e) => setSeg(e.target.value)} style={{ width: 160 }} placeholder="37" />
          </div>
          <button className="btn btn-g" onClick={() => salvar({ segunda_oferta: Number(String(seg).replace(',', '.')) || null }, 'Valor da segunda oferta salvo')}><Icon name="check" />Salvar</button>
        </div>
      )}
      <style>{`.mv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.mv-card{border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;opacity:.85}.mv-card.on{border-color:var(--c);opacity:1;background:color-mix(in srgb,var(--c) 6%,transparent)}
.mv-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.mv-top b{color:var(--c)}
.mv-sw{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;cursor:pointer}.mv-sw input{width:18px;height:18px;accent-color:var(--c)}
.mv-card p{font-size:13px;color:var(--muted);margin:6px 0 10px}
.mv-num{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}.mv-num b{display:block;font-size:16px}.mv-num small{font-size:11px;color:var(--muted)}`}</style>
    </div>
  );
}
