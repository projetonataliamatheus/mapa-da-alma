'use client';
/*
 * Packs Canva: cada pack tem nicho, prévias (imagens), quantidade de artes e o link do Canva (entrega).
 * A galeria pública (packs.suaagencia.com.br/slug) mostra as prévias com o botão "Quero este pack" no WhatsApp.
 * A IA oferece o pack do ramo do cliente como complemento, mandando o link da galeria.
 */
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Switch, api, toast, brl } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { sb } from '@/lib/supabase/browser';
import { PACK_LIMITS } from '@/lib/packs';

async function upload(file: File) {
  if (!/^image\//.test(file.type)) throw new Error('Envie imagens (PNG, JPG ou WebP).');
  if (file.size > 6 * 1024 * 1024) throw new Error(`"${file.name}" é muito grande (máximo 6 MB).`);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `packs/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb().storage.from('publico').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb().storage.from('publico').getPublicUrl(path).data.publicUrl;
}

function copy(t: string, ok = 'Copiado') {
  navigator.clipboard?.writeText(t).then(
    () => toast(ok),
    () => toast('Não deu para copiar'),
  );
}

function Editor({ p, base, onSaved, onClose, canEdit }: { p: any; base: string; onSaved: () => void; onClose: () => void; canEdit: boolean }) {
  const [f, setF] = useState<any>({ ...p, images: p.images || [], price: p.price ?? '', items: p.items ?? '' });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(0);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  async function save() {
    setBusy(true);
    try {
      await api('/api/packs', 'PATCH', { id: p.id, name: f.name, niche: f.niche, keywords: f.keywords, description: f.description, items: f.items, price: f.price, canva_url: f.canva_url, active: f.active, images: f.images, cover: f.cover || f.images[0] || null, ...(f.slug !== p.slug ? { slug: f.slug } : {}) });
      toast('Pack salvo');
      onSaved();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  async function addFiles(list: FileList | null) {
    const files = Array.from(list || []).slice(0, PACK_LIMITS.images - f.images.length);
    if (!files.length) return toast(`Máximo de ${PACK_LIMITS.images} prévias por pack.`);
    setUp(files.length);
    const urls: string[] = [];
    for (const file of files) {
      try {
        urls.push(await upload(file));
      } catch (e: any) {
        toast(e.message);
      }
      setUp((n) => n - 1);
    }
    setF((x: any) => ({ ...x, images: [...x.images, ...urls] }));
  }
  const move = (i: number, d: number) =>
    setF((x: any) => {
      const a = [...x.images];
      const j = i + d;
      if (j < 0 || j >= a.length) return x;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...x, images: a };
    });
  return (
    <div className="card" style={{ borderColor: 'var(--accent-line)' }}>
      <div className="card-h" style={{ flexWrap: 'wrap' }}>
        <Ib name="spark" tone="ai" size="sm" />
        <h2>{f.name || 'Pack'}</h2>
        <span className="sp" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          {f.active ? 'Ativo (aparece na vitrine e a IA oferece)' : 'Pausado'}
          <Switch checked={!!f.active} onChange={(v) => set('active', v)} label="Ativo" disabled={!canEdit} />
        </label>
      </div>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="field">
            <label>Nome do pack</label>
            <input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Pack Estética 30 artes" />
          </div>
          <div className="field">
            <label>Nicho principal</label>
            <input className="input" value={f.niche || ''} onChange={(e) => set('niche', e.target.value)} placeholder="Ex.: estética, pizzaria, odontologia" />
          </div>
          <div className="field">
            <label>Outras palavras do nicho (a IA usa para achar o pack)</label>
            <input className="input" value={f.keywords || ''} onChange={(e) => set('keywords', e.target.value)} placeholder="Ex.: beleza, sobrancelha, cílios, unhas" />
          </div>
          <div className="field">
            <label>Quantidade de artes</label>
            <input className="input" type="number" min={0} value={f.items} onChange={(e) => set('items', e.target.value)} />
          </div>
          <div className="field">
            <label>Preço (vazio = o do serviço "Pack de artes")</label>
            <input className="input" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="R$" />
          </div>
          <div className="field">
            <label>Endereço da galeria</label>
            <input className="input mono" value={f.slug || ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            <small className="muted">{base}/{f.slug}</small>
          </div>
        </div>
        <div className="field">
          <label>Descrição (aparece na galeria)</label>
          <textarea className="input" rows={3} value={f.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Ex.: Posts, stories e destaques prontos para clínicas de estética. É só trocar o logo, as cores e as fotos." />
        </div>
        <div className="field">
          <label>Link do modelo no Canva (entrega — só a equipe vê; vai para o cliente depois do pagamento)</label>
          <input className="input" value={f.canva_url || ''} onChange={(e) => set('canva_url', e.target.value)} placeholder="https://www.canva.com/design/.../view?mode=preview" />
        </div>
        <div className="field">
          <label>
            Prévias ({f.images.length}/{PACK_LIMITS.images}) — a primeira é a capa
          </label>
          <div className="pack-imgs">
            {f.images.map((u: string, i: number) => (
              <div key={u + i} className="pack-img">
                <img src={u} alt="" />
                <span>
                  <button type="button" onClick={() => move(i, -1)} aria-label="Mover para a esquerda" disabled={i === 0}>
                    ‹
                  </button>
                  <button type="button" onClick={() => setF((x: any) => ({ ...x, images: x.images.filter((_: any, k: number) => k !== i) }))} aria-label="Remover prévia">
                    ✕
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Mover para a direita" disabled={i === f.images.length - 1}>
                    ›
                  </button>
                </span>
                {i === 0 && <em>capa</em>}
              </div>
            ))}
            {f.images.length < PACK_LIMITS.images && (
              <label className="pack-add">
                {up ? <span className="spin" /> : <Icon name="upload" />}
                {up ? `Enviando ${up}…` : 'Adicionar prévias'}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
              </label>
            )}
          </div>
          <small className="muted">Dica: exporte do Canva 6 a 12 artes como PNG/JPG (pode marcar várias de uma vez).</small>
        </div>
      </fieldset>
      <div className="row-actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {canEdit && (
          <button className="btn btn-p" onClick={save} disabled={busy || up > 0}>
            <Icon name="check" /> {busy ? 'Salvando…' : 'Salvar'}
          </button>
        )}
        <button className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function Packs() {
  const can = useCan();
  const canEdit = can('packs.editar');
  const [d, setD] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  async function load() {
    try {
      setD(await api('/api/packs', 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function create() {
    try {
      const p = await api('/api/packs', 'POST', { name: 'Novo pack', active: false });
      await load();
      setOpen(p.id);
      setTimeout(() => document.getElementById('pk-' + p.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(p: any) {
    if (!window.confirm(`Excluir o pack "${p.name}"? A galeria sai do ar.`)) return;
    try {
      await api('/api/packs', 'DELETE', { id: p.id });
      toast('Pack excluído');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function toggle(p: any) {
    try {
      await api('/api/packs', 'PATCH', { id: p.id, active: !p.active });
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  if (!d) return <div className="spin" />;
  const base = d.base;
  return (
    <>
      <PageHead title="Packs Canva" sub="Packs de artes prontas por nicho: galeria de prévia para o cliente e link do Canva para entregar" icon="spark" tone="ai" help="packs">
        <a className="btn btn-sm" href={base} target="_blank" rel="noopener noreferrer">
          <Icon name="ext" /> Ver vitrine
        </a>
        {canEdit && (
          <button className="btn btn-p btn-sm" onClick={create}>
            <Icon name="plus" /> Novo pack
          </button>
        )}
      </PageHead>
      {d.missing && (
        <div className="card">
          <p>
            Rode a atualização <b>034_packs_canva.sql</b> no Supabase para liberar os packs.
          </p>
        </div>
      )}
      <div className="card" style={{ fontSize: 13 }}>
        <div className="card-h">
          <Ib name="bulb" tone="warn" size="sm" />
          <h2>Como funciona</h2>
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Cadastre o pack com o nicho, as prévias (imagens exportadas do Canva) e o link do modelo no Canva.</li>
          <li>Cada pack ganha uma galeria pública com o botão “Quero este pack” que abre o WhatsApp.</li>
          <li>A IA oferece o pack do ramo do cliente como complemento (depois do site ou quando ele fala de posts/artes), mandando a galeria.</li>
          <li>
            Depois do pagamento, use <b>Copiar entrega</b> e mande a mensagem com o link do Canva.
          </li>
        </ol>
      </div>
      {(d.packs || []).length === 0 && !d.missing ? (
        <div className="card">
          <p className="muted">Nenhum pack ainda. Clique em Novo pack.</p>
        </div>
      ) : (
        <div className="pack-grid">
          {d.packs.map((p: any) =>
            open === p.id ? (
              <div key={p.id} id={'pk-' + p.id} style={{ gridColumn: '1 / -1' }}>
                <Editor p={p} base={base} canEdit={canEdit} onSaved={load} onClose={() => setOpen(null)} />
              </div>
            ) : (
              <div key={p.id} id={'pk-' + p.id} className={`pack-card ${p.active ? '' : 'off'}`}>
                <button type="button" className="pack-cover" onClick={() => setOpen(p.id)} aria-label={`Editar ${p.name}`}>
                  {p.cover || p.images?.[0] ? <img src={p.cover || p.images[0]} alt="" loading="lazy" /> : <span>sem prévia</span>}
                  <em>{(p.images || []).length} prévias</em>
                </button>
                <div className="pack-body">
                  <b>{p.name}</b>
                  <small className="muted">
                    {p.niche || 'sem nicho'}
                    {p.items ? ` · ${p.items} artes` : ''}
                    {p.price ? ` · ${brl(p.price)}` : ''} · {p.views || 0} visitas
                  </small>
                  {!p.canva_url && <small style={{ color: 'var(--warn)' }}>Falta o link do Canva (entrega)</small>}
                  <div className="row-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => copy(`${base}/${p.slug}`, 'Link da galeria copiado')}>
                      <Icon name="copy" /> Galeria
                    </button>
                    <a className="btn btn-sm" href={`${base}/${p.slug}`} target="_blank" rel="noopener noreferrer">
                      <Icon name="ext" />
                    </a>
                    {p.canva_url && (
                      <button
                        className="btn btn-sm"
                        onClick={() => copy(`Prontinho! 🎉 Aqui está o seu ${p.name} 👇\n${p.canva_url}\n\nÉ só abrir no Canva (pode ser a conta grátis), clicar em "Usar modelo" e trocar logo, cores, textos e fotos. Qualquer dúvida, me chama aqui 😊`, 'Mensagem de entrega copiada')}
                      >
                        <Icon name="send" /> Copiar entrega
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <Switch checked={!!p.active} onChange={() => toggle(p)} label={p.active ? 'Pausar pack' : 'Ativar pack'} />
                        <button className="iconbtn" onClick={() => remove(p)} aria-label="Excluir pack" title="Excluir">
                          <Icon name="trash" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </>
  );
}
