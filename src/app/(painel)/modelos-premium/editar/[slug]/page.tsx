'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { api, toast } from '@/components/ui';
import { leaves, setAt, pathLabel, type Leaf } from '@/lib/premium-edit';

/**
 * Editor visual do modelo premium: a página do modelo ao vivo; clique num texto, imagem ou botão para trocar.
 * Ao salvar, vai para o GitHub (content.override.json) e vira o padrão do modelo para todas as prévias.
 */
export default function EditarModelo({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [tpl, setTpl] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [onlyMedia, setOnlyMedia] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api(`/api/premium?slug=${encodeURIComponent(slug)}`, 'GET')
      .then((r) => {
        setTpl(r.template);
        setContent(r.template.content || {});
      })
      .catch((e) => toast(e.message));
  }, [slug]);

  // a numeração dos campos vem do conteúdo original (é a mesma usada na página do modelo)
  const base = useMemo(() => (tpl?.content ? leaves(tpl.content) : []), [tpl]);
  const cur = useMemo(() => (content ? leaves(content) : []), [content]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      const m = e.data || {};
      if (!m.__rp) return;
      if (m.type === 'pick') setSel(Number(m.i));
      if (m.type === 'notfound') toast('Esse campo não aparece na tela agora (pode estar num menu, aba ou carrossel)');
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);

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

  const post = (m: any) => frame.current?.contentWindow?.postMessage({ __rp: 1, ...m }, '*');

  function change(i: number, value: string) {
    const leaf = base[i];
    if (!leaf) return;
    setContent((c: any) => setAt(c, leaf.path, value));
    setDirty(true);
    if (leaf.kind === 'image') post({ type: 'image', i, value });
    else post({ type: 'text', i, value });
  }

  async function uploadImg(f: File | null) {
    if (!f || sel === null) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('asset', f);
      fd.append('slug', slug);
      const r = await api('/api/premium', 'POST', fd);
      change(sel, r.url);
      toast('Imagem trocada');
    } catch (e: any) {
      toast(e.message);
    }
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await api('/api/premium', 'PATCH', { action: 'edit', slug, content });
      setDirty(false);
      toast('Salvo no GitHub. Já vale para as próximas prévias; a página do modelo recompila em 1 a 2 min.');
    } catch (e: any) {
      toast(e.message);
    }
    setSaving(false);
  }

  if (!tpl || !content) return <div className="spin" />;
  const leaf: Leaf | undefined = sel !== null ? cur[sel] : undefined;
  const kindOf = (i: number) => base[i]?.kind;
  const list = cur.filter((l) => (onlyMedia ? kindOf(l.i) === 'image' : true) && (!q || (l.value + ' ' + pathLabel(l.path)).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="veditor">
      <div className="ve-top">
        <Link href="/modelos-premium" className="btn btn-sm btn-g">
          <Icon name="chevron" /> Modelos premium
        </Link>
        <b style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Editando: {tpl.name}
          {tpl.audience ? ` · ${tpl.audience === 'feminino' ? 'Feminino' : 'Masculino'}` : ''}
        </b>
        <div className="seg" role="group" aria-label="Tamanho da tela" style={{ marginLeft: 'auto' }}>
          <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
            Computador
          </button>
          <button aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
            Celular
          </button>
        </div>
        <button className="btn btn-sm btn-p" onClick={save} disabled={!dirty || saving}>
          {saving ? <span className="spin" /> : <Icon name="check" />}
          {saving ? 'Salvando…' : dirty ? 'Salvar e virar padrão' : 'Tudo salvo'}
        </button>
      </div>
      <div className="ve-body">
        <div className="ve-stage">
          <iframe
            ref={frame}
            title={`Modelo ${tpl.name} em edição`}
            src={`/modelo/${encodeURIComponent(slug)}?edit=1`}
            style={{ width: device === 'mobile' ? 390 : '100%', maxWidth: '100%' }}
          />
        </div>
        <aside className="ve-side">
          {leaf ? (
            <div className="card ve-field">
              <small className="muted">{pathLabel(leaf.path)}</small>
              {kindOf(leaf.i) === 'image' ? (
                <>
                  <img src={leaf.value} alt="" className="ve-img" />
                  <input className="input" value={leaf.value} onChange={(e) => change(leaf.i, e.target.value)} aria-label="Link da imagem" placeholder="https://…" />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-p" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <span className="spin" /> : <Icon name="upload" />} Enviar imagem do computador
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (uploadImg(e.target.files?.[0] || null), (e.target.value = ''))} />
                  </div>
                  <small className="muted">Dica: para a versão feminina/masculina, troque as fotos de pessoas por fotos do outro público. Links do Unsplash/Pexels também funcionam.</small>
                </>
              ) : (
                <>
                  <textarea className="input" rows={Math.min(8, Math.max(2, Math.ceil(leaf.value.length / 38)))} value={leaf.value} onChange={(e) => change(leaf.i, e.target.value)} aria-label="Texto" />
                  <small className="muted">Palavras entre *asteriscos* ficam em destaque (quando o modelo usa esse efeito).</small>
                </>
              )}
              {base[leaf.i] && base[leaf.i].value !== leaf.value && (
                <button className="linkbtn" onClick={() => change(leaf.i, base[leaf.i].value)}>
                  Desfazer este campo
                </button>
              )}
            </div>
          ) : (
            <div className="card ve-field">
              <b>Clique em qualquer texto, imagem ou botão da página</b>
              <small className="muted">Ou procure o campo na lista abaixo (ícones, links e textos curtos estão só na lista).</small>
            </div>
          )}
          <div className="ve-list">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="input" placeholder="Procurar campo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar campo" />
              <label style={{ display: 'flex', gap: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={onlyMedia} onChange={(e) => setOnlyMedia(e.target.checked)} /> Só imagens
              </label>
            </div>
            {list.slice(0, 400).map((l) => (
              <button
                key={l.i}
                className={`ve-item${sel === l.i ? ' on' : ''}${base[l.i]?.value !== l.value ? ' changed' : ''}`}
                onClick={() => {
                  setSel(l.i);
                  post({ type: 'focus', i: l.i });
                }}
              >
                {kindOf(l.i) === 'image' ? <img src={l.value} alt="" /> : <Icon name={kindOf(l.i) === 'text' ? 'file' : 'ext'} />}
                <span>
                  <small>{pathLabel(l.path)}</small>
                  {kindOf(l.i) === 'image' ? '' : l.value.slice(0, 90)}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
