import type { Metadata } from 'next';
import '@/components/bio.css';

export const metadata: Metadata = { title: 'olinks · seu link na bio profissional', description: 'Uma página com todos os seus links: WhatsApp, Instagram, agenda, cardápio e mais.' };

/** Página inicial do domínio olinks (quem digita só o endereço). */
export default function Home() {
  const wa = process.env.NEXT_PUBLIC_OLINKS_WHATSAPP || '';
  return (
    <div className="bio t-aurora" style={{ ['--c' as any]: '#e8562a', ['--c2' as any]: '#7a5af8' }}>
      <div className="bio-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <main className="bio-main" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
        <header className="bio-head">
          <div className="bio-av">
            <span>o</span>
          </div>
          <h1>olinks</h1>
          <p className="bio-tag">Todos os links do seu negócio numa página só, bonita e pronta para colocar na bio do Instagram.</p>
        </header>
        {wa && (
          <section className="bio-btns">
            <a className="bio-btn hl" href={`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Quero o meu link na bio.')}`}>
              <span className="bio-bl" style={{ textAlign: 'center' }}>
                Quero o meu
              </span>
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
