import type { Metadata } from 'next';
import { Shell } from '@/components/Shell';
import { BrandProvider } from '@/components/Brand';
import { getBrand } from '@/lib/brand-server';

// a marca é lida a cada acesso (sem isto o Next congela a página com a cor do momento do Implantar)
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBrand();
  return { title: b.name, ...(b.logo ? { icons: { icon: b.logo, apple: b.logo } } : {}) };
}

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <BrandProvider initial={brand}>
      <Shell>{children}</Shell>
    </BrandProvider>
  );
}
