'use client';
/* Aviso na tela: contas vencidas ou que vencem em até 3 dias (uma vez por sessão, para quem vê o Financeiro). */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { brl } from './ui';

export function FinAlerts({ fin, prod }: { fin: boolean; prod: boolean }) {
  const enabled = fin || prod;
  const [items, setItems] = useState<any[]>([]);
  const [today, setToday] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let seen = '';
    try {
      seen = sessionStorage.getItem('fin-alert') || '';
    } catch {}
    const t = setTimeout(() => {
      Promise.all([
        fin ? fetch('/api/financeiro/alertas', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)) : null,
        prod ? fetch('/api/financeiro/resumo', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)) : null,
      ])
        .then(([a, b]) => {
          const today = a?.today || new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
          const late = (b?.deliveries || []).filter((x: any) => x.late).map((x: any) => ({ id: 'd' + x.id, description: `Entrega: ${x.name}`, amount: null, due_date: x.due, delivery: true }));
          const j = { today, items: [...late, ...(a?.items || [])] };
          if (!j.items.length) return;
          const sig = j.today + ':' + j.items.map((x: any) => x.id).join(',');
          if (sig === seen) return;
          setToday(j.today);
          setItems(j.items);
          try {
            sessionStorage.setItem('fin-alert', sig);
          } catch {}
        })
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [enabled, fin, prod]);
  if (!items.length) return null;
  const days = (d: string) => Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400_000);
  const late = items.filter((x) => days(x.due_date) < 0).length;
  return (
    <div className="fin-pop" role="alertdialog" aria-label="Contas a vencer">
      <div className="fin-pop-h">
        <b>{late ? `⚠️ ${late} item(ns) atrasado(s)` : '🔔 Vencimentos'}</b>
        <button className="iconbtn" onClick={() => setItems([])} aria-label="Fechar aviso">
          ✕
        </button>
      </div>
      {items.slice(0, 5).map((x) => {
        const n = days(x.due_date);
        return (
          <div key={x.id} className={`fin-pop-i ${n < 0 ? 'late' : ''}`}>
            <span>{x.description}</span>
            <b>{x.amount != null ? brl(x.amount) : ''}</b>
            <small>{x.delivery ? `prazo de entrega passou há ${-n} dia(s)` : n < 0 ? `venceu há ${-n} dia(s)` : n === 0 ? 'vence hoje' : `vence em ${n} dia(s)`}</small>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 6 }}>
        {items.some((x) => !x.delivery) && (
          <Link className="btn btn-sm btn-p" href="/financeiro" onClick={() => setItems([])}>
            Abrir o Financeiro
          </Link>
        )}
        {items.some((x) => x.delivery) && (
          <Link className="btn btn-sm" href="/producao" onClick={() => setItems([])}>
            Abrir a Produção
          </Link>
        )}
      </div>
    </div>
  );
}
