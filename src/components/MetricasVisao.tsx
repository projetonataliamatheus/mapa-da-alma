'use client';
/* Visão geral › métricas de vendas e conversão do Mapa da Alma (recebido, médias, mapas, conversão, dores mais citadas). */
import { useEffect, useMemo, useState } from 'react';
import { Ib } from './Icon';
import { Flag } from './Flag';
import { brl } from './ui';
import { sb } from '@/lib/supabase/browser';
import { nomePais, paisDoLeadRow } from '@/lib/ddi';
import { usdDe, brlDe, paisDoPg, usd } from '@/lib/vendas';

const DIA = 86400000;
const pct = (a: number, b: number) => (b > 0 ? `${Math.min(100, (a / b) * 100).toFixed(a / b >= 0.1 ? 0 : 1).replace('.', ',')}%` : '—');
const dinheiro = (u: number, r: number) => (u && r ? `${brl(r)} + ${usd(u)}` : u ? usd(u) : brl(r));

function K({ icon, tone, v, l, sub }: { icon: string; tone: string; v: any; l: string; sub?: string }) {
  return (
    <div className="card kpi">
      <div className="row"><Ib name={icon} tone={tone} /></div>
      <div className="v">{v}</div>
      <div className="l">{l}</div>
      {sub && <small className="muted" style={{ display: 'block', marginTop: 2 }}>{sub}</small>}
    </div>
  );
}

