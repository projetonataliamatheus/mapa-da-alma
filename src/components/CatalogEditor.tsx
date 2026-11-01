'use client';
/* Editor do Catálogo digital: usado pela equipe no painel e pelo dono no link de edição. Mostra o cardápio ao vivo ao lado. */
import { useMemo, useRef, useState } from 'react';
import { CatalogPage } from './CatalogPage';
import { ImagePick, shrinkImage } from './BioEditor';
import { CatalogData, CatProduct, CAT_THEMES, CAT_LIMITS, TAGS, newId, money } from '@/lib/catalog';
import { PALETTE, FONTS } from '@/lib/bio';
import { NICHE } from '@/lib/bio-icons';

const EMOJIS = ['🍔', '🍕', '🍟', '🌭', '🥪', '🌮', '🍣', '🍱', '🍝', '🥗', '🍽️', '🍖', '🍗', '🥩', '🍤', '🥟', '🍢', '☕', '🥐', '🍰', '🍩', '🍫', '🍦', '🍇', '🥤', '🍺', '🍹', '🍷', '🥂', '🧃', '⭐', '🔥', '➕'];
const price = (v: string) => {
  const t = String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  return t === '' ? null : Number(t);
};

function Photos({ p, set, upload }: { p: CatProduct; set: (x: Partial<CatProduct>) => void; upload: (f: File) => Promise<string> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, CAT_LIMITS.photos - p.photos.length)) {
      try {
        out.push(await upload(await shrinkImage(f, 1000)));
      } catch {}
    }
    set({ photos: [...p.photos, ...out] });
    setBusy(false);
  }
  return (
    <div className="ce-photos">
      {p.photos.map((ph, i) => (
        <div key={ph} className="ce-ph" style={{ backgroundImage: `url("${ph}")` }}>
          <button type="button" onClick={() => set({ photos: p.photos.filter((_, k) => k !== i) })} aria-label="Remover foto">
            ✕
          </button>
          {i > 0 && (
            <button type="button" className="ce-ph-main" onClick={() => set({ photos: [ph, ...p.photos.filter((_, k) => k !== i)] })} title="Usar como foto principal">
              ★
            </button>
          )}
        </div>
      ))}
      {p.photos.length < CAT_LIMITS.photos && (
        <button type="button" className="ce-ph-add" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <span className="spin" /> : `+ Foto (${p.photos.length}/${CAT_LIMITS.photos})`}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
    </div>
  );
}

const TABS: [string, string][] = [
  ['produtos', 'Produtos'],
  ['categorias', 'Categorias'],
  ['loja', 'Loja e contato'],
  ['visual', 'Aparência'],
];

