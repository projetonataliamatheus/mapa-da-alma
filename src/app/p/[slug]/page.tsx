import type { Metadata } from 'next';
import { admin } from '@/lib/supabase/admin';
import { PackGallery } from '../PackGallery';
import { agencyWhatsapp, WA_ICON } from '../shared';
import '../packs.css';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  if (!/^[a-z0-9-]{2,50}$/.test(slug || '')) return null;
  const { data } = await admin().from('canva_packs').select('*').eq('slug', slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await load(params.slug).catch(() => null);
  if (!p) return { title: 'Pack não encontrado', robots: { index: false } };
  const img = p.cover || (p.images || [])[0];
  return { title: `${p.name} · Pack de artes no Canva`, description: p.description || `Artes prontas para ${p.niche || 'o seu negócio'}, editáveis no Canva.`, openGraph: { title: p.name, images: img ? [img] : undefined } };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const p = await load(params.slug).catch(() => null);
  if (!p || !p.active)
    return (
      <div className="pk">
        <div className="pk-empty">
          <h1>{p ? 'Este pack está indisponível no momento' : 'Pack não encontrado'}</h1>
        </div>
      </div>
    );
  admin().from('canva_packs').update({ views: (p.views || 0) + 1 }).eq('id', p.id).then(() => {}, () => {});
  const wa = await agencyWhatsapp().catch(() => ({ phone: '', company: '' }));
  const images: string[] = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  const msg = `Olá! Vi o pack "${p.name}" e quero saber mais 😊`;
  return (
    <div className="pk">
      <div className="pk-wrap">
        <div className="pk-top">
          <b>{wa.company || 'Packs de artes'}</b> · Pack de artes no Canva
        </div>
        <div className="pk-hero">
          <h1>{p.name}</h1>
          {p.description && <p style={{ whiteSpace: 'pre-line' }}>{p.description}</p>}
          <div className="pk-tags">
            {p.items ? <span className="hl">{p.items} artes prontas</span> : null}
            <span>Editável no Canva (grátis)</span>
            <span>Troque textos, cores e fotos</span>
            {p.niche && <span>{p.niche}</span>}
          </div>
        </div>
        {images.length ? <PackGallery images={images} name={p.name} /> : <p className="pk-empty">As prévias deste pack estão sendo preparadas.</p>}
        <p className="pk-foot">Imagens de prévia. Depois da compra você recebe o link do Canva para editar com a sua marca.</p>
      </div>
      {wa.phone && (
        <a className="pk-cta" href={`https://wa.me/${wa.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: WA_ICON }} />
          Quero este pack
        </a>
      )}
    </div>
  );
}
