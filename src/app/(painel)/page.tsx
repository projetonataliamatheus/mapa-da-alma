'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { OverviewMoney } from '@/components/OverviewMoney';
import { Ib } from '@/components/Icon';
import { LeadDrawer } from '@/components/LeadDrawer';
import { CampaignFunnel } from '@/components/CampaignFunnel';
import { VendasPainel } from '@/components/VendasPainel';
import { useLive, brl, timeLabel } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { startOfTodayISO } from '@/lib/util';
import { dailyLimit } from '@/lib/limits';
import { DEFAULT_SETTINGS, deepMerge } from '@/lib/settings';

const EV_ICON: Record<string, [string, string]> = {
  wa: ['wa', 'wa'], ig: ['ig', 'ig'], gg: ['pin', 'gg'], ai: ['robot', 'ai'], acc: ['spark', 'acc'], ok: ['check', 'ok'], warn: ['alert', 'warn'], pay: ['pix', 'gg'], sys: ['bolt', 'mut'],
};

export default function Visao() {
  const [k, setK] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<[string, number][]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [series, setSeries] = useState<number[]>([]);
  const [limits, setLimits] = useState(DEFAULT_SETTINGS.limits);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const db = sb();
    const today = startOfTodayISO();
    const since48 = new Date(Date.now() - 48 * 3600000).toISOString();
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
    const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
    const [leadsToday, evToday, talk, hot, paid, ev, al, stages, nums, settings] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', today),
      db.from('lead_events').select('type').gte('created_at', today).in('type', ['wa_first', 'followup', 'ig_sent']).limit(5000),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('wa_status', 'conversa').gte('last_inbound_at', since48),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('temperature', 65).not('stage', 'in', '(pago,sem)'),
      db.from('leads').select('paid_amount,paid_at').gte('paid_at', since14),
      db.from('lead_events').select('*').order('created_at', { ascending: false }).limit(30),
      db.from('leads').select('id,name,needs_human,temperature').not('needs_human', 'is', null).order('updated_at', { ascending: false }).limit(8),
      db.from('leads').select('stage').limit(10000),
      db.from('whatsapp_numbers').select('*').order('created_at'),
      db.from('settings').select('data').eq('id', 1).maybeSingle(),
    ]);
    const evs = evToday.data || [];
    const paidRows = paid.data || [];
    const sales7 = paidRows.filter((p: any) => p.paid_at >= since7);
    setK({
      found: leadsToday.count || 0,
      wa: evs.filter((e: any) => e.type !== 'ig_sent').length,
      ig: evs.filter((e: any) => e.type === 'ig_sent').length,
      talk: talk.count || 0,
      hot: hot.count || 0,
      sales: sales7.reduce((a: number, p: any) => a + Number(p.paid_amount || 0), 0),
      salesN: sales7.length,
    });
    setEvents(ev.data || []);
    setAlerts(al.data || []);
    const counts: Record<string, number> = {};
    (stages.data || []).forEach((s: any) => (counts[s.stage] = (counts[s.stage] || 0) + 1));
    const reached = (keys: string[]) => keys.reduce((a, x) => a + (counts[x] || 0), 0);
    setFunnel([
      ['Encontrados', (stages.data || []).length],
      ['Abordados', reached(['abordado', 'respondeu', 'interessado', 'negociando', 'pix', 'pago', 'sem', 'remarketing'])],
      ['Responderam', reached(['respondeu', 'interessado', 'negociando', 'pix', 'pago'])],
      ['Interessados', reached(['interessado', 'negociando', 'pix', 'pago'])],
      ['Negociando', reached(['negociando', 'pix', 'pago'])],
      ['Pagos', reached(['pago'])],
    ]);
    setNumbers(nums.data || []);
    setLimits(deepMerge(DEFAULT_SETTINGS, settings.data?.data || {}).limits);
    const days: number[] = new Array(14).fill(0);
    paidRows.forEach((p: any) => {
      const idx = 13 - Math.floor((Date.now() - new Date(p.paid_at).getTime()) / 86400000);
      if (idx >= 0 && idx < 14) days[idx]++;
    });
    setSeries(days);
  }
  useLive(['lead_events', 'leads', 'whatsapp_numbers'], load);

  const kpis: any[] = k
    ? [
        ['radar', 'gg', 'Leads encontrados hoje', k.found],
        ['wa', 'wa', 'Mensagens WhatsApp hoje', k.wa],
        ['ig', 'ig', 'Directs no Instagram hoje', k.ig],
        ['chat', 'ai', 'Em conversa (48h)', k.talk],
        ['flame', 'acc', 'Leads quentes', k.hot],
        ['money', 'ok', `Vendas em 7 dias (${k.salesN})`, brl(k.sales)],
      ]
    : [];

  const W = 520, H = 150, pl = 28, pr = 12, pt = 12, pb = 24;
  const mx = Math.max(4, ...series);
  const sx = (i: number) => pl + (i * (W - pl - pr)) / 13;
  const sy = (v: number) => pt + (H - pt - pb) * (1 - v / mx);
  const pts = series.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const fmax = Math.max(1, funnel[0]?.[1] || 1);

  return (
    <>
      <PageHead title="Visão geral" sub="O que a automação está fazendo agora, em tempo real" icon="pulse" help="painel-visao" />
      <OverviewMoney />
      <div className="grid g-kpi">
        {kpis.map((x, i) => (
          <div className="card kpi" key={i}>
            <div className="row">
              <Ib name={x[0]} tone={x[1]} delay={i * 0.35} />
            </div>
            <div className="v">{x[3]}</div>
            <div className="l">{x[2]}</div>
          </div>
        ))}
      </div>
      <VendasPainel />
      <CampaignFunnel />
      <div className="grid g-2">
        <div className="card">
          <div className="card-h">
            <Ib name="bolt" tone="acc" size="sm" />
            <h2>Ao vivo</h2>
          </div>
          <div className="feed">
            {events.length === 0 && <p className="muted">As ações da automação aparecem aqui assim que começarem.</p>}
            {events.map((e, i) => {
              const ic = EV_ICON[e.channel] || EV_ICON.sys;
              return (
                <div className={`fi ${i === 0 ? 'new' : ''}`} key={e.id} onClick={() => e.lead_id && setOpen(e.lead_id)} style={{ cursor: e.lead_id ? 'pointer' : 'default' }}>
                  <Ib name={ic[0]} tone={ic[1]} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <p>{e.text}</p>
                    {e.meta?.approach && <small>Abordagem: {e.meta.approach}</small>}
                  </div>
                  <span className="tm">{timeLabel(e.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <Ib name="bell" tone="warn" size="sm" />
              <h2>Precisa de você</h2>
              <span className="sp chip" style={{ ['--t' as any]: 'var(--warn)' }}>
                {alerts.length}
              </span>
            </div>
            <div className="grid" style={{ gap: 8 }}>
              {alerts.length === 0 && <p className="muted">Nada pendente. A IA está dando conta.</p>}
              {alerts.map((a) => (
                <div className="alert" key={a.id}>
                  <Ib name={a.temperature >= 65 ? 'call' : 'bell'} tone={a.temperature >= 65 ? 'acc' : 'warn'} size="sm" />
                  <p>
                    <b>{a.name}</b>
                    <br />
                    <small className="muted">{a.needs_human}</small>
                  </p>
                  <button className="btn btn-sm" onClick={() => setOpen(a.id)}>
                    Abrir
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="trend" tone="acc" size="sm" />
              <h2>Funil</h2>
            </div>
            <div className="funnel">
              {funnel.map((f) => (
                <div className="frow" key={f[0]}>
                  <span>{f[0]}</span>
                  <div>
                    <div className="bar" style={{ width: `${Math.max(2, (f[1] / fmax) * 100)}%` }} />
                  </div>
                  <b>{f[1]}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-h">
            <Ib name="money" tone="ok" size="sm" />
            <h2>Vendas por dia</h2>
            <span className="sp muted" style={{ fontSize: 12 }}>
              últimos 14 dias
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 320, display: 'block' }} role="img" aria-label="Vendas por dia">
              {[0, mx / 2, mx].map((v) => (
                <g key={v}>
                  <line x1={pl} x2={W - pr} y1={sy(v)} y2={sy(v)} stroke="var(--line)" />
                  <text x={pl - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                    {Math.round(v)}
                  </text>
                </g>
              ))}
              {series.length > 0 && (
                <>
                  <polygon points={`${sx(0)},${sy(0)} ${pts} ${sx(13)},${sy(0)}`} fill="color-mix(in srgb,var(--accent) 16%,transparent)" />
                  <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" />
                  <circle cx={sx(13)} cy={sy(series[13])} r="4.5" fill="var(--accent)" />
                </>
              )}
              <text x={sx(0)} y={H - 6} fontSize="11" fill="var(--muted)">
                14 dias atrás
              </text>
              <text x={sx(13)} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="end">
                hoje
              </text>
            </svg>
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <Ib name="phone" tone="wa" size="sm" />
            <h2>Saúde dos números</h2>
            <Link className="sp btn btn-sm btn-g" href="/numeros">
              Ver todos
            </Link>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            {numbers.length === 0 && (
              <p className="muted">
                Nenhum número conectado. <Link href="/numeros" className="linkbtn">Conectar o primeiro</Link>
              </p>
            )}
            {numbers.map((n) => {
              const lim = dailyLimit(n, limits);
              const paused = n.paused_until && new Date(n.paused_until) > new Date();
              return (
                <div key={n.id} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr) 96px', gap: 10, alignItems: 'center', fontSize: 13 }}>
                  <b>{n.label}</b>
                  <div className="progress">
                    <i style={{ width: `${Math.min(100, (n.sent_today / lim) * 100)}%`, background: paused || n.status !== 'conectado' ? 'var(--warn)' : 'var(--wa)' }} />
                  </div>
                  <span className="num muted" style={{ textAlign: 'right' }}>
                    {n.status !== 'conectado' ? 'desconectado' : paused ? 'pausado' : `${n.sent_today} / ${lim}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {open && <LeadDrawer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

