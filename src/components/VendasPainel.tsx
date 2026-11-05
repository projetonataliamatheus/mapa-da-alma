'use client';
/* Visão geral › Vendas: dólar x reais, método (Pix, cartão, Kiwify), ranking por país e mapas gerados. */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ib } from './Icon';
import { Flag } from './Flag';
import { brl } from './ui';
import { sb } from '@/lib/supabase/browser';
import { nomePais, paisDoLeadRow } from '@/lib/ddi';
import { metodoDe, usdDe, brlDe, paisDoPg, usd, type Pg } from '@/lib/vendas';

const PERIODOS: [string, number][] = [['Hoje', 1], ['7 dias', 7], ['30 dias', 30], ['90 dias', 90]];

export function VendasPainel() {
  const [dias, setDias] = useState(30);
  const [pgs, setPgs] = useState<Pg[] | null>(null);
  const [mapas, setMapas] = useState<any[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    setPgs(null);
    const desde = new Date(dias === 1 ? new Date().setHours(0, 0, 0, 0) : Date.now() - dias * 86400000).toISOString();
    (async () => {
      const db = sb();
      const [p, m] = await Promise.all([
        db.from('payments').select('id,amount,status,provider,method,moeda,valor_local,paid_at,created_at,service,leads(whatsapp,pais,idioma)').eq('status', 'pago').gte('paid_at', desde).order('paid_at', { ascending: false }).limit(5000),
        db.from('mapas').select('id,created_at,lead_id,leads(whatsapp,pais,idioma)').gte('created_at', desde).limit(5000),
      ]);
      if (p.error) return setErr(p.error.message);
      setPgs(((p.data as any[]) || []).filter((x) => x.provider !== 'cortesia'));
      setMapas(m.data || []);
    })();
  }, [dias]);

  const R = useMemo(() => {
    const lista = pgs || [];
    const porMetodo: Record<string, { n: number; usd: number; brl: number }> = {};
    const porPais: Record<string, { n: number; usd: number; brl: number; mapas: number }> = {};
    for (const p of lista) {
      const m = metodoDe(p);
      (porMetodo[m] ||= { n: 0, usd: 0, brl: 0 }); porMetodo[m].n++; porMetodo[m].usd += usdDe(p); porMetodo[m].brl += brlDe(p);
      const c = paisDoPg(p) || '??';
      (porPais[c] ||= { n: 0, usd: 0, brl: 0, mapas: 0 }); porPais[c].n++; porPais[c].usd += usdDe(p); porPais[c].brl += brlDe(p);
    }
    for (const mp of mapas) {
      const l = Array.isArray(mp.leads) ? mp.leads[0] : mp.leads;
      const c = (l && paisDoLeadRow(l)) || (mp.lead_id ? '??' : 'SITE');
      (porPais[c] ||= { n: 0, usd: 0, brl: 0, mapas: 0 }); porPais[c].mapas++;
    }
    const paises = Object.entries(porPais).sort((a, b) => b[1].n - a[1].n || b[1].mapas - a[1].mapas);
    return { totUsd: lista.reduce((a, p) => a + usdDe(p), 0), totBrl: lista.reduce((a, p) => a + brlDe(p), 0), n: lista.length, porMetodo: Object.entries(porMetodo).sort((a, b) => b[1].n - a[1].n), paises, top: paises.find(([c]) => c !== '??' && c !== 'SITE' && porPais[c].n > 0) };
  }, [pgs, mapas]);

  return (
    <div className="card">
      <div className="card-h" style={{ flexWrap: 'wrap' }}>
        <Ib name="pix" tone="gg" size="sm" />
        <h2>Vendas · dólar e reais</h2>
        <span className="sp" />
        <div className="sites-tabs" role="tablist" aria-label="Período">
          {PERIODOS.map(([l, n]) => (<button key={n} type="button" role="tab" aria-selected={dias === n} className={dias === n ? 'on' : ''} onClick={() => setDias(n)}>{l}</button>))}
        </div>
        <Link className="btn btn-g btn-sm" href="/pagamentos">Ver todos os pagamentos</Link>
      </div>
      {err ? <p className="muted" style={{ fontSize: 13 }}>{err}</p> : !pgs ? <div className="spin" /> : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card kpi"><div className="v" style={{ color: 'var(--gg)' }}>{usd(R.totUsd)}</div><div className="l">Recebido em dólar</div></div>
            <div className="card kpi"><div className="v" style={{ color: 'var(--gg)' }}>{brl(R.totBrl)}</div><div className="l">Recebido em reais</div></div>
            <div className="card kpi"><div className="v">{R.n}</div><div className="l">Vendas</div></div>
            <div className="card kpi"><div className="v">{mapas.length}</div><div className="l">Mapas gerados</div></div>
            <div className="card kpi"><div className="v flagtxt">{R.top ? <><Flag iso={R.top[0]} size={26} />{nomePais(R.top[0])}</> : '—'}</div><div className="l">País que mais compra</div></div>
          </div>
          <div className="grid g-2" style={{ gap: 16 }}>
            <div className="tablewrap">
              <table className="funnel-t">
                <thead><tr><th>Forma de pagamento</th><th className="num">Vendas</th><th className="num">Dólar</th><th className="num">Reais</th></tr></thead>
                <tbody>
                  {R.porMetodo.length === 0 && <tr><td colSpan={4} className="muted">Nenhuma venda no período.</td></tr>}
                  {R.porMetodo.map(([m, v]) => (<tr key={m}><td><b>{m}</b></td><td className="num">{v.n}</td><td className="num">{v.usd ? usd(v.usd) : '—'}</td><td className="num">{v.brl ? brl(v.brl) : '—'}</td></tr>))}
                </tbody>
              </table>
            </div>
            <div className="tablewrap">
              <table className="funnel-t">
                <thead><tr><th>País</th><th className="num">Vendas</th><th className="num">Dólar</th><th className="num">Reais</th><th className="num">Mapas gerados</th></tr></thead>
                <tbody>
                  {R.paises.length === 0 && <tr><td colSpan={5} className="muted">Nada ainda.</td></tr>}
                  {R.paises.map(([c, v]) => (
                    <tr key={c}>
                      <td><span className="flagtxt">{c === 'SITE' ? <><Ib name="globe" tone="acc" size="sm" /><b>Site (ainda sem WhatsApp)</b></> : c === '??' ? <b>Sem país</b> : <><Flag iso={c} size={22} /><b>{nomePais(c)}</b></>}</span></td>
                      <td className="num">{v.n}</td><td className="num">{v.usd ? usd(v.usd) : '—'}</td><td className="num">{v.brl ? brl(v.brl) : '—'}</td><td className="num">{v.mapas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Os totais usam só o que foi realmente recebido em cada moeda (dólar na Kiwify/cartão; reais no Pix e cartão do Brasil). Sem conversão automática.</p>
        </>
      )}
    </div>
  );
}
