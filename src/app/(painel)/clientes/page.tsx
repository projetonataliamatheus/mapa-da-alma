'use client';
/* Clientes: a central de quem já comprou. Cada um tem a sua ficha com tudo junto. */
import { Flag } from '@/components/Flag';
import { paisDoLeadRow } from '@/lib/ddi';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { api, toast, brl, initials } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { sb } from '@/lib/supabase/browser';
import { norm } from '@/lib/util';

const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—');
const daysTo = (d: string) => Math.round((Date.parse(d + 'T12:00:00') - Date.now()) / 86400_000);

function AddClient({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      let r = sb().from('leads').select('id,name,niche,city,whatsapp,is_client').eq('is_client', false).order('updated_at', { ascending: false }).limit(12);
      if (q.trim()) r = r.ilike('name', `%${q.trim()}%`);
      const { data } = await r;
      setLeads(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  async function add(id: string) {
    try {
      await api('/api/clientes', 'POST', { lead_id: id, is_client: true });
      toast('Adicionado aos clientes');
      onAdded();
      onClose();
    } catch (e: any) {
      toast(e.message);
    }
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Adicionar cliente" style={{ textAlign: 'left', alignItems: 'stretch', width: 'min(520px, calc(100vw - 32px))' }}>
        <h2>Adicionar cliente</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Quem paga entra aqui sozinho. Use isto para clientes antigos ou que pagaram por fora.
        </p>
        <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contato pelo nome" />
        <div className="nb-list">
          {leads.map((l) => (
            <button key={l.id} className="nb-item" onClick={() => add(l.id)}>
              <b>{l.name}</b>
              <small className="muted">{[l.niche, l.city, l.whatsapp].filter(Boolean).join(' · ')}</small>
            </button>
          ))}
        </div>
        <button className="btn btn-g" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  );
}

export default function Clientes() {
  const can = useCan();
  const [list, setList] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState<'todos' | 'renovar' | 'producao' | 'instagram' | 'semacesso'>('todos');
  const [add, setAdd] = useState(false);
  const load = () =>
    api('/api/clientes', 'GET')
      .then((r) => setList(r.clients))
      .catch((e) => (toast(e.message), setList([])));
  useEffect(() => {
    load();
  }, []);
  const shown = useMemo(() => {
    let l = list || [];
    if (f === 'renovar') l = l.filter((c) => c.renewal && daysTo(c.renewal.next_due) <= 15);
    if (f === 'producao') l = l.filter((c) => c.production_status && c.production_status !== 'entregue');
    if (f === 'instagram') l = l.filter((c) => c.ig);
    if (f === 'semacesso') l = l.filter((c) => !c.account);
    if (q.trim()) l = l.filter((c) => norm(`${c.name} ${c.niche} ${c.city} ${c.whatsapp} ${c.ig?.username || ''}`).includes(norm(q)));
    return l;
  }, [list, q, f]);
  const tot = useMemo(() => {
    const l = list || [];
    return {
      n: l.length,
      total: l.reduce((t, c) => t + (c.total || 0), 0),
      renew: l.filter((c) => c.renewal && daysTo(c.renewal.next_due) <= 15).length,
      prod: l.filter((c) => c.production_status && c.production_status !== 'entregue').length,
    };
  }, [list]);

  return (
    <>
      <PageHead title="Clientes" sub="Tudo de cada cliente num lugar só: páginas, pagamentos, renovações, Instagram e acesso" icon="users" help="clientes">
        <a className="btn btn-sm" href="/api/clientes/compradores">
          ⬇ Compradores (Excel)
        </a>
        <Link className="btn btn-sm" href="/clientes/renovacoes">
          <Icon name="refresh" /> Renovações
        </Link>
        {can('leads.editar') && (
          <button className="btn btn-p btn-sm" onClick={() => setAdd(true)}>
            <Icon name="plus" /> Adicionar cliente
          </button>
        )}
      </PageHead>
      <div className="grid g-kpi">
        <div className="card kpi">
          <div className="v">{tot.n}</div>
          <div className="l">Clientes</div>
        </div>
        <div className="card kpi">
          <div className="v">{brl(tot.total)}</div>
          <div className="l">Total já recebido</div>
        </div>
        <div className="card kpi">
          <div className="v">{tot.renew}</div>
          <div className="l">Renovações nos próximos 15 dias</div>
        </div>
        <div className="card kpi">
          <div className="v">{tot.prod}</div>
          <div className="l">Em produção</div>
        </div>
      </div>
      <div className="fin-top">
        <div className="seg" role="tablist">
          {(
            [
              ['todos', 'Todos'],
              ['renovar', 'Renovando'],
              ['producao', 'Em produção'],
              ['instagram', 'Com Instagram'],
              ['semacesso', 'Sem acesso'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} aria-pressed={f === k} onClick={() => setF(k)}>
              {l}
            </button>
          ))}
        </div>
        <input className="input" style={{ maxWidth: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, ramo, cidade, WhatsApp ou @" />
      </div>
      {list === null ? (
        <p className="muted">Carregando…</p>
      ) : shown.length === 0 ? (
        <div className="card vault-empty">
          <Icon name="users" />
          <h2>{list.length ? 'Nada encontrado' : 'Nenhum cliente ainda'}</h2>
          <p className="muted">Quem paga entra aqui sozinho. Clientes antigos você adiciona pelo botão "Adicionar cliente".</p>
        </div>
      ) : (
        <div className="cl-grid">
          {shown.map((c) => {
            const d = c.renewal ? daysTo(c.renewal.next_due) : null;
            return (
              <Link key={c.id} href={`/clientes/${c.id}`} className="card cl-card">
                <div className="cl-h">
                  <span className="avatar cl-av" style={c.photo_url ? { background: `url("${c.photo_url}") center/cover` } : undefined}>
                    {!c.photo_url && initials(c.name)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{c.name}{paisDoLeadRow(c) && <Flag iso={paisDoLeadRow(c)} size={17} />}</b>
                    <small className="muted">{[c.niche, c.city].filter(Boolean).join(' · ') || c.whatsapp}</small>
                  </span>
                </div>
                <div className="cl-stats">
                  <span>
                    <small>Recebido</small>
                    <b>{brl(c.total)}</b>
                  </span>
                  <span>
                    <small>Cliente desde</small>
                    <b>{fmt(c.client_since)}</b>
                  </span>
                </div>
                <div className="cl-tags">
                  {c.production_status && c.production_status !== 'entregue' && (
                    <span className="chip" style={{ ['--t' as any]: c.production_due && c.production_due < new Date().toISOString().slice(0, 10) ? 'var(--bad)' : 'var(--ai)' }}>
                      Produção{c.production_due ? ` · ${fmt(c.production_due)}` : ''}
                    </span>
                  )}
                  {c.renewal && (
                    <span className="chip" style={{ ['--t' as any]: d! < 0 ? 'var(--bad)' : d! <= 7 ? 'var(--warn)' : 'var(--muted)' }}>
                      {c.renewal.title} · {d! < 0 ? `venceu há ${-d!}d` : d === 0 ? 'vence hoje' : `vence em ${d}d`}
                    </span>
                  )}
                  {c.ig && (
                    <span className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
                      @{c.ig.username}
                      {c.ig.followers != null ? ` · ${c.ig.followers.toLocaleString('pt-BR')}` : ''}
                      {c.ig.growth ? ` (${c.ig.growth > 0 ? '+' : ''}${c.ig.growth} em 30d)` : ''}
                    </span>
                  )}
                  {!c.account && <span className="chip">Sem acesso</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {add && <AddClient onClose={() => setAdd(false)} onAdded={load} />}
    </>
  );
}
