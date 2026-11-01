import type { Metadata, Viewport } from 'next';
import { admin } from '@/lib/supabase/admin';
import { mergeData } from '@/lib/bio';
import { BioPage } from '@/components/BioPage';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  if (!/^[a-z0-9]{2,30}$/.test(slug || '')) return null;
  const { data } = await admin().from('bio_pages').select('id,slug,status,data,visible').eq('slug', slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await load(params.slug).catch(() => null);
  if (!p) return { title: 'Página não encontrada', robots: { index: false } };
  const d = mergeData(p.data);
  return {
    title: d.name,
    description: d.tagline || `Links de ${d.name}`,
    robots: p.status === 'publicado' ? undefined : { index: false, follow: false },
    openGraph: { title: d.name, description: d.tagline || undefined, images: d.avatar ? [d.avatar] : undefined },
    icons: d.avatar ? { icon: d.avatar } : undefined,
  };
}

export async function generateViewport({ params }: { params: { slug: string } }): Promise<Viewport> {
  const p = await load(params.slug).catch(() => null);
  const d = p ? mergeData(p.data) : null;
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: d?.theme === 'noite' ? '#0b0d14' : d?.theme === 'bold' ? d.color : '#ffffff' };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const p = await load(params.slug).catch(() => null);
  if (!p || p.status === 'pausado' || (p as any).visible === false)
    return (
      <div className="bio t-clean" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <h1>{p ? 'Página temporariamente indisponível' : 'Página não encontrada'}</h1>
          <p className="bio-tag" style={{ margin: '10px auto 0' }}>
            {p ? 'Volte em breve.' : 'Confira o endereço digitado.'}
          </p>
        </div>
      </div>
    );
  const d = mergeData(p.data);
  const live = p.status === 'publicado';
  return <BioPage d={d} pageId={p.id} mode={live ? 'live' : 'preview'} banner={live ? undefined : <div className="bio-mark">Prévia · ainda não publicada</div>} />;
}
