'use client';
/* Renovações de todos os clientes: domínio, hospedagem e mensalidades, com a próxima cobrança. */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { api, toast, brl } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { RenewalForm, KIND } from '@/components/ClientWidgets';
import { norm } from '@/lib/util';

const fmt = (d?: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
const left = (d: string) => Math.round((Date.parse(d + 'T12:00:00') - Date.now()) / 86400_000);

export default function Renovacoes() {
  const can = useCan();
  const [items, setItems] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<any>(null);
  const load = () =>
    api('/api/renovacoes', 'GET')
      .then((r) => setItems(r.items))
      .catch((e) => (toast(e.message), setItems([])));
  useEffect(() => {
    load();
  }, []);
  const list = useMemo(() => (items || []).filter((r) => !q || norm(`${r.title} ${r.leads?.name}`).includes(norm(q))), [items, q]);
  const mensal = (items || []).filter((r) => r.active).reduce((t, r) => t + (r.cycle === 'mensal' ? Number(r.amount) : Number(r.amount) / 12), 0);
  return (
    <>
      <PageHead title="Renovações" sub="Domínios, hospedagens e mensalidades: a cobrança sai sozinha no WhatsApp e cai no Financeiro" icon="refresh" help="clientes">
        <Link className="btn btn-sm btn-g" href="/clientes">
          ← Clientes
        </Link>
      </PageHead>
      <div className="grid g-kpi">
        <div className="card kpi">
          <div className="v">{(items || []).filter((r) => r.active).length}</div>
          <div className="l">Renovações ativas</div>
        </div>
        <div className="card kpi">
          <div className="v">{brl(mensal)}</div>
          <div className="l">Receita recorrente por mês</div>
        </div>
        <div className="card kpi">
          <div className="v">{(items || []).filter((r) => r.active && left(r.next_due) <= 15).length}</div>
          <div className="l">Vencem em até 15 dias</div>
        </div>
      </div>
      <input className="input" style={{ maxWidth: 380 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente ou serviço" />
      <div className="card" style={{ padding: 0 }}>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Ciclo</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th>Cobrança</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items === null && (
                <tr>
                  <td colSpan={7} className="muted">
                    Carregando…
                  </td>
                </tr>
              )}
              {items && !list.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    Nenhuma renovação. Cadastre na ficha do cliente (Clientes › cliente › Renovações).
                  </td>
                </tr>
              )}
              {list.map((r) => {
                const d = left(r.next_due);
                return (
                  <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                    <td style={{ whiteSpace: 'nowrap', color: d < 0 ? 'var(--bad)' : d <= 7 ? 'var(--warn)' : undefined, fontWeight: d <= 7 ? 650 : undefined }}>
                      {fmt(r.next_due)}
                      <small className="muted" style={{ display: 'block' }}>
                        {d < 0 ? `há ${-d} dias` : d === 0 ? 'hoje' : `em ${d} dias`}
                      </small>
                    </td>
                    <td>
                      <Link href={`/clientes/${r.lead_id}?aba=renovacoes`}>
                        <b>{r.leads?.name}</b>
                      </Link>
                    </td>
                    <td>
                      {r.title}
                      <small className="muted" style={{ display: 'block' }}>
                        {KIND[r.kind] || r.kind}
                      </small>
                    </td>
                    <td>{r.cycle === 'anual' ? 'Anual' : 'Mensal'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 650 }}>{brl(r.amount)}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>
                      {r.auto_charge ? `${r.remind_days}d antes no WhatsApp` : 'manual'}
                      {r.last_sent_at ? ' · enviada' : ''}
                    </td>
                    <td>
                      {can('leads.editar') && (
                        <button className="btn btn-sm btn-g" onClick={() => setEdit(r)}>
                          <Icon name="gear" /> Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {edit && <RenewalForm initial={edit} onClose={() => setEdit(null)} onSaved={load} />}
    </>
  );
}
