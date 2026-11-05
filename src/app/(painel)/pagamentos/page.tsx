'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Flag } from '@/components/Flag';
import { brl } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { nomePais, paisDoLeadRow } from '@/lib/ddi';
import { metodoDe, moedaDe, usdDe, brlDe, paisDoPg, usd, type Pg } from '@/lib/vendas';

const TZ = 'America/Sao_Paulo';
const dataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ }) : '—');
const horaBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');
const fmtTel = (w?: string) => { const d = String(w || '').replace(/\D/g, ''); return d ? '+' + d : '—'; };
const STATUS: Record<string, [string, string]> = { pago: ['Pago', 'var(--gg)'], pendente: ['Pendente', 'var(--warn)'], expirado: ['Expirado', 'var(--muted)'], cancelado: ['Cancelado', 'var(--muted)'], estornado: ['Estornado', 'var(--bad)'] };
const comprovanteDe = (p: Pg): { url: string | null; txt: string } => {
  const u = p.receipt_drive_url || p.asaas_receipt_url || p.ticket_url || null;
  if (u) return { url: u, txt: p.receipt_number ? `Recibo nº ${p.receipt_number}` : 'Comprovante' };
  if (String(p.provider) === 'kiwify') return { url: null, txt: `Kiwify · pedido ${p.provider_id || '—'}` };
  if (p.receipt_number) return { url: null, txt: `Recibo nº ${p.receipt_number}` };
  return { url: null, txt: '—' };
};

export default function Pagamentos() {
  const [dias, setDias] = useState(30);
  const [status, setStatus] = useState('pago');
  const [metodo, setMetodo] = useState('');
  const [pais, setPais] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setRows(null);
    const desde = dias ? new Date(Date.now() - dias * 86400000).toISOString() : '2000-01-01';
    sb().from('payments').select('id,amount,status,provider,method,moeda,valor_local,paid_at,created_at,service,provider_id,receipt_number,asaas_receipt_url,receipt_drive_url,ticket_url,leads(name,whatsapp,pais,idioma,source,campaign)')
      .gte('created_at', desde).order('created_at', { ascending: false }).limit(3000)
      .then(({ data, error }: any) => (error ? setErr(error.message) : setRows(data || [])));
  }, [dias]);

  const lista = useMemo(() => (rows || []).filter((p: any) => {
    const l = Array.isArray(p.leads) ? p.leads[0] : p.leads;
    if (p.provider === 'cortesia') return false;
    if (status && p.status !== status) return false;
    if (metodo && metodoDe(p) !== metodo) return false;
    if (pais && paisDoPg(p) !== pais) return false;
    if (q) { const t = (String(l?.name || '') + ' ' + String(l?.whatsapp || '') + ' ' + String(p.provider_id || '')).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  }), [rows, status, metodo, pais, q]);
  const paises = useMemo(() => [...new Set((rows || []).map((p: any) => paisDoPg(p)).filter(Boolean))] as string[], [rows]);
  const totUsd = lista.filter((p) => p.status === 'pago').reduce((a, p) => a + usdDe(p), 0);
  const totBrl = lista.filter((p) => p.status === 'pago').reduce((a, p) => a + brlDe(p), 0);

  function csv() {
    const cab = ['Data', 'Hora', 'Nome', 'WhatsApp', 'País', 'Moeda', 'Valor recebido', 'Valor em reais (referência)', 'Forma de pagamento', 'Status', 'Pedido/ID', 'Comprovante'];
    const lin = lista.map((p: any) => {
      const l = Array.isArray(p.leads) ? p.leads[0] : p.leads; const m = moedaDe(p); const c = comprovanteDe(p);
      const dt = p.paid_at || p.created_at;
      return [dataBR(dt), horaBR(dt), l?.name || '', fmtTel(l?.whatsapp), nomePais(paisDoPg(p)), m, m === 'BRL' ? Number(p.amount || 0).toFixed(2) : Number(p.valor_local || 0).toFixed(2), Number(p.amount || 0).toFixed(2), metodoDe(p), STATUS[p.status]?.[0] || p.status, p.provider_id || '', c.url || c.txt];
    });
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const blob = new Blob(['﻿' + [cab, ...lin].map((r) => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <>
      <PageHead title="Pagamentos" sub="Registro e log de todos os pagamentos: data, hora, cliente, WhatsApp, país, moeda e comprovante" icon="money" help="financeiro">
        <button className="btn btn-sm" onClick={csv} disabled={!lista.length}>⬇ Exportar planilha (CSV)</button>
      </PageHead>
      <div className="card">
        <div className="card-h" style={{ flexWrap: 'wrap', gap: 8 }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar nome, WhatsApp ou pedido" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ width: 130 }} value={dias} onChange={(e) => setDias(Number(e.target.value))}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={365}>1 ano</option><option value={0}>Tudo</option></select>
          <select className="input" style={{ width: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="pago">Pagos</option><option value="pendente">Pendentes</option><option value="">Todos</option></select>
          <select className="input" style={{ width: 170 }} value={metodo} onChange={(e) => setMetodo(e.target.value)}><option value="">Toda forma</option>{['Pix', 'Cartão de crédito', 'Cartão (Stripe)', 'Kiwify', 'Manual'].map((m) => <option key={m}>{m}</option>)}</select>
          <select className="input" style={{ width: 160 }} value={pais} onChange={(e) => setPais(e.target.value)}><option value="">Todos os países</option>{paises.map((c) => <option key={c} value={c}>{nomePais(c)}</option>)}</select>
          <span className="sp" />
          <b style={{ color: 'var(--gg)' }}>{usd(totUsd)}</b><b style={{ color: 'var(--gg)' }}>{brl(totBrl)}</b><span className="muted">{lista.length} registro(s)</span>
        </div>
        {err ? <p className="muted">{err}</p> : !rows ? <div className="spin" /> : (
          <div className="tablewrap">
            <table className="funnel-t">
              <thead><tr><th>Data</th><th>Hora</th><th>Nome</th><th>WhatsApp</th><th>País</th><th>Moeda</th><th className="num">Valor</th><th>Forma</th><th>Status</th><th>Comprovante</th></tr></thead>
              <tbody>
                {lista.length === 0 && <tr><td colSpan={10} className="muted">Nenhum pagamento com esses filtros.</td></tr>}
                {lista.map((p: any) => {
                  const l = Array.isArray(p.leads) ? p.leads[0] : p.leads; const c = comprovanteDe(p); const m = moedaDe(p); const dt = p.paid_at || p.created_at; const st = STATUS[p.status] || [p.status, 'var(--muted)']; const pc = paisDoPg(p);
                  return (
                    <tr key={p.id}>
                      <td>{dataBR(dt)}</td><td>{horaBR(dt)}</td><td><b>{l?.name || '—'}</b>{l?.source === 'site' && <span className="src-tag src-site" style={{ marginLeft: 6 }}>Site</span>}</td><td>{fmtTel(l?.whatsapp)}</td>
                      <td><span className="flagtxt">{pc ? <><Flag iso={pc} size={20} />{nomePais(pc)}</> : '—'}</span></td><td>{m}</td>
                      <td className="num"><b>{m === 'USD' ? usd(Number(p.valor_local || 0)) : m === 'BRL' ? brl(p.amount) : `${m} ${Number(p.valor_local || 0).toLocaleString('pt-BR')}`}</b></td>
                      <td>{metodoDe(p)}</td><td><span className="chip" style={{ ['--t' as any]: st[1] }}>{st[0]}</span></td>
                      <td>{c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.txt}</a> : <span className="muted">{c.txt}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