export function MetricasVisao() {
  const [pgs, setPgs] = useState<any[] | null>(null);
  const [mapas, setMapas] = useState<any[]>([]);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [dores, setDores] = useState<any[]>([]);
  const [idioma, setIdioma] = useState<'todos' | 'es' | 'pt'>('todos');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const db = sb();
      const desde = new Date(Date.now() - 31 * DIA).toISOString();
      const [p, m, ms, d] = await Promise.all([
        db.from('payments').select('id,lead_id,amount,status,provider,method,moeda,valor_local,paid_at,leads(whatsapp,pais,idioma)').eq('status', 'pago').order('paid_at', { ascending: false }).limit(20000),
        db.from('mapas').select('id,lead_id,created_at').limit(20000),
        db.from('messages').select('lead_id,created_at').eq('direction', 'in').gte('created_at', desde).limit(50000),
        db.from('leads').select('pains,idioma').not('pains', 'is', null).limit(20000),
      ]);
      if (p.error) return setErr(p.error.message);
      setPgs(((p.data as any[]) || []).filter((x) => x.provider !== 'cortesia' && x.paid_at));
      setMapas(m.data || []);
      setMsgs(ms.data || []);
      setDores(d.data || []);
    })();
  }, []);

  const R = useMemo(() => {
    const lista = pgs || [];
    const agora = Date.now();
    const ini = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const mesIni = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const soma = (f: (p: any) => boolean) => { const l = lista.filter(f); return { n: l.length, u: l.reduce((a, p) => a + usdDe(p), 0), r: l.reduce((a, p) => a + brlDe(p), 0), leads: new Set(l.map((p) => p.lead_id).filter(Boolean)) }; };
    const t = (p: any) => new Date(p.paid_at).getTime();
    const total = soma(() => true);
    const mes = soma((p) => t(p) >= mesIni);
    const s7 = soma((p) => t(p) >= agora - 7 * DIA);
    const hoje = soma((p) => t(p) >= ini);
    const primeira = lista.length ? Math.min(...lista.map(t)) : agora;
    const dias = Math.max(1, (agora - primeira) / DIA);
    const media = (x: number) => x / dias;
    // mapas → compraram
    const comMapa = new Set(mapas.map((m) => m.lead_id).filter(Boolean));
    const convertidos = [...comMapa].filter((id) => total.leads.has(id)).length;
    // conversas (pessoas que mandaram mensagem) por janela
    const pessoas = (desde: number) => new Set(msgs.filter((m) => new Date(m.created_at).getTime() >= desde).map((m) => m.lead_id).filter(Boolean));
    const cHoje = pessoas(ini), c7 = pessoas(agora - 7 * DIA), c30 = pessoas(Math.max(mesIni, agora - 31 * DIA)); // mês atual
    // países
    const porPais: Record<string, { n: number; u: number; r: number }> = {};
    for (const p of lista) { const c = paisDoPg(p) || '??'; (porPais[c] ||= { n: 0, u: 0, r: 0 }); porPais[c].n++; porPais[c].u += usdDe(p); porPais[c].r += brlDe(p); }
    const paises = Object.entries(porPais).filter(([c]) => c !== '??').sort((a, b) => b[1].n - a[1].n).slice(0, 6);
    return { total, mes, s7, hoje, dias, media, convertidos, nMapas: mapas.length, cHoje, c7, c30, paises, pagosHoje: hoje.n, pagos7: s7.n, pagosMes: mes.n };
  }, [pgs, mapas, msgs]);

  const ranking = useMemo(() => {
    const cont: Record<string, { n: number; nome: string }> = {};
    for (const l of dores) {
      if (idioma !== 'todos' && (l.idioma === 'es' ? 'es' : 'pt') !== idioma) continue;
      for (const raw of Array.isArray(l.pains) ? l.pains : []) {
        const nome = String(raw || '').trim();
        const k = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (!k) continue;
        (cont[k] ||= { n: 0, nome }).n++;
      }
    }
    return Object.values(cont).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [dores, idioma]);

  if (err) return <p className="muted" style={{ fontSize: 13 }}>{err}</p>;
  if (!pgs) return <div className="spin" />;
  const T = R.total;
  const maxD = Math.max(1, ...ranking.map((x) => x.n));
  return (
    <>
      <h3 style={{ margin: '4px 0 10px', fontSize: 14 }} className="muted">Dinheiro</h3>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        <K icon="money" tone="ok" v={dinheiro(T.u, T.r)} l="Recebido total (desde o início)" />
        <K icon="money" tone="ok" v={dinheiro(R.mes.u, R.mes.r)} l="Recebido no mês" sub={`${R.mes.n} venda(s)`} />
        <K icon="trend" tone="acc" v={dinheiro(R.s7.u, R.s7.r)} l="Vendido nos últimos 7 dias" sub={`${R.s7.n} venda(s)`} />
        <K icon="pix" tone="gg" v={brl(T.r)} l="Recebido em reais (R$)" />
        <K icon="globe" tone="acc" v={usd(T.u)} l="Recebido em dólar (US$)" />
        <K icon="check" tone="ok" v={T.n} l="Vendas realizadas (total)" />
      </div>
      <h3 style={{ margin: '18px 0 10px', fontSize: 14 }} className="muted">Médias de venda</h3>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        <K icon="trend" tone="acc" v={dinheiro(R.media(T.u), R.media(T.r))} l="Média por dia" sub={`${R.media(T.n).toFixed(1).replace('.', ',')} venda(s)/dia`} />
        <K icon="trend" tone="acc" v={dinheiro(R.media(T.u) * 7, R.media(T.r) * 7)} l="Média por semana" sub={`${(R.media(T.n) * 7).toFixed(1).replace('.', ',')} venda(s)/semana`} />
        <K icon="trend" tone="acc" v={dinheiro(R.media(T.u) * 30, R.media(T.r) * 30)} l="Média por mês" sub={`${(R.media(T.n) * 30).toFixed(1).replace('.', ',')} venda(s)/mês`} />
      </div>
      <h3 style={{ margin: '18px 0 10px', fontSize: 14 }} className="muted">Mapas e conversão</h3>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        <K icon="star" tone="acc" v={R.nMapas} l="Mapas gerados" />
        <K icon="check" tone="ok" v={pct(R.convertidos, R.nMapas)} l="Convertidos (dos mapas gerados, quantos compraram)" sub={`${R.convertidos} de ${R.nMapas}`} />
        <K icon="wa" tone="wa" v={R.cHoje.size} l="Conversas no WhatsApp hoje" sub={`Conversão hoje: ${pct(R.pagosHoje, R.cHoje.size)} (${R.pagosHoje} compra(s))`} />
        <K icon="wa" tone="wa" v={R.c7.size} l="Conversas no WhatsApp · 7 dias" sub={`Conversão 7 dias: ${pct(R.pagos7, R.c7.size)} (${R.pagos7} compra(s))`} />
        <K icon="wa" tone="wa" v={R.c30.size} l="Conversas no WhatsApp · mês" sub={`Conversão do mês: ${pct(R.pagosMes, R.c30.size)} (${R.pagosMes} compra(s))`} />
      </div>
      <div className="grid g-2" style={{ gap: 16, marginTop: 18 }}>
        <div className="card">
          <div className="card-h"><Ib name="globe" tone="acc" size="sm" /><h2>Países que mais compram</h2></div>
          {R.paises.length === 0 ? <p className="muted">Nenhuma venda ainda.</p> : (
            <div className="tablewrap"><table className="funnel-t"><thead><tr><th>País</th><th className="num">Vendas</th><th className="num">Recebido</th></tr></thead><tbody>
              {R.paises.map(([c, v]) => (<tr key={c}><td><span className="flagtxt"><Flag iso={c} size={22} /><b>{nomePais(c)}</b></span></td><td className="num">{v.n}</td><td className="num">{dinheiro(v.u, v.r)}</td></tr>))}
            </tbody></table></div>
          )}
        </div>
        <div className="card">
          <div className="card-h">
            <Ib name="flame" tone="acc" size="sm" /><h2>Dores mais citadas</h2><span className="sp" />
            <div className="sites-tabs" role="tablist" aria-label="Idioma">
              {([['todos', 'Todos'], ['es', 'Espanhol'], ['pt', 'Português']] as const).map(([k, l]) => (<button key={k} type="button" role="tab" aria-selected={idioma === k} className={idioma === k ? 'on' : ''} onClick={() => setIdioma(k)}>{l}</button>))}
            </div>
          </div>
          {ranking.length === 0 ? <p className="muted">Ainda não há dores registradas nas conversas.</p> : (
            <div className="funnel">
              {ranking.map((x) => (<div className="frow" key={x.nome}><span style={{ textTransform: 'capitalize' }}>{x.nome}</span><div><div className="bar" style={{ width: `${Math.max(3, (x.n / maxD) * 100)}%` }} /></div><b>{x.n}</b></div>))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
