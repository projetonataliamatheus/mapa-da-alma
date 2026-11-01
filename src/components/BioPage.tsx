'use client';
/* Página pública do Link na bio (também usada como pré-visualização no editor). */
import { useEffect, useState } from 'react';
import { BTN, NICHE } from '@/lib/bio-icons';
import { BioData, buttonHref } from '@/lib/bio';
import './bio.css';

const Svg = ({ d, s = 20 }: { d: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);

/** Posições fixas (não mudam a cada visita) para os ícones que flutuam no fundo. */
const SPOTS = [
  [8, 12, 30, 0],
  [82, 8, 26, 2],
  [90, 38, 34, 4],
  [4, 46, 28, 1],
  [76, 66, 30, 3],
  [12, 78, 34, 5],
  [50, 90, 24, 2],
  [60, 24, 22, 6],
];

export function BioPage({ d, pageId, mode = 'live', banner }: { d: BioData; pageId?: string; mode?: 'live' | 'preview' | 'editor'; banner?: React.ReactNode }) {
  const [copied, setCopied] = useState('');
  const [photo, setPhoto] = useState<number | null>(null);
  const track = (kind: string, target = '') => {
    if (mode !== 'live' || !pageId) return;
    try {
      const body = JSON.stringify({ id: pageId, kind, target });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/bio/hit', new Blob([body], { type: 'application/json' }));
      else fetch('/api/bio/hit', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    } catch {}
  };
  useEffect(() => {
    if (mode === 'live') track('view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icons = (NICHE[d.niche] || NICHE.geral).icons;
  const font = d.font && d.font !== 'Geist' ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(d.font)}:wght@400;500;600;700;800&display=swap` : null;
  const buttons = d.buttons.filter((b) => b.on !== false && (b.value || mode === 'editor'));
  const theme = d.theme || 'aurora';
  const initials = (d.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const dock = theme === 'luxo';
  const waSocial = d.socials.find((s) => s.type === 'whatsapp');
  const dockSocials = d.socials.filter((s) => s !== waSocial);
  async function copyPix(key: string, id: string) {
    try {
      await navigator.clipboard.writeText(key);
    } catch {}
    setCopied(id);
    setTimeout(() => setCopied(''), 2200);
  }

  return (
    <div className={`bio t-${d.theme || 'aurora'} ${mode === 'editor' ? 'in-editor' : ''}`} style={{ ['--c' as any]: d.color || '#e8562a', ['--c2' as any]: d.color2 || '#7a5af8', ['--bf' as any]: `'${d.font || 'Geist'}'` }}>
      {font && <link rel="stylesheet" href={font} />}
      <div className="bio-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {d.floating !== false && (
        <div className="bio-float" aria-hidden="true">
          {SPOTS.map(([x, y, s, k], i) => (
            <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-i * 1.7}s`, ['--r' as any]: `${(i % 2 ? 1 : -1) * (8 + i * 3)}deg` }}>
              <Svg d={icons[(k as number) % icons.length]} s={s as number} />
            </span>
          ))}
        </div>
      )}

      {theme === 'elegante' && (
        <div className="bio-mono" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i}>{initials}</span>
          ))}
        </div>
      )}
      <main className="bio-main">
        {(theme === 'capa' || theme === 'luxo') && <div className="bio-cover" style={d.cover ? { backgroundImage: `url("${d.cover}")` } : undefined} />}
        {theme === 'elegante' && <div className="bio-hero" style={d.cover || d.avatar ? { backgroundImage: `url("${d.cover || d.avatar}")` } : undefined} />}
        <header className="bio-head">
          {theme !== 'elegante' && (
            <div className="bio-av">{d.avatar ? <img src={d.avatar} alt={d.name} /> : <span>{(d.name || '?').trim().slice(0, 1).toUpperCase()}</span>}</div>
          )}
          {d.logo ? <img className="bio-logo" src={d.logo} alt={d.name} /> : <h1>{d.name || 'Seu negócio'}</h1>}
          {d.logo && <h1 className="sr-only">{d.name}</h1>}
          {d.subtitle && <p className="bio-sub">{d.subtitle}</p>}
          {theme === 'elegante' && (
            <p className="bio-hello">
              <b>Bem-vindo(a)</b>
              <span>Toque nos botões para interagir</span>
            </p>
          )}
          {d.tagline && <p className="bio-tag">{d.tagline}</p>}
          {!dock && d.socials.length > 0 && (
            <nav className="bio-soc" aria-label="Redes sociais">
              {d.socials.map((s, i) => {
                const h = buttonHref(s.type, s.value, d.name);
                return h ? (
                  <a key={i} href={h} target="_blank" rel="noopener noreferrer" aria-label={s.type} onClick={() => track('social', s.type)}>
                    <Svg d={BTN[s.type] || BTN.link} s={20} />
                  </a>
                ) : null;
              })}
            </nav>
          )}
        </header>

        <section className="bio-btns">
          {buttons.map((b, i) => {
            const h = buttonHref(b.type, b.value, d.name);
            const inner = (
              <>
                <span className="bio-bi">
                  <Svg d={BTN[b.type] || BTN.link} />
                </span>
                <span className="bio-bl">{b.type === 'pix' && copied === b.id ? 'Chave Pix copiada!' : b.label || 'Botão'}</span>
                <span className="bio-ba" aria-hidden="true">
                  <Svg d={b.type === 'pix' ? '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>' : '<path d="M9 6l6 6-6 6"/>'} s={16} />
                </span>
              </>
            );
            const cls = `bio-btn ${b.highlight ? 'hl' : ''}`;
            const st = { animationDelay: `${120 + i * 70}ms` };
            if (b.type === 'pix')
              return (
                <button key={b.id} type="button" className={cls} style={st} onClick={() => (copyPix(b.value, b.id), track('click', 'pix'))}>
                  {inner}
                </button>
              );
            return h ? (
              <a key={b.id} className={cls} style={st} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" onClick={() => track('click', b.label || b.type)}>
                {inner}
              </a>
            ) : (
              <span key={b.id} className={cls + ' empty'} style={st}>
                {inner}
              </span>
            );
          })}
        </section>

        {d.about && <p className="bio-about">{d.about}</p>}

        {dock && d.socials.length > 0 && (
          <nav className={`bio-dock ${waSocial ? 'has-main' : ''}`} aria-label="Redes sociais">
            {waSocial && (
              <a className="bio-dock-main" href={buttonHref('whatsapp', waSocial.value, d.name) || '#'} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" onClick={() => track('social', 'whatsapp')}>
                <Svg d={BTN.whatsapp} s={30} />
              </a>
            )}
            {dockSocials.map((s, i) => {
              const h = buttonHref(s.type, s.value, d.name);
              return h ? (
                <a key={i} href={h} target="_blank" rel="noopener noreferrer" aria-label={s.type} onClick={() => track('social', s.type)} className={waSocial && i === Math.ceil(dockSocials.length / 2) - 1 ? 'gap-after' : ''}>
                  <Svg d={BTN[s.type] || BTN.link} s={22} />
                </a>
              ) : null;
            })}
          </nav>
        )}

        {d.gallery.length > 0 && (
          <section className="bio-gal" aria-label="Fotos">
            {d.gallery.map((g, i) => (
              <button key={i} type="button" onClick={() => setPhoto(i)} aria-label={`Ver foto ${i + 1}`}>
                <img src={g} alt="" loading="lazy" />
              </button>
            ))}
          </section>
        )}

        {(d.address || d.hours) && (
          <section className="bio-info">
            {d.hours && (
              <p>
                <Svg d={BTN.clock} s={18} />
                <span style={{ whiteSpace: 'pre-line' }}>{d.hours}</span>
              </p>
            )}
            {d.address && (
              <p>
                <Svg d={BTN.maps} s={18} />
                <a href={buttonHref('maps', d.address) || '#'} target="_blank" rel="noopener noreferrer" onClick={() => track('click', 'endereco')}>
                  {d.address}
                </a>
              </p>
            )}
          </section>
        )}

        {d.footer !== false && (
          <footer className="bio-foot">
            <a href="https://olinks.com.br" target="_blank" rel="noopener noreferrer">
              feito com <b>olinks</b>
            </a>
          </footer>
        )}
      </main>

      {photo !== null && (
        <div className="bio-lb" role="dialog" aria-label="Foto" onClick={() => setPhoto(null)}>
          <img src={d.gallery[photo]} alt="" />
          <button type="button" aria-label="Fechar">
            ✕
          </button>
        </div>
      )}
      {banner}
    </div>
  );
}
