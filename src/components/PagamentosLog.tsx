'use client';
import { useEffect, useMemo, useState } from 'react';
import { Flag, FlagIdioma } from '@/components/Flag';
import { brl } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { nomePais, paisDoLeadRow } from '@/lib/ddi';
import { metodoDe, moedaDe, usdDe, brlDe, paisDoPg, usd, type Pg } from '@/lib/vendas';

const TZ = 'America/Sao_Paulo';
const dataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ }) : '—');
const horaBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');
const fmtTel = (w?: string) => { const d = String(w || '').replace(/\D/g, ''); return d ? '+' + d : '—'; };
const STATUS: Record<string, [string, string]> = { pago: ['Pago', 'var(--gg)'], pendente: ['Pendente', 'var(--warn)'], expirado: ['Expirado', 'var(--muted)'], cancelado: ['Cancelado', 'var(--muted)'], estornado: ['Estornado', 'var(--bad)'] };
const plataformaDe = (p: any) => ({ kiwify: 'Kiwify', asaas: 'Asaas (Pix/cartão)', stripe: 'Stripe', mercadopago: 'Mercado Pago', manual: 'WhatsApp (manual)' } as Record<string, string>)[String(p.provider || '').toLowerCase()] || String(p.provider || '—');
const origemDe = (l: any) => (l?.source === 'site' ? 'Site' : l?.source === 'anuncio' ? 'Anúncio' : l?.source === 'google' ? 'Prospecção' : 'WhatsApp direto');
const comprovanteDe = (p: Pg): { url: string | null; txt: string } => {
  const u = p.receipt_drive_url || p.asaas_receipt_url || p.ticket_url || null;
  if (u) return { url: u, txt: p.receipt_number ? `Recibo nº ${p.receipt_number}` : 'Comprovante' };
  if (String(p.provider) === 'kiwify') return { url: null, txt: `Kiwify · pedido ${p.provider_id || '—'}` };
  if (p.receipt_number) return { url: null, txt: `Recibo nº ${p.receipt_number}` };
  return { url: null, txt: '—' };
};

export function PagamentosLog() {
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
    sb().from('payments').select('*,leads(name,whatsapp,pais,idioma,source,campaign)')
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
    const cab = ['Nome', 'WhatsApp', 'Data', 'Horário', 'País', 'Moeda', 'Idioma', 'Valor recebido', 'Valor em reais (referência)', 'Plataforma', 'Forma de pagamento', 'Origem', 'Status', 'Pedido/ID', 'Comprovante'];
    const lin = lista.map((p: any) => {
      const l = Array.isArray(p.leads) ? p.leads[0] : p.leads; const m = moedaDe(p); const c = comprovanteDe(p);
      const dt = p.paid_at || p.created_at;
      return [l?.name || '', fmtTel(l?.whatsapp), dataBR(dt), horaBR(dt), nomePais(paisDoPg(p)), m, (l?.idioma || (paisDoPg(p) === 'BR' ? 'pt' : 'es')) === 'es' ? 'Espanhol' : 'Português', m === 'BRL' ? Number(p.amount || 0).toFixed(2) : Number(p.valor_local || 0).toFixed(2), Number(p.amount || 0).toFixed(2), plataformaDe(p), metodoDe(p), origemDe(l), STATUS[p.status]?.[0] || p.status, p.provider_id || '', c.url || c.txt];
    });
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const blob = new Blob(['﻿' + [cab, ...lin].map((r) => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <>
      <div className="card" style={{ marginTop: 0 }}>
        <div className="card-h" style={{ flexWrap: 'wrap', gap: 8 }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar nome, WhatsApp ou pedido" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ width: 130 }} value={dias} onChange={(e) => setDias(Number(e.target.value))}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={365}>1 ano</option><option value={0}>Tudo</option></select>
          <select className="input" style={{ width: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="pago">Pagos</option><option value="pendente">Pendentes</option><option value="">Todos</option></select>
          <select className="input" style={{ width: 170 }} value={metodo} onChange={(e) => setMetodo(e.target.value)}><option value="">Toda forma</option>{['Pix', 'Cartão de crédito', 'Cartão (Stripe)', 'Kiwify', 'Manual'].map((m) => <option key={m}>{m}</option>)}</select>
          <select className="input" style={{ width: 160 }} value={pais} onChange={(e) => setPais(e.target.value)}><option value="">Todos os países</option>{paises.map((c) => <option key={c} value={c}>{nomePais(c)}</option>)}</select>
          <span className="sp" />
          <button className="btn btn-sm" onClick={csv} disabled={!lista.length}>⬇ Planilha (CSV)</button>
          <b style={{ color: 'var(--gg)' }}>{usd(totUsd)}</b><b style={{ color: 'var(--gg)' }}>{brl(totBrl)}</b><span className="muted">{lista.length} registro(s)</span>
        </div>
        {err ? <p className="muted">{err}</p> : !rows ? <div className="spin" /> : (
          <div className="tablewrap">
            <table className="funnel-t">
              <thead><tr><th>Nome</th><th>WhatsApp</th><th>Data</th><th>Horário</th><th>País</th><th>Moeda</th><th>Idioma</th><th className="num">Valor</th><th>Plataforma</th><th>Forma</th><th>Origem</th><th>Status</th><th>Comprovante</th></tr></thead>
              <tbody>
                {lista.length === 0 && <tr><td colSpan={13} className="muted">Nenhum pagamento com esses filtros.</td></tr>}
                {lista.map((p: any) => {
                  const l = Array.isArray(p.leads) ? p.leads[0] : p.leads; const c = comprovanteDe(p); const m = moedaDe(p); const dt = p.paid_at || p.created_at; const st = STATUS[p.status] || [p.status, 'var(--muted)']; const pc = paisDoPg(p);
                  return (
                    <tr key={p.id}>
                      <td><b>{l?.name || '—'}</b></td><td>{fmtTel(l?.whatsapp)}</td><td>{dataBR(dt)}</td><td>{horaBR(dt)}</td>
                      <td><span className="flagtxt">{pc ? <><Flag iso={pc} size={20} />{nomePais(pc)}</> : '—'}</span></td><td>{m}</td>
                      <td><span className="flagtxt"><FlagIdioma idioma={l?.idioma || (pc === 'BR' || !pc ? 'pt' : 'es')} size={18} />{(l?.idioma || (pc === 'BR' || !pc ? 'pt' : 'es')) === 'es' ? 'Espanhol' : 'Português'}</span></td>
                      <td className="num"><b>{m === 'USD' ? usd(Number(p.valor_local || 0)) : m === 'BRL' ? brl(p.amount) : `${m} ${Number(p.valor_local || 0).toLocaleString('pt-BR')}`}</b>{p.liquido_usd ? <><br /><small className="muted">líq. {usd(Number(p.liquido_usd))} ≈ {brl(p.amount)}</small></> : null}</td>
                      <td>{plataformaDe(p)}</td><td>{metodoDe(p)}</td><td>{l?.source === 'site' ? <span className="src-tag src-site">Site</span> : origemDe(l)}</td><td><span className="chip" style={{ ['--t' as any]: st[1] }}>{st[0]}</span></td>
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
