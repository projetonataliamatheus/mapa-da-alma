'use client';
/* Página pública do Catálogo digital (cardápio do QR Code). Também é a pré-visualização no editor. Sem carrinho: só mostra. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BTN, NICHE } from '@/lib/bio-icons';
import { CatalogData, CatProduct, TAGS, money } from '@/lib/catalog';
import { buttonHref } from '@/lib/bio';
import './catalog.css';

const Svg = ({ d, s = 20 }: { d: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SPOTS = [
  [6, 30, 26],
  [88, 22, 30],
  [92, 58, 24],
  [4, 70, 30],
  [80, 88, 26],
];

function Product({ p, onOpen }: { p: CatProduct; onOpen: () => void }) {
  return (
    <button type="button" className={`cp-item ${p.photos[0] ? '' : 'nophoto'}`} onClick={onOpen}>
      <span className="cp-item-tx">
        <b>{p.name || 'Produto'}</b>
        {p.desc && <span className="cp-desc">{p.desc}</span>}
        {p.tags.length > 0 && (
          <span className="cp-tags">
            {p.tags.map((t) => (
              <i key={t}>{TAGS.find((x) => x[0] === t)?.[1]}</i>
            ))}
          </span>
        )}
        <span className="cp-price">
          {p.promo != null && p.price != null && p.promo < p.price ? (
            <>
              <s>{money(p.price)}</s> <b>{money(p.promo)}</b>
            </>
          ) : (
            <b>{money(p.price ?? p.promo)}</b>
          )}
        </span>
      </span>
      {p.photos[0] && (
        <span className="cp-thumb">
          <img src={p.photos[0]} alt="" loading="lazy" />
          {p.photos.length > 1 && <em>+{p.photos.length - 1}</em>}
        </span>
      )}
    </button>
  );
}

export function CatalogPage({ d, id, mode = 'live', banner }: { d: CatalogData; id?: string; mode?: 'live' | 'preview' | 'editor'; banner?: React.ReactNode }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<CatProduct | null>(null);
  const [act, setAct] = useState<string>('');
  const root = useRef<HTMLDivElement>(null);
  const track = (kind: string, target = '') => {
    if (mode !== 'live' || !id) return;
    try {
      const body = JSON.stringify({ id, kind, target });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/catalogo/hit', new Blob([body], { type: 'application/json' }));
      else fetch('/api/catalogo/hit', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    } catch {}
  };
  useEffect(() => {
    if (mode === 'live') track('view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const prods = d.products.filter((p) => p.on !== false);
  const sections = useMemo(() => {
    const n = norm(q.trim());
    return d.categories
      .map((c) => ({ c, items: prods.filter((p) => p.cat === c.id && (!n || norm(`${p.name} ${p.desc}`).includes(n))) }))
      .filter((s) => s.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, q]);

  function go(cid: string) {
    setAct(cid);
    const el = root.current?.querySelector(`#cs-${cid}`) as HTMLElement | null;
    if (!el) return;
    const scroller = mode === 'editor' ? root.current?.parentElement : null;
    const top = el.getBoundingClientRect().top + (scroller ? scroller.scrollTop - scroller.getBoundingClientRect().top : window.scrollY) - 64;
    (scroller || window).scrollTo({ top, behavior: 'smooth' });
  }

  const icons = (NICHE[d.niche] || NICHE.comida).icons;
  const font = d.font && d.font !== 'Geist' ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(d.font)}:wght@400;500;600;700;800&display=swap` : null;
  const wa = d.whatsapp ? buttonHref('whatsapp', d.whatsapp, d.name) : null;
  const ig = d.instagram ? buttonHref('instagram', d.instagram) : null;

  return (
    <div ref={root} className={`cp ct-${d.theme || 'claro'} ${mode === 'editor' ? 'in-editor' : ''}`} style={{ ['--c' as any]: d.color || '#e8562a', ['--c2' as any]: d.color2 || '#f5b301', ['--cf' as any]: `'${d.font || 'Poppins'}'` }}>
      {font && <link rel="stylesheet" href={font} />}
      {d.floating !== false && (
        <div className="cp-float" aria-hidden="true">
          {SPOTS.map(([x, y, s], i) => (
            <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-i * 2}s` }}>
              <Svg d={icons[i % icons.length]} s={s} />
            </span>
          ))}
        </div>
      )}
      <header className="cp-head">
        <div className="cp-cover" style={d.cover ? { backgroundImage: `url("${d.cover}")` } : undefined} />
        <div className="cp-id">
          <div className="cp-logo">{d.logo ? <img src={d.logo} alt={d.name} /> : <span>{(d.name || '?').trim().slice(0, 1).toUpperCase()}</span>}</div>
          <h1>{d.name || 'Seu estabelecimento'}</h1>
          {d.tagline && <p className="cp-tagline">{d.tagline}</p>}
          <div className="cp-chips">
            {d.hours && (
              <span title={d.hours}>
                <Svg d={BTN.clock} s={14} /> {d.hours.split('\n')[0]}
              </span>
            )}
            {d.address && (
              <a href={buttonHref('maps', d.address) || '#'} target="_blank" rel="noopener noreferrer">
                <Svg d={BTN.maps} s={14} /> Como chegar
              </a>
            )}
          </div>
        </div>
      </header>
      {d.notice && <p className="cp-notice">{d.notice}</p>}

      <nav className="cp-tabs" aria-label="Categorias">
        <div className="cp-search">
          <Svg d='<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>' s={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cardápio" aria-label="Buscar no cardápio" />
        </div>
        <div className="cp-tabs-row">
          {d.categories
            .filter((c) => prods.some((p) => p.cat === c.id))
            .map((c) => (
              <button key={c.id} type="button" className={act === c.id ? 'on' : ''} onClick={() => go(c.id)}>
                {c.emoji ? `${c.emoji} ` : ''}
                {c.name}
              </button>
            ))}
        </div>
      </nav>

      <main className="cp-main">
        {sections.length === 0 && <p className="cp-empty">{q ? `Nada encontrado para “${q}”.` : 'O cardápio está sendo preparado.'}</p>}
        {sections.map(({ c, items }) => (
          <section key={c.id} id={`cs-${c.id}`} className="cp-sec">
            <h2>
              {c.emoji && <span>{c.emoji}</span>}
              {c.name}
            </h2>
            <div className="cp-list">
              {items.map((p) => (
                <Product
                  key={p.id}
                  p={p}
                  onOpen={() => {
                    setOpen(p);
                    track('open', p.name);
                  }}
                />
              ))}
            </div>
          </section>
        ))}

        <footer className="cp-foot">
          <b>{d.name}</b>
          {d.hours && <p style={{ whiteSpace: 'pre-line' }}>{d.hours}</p>}
          {d.address && <p>{d.address}</p>}
          {d.phone && <p>{d.phone}</p>}
          {d.footer !== false && (
            <a className="cp-made" href="https://olinks.com.br" target="_blank" rel="noopener noreferrer">
              cardápio digital <b>olinks</b>
            </a>
          )}
        </footer>
      </main>

      {(wa || ig) && (
        <div className="cp-fab">
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="ig" onClick={() => track('click', 'instagram')}>
              <Svg d={BTN.instagram} s={22} />
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="wa" onClick={() => track('click', 'whatsapp')}>
              <Svg d={BTN.whatsapp} s={24} />
            </a>
          )}
        </div>
      )}

      {open && (
        <div className="cp-modal" role="dialog" aria-label={open.name} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="cp-sheet">
            <button type="button" className="cp-x" onClick={() => setOpen(null)} aria-label="Fechar">
              ✕
            </button>
            {open.photos.length > 0 && (
              <div className="cp-car">
                <div className="cp-car-in">
                  {open.photos.map((ph, i) => (
                    <img key={i} src={ph} alt={`${open.name} ${i + 1}`} />
                  ))}
                </div>
                {open.photos.length > 1 && (
                  <div className="cp-dots" aria-hidden="true">
                    {open.photos.map((_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="cp-sheet-tx">
              <h3>{open.name}</h3>
              {open.tags.length > 0 && (
                <span className="cp-tags">
                  {open.tags.map((t) => (
                    <i key={t}>{TAGS.find((x) => x[0] === t)?.[1]}</i>
                  ))}
                </span>
              )}
              {open.desc && <p>{open.desc}</p>}
              <div className="cp-price big">
                {open.promo != null && open.price != null && open.promo < open.price ? (
                  <>
                    <s>{money(open.price)}</s> <b>{money(open.promo)}</b>
                  </>
                ) : (
                  <b>{money(open.price ?? open.promo)}</b>
                )}
              </div>
              {d.notice && <small>{d.notice}</small>}
            </div>
          </div>
        </div>
      )}
      {banner}
    </div>
  );
}
