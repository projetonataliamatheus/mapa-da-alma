import type { Metadata, Viewport } from 'next';
import { admin } from '@/lib/supabase/admin';
import { catMerge } from '@/lib/catalog';
import { CatalogPage } from '@/components/CatalogPage';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  if (!/^[a-z0-9]{2,30}$/.test(slug || '')) return null;
  const { data } = await admin().from('catalogs').select('id,slug,status,data,visible').eq('slug', slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await load(params.slug).catch(() => null);
  if (!c) return { title: 'Cardápio não encontrado', robots: { index: false } };
  const d = catMerge(c.data);
  return {
    title: `${d.name} · Cardápio`,
    description: d.tagline || `Cardápio digital de ${d.name}`,
    robots: c.status === 'publicado' ? undefined : { index: false, follow: false },
    openGraph: { title: `${d.name} · Cardápio`, images: d.logo ? [d.logo] : d.cover ? [d.cover] : undefined },
    icons: d.logo ? { icon: d.logo } : undefined,
  };
}

export async function generateViewport({ params }: { params: { slug: string } }): Promise<Viewport> {
  const c = await load(params.slug).catch(() => null);
  const d = c ? catMerge(c.data) : null;
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: d?.theme === 'escuro' ? '#0f1013' : d?.theme === 'marca' ? d.color : '#ffffff' };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const c = await load(params.slug).catch(() => null);
  if (!c || c.status === 'pausado' || (c as any).visible === false)
    return (
      <div className="cp" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <h1>{c ? 'Cardápio temporariamente indisponível' : 'Cardápio não encontrado'}</h1>
          <p className="cp-tagline" style={{ marginTop: 8 }}>
            {c ? 'Peça o cardápio ao atendente.' : 'Confira o endereço ou o QR Code.'}
          </p>
        </div>
      </div>
    );
  const live = c.status === 'publicado';
  return <CatalogPage d={catMerge(c.data)} id={c.id} mode={live ? 'live' : 'preview'} banner={live ? undefined : <div className="cp-mark">Prévia · ainda não publicado</div>} />;
}
