'use client';
/* Catálogo digital: lista dos cardápios dos clientes (QR Code nas mesas). */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { api, toast, timeLabel, copyText } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { sb } from '@/lib/supabase/browser';
import { norm } from '@/lib/util';
import { ClientAccessButton, VisibleSwitch } from '@/components/ClientAccess';

const STATUS: Record<string, [string, string]> = {
  rascunho: ['Rascunho', 'var(--muted)'],
  previa: ['Prévia enviada', 'var(--warn)'],
  publicado: ['No ar', 'var(--ok)'],
  pausado: ['Pausado', 'var(--bad)'],
};
const SAMPLES: [string, string][] = [
  ['hamburgueria', '🍔 Hamburgueria'],
  ['pizzaria', '🍕 Pizzaria'],
  ['padaria', '🥐 Padaria / café'],
  ['bar', '🍺 Bar'],
  ['acai', '🍇 Açaí / sorveteria'],
  ['japones', '🍣 Japonês'],
  ['restaurante', '🍽️ Restaurante'],
];

function NewCatalog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState('restaurante');
  useEffect(() => {
    const t = setTimeout(async () => {
      let r = sb().from('leads').select('id,name,niche,city,whatsapp').order('updated_at', { ascending: false }).limit(12);
      if (q.trim()) r = r.ilike('name', `%${q.trim()}%`);
      const { data } = await r;
      setLeads(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  async function create(body: any) {
    setBusy(true);
    try {
      const r = await api('/api/catalogo', 'POST', body);
      router.push(`/catalogo/${r.id}`);
    } catch (e: any) {
      toast(e.message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Novo catálogo" style={{ textAlign: 'left', alignItems: 'stretch', width: 'min(540px, calc(100vw - 32px))' }}>
        <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="book" /> Novo catálogo digital
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Escolha o cliente: os dados da loja entram sozinhos e o cardápio já vem com produtos de exemplo do tipo de negócio (você troca depois).
        </p>
        <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente pelo nome" />
        <div className="nb-list">
          {leads.map((l) => (
            <button key={l.id} className="nb-item" disabled={busy} onClick={() => create({ lead_id: l.id })}>
              <b>{l.name}</b>
              <small className="muted">{[l.niche, l.city].filter(Boolean).join(' · ') || l.whatsapp || ''}</small>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto' }} value={sample} onChange={(e) => setSample(e.target.value)} aria-label="Tipo de negócio">
            {SAMPLES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn-g" onClick={() => create({ name: q.trim() || 'Novo estabelecimento', sample })} disabled={busy}>
            Começar sem cliente{q.trim() ? `: "${q.trim()}"` : ''}
          </button>
          <span className="sp" />
          <button className="btn btn-g" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}

export default function Catalogos() {
  const can = useCan();
  const [res, setRes] = useState<{ base: string; pages: any[] } | null>(null);
  const [q, setQ] = useState('');
  const [neu, setNeu] = useState(false);
  useEffect(() => {
    api('/api/catalogo', 'GET')
      .then(setRes)
      .catch((e) => (toast(e.message), setRes({ base: '', pages: [] })));
  }, []);
  const list = useMemo(() => (res?.pages || []).filter((p) => !q || norm(`${p.slug} ${p.data?.name} ${p.leads?.name || ''}`).includes(norm(q))), [res, q]);
  const tot = useMemo(
    () => ({
      on: (res?.pages || []).filter((p) => p.status === 'publicado').length,
      mensal: (res?.pages || []).filter((p) => p.status === 'publicado' && p.plan === 'mensal').length,
      views: (res?.pages || []).reduce((t, p) => t + (p.views || 0), 0),
    }),
    [res],
  );
  const host = (res?.base || '').replace(/^https?:\/\//, '');

  return (
    <>
      <PageHead title="Catálogo digital" sub="Cardápios com QR Code para as mesas: o cliente vê fotos e preços, o garçom anota o pedido" icon="book" help="catalogo">
        {can('catalogo.editar') && (
          <button className="btn btn-p btn-sm" onClick={() => setNeu(true)}>
            <Icon name="plus" />
            Novo catálogo
          </button>
        )}
      </PageHead>
      <div className="grid g-kpi">
        <div className="card kpi">
          <div className="v">{tot.on}</div>
          <div className="l">Catálogos no ar</div>
        </div>
        <div className="card kpi">
          <div className="v">{tot.mensal}</div>
          <div className="l">No plano mensal</div>
        </div>
        <div className="card kpi">
          <div className="v">{tot.views}</div>
          <div className="l">Leituras do QR / visitas</div>
        </div>
      </div>
      <input className="input" style={{ maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou endereço" />
      {res === null ? (
        <p className="muted">Carregando…</p>
      ) : list.length === 0 ? (
        <div className="card vault-empty">
          <Icon name="book" />
          <h2>{res.pages.length ? 'Nada encontrado' : 'Nenhum catálogo ainda'}</h2>
          <p className="muted">Crie a partir de um cliente: a loja e um cardápio de exemplo do tipo de negócio já entram prontos para mandar a prévia.</p>
        </div>
      ) : (
        <div className="bio-cards">
          {list.map((p) => {
            const st = STATUS[p.status] || STATUS.rascunho;
            const url = `${res.base}/${p.slug}`;
            return (
              <div key={p.id} className="card bio-card">
                <Link href={`/catalogo/${p.id}`} className="bio-card-h">
                  <span className="bio-card-av" style={{ borderRadius: 12, background: p.data?.logo ? `#fff url("${p.data.logo}") center/contain no-repeat` : `linear-gradient(135deg, ${p.data?.color || '#e8562a'}, ${p.data?.color2 || '#f5b301'})` }}>
                    {!p.data?.logo && (p.data?.name || '?').slice(0, 1)}
                  </span>
                  <span className="bio-card-tx">
                    <b title={p.data?.name || p.slug}>{p.data?.name || p.slug}</b>
                    <small className="muted" title={`${host}/${p.slug}`}>
                      {host}/{p.slug}
                    </small>
                    <span className="chip" style={{ ['--t' as any]: st[1] }}>
                      {st[0]}
                    </span>
                  </span>
                </Link>
                <div className="bio-card-n">
                  <span>
                    <b>{p.nprod}</b> produtos
                  </span>
                  <span>
                    <b>{p.views || 0}</b> visitas
                  </span>
                  <span className="muted">{p.plan === 'mensal' ? 'mensal' : 'pagamento único'}</span>
                  <span className="muted">{p.client_edited_at ? `dono editou ${timeLabel(p.client_edited_at)}` : `atualizado ${timeLabel(p.updated_at)}`}</span>
                </div>
                <div className="bio-card-v">
                  <VisibleSwitch kind="catalogo" id={p.id} name={p.data?.name || p.slug} value={p.visible !== false} onChange={(v) => setRes((r) => (r ? { ...r, pages: r.pages.map((x) => (x.id === p.id ? { ...x, visible: v } : x)) } : r))} />
                  <span className="muted" style={{ fontSize: 12 }}>{p.account_id ? 'Cliente com acesso' : 'Cliente sem acesso'}</span>
                  <ClientAccessButton kind="catalogo" id={p.id} name={p.data?.name || p.slug} />
                </div>
                <div className="bio-card-a">
                  <Link className="btn btn-sm" href={`/catalogo/${p.id}`}>
                    Editar
                  </Link>
                  <button className="btn btn-sm btn-g" onClick={() => copyText(url)}>
                    <Icon name="copy" /> Copiar link
                  </button>
                  <a className="btn btn-sm btn-g" href={`/c/${p.slug}/qr`} target="_blank" rel="noopener noreferrer">
                    <Icon name="qr" /> QR Code
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {neu && <NewCatalog onClose={() => setNeu(false)} />}
    </>
  );
}
