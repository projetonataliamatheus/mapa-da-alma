'use client';
/* Editor de um Link na bio no painel: endereço, status, link de edição do cliente, números e o editor com a página ao vivo. */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { BioEditor } from '@/components/BioEditor';
import { api, toast, copyText } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { ASK_TEXT, BioData } from '@/lib/bio';

const STATUS: [string, string, string][] = [
  ['rascunho', 'Rascunho', 'Só a equipe trabalha nela'],
  ['previa', 'Prévia', 'Abre com a faixa "Prévia" para mostrar ao cliente'],
  ['publicado', 'No ar', 'Página oficial, sem faixa, contando visitas e cliques'],
  ['pausado', 'Pausado', 'Fora do ar (ex.: cliente cancelou)'],
];

async function uploadTeam(id: string, f: File) {
  const fd = new FormData();
  fd.append('file', f);
  fd.append('id', id);
  const r = await fetch('/api/bio/upload', { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Não consegui enviar a imagem');
  return j.url as string;
}

export default function BioEdit({ params }: { params: { id: string } }) {
  const router = useRouter();
  const can = useCan();
  const editable = can('bio.editar');
  const [p, setP] = useState<any>(null);
  const [base, setBase] = useState('');
  const [stats, setStats] = useState<any[]>([]);
  const [d, setD] = useState<BioData | null>(null);
  const [saved, setSaved] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [askDel, setAskDel] = useState(false);

  async function load() {
    try {
      const r = await api(`/api/bio/${params.id}`, 'GET');
      setP(r.page);
      setBase(r.base);
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
      const r = await api(`/api/bio/${params.id}`, 'PATCH', body);
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
      const r = await api(`/api/bio/${params.id}`, 'POST', { action: 'token' });
      setP((o: any) => ({ ...o, edit_token: r.edit_token }));
      toast('Novo link de edição criado. O anterior parou de funcionar.');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove() {
    try {
      await api(`/api/bio/${params.id}`, 'DELETE');
      toast('Página apagada');
      router.push('/bio');
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
  const editUrl = `${base}/editar/${p.edit_token}`;
  const host = base.replace(/^https?:\/\//, '');

  return (
    <>
      <PageHead title={d.name || 'Link na bio'} sub={`${host}/${p.slug}${p.leads?.name ? ` · cliente: ${p.leads.name}` : ''}`} icon="link" help="bio">
        <Link href="/bio" className="btn btn-sm btn-g">
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
              <Icon name="ext" /> Abrir página
            </a>
            <button className="btn btn-sm btn-g" onClick={() => copyText(url)}>
              <Icon name="copy" /> Copiar link
            </button>
            <button className="btn btn-sm btn-g" onClick={() => copyText(ASK_TEXT)} title="Mensagem pronta pedindo fotos e informações ao cliente">
              <Icon name="file" /> Copiar pedido de informações
            </button>
          </div>
        </div>

        <div className="card bio-top-c">
          <b style={{ fontSize: 13.5 }}>Edição pelo próprio cliente</b>
          <small className="muted">Mande este link para o cliente trocar fotos, textos e botões sozinho, sem login e sem senha. Gere um novo se ele vazar.</small>
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
            <small className="muted">{p.status === 'publicado' ? 'Ainda sem cliques.' : 'Os números contam só depois de publicar.'}</small>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <BioEditor value={d} onChange={setD} upload={(f) => uploadTeam(params.id, f)} />
      </div>

      {editable && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {askDel ? (
            <>
              <small style={{ color: 'var(--bad)', alignSelf: 'center' }}>Apagar a página e as fotos? O endereço fica livre.</small>
              <button className="btn btn-sm" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={remove}>
                Apagar
              </button>
              <button className="btn btn-sm btn-g" onClick={() => setAskDel(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-g" style={{ color: 'var(--bad)' }} onClick={() => setAskDel(true)}>
              <Icon name="trash" /> Apagar página
            </button>
          )}
        </div>
      )}
    </>
  );
}