export function CatalogEditor({ value, onChange, upload, client }: { value: CatalogData; onChange: (d: CatalogData) => void; upload: (f: File) => Promise<string>; client?: boolean }) {
  const d = value;
  const [tab, setTab] = useState('produtos');
  const [view, setView] = useState(false);
  const [catF, setCatF] = useState<string>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const set = (p: Partial<CatalogData>) => onChange({ ...d, ...p });
  const setP = (id: string, p: Partial<CatProduct>) => set({ products: d.products.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const list = useMemo(() => d.products.filter((p) => (!catF || p.cat === catF) && (!q || `${p.name} ${p.desc}`.toLowerCase().includes(q.toLowerCase()))), [d.products, catF, q]);
  const moveP = (id: string, dir: number) => {
    const a = [...d.products];
    const i = a.findIndex((x) => x.id === id);
    // anda só dentro da mesma categoria
    let j = i + dir;
    while (j >= 0 && j < a.length && a[j].cat !== a[i].cat) j += dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set({ products: a });
  };
  function addProduct() {
    if (d.products.length >= CAT_LIMITS.products) return;
    const cat = catF || d.categories[0]?.id;
    if (!cat) {
      setTab('categorias');
      return;
    }
    const p: CatProduct = { id: newId(), cat, name: 'Novo produto', desc: '', price: null, promo: null, photos: [], on: true, tags: [] };
    set({ products: [...d.products, p] });
    setOpenId(p.id);
  }
  const moveC = (i: number, dir: number) => {
    const a = [...d.categories];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set({ categories: a });
  };

  return (
    <div className={`be ${view ? 'show-view' : ''}`}>
      <div className="be-form">
        <div className="be-tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {l}
              {k === 'produtos' && <small className="muted"> {d.products.length}</small>}
            </button>
          ))}
        </div>

        {tab === 'produtos' && (
          <div className="be-sec">
            <div className="ce-bar">
              <select className="input" value={catF} onChange={(e) => setCatF(e.target.value)} aria-label="Categoria">
                <option value="">Todas as categorias</option>
                {d.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name} ({d.products.filter((p) => p.cat === c.id).length})
                  </option>
                ))}
              </select>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" />
              <button type="button" className="btn btn-p btn-sm" onClick={addProduct} disabled={d.products.length >= CAT_LIMITS.products}>
                + Produto
              </button>
            </div>
            <small className="muted">
              {d.products.length}/{CAT_LIMITS.products} produtos · até {CAT_LIMITS.photos} fotos cada (a primeira é a principal)
            </small>
            {list.map((p) => {
              const open = openId === p.id;
              const cat = d.categories.find((c) => c.id === p.cat);
              return (
                <div key={p.id} className={`ce-prod ${open ? 'open' : ''} ${p.on ? '' : 'off'}`}>
                  <button type="button" className="ce-prod-h" onClick={() => setOpenId(open ? null : p.id)}>
                    <span className="ce-prod-ph" style={p.photos[0] ? { backgroundImage: `url("${p.photos[0]}")` } : undefined}>
                      {!p.photos[0] && (cat?.emoji || '🍽️')}
                    </span>
                    <span className="ce-prod-tx">
                      <b>{p.name || 'Sem nome'}</b>
                      <small className="muted">
                        {cat?.name || '—'} · {p.price != null ? money(p.promo ?? p.price) : 'sem preço'}
                        {!p.on && ' · escondido'}
                      </small>
                    </span>
                    <span className="ce-prod-arrow">{open ? '▴' : '▾'}</span>
                  </button>
                  {open && (
                    <div className="ce-prod-b">
                      <input className="input" value={p.name} maxLength={80} placeholder="Nome do produto" onChange={(e) => setP(p.id, { name: e.target.value })} />
                      <textarea className="input" rows={2} maxLength={400} value={p.desc} placeholder="Descrição, ingredientes, tamanho…" onChange={(e) => setP(p.id, { desc: e.target.value })} />
                      <div className="ce-grid3">
                        <label className="field">
                          <span>Preço</span>
                          <input className="input num" inputMode="decimal" defaultValue={p.price ?? ''} placeholder="0,00" onBlur={(e) => setP(p.id, { price: price(e.target.value) })} />
                        </label>
                        <label className="field">
                          <span>Preço promocional</span>
                          <input className="input num" inputMode="decimal" defaultValue={p.promo ?? ''} placeholder="opcional" onBlur={(e) => setP(p.id, { promo: price(e.target.value) })} />
                        </label>
                        <label className="field">
                          <span>Categoria</span>
                          <select className="input" value={p.cat} onChange={(e) => setP(p.id, { cat: e.target.value })}>
                            {d.categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.emoji} {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <Photos p={p} set={(x) => setP(p.id, x)} upload={upload} />
                      <div className="ce-tags">
                        {TAGS.map(([k, l]) => (
                          <button key={k} type="button" className={`dom-role ${p.tags.includes(k) ? 'on' : ''}`} onClick={() => setP(p.id, { tags: p.tags.includes(k) ? p.tags.filter((t) => t !== k) : [...p.tags, k] })}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <div className="ce-prod-f">
                        <label>
                          <input type="checkbox" checked={p.on} onChange={(e) => setP(p.id, { on: e.target.checked })} /> Mostrar no cardápio (desmarque quando acabar)
                        </label>
                        <span className="sp" />
                        <button type="button" className="iconbtn" onClick={() => moveP(p.id, -1)} title="Subir">
                          ↑
                        </button>
                        <button type="button" className="iconbtn" onClick={() => moveP(p.id, 1)} title="Descer">
                          ↓
                        </button>
                        <button type="button" className="btn btn-sm btn-g" disabled={d.products.length >= CAT_LIMITS.products} onClick={() => set({ products: [...d.products, { ...p, id: newId(), name: p.name + ' (cópia)', photos: [] }] })}>
                          Duplicar
                        </button>
                        <button type="button" className="btn btn-sm btn-g" style={{ color: 'var(--bad)' }} onClick={() => set({ products: d.products.filter((x) => x.id !== p.id) })}>
                          Apagar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {list.length === 0 && <p className="muted">Nenhum produto {catF ? 'nesta categoria' : 'ainda'}. Clique em “+ Produto”.</p>}
          </div>
        )}

        {tab === 'categorias' && (
          <div className="be-sec">
            <small className="muted">A ordem aqui é a ordem do cardápio. Até {CAT_LIMITS.categories} categorias.</small>
            {d.categories.map((c, i) => {
              const n = d.products.filter((p) => p.cat === c.id).length;
              return (
                <div key={c.id} className="ce-cat">
                  <select className="input ce-emoji" value={c.emoji || ''} onChange={(e) => set({ categories: d.categories.map((x) => (x.id === c.id ? { ...x, emoji: e.target.value } : x)) })} aria-label="Ícone">
                    <option value="">—</option>
                    {EMOJIS.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                  <input className="input" value={c.name} maxLength={40} onChange={(e) => set({ categories: d.categories.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} />
                  <small className="muted" style={{ whiteSpace: 'nowrap' }}>
                    {n} itens
                  </small>
                  <button type="button" className="iconbtn" onClick={() => moveC(i, -1)} disabled={i === 0} aria-label="Subir">
                    ↑
                  </button>
                  <button type="button" className="iconbtn" onClick={() => moveC(i, 1)} disabled={i === d.categories.length - 1} aria-label="Descer">
                    ↓
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    title={n ? 'Apaga a categoria e os produtos dela' : 'Apagar'}
                    onClick={() => {
                      if (n && !window.confirm(`Apagar "${c.name}" e os ${n} produtos dela?`)) return;
                      set({ categories: d.categories.filter((x) => x.id !== c.id), products: d.products.filter((p) => p.cat !== c.id) });
                    }}
                    aria-label="Apagar categoria"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {d.categories.length < CAT_LIMITS.categories && (
              <button type="button" className="btn btn-sm btn-g" onClick={() => set({ categories: [...d.categories, { id: newId(), name: 'Nova categoria', emoji: '' }] })}>
                + Categoria
              </button>
            )}
          </div>
        )}

        {tab === 'loja' && (
          <div className="be-sec">
            <ImagePick label="Logo (PNG sem fundo de preferência)" square value={d.logo} upload={upload} onPick={(u) => set({ logo: u })} onClear={() => set({ logo: '' })} />
            <ImagePick label="Foto do topo (fachada, ambiente)" value={d.cover} upload={upload} onPick={(u) => set({ cover: u })} onClear={() => set({ cover: '' })} />
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field">
                <span>Nome do estabelecimento</span>
                <input className="input" value={d.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
              </label>
              <label className="field">
                <span>Frase curta</span>
                <input className="input" value={d.tagline} maxLength={80} onChange={(e) => set({ tagline: e.target.value })} placeholder="Ex.: Hamburgueria artesanal · Centro" />
              </label>
              <label className="field">
                <span>WhatsApp (botão flutuante)</span>
                <input className="input" value={d.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="(19) 99999-9999" />
              </label>
              <label className="field">
                <span>Instagram (botão flutuante)</span>
                <input className="input" value={d.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@seuperfil" />
              </label>
              <label className="field">
                <span>Telefone (rodapé)</span>
                <input className="input" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
              </label>
              <label className="field">
                <span>Endereço</span>
                <input className="input" value={d.address} onChange={(e) => set({ address: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>Horário de funcionamento</span>
              <textarea className="input" rows={3} value={d.hours} onChange={(e) => set({ hours: e.target.value })} placeholder={'Ter a dom: 18h às 23h\nSegunda: fechado'} />
            </label>
            <label className="field">
              <span>Aviso no topo do cardápio</span>
              <input className="input" value={d.notice} maxLength={140} onChange={(e) => set({ notice: e.target.value })} placeholder="Ex.: Chame o garçom para fazer o pedido" />
            </label>
          </div>
        )}

        {tab === 'visual' && (
          <div className="be-sec">
            <div className="field">
              <label>Tema</label>
              <div className="be-themes">
                {CAT_THEMES.map(([k, l, desc]) => (
                  <button key={k} type="button" className={`be-theme ${d.theme === k ? 'on' : ''}`} onClick={() => set({ theme: k })} title={desc}>
                    <span className={`be-theme-sw csw-${k}`} style={{ ['--c' as any]: d.color, ['--c2' as any]: d.color2 }}>
                      <i />
                      <i />
                      <i />
                    </span>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Cor principal (preços, abas)</label>
              <div className="be-colors">
                {PALETTE.map((c) => (
                  <button key={c} type="button" className={`swatch ${d.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />
                ))}
                <input type="color" value={d.color} onChange={(e) => set({ color: e.target.value })} aria-label="Outra cor" />
              </div>
            </div>
            <div className="field">
              <label>Cor de apoio (selos e aviso)</label>
              <div className="be-colors">
                {['#f5b301', '#fb923c', '#f472b6', '#a3e635', '#38bdf8', '#c084fc', '#e9d3b0', '#d9b779'].map((c) => (
                  <button key={c} type="button" className={`swatch ${d.color2 === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color2: c })} aria-label={c} />
                ))}
                <input type="color" value={d.color2} onChange={(e) => set({ color2: e.target.value })} aria-label="Outra cor" />
              </div>
            </div>
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field">
                <span>Fonte</span>
                <select className="input" value={d.font} onChange={(e) => set({ font: e.target.value })}>
                  {FONTS.map(([f, l]) => (
                    <option key={f} value={f}>
                      {l} ({f})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ícones do fundo</span>
                <select className="input" value={d.niche} onChange={(e) => set({ niche: e.target.value })}>
                  {Object.entries(NICHE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
              <input type="checkbox" checked={d.floating !== false} onChange={(e) => set({ floating: e.target.checked })} /> Ícones flutuando no fundo
            </label>
          </div>
        )}
        {client && <p className="muted" style={{ fontSize: 12 }}>As mudanças só vão para o cardápio quando você clicar em Salvar.</p>}
      </div>

      <div className="be-view">
        <div className="be-phone">
          <div className="be-phone-in">
            <CatalogPage d={d} mode="editor" />
          </div>
        </div>
      </div>
      <button type="button" className="be-toggle btn btn-p" onClick={() => setView(!view)}>
        {view ? 'Voltar a editar' : 'Ver como fica'}
      </button>
    </div>
  );
}
