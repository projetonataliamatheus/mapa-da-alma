'use client';
/* Editor de um Catálogo digital no painel: endereço, status, plano, link de edição do dono, QR Code e o editor com o cardápio ao vivo. */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { CatalogEditor } from '@/components/CatalogEditor';
import { api, toast, copyText } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { CAT_ASK_TEXT, CatalogData } from '@/lib/catalog';

const STATUS: [string, string, string][] = [
  ['rascunho', 'Rascunho', 'Só a equipe trabalha nela'],
  ['previa', 'Prévia', 'Abre com a faixa "Prévia" para mostrar ao cliente'],
  ['publicado', 'No ar', 'Cardápio oficial, sem faixa, contando visitas'],
  ['pausado', 'Pausado', 'Fora do ar (ex.: cliente cancelou)'],
];

async function uploadTeam(id: string, f: File) {
  const fd = new FormData();
  fd.append('file', f);
  fd.append('id', id);
  const r = await fetch('/api/catalogo/upload', { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Não consegui enviar a imagem');
  return j.url as string;
}

export default function CatalogEdit({ params }: { params: { id: string } }) {
  const router = useRouter();
  const can = useCan();
  const editable = can('catalogo.editar');
  const [p, setP] = useState<any>(null);
  const [base, setBase] = useState('');
  const [editBase, setEditBase] = useState('');
  const [stats, setStats] = useState<any[]>([]);
  const [d, setD] = useState<CatalogData | null>(null);
  const [saved, setSaved] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [askDel, setAskDel] = useState(false);

  async function load() {
    try {
      const r = await api(`/api/catalogo/${params.id}`, 'GET');
      setP(r.page);
      setBase(r.base);
      setEditBase(r.editBase);
      setStats(r.stats);
      setD(r.page.data);
      setSaved(JSON.stringify(r.page.data));
      setSlug(r.page.slug);
    } catch (e: any) {
      toast(e.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);
  const dirty = d && JSON.stringify(d) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function patch(body: any, ok = 'Salvo') {
    setBusy(true);
    try {
      const r = await api(`/api/catalogo/${params.id}`, 'PATCH', body);
      setP((o: any) => ({ ...o, ...r }));
      if (body.data) setSaved(JSON.stringify(r.data));
      if (body.slug) setSlug(r.slug);
      toast(ok);
    } catch (e: any) {
      toast(e.message);
      if (body.slug) setSlug(p.slug);
    }
    setBusy(false);
  }
  async function newToken() {
    try {
      const r = await api(`/api/catalogo/${params.id}`, 'POST', { action: 'token' });
      setP((o: any) => ({ ...o, edit_token: r.edit_token }));
      toast('Novo link de edição criado. O anterior parou de funcionar.');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove() {
    try {
      await api(`/api/catalogo/${params.id}`, 'DELETE');
      toast('Catálogo apagado');
      router.push('/catalogo');
    } catch (e: any) {
      toast(e.message);
    }
  }

  const top = useMemo(() => {
    const m: Record<string, number> = {};
    stats.filter((s) => s.kind !== 'view').forEach((s) => (m[s.target || s.kind] = (m[s.target || s.kind] || 0) + s.n));
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats]);
  const views30 = stats.filter((s) => s.kind === 'view').reduce((t, s) => t + s.n, 0);
  const clicks30 = stats.filter((s) => s.kind !== 'view').reduce((t, s) => t + s.n, 0);

  if (!p || !d) return <p className="muted">Carregando…</p>;
  const url = `${base}/${p.slug}`;
  const editUrl = `${editBase}/${p.edit_token}`;
  const host = base.replace(/^https?:\/\//, '');

  return (
    <>
      <PageHead title={d.name || 'Catálogo digital'} sub={`${host}/${p.slug}${p.leads?.name ? ` · cliente: ${p.leads.name}` : ''}`} icon="book" help="catalogo">
        <Link href="/catalogo" className="btn btn-sm btn-g">
          ← Voltar
        </Link>
        {editable && (
          <button className="btn btn-p btn-sm" disabled={!dirty || busy} onClick={() => patch({ data: d })}>
            <Icon name="check" />
            {busy ? 'Salvando…' : dirty ? 'Salvar' : 'Tudo salvo'}
          </button>
        )}
      </PageHead>

      <div className="bio-top">
        <div className="card bio-top-c">
          <div className="seg" role="group" aria-label="Status">
            {STATUS.map(([k, l, t]) => (
              <button key={k} aria-pressed={p.status === k} disabled={!editable || busy} title={t} onClick={() => p.status !== k && patch({ status: k }, k === 'publicado' ? 'Página no ar!' : `Status: ${l}`)}>
                {l}
              </button>
            ))}
          </div>
          <div className="bio-slug">
            <span className="muted">{host}/</span>
            <input className="input" value={slug} disabled={!editable} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30))} aria-label="Endereço da página" />
            {slug !== p.slug && (
              <button className="btn btn-sm" onClick={() => patch({ slug }, 'Endereço trocado')} disabled={busy || slug.length < 2}>
                Salvar endereço
              </button>
            )}
          </div>
          <div className="bio-top-a">
            <a className="btn btn-sm btn-g" href={url} target="_blank" rel="noopener noreferrer">
              <Icon name="ext" /> Abrir cardápio
            </a>
            <button className="btn btn-sm btn-g" onClick={() => copyText(url)}>
              <Icon name="copy" /> Copiar link
            </button>
            <a className="btn btn-sm btn-g" href={`/c/${p.slug}/qr`} target="_blank" rel="noopener noreferrer">
              <Icon name="qr" /> QR Code para imprimir
            </a>
            <button className="btn btn-sm btn-g" onClick={() => copyText(CAT_ASK_TEXT)} title="Mensagem pronta pedindo fotos, produtos e preços ao cliente">
              <Icon name="file" /> Copiar pedido de informações
            </button>
          </div>
        </div>

        <div className="card bio-top-c">
          <b style={{ fontSize: 13.5 }}>Painel do dono</b>
          <small className="muted">Mande este link para o dono atualizar produtos, preços, fotos e o que acabou, sozinho, sem login e sem senha. Gere um novo se ele vazar.</small>
          <div className="bio-slug">
            <span className="muted">Plano:</span>
            <select className="input" style={{ width: 'auto', height: 32 }} value={p.plan} disabled={!editable} onChange={(e) => patch({ plan: e.target.value }, 'Plano atualizado')}>
              <option value="unico">Pagamento único</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          <div className="bio-top-a">
            <button className="btn btn-sm" onClick={() => copyText(editUrl)}>
              <Icon name="copy" /> Copiar link de edição
            </button>
            {editable && (
              <button className="btn btn-sm btn-g" onClick={newToken}>
                <Icon name="refresh" /> Gerar novo link
              </button>
            )}
          </div>
        </div>

        <div className="card bio-top-c">
          <b style={{ fontSize: 13.5 }}>Últimos 30 dias</b>
          <div className="bio-card-n">
            <span>
              <b>{views30}</b> visitas
            </span>
            <span>
              <b>{clicks30}</b> cliques
            </span>
          </div>
          {top.length > 0 ? (
            <ul className="bio-top-l">
              {top.map(([k, n]) => (
                <li key={k}>
                  <span>{k}</span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
          ) : (
            <small className="muted">{p.status === 'publicado' ? 'Ainda sem visitas.' : 'Os números contam só depois de publicar.'}</small>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <CatalogEditor value={d} onChange={setD} upload={(f) => uploadTeam(params.id, f)} />
      </div>

      {editable && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {askDel ? (
            <>
              <small style={{ color: 'var(--bad)', alignSelf: 'center' }}>Apagar o catálogo e as fotos? O QR Code impresso deixa de funcionar.</small>
              <button className="btn btn-sm" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={remove}>
                Apagar
              </button>
              <button className="btn btn-sm btn-g" onClick={() => setAskDel(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-g" style={{ color: 'var(--bad)' }} onClick={() => setAskDel(true)}>
              <Icon name="trash" /> Apagar catálogo
            </button>
          )}
        </div>
      )}
    </>
  );
}
