'use client';
/* Peças da central do cliente: gráfico de linha e formulário de renovação. */
import { useState } from 'react';
import { api, toast } from './ui';
import { todaySP } from '@/lib/finance';

const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—');
const n = (v: any) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));
export const KIND: Record<string, string> = { dominio: 'Domínio', hospedagem: 'Hospedagem', mensalidade: 'Mensalidade', outro: 'Outro' };

/* gráfico de linha simples (SVG) */
export function LineChart({ points, color = 'var(--accent)', height = 160, label }: { points: { x: string; y: number | null }[]; color?: string; height?: number; label: string }) {
  const pts = points.filter((p) => p.y != null) as { x: string; y: number }[];
  if (pts.length < 2) return <p className="muted" style={{ fontSize: 13 }}>Os gráficos aparecem a partir do 2º dia de leitura.</p>;
  const W = 600;
  const min = Math.min(...pts.map((p) => p.y));
  const max = Math.max(...pts.map((p) => p.y));
  const span = max - min || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * W, height - 18 - ((p.y - min) / span) * (height - 36)]);
  const d = xy.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="ig-chart" role="img" aria-label={label} preserveAspectRatio="none">
      <path d={`${d} L${W},${height} L0,${height} Z`} fill={color} opacity={0.1} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      {xy.map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1]} r={3} fill={color} vectorEffect="non-scaling-stroke">
          <title>
            {fmt(pts[i].x)}: {n(pts[i].y)}
          </title>
        </circle>
      ))}
      <text x={4} y={12} fontSize={11} fill="currentColor" opacity={0.6}>
        {n(max)}
      </text>
      <text x={4} y={height - 4} fontSize={11} fill="currentColor" opacity={0.6}>
        {n(min)}
      </text>
    </svg>
  );
}

export function RenewalForm({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ kind: 'dominio', cycle: 'anual', remind_days: 7, auto_charge: true, active: true, next_due: todaySP(), ...initial, amount: initial?.amount != null ? String(initial.amount).replace('.', ',') : '' });
  const set = (k: string, v: any) => setF((o: any) => ({ ...o, [k]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/renovacoes', f.id ? 'PATCH' : 'POST', { ...f, leads: undefined });
      toast('Salvo');
      onSaved();
      onClose();
    } catch (er: any) {
      toast(er.message);
    }
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="modal fin-form" onSubmit={save}>
        <h2>{f.id ? 'Editar renovação' : 'Nova renovação'}</h2>
        <div className="fin-2">
          <label className="field">
            <span>Tipo</span>
            <select
              className="input"
              value={f.kind}
              onChange={(e) => setF((o: any) => ({ ...o, kind: e.target.value, cycle: e.target.value === 'mensalidade' ? 'mensal' : o.cycle, title: o.title || (e.target.value === 'dominio' ? 'Renovação do domínio' : e.target.value === 'hospedagem' ? 'Hospedagem do site' : 'Mensalidade') }))}
            >
              {Object.entries(KIND).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Ciclo</span>
            <select className="input" value={f.cycle} onChange={(e) => set('cycle', e.target.value)}>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Descrição (aparece na cobrança)</span>
          <input className="input" required value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Renovação do domínio clinicasorriso.com.br" />
        </label>
        <div className="fin-2">
          <label className="field">
            <span>Valor (R$)</span>
            <input className="input" required inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value.replace(/[^\d,.]/g, ''))} />
          </label>
          <label className="field">
            <span>Próximo vencimento</span>
            <input className="input" type="date" required value={f.next_due} onChange={(e) => set('next_due', e.target.value)} />
          </label>
        </div>
        <div className="fin-2">
          <label className="field">
            <span>Cobrar quantos dias antes</span>
            <input className="input" type="number" min={0} max={30} value={f.remind_days} onChange={(e) => set('remind_days', e.target.value)} />
          </label>
          <label className="field" style={{ alignSelf: 'end' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={f.auto_charge} onChange={(e) => set('auto_charge', e.target.checked)} /> Mandar a cobrança no WhatsApp sozinho
            </span>
          </label>
        </div>
        <small className="muted">
          {f.remind_days} dia(s) antes do vencimento o sistema cria a conta a receber no Financeiro e o link de pagamento{f.auto_charge ? ', manda a cobrança no WhatsApp (horário comercial) e lembra de novo no dia do vencimento' : ''}. Quando o cliente paga, a próxima data é calculada sozinha.
        </small>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-g" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-p">Salvar</button>
        </div>
      </form>
    </>
  );
}

