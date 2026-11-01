'use client';
/* Link na bio: lista das páginas dos clientes (olinks.com.br/empresa). */
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

function NewBio({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
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
      const r = await api('/api/bio', 'POST', body);
      router.push(`/bio/${r.id}`);
    } catch (e: any) {
      toast(e.message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Novo link na bio" style={{ textAlign: 'left', alignItems: 'stretch', width: 'min(520px, calc(100vw - 32px))' }}>
        <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="link" /> Novo link na bio
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Escolha o cliente: nome, WhatsApp, endereço, Instagram e os ícones do nicho já vêm preenchidos.
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
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button className="btn btn-g" onClick={() => create({ name: q.trim() || 'Novo cliente' })} disabled={busy}>
            Começar em branco{q.trim() ? `: "${q.trim()}"` : ''}
          </button>
          <button className="btn btn-g" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}

export default function Bios() {
  const can = useCan();
  const [res, setRes] = useState<{ base: string; pages: any[] } | null>(null);
  const [q, setQ] = useState('');
  const [neu, setNeu] = useState(false);
  useEffect(() => {
    api('/api/bio', 'GET')
      .then(setRes)
      .catch((e) => (toast(e.message), setRes({ base: '', pages: [] })));
  }, []);
  const list = useMemo(() => (res?.pages || []).filter((p) => !q || norm(`${p.slug} ${p.data?.name} ${p.leads?.name || ''}`).includes(norm(q))), [res, q]);
  const tot = useMemo(() => ({ on: (res?.pages || []).filter((p) => p.status === 'publicado').length, views: (res?.pages || []).reduce((t, p) => t + (p.views || 0), 0), clicks: (res?.pages || []).reduce((t, p) => t + (p.clicks || 0), 0) }), [res]);
  const host = (res?.base || '').replace(/^https?:\/\//, '');

  return (
    <>
      <PageHead title="Link na bio" sub="Páginas de links dos clientes no olinks, prontas para a bio do Instagram" icon="link" help="bio">
        {can('bio.editar') && (
          <button className="btn btn-p btn-sm" onClick={() => setNeu(true)}>
            <Icon name="plus" />
            Novo link na bio
          </button>
        )}
      </PageHead>
      <div className="grid g-kpi">
        <div className="card kpi">
          <div className="v">{tot.on}</div>
          <div className="l">Páginas no ar</div>
        </div>
        <div className="card kpi">
          <div className="v">{tot.views}</div>
          <div className="l">Visitas (total)</div>
        </div>
        <div className="card kpi">
          <div className="v">{tot.clicks}</div>
          <div className="l">Cliques nos botões</div>
        </div>
      </div>
      <input className="input" style={{ maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou endereço" />
      {res === null ? (
        <p className="muted">Carregando…</p>
      ) : list.length === 0 ? (
        <div className="card vault-empty">
          <Icon name="link" />
          <h2>{res.pages.length ? 'Nada encontrado' : 'Nenhum link na bio ainda'}</h2>
          <p className="muted">Crie a partir de um cliente: o sistema monta a página com os dados dele e os ícones do nicho. Você ajusta, manda a prévia e publica depois do pagamento.</p>
        </div>
      ) : (
        <div className="bio-cards">
          {list.map((p) => {
            const st = STATUS[p.status] || STATUS.rascunho;
            const url = `${res.base}/${p.slug}`;
            return (
              <div key={p.id} className="card bio-card">
                <Link href={`/bio/${p.id}`} className="bio-card-h">
                  <span className="bio-card-av" style={{ background: p.data?.avatar ? `url("${p.data.avatar}") center/cover` : `linear-gradient(135deg, ${p.data?.color || '#e8562a'}, ${p.data?.color2 || '#7a5af8'})` }}>
                    {!p.data?.avatar && (p.data?.name || '?').slice(0, 1)}
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
                    <b>{p.views || 0}</b> visitas
                  </span>
                  <span>
                    <b>{p.clicks || 0}</b> cliques
                  </span>
                  <span className="muted">{p.client_edited_at ? `cliente editou ${timeLabel(p.client_edited_at)}` : `atualizado ${timeLabel(p.updated_at)}`}</span>
                </div>
                <div className="bio-card-v">
                  <VisibleSwitch kind="bio" id={p.id} name={p.data?.name || p.slug} value={p.visible !== false} onChange={(v) => setRes((r) => (r ? { ...r, pages: r.pages.map((x) => (x.id === p.id ? { ...x, visible: v } : x)) } : r))} />
                  <span className="muted" style={{ fontSize: 12 }}>{p.account_id ? 'Cliente com acesso' : 'Cliente sem acesso'}</span>
                  <ClientAccessButton kind="bio" id={p.id} name={p.data?.name || p.slug} />
                </div>
                <div className="bio-card-a">
                  <Link className="btn btn-sm" href={`/bio/${p.id}`}>
                    Editar
                  </Link>
                  <button className="btn btn-sm btn-g" onClick={() => copyText(url)}>
                    <Icon name="copy" /> Copiar link
                  </button>
                  <a className="btn btn-sm btn-g" href={url} target="_blank" rel="noopener noreferrer">
                    <Icon name="ext" /> Abrir
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {neu && <NewBio onClose={() => setNeu(false)} />}
    </>
  );
}
