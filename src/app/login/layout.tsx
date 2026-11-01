import type { Metadata } from 'next';
import { BrandProvider } from '@/components/Brand';
import { getBrand } from '@/lib/brand-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBrand();
  return { title: `Entrar · ${b.name}`, ...(b.logo ? { icons: { icon: b.logo, apple: b.logo } } : {}) };
}

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  return <BrandProvider initial={await getBrand()}>{children}</BrandProvider>;
}
