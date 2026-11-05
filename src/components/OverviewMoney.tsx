'use client';
/* Visão geral: dinheiro do mês, contas vencendo, entregas com prazo e renovações próximas. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { brl } from './ui';

const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function OverviewMoney() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    fetch('/api/financeiro/resumo', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setD)
      .catch(() => {});
  }, []);
  if (!d || (!d.fin && !d.deliveries && !d.renewals)) return null;
  return (
    <div className="ov-money">
      {d.fin && (
        <>
          <Link href="/financeiro" className="card kpi ov-k">
            <div className="v" style={{ color: 'var(--ok)' }}>{brl(d.fin.received)}</div>
            <div className="l">Recebido no mês</div>
          </Link>
          <Link href="/financeiro" className="card kpi ov-k">
            <div className="v">{brl(d.fin.receivable)}</div>
            <div className="l">A receber</div>
          </Link>
          <Link href="/financeiro" className="card kpi ov-k" style={d.fin.bills_late ? { borderColor: 'color-mix(in srgb, var(--bad) 45%, var(--line))' } : undefined}>
            <div className="v" style={{ color: d.fin.bills_late ? 'var(--bad)' : d.fin.bills ? 'var(--warn)' : undefined }}>{d.fin.bills}</div>
            <div className="l">
              Contas vencendo{d.fin.bills ? ` · ${brl(d.fin.bills_sum)}` : ''}
              {d.fin.bills_late ? ` · ${d.fin.bills_late} vencida(s)` : ''}
            </div>
          </Link>
        </>
      )}
    </div>
  );
}
