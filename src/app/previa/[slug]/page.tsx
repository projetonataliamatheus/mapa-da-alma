import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { publicPreview } from '@/lib/preview';
import { previewShare } from '@/lib/preview-share';
import { getSettings } from '@/lib/settings';
import { admin } from '@/lib/supabase/admin';
import '../previa.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const info = await previewShare(params.slug).catch(() => null);
  if (!info) return { title: 'Prévia', robots: { index: false, follow: false } };
  const img = `/api/og/previa/${params.slug}`;
  return { title: info.title, description: info.desc, robots: { index: false, follow: false }, openGraph: { title: info.title, description: info.desc, images: [{ url: img, width: 1200, height: 630 }], type: 'website' }, twitter: { card: 'summary_large_image', title: info.title, description: info.desc, images: [img] } };
}

const wa = (n?: string | null, text = '') => (n ? `https://wa.me/${String(n).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null);

export default async function Page({ params }: { params: { slug: string } }) {
  const p = await publicPreview(params.slug, true).catch(() => null);
  if (p && (p as any).visible === false)
    return (
      <div className="pv">
        <main className="pv-empty">
          <h1>Página temporariamente indisponível</h1>
          <p>Fale com quem te enviou este link.</p>
        </main>
      </div>
    );
  // prévia com modelo premium: a página é o próprio site do modelo
  if ((p?.content as any)?.kind === 'premium') redirect(`/site/${params.slug}`);
  if (!p) {
    return (
      <div className="pv">
        <main className="pv-empty">
          <h1>Prévia não encontrada</h1>
          <p>Confira o endereço com quem te enviou.</p>
        </main>
      </div>
    );
  }
  const settings = await getSettings(admin());
  const c = p.content;
  const b = c.business;
  const t = c.template;
  const contact = wa(b.whatsapp || b.phone, `Olá! Vi o site da ${b.name} e quero agendar.`);
  const ours = wa(settings.company?.phone, `Oi! Vi a prévia do site da ${b.name} e quero fechar.`);
  const map = b.lat && b.lng ? `https://maps.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed` : b.address ? `https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&z=15&output=embed` : null;
  const hero = t.hero_image ? { backgroundImage: `linear-gradient(180deg, rgba(10,12,20,.55), rgba(10,12,20,.75)), url("${t.hero_image}")` } : {};

  return (
    <div className={`pv pv-${t.style}`} style={{ ['--pv' as any]: t.accent }}>
      <div className="pv-ribbon">
        <span>
          Prévia gratuita feita por <b>{p.brand}</b> para <b>{b.name}</b> ·{' '}
          <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', background: 'none', padding: 0 }}>
            termos
          </a>
          {' · '}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', background: 'none', padding: 0 }}>
            privacidade
          </a>
        </span>
        {ours && (
          <a href={ours} target="_blank" rel="noreferrer">
            Quero meu site assim
          </a>
        )}
      </div>

      <header className={`pv-hero ${t.hero_image ? 'img' : ''}`} style={hero}>
        <nav className="pv-nav">
          <b>{b.name}</b>
          {contact && (
            <a className="pv-btn ghost" href={contact} target="_blank" rel="noreferrer">
              Fale conosco
            </a>
          )}
        </nav>
        <div className="pv-hero-in">
          {b.rating ? (
            <span className="pv-badge">
              ★ {Number(b.rating).toFixed(1).replace('.', ',')} no Google · {b.reviews} avaliações
            </span>
          ) : (
            b.city && <span className="pv-badge">{b.city}</span>
          )}
          <h1>{c.headline}</h1>
          <p>{c.subheadline}</p>
          <div className="pv-cta">
            {contact && (
              <a className="pv-btn" href={contact} target="_blank" rel="noreferrer">
                {c.cta}
              </a>
            )}
            <a className="pv-btn ghost" href="#servicos">
              Ver serviços
            </a>
          </div>
        </div>
      </header>

      <section className="pv-benefits">
        {c.benefits.map((x, i) => (
          <div key={i}>
            <span className="pv-dot" />
            {x}
          </div>
        ))}
      </section>

      <section id="servicos" className="pv-sec">
        <h2>Serviços</h2>
        <div className="pv-grid">
          {c.services.map((s, i) => (
            <article key={i} className="pv-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="pv-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pv-sec pv-about">
        <div>
          <h2>Sobre {b.name}</h2>
          <p>{c.about}</p>
          {contact && (
            <a className="pv-btn" href={contact} target="_blank" rel="noreferrer">
              {c.cta}
            </a>
          )}
        </div>
        {(t.gallery || []).length > 0 && (
          <div className="pv-gallery">
            {(t.gallery || []).slice(0, 4).map((g, i) => (
              <img key={i} src={g} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </section>

      <section className="pv-sec">
        <h2>Perguntas frequentes</h2>
        <div className="pv-faq">
          {c.faq.map((f, i) => (
            <details key={i}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {(map || b.address) && (
        <section className="pv-sec pv-where">
          <div>
            <h2>Onde estamos</h2>
            {b.address && <p>{b.address}</p>}
            {b.maps_url && (
              <a className="pv-link" href={b.maps_url} target="_blank" rel="noreferrer">
                Abrir no Google Maps →
              </a>
            )}
          </div>
          {map && <iframe title="Mapa" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
        </section>
      )}

      <section className="pv-final">
        <h2>{c.closing}</h2>
        {contact && (
          <a className="pv-btn light" href={contact} target="_blank" rel="noreferrer">
            {c.cta}
          </a>
        )}
      </section>

      <footer className="pv-foot">
        <span>
          {b.name}
          {b.city ? ` · ${b.city}` : ''}
          {b.instagram ? ` · ${b.instagram}` : ''}
        </span>
        <span>
          Prévia de demonstração criada por {p.brand}. Textos e fotos são ilustrativos.
        </span>
      </footer>

      {contact && (
        <a className="pv-float" href={contact} target="_blank" rel="noreferrer" aria-label="Chamar no WhatsApp">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 20l1.3-3.8A8.5 8.5 0 1 1 8.2 19z" />
            <path d="M9.3 9c.4 2.6 2.6 4.8 5.2 5.3" />
          </svg>
        </a>
      )}
    </div>
  );
}
