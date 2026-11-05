'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { api, toast } from '@/components/ui';

function Chart({ pts, max, cor, fmt }: { pts: number[]; max: number; cor: string; fmt: (n: number) => string }) {
  const W = 600, H = 150;
  const n = Math.max(pts.length, 2);
  const xy = pts.map((v, i) => `${(i / (n - 1)) * W},${H - Math.min(1, v / (max || 1)) * (H - 8) - 4}`);
  const line = xy.join(' ');
  return (
    <svg className="uso-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="currentColor" opacity=".12" />
      ))}
      {pts.length > 1 && <polygon points={`0,${H} ${line} ${W},${H}`} fill={cor} opacity=".15" />}
      {pts.length > 1 && <polyline points={line} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
      <text x="4" y="12" fontSize="11" fill="currentColor" opacity=".6">{fmt(max)}</text>
    </svg>
  );
}
const dur = (s: number) => (s > 86400 ? `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h` : s > 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min` : `${Math.floor(s / 60)}min`);

export default function Uso() {
  const [d, setD] = useState<any>(null);
  async function load() {
    try {
      setD(await api('/api/uso-sistema', 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  if (!d) return <PageHead title="Uso do sistema" sub="CPU e memória do servidor" icon="pulse" tone="mut" help="horarios" />;
  const a = d.agora;
  const cpuMax = Math.max(100, ...d.hist.map((x: any) => x.cpu));
  const nivel = a.memPct > 90 || a.cpu > 85 ? 'bad' : a.memPct > 75 || a.cpu > 60 ? 'wait' : 'ok';
  const msg = { ok: 'Tranquilo: o servidor está folgado.', wait: 'Atenção: uso alto, vale acompanhar.', bad: 'Sobrecarregado: considere aumentar o servidor.' }[nivel as 'ok'];
  return (
    <>
      <PageHead title="Uso do sistema" sub="CPU, memória e carga do servidor onde o sistema roda (somente leitura)" icon="pulse" tone="mut" help="horarios" />
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <span className={`dm-dot ${nivel}`} />
        <b style={{ flex: 1 }}>{msg}</b>
        <button className="btn" onClick={load}>Atualizar</button>
      </div>
      <div className="uso-grid">
        <div className="card uso-kpi"><small className="muted">CPU (de {d.cores} núcleos)</small><b>{a.cpu}%</b></div>
        <div className="card uso-kpi"><small className="muted">Memória</small><b>{a.mem} MB</b><small className="muted">{a.memPct}% de {d.memTotalMB} MB</small></div>
        <div className="card uso-kpi"><small className="muted">Carga (1 min)</small><b>{a.load}</b></div>
        <div className="card uso-kpi"><small className="muted">No ar há</small><b>{dur(d.uptimeApp)}</b><small className="muted">servidor: {dur(d.uptimeServidor)}</small></div>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <b>CPU (%) · últimos minutos</b>
        <Chart pts={d.hist.map((x: any) => x.cpu)} max={cpuMax} cor="#2563eb" fmt={(n) => Math.round(n) + '%'} />
      </div>
      <div className="card">
        <b>Memória (%) · últimos minutos</b>
        <Chart pts={d.hist.map((x: any) => x.memPct)} max={100} cor="#9333ea" fmt={(n) => n + '%'} />
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Dados lidos do próprio contêiner do app no Easypanel, a cada 10 s (histórico zera quando o app reinicia).</p>
    </>
  );
}
