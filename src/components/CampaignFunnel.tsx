'use client';
/* Visão geral › Funil por campanha: de onde vêm os clientes e onde desistem (anúncios, prospecção, direto). */
import { useEffect, useState } from 'react';
import { Ib } from './Icon';
import { api, brl } from './ui';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function CampaignFunnel() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setD(null);
    api(`/api/campaigns?days=${days}`, 'GET')
      .then((r) => (setD(r), setErr('')))
      .catch((e) => setErr(e.message));
  }, [days]);
  const rows: any[] = d?.rows || [];
  const max = Math.max(1, ...rows.map((r) => r.chegaram));
  return (
    <div className="card">
      <div className="card-h" style={{ flexWrap: 'wrap' }}>
        <Ib name="target" tone="acc" size="sm" />
        <h2>Funil por campanha</h2>
        <span className="sp" />
        <div className="sites-tabs" role="tablist" aria-label="Período">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" role="tab" aria-selected={days === n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>
              {n} dias
            </button>
          ))}
        </div>
      </div>
      {err ? (
        <p className="muted" style={{ fontSize: 13 }}>{err}</p>
      ) : !d ? (
        <div className="spin" />
      ) : rows.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Nenhum lead no período.</p>
      ) : (
        <div className="tablewrap">
          <table className="funnel-t">
            <thead>
              <tr>
                <th>Origem</th>
                <th className="num">Chegaram</th>
                <th className="num">Conversaram</th>
                <th className="num">Viram a prévia</th>
                <th className="num">Pagaram</th>
                <th className="num">Receita</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <span className={`src-tag src-${r.source}`}>{r.source === 'anuncio' ? 'Anúncio' : r.source === 'google' ? 'Prospecção' : 'Direto'}</span> <b>{r.name}</b>
                    <div className="funnel-bar" aria-hidden="true">
                      <i style={{ width: `${(r.chegaram / max) * 100}%` }} />
                      <i className="b2" style={{ width: `${(r.conversaram / max) * 100}%` }} />
                      <i className="b3" style={{ width: `${(r.previa / max) * 100}%` }} />
                      <i className="b4" style={{ width: `${(r.pagaram / max) * 100}%` }} />
                    </div>
                  </td>
                  <td className="num">{r.chegaram}</td>
                  <td className="num">
                    {r.conversaram} <small className="muted">{pct(r.conversaram, r.chegaram)}%</small>
                  </td>
                  <td className="num">
                    {r.previa} <small className="muted">{pct(r.previa, r.chegaram)}%</small>
                  </td>
                  <td className="num">
                    <b>{r.pagaram}</b> <small className="muted">{pct(r.pagaram, r.chegaram)}%</small>
                  </td>
                  <td className="num">
                    <b>{brl(r.receita)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Cada linha de <b>Configurações › Textos dos anúncios</b> é uma campanha. Para dar nome: <code>Site 149 = Quero criar o meu site…</code>
      </p>
    </div>
  );
}
