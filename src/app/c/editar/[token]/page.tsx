'use client';
/* Painel do dono do Catálogo digital (com usuário e senha do cliente). */
import { useEffect, useState } from 'react';
import { CatalogEditor } from '@/components/CatalogEditor';
import { Toaster, toast } from '@/components/ui';
import { ClientLogin, clientLogout } from '@/components/ClientLogin';
import { CatalogData } from '@/lib/catalog';

export default function CatalogOwner({ params }: { params: { token: string } }) {
  const [d, setD] = useState<CatalogData | null>(null);
  const [info, setInfo] = useState<{ slug: string; base: string; status: string } | null>(null);
  const [saved, setSaved] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [need, setNeed] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => {
    setErr('');
    setNeed('');
    fetch(`/api/catalogo/cliente/${params.token}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (r.status === 401 || j.reason === 'outro') {
          setNeed(j.reason === 'outro' ? j.error : 'login');
          return;
        }
        if (!r.ok) throw new Error(j.error);
        setD(j.data);
        setSaved(JSON.stringify(j.data));
        setInfo({ slug: j.slug, base: j.base, status: j.status });
      })
      .catch((e) => setErr(e.message || 'Link inválido'));
  }, [params.token, n]);
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

  async function upload(f: File) {
    const fd = new FormData();
    fd.append('file', f);
    fd.append('token', params.token);
    const r = await fetch('/api/catalogo/upload', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Não consegui enviar a imagem');
    return j.url as string;
  }
  async function save() {
    setBusy(true);
    try {
      const r = await fetch(`/api/catalogo/cliente/${params.token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não consegui salvar');
      setSaved(JSON.stringify(d));
      toast('Pronto! O cardápio foi atualizado.');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }

  if (need === 'login') return <ClientLogin onDone={() => setN((x) => x + 1)} />;
  if (need)
    return (
      <div className="be-client-msg">
        <h1>Sem acesso a esta página</h1>
        <p>{need}</p>
        <button className="btn" onClick={async () => (await clientLogout(), setN((x) => x + 1))}>
          Sair e entrar com outro usuário
        </button>
      </div>
    );
  if (err)
    return (
      <div className="be-client-msg">
        <h1>Não foi possível abrir</h1>
        <p>{err}</p>
      </div>
    );
  if (!d || !info) return <div className="be-client-msg">Carregando…</div>;
  const url = `${info.base}/${info.slug}`;
  return (
    <div className="be-client">
      <header className="be-client-h">
        <div style={{ minWidth: 0 }}>
          <b>Meu cardápio</b>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url.replace(/^https?:\/\//, '')} ↗
          </a>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a className="btn btn-g btn-sm" href="/cliente">
            Minha área
          </a>
          <button className="btn btn-g btn-sm" onClick={async () => (await clientLogout(), setD(null), setN((x) => x + 1))}>
            Sair
          </button>
          <button className="btn btn-p" onClick={save} disabled={!dirty || busy}>
            {busy ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>
      </header>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <CatalogEditor value={d} onChange={setD} upload={upload} client />
      </div>
      <Toaster />
    </div>
  );
}
