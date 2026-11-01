import type { Metadata } from 'next';
import { publicLink } from '@/lib/checkout';
import { Checkout } from './Checkout';
import '../checkout.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const link = await publicLink(params.slug).catch(() => null);
  return {
    title: link ? `Pagamento · ${link.title}` : 'Pagamento',
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const link = await publicLink(params.slug, true).catch(() => null);
  if (!link) {
    return (
      <div className="ck">
        <div className="ck-bg" aria-hidden="true" />
        <main className="ck-center">
          <div className="ck-card ck-msg">
            <h1>Link não encontrado</h1>
            <p>Confira o endereço ou peça um novo link para quem te atendeu.</p>
          </div>
        </main>
      </div>
    );
  }
  return <Checkout data={link} />;
}
