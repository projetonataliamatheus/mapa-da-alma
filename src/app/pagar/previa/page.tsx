import type { Metadata } from 'next';
import { admin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { Checkout } from '../[slug]/Checkout';
import '../checkout.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Prévia do checkout', robots: { index: false, follow: false } };

/** Prévia do checkout publicado (sem cobrar): o Master abre ou manda para alguém revisar. ?produto=slug escolhe o produto. */
export default async function Previa({ searchParams }: { searchParams: { produto?: string; tela?: string } }) {
  const db = admin();
  const s: any = await getSettings(db);
  const ck = s.checkout || {};
  const slug = searchParams.produto || 'mapa-completo';
  const { data: svc } = await db.from('services').select('*').eq('slug', slug).maybeSingle();
  const tela = (['dados', 'pix', 'cartao', 'pago'].includes(String(searchParams.tela)) ? searchParams.tela : 'dados') as any;
  const data: any = {
    slug: 'previa', status: 'ativo',
    title: svc?.name || 'Mapa da Alma Completo',
    description: svc?.description || '',
    includes: svc?.includes || '',
    amount: Number(svc?.price_steps?.[0] || svc?.max_price) || 49,
    billing: 'unico',
    max_installments: Number(ck.max_installments) || 1,
    methods: ck.methods?.length ? ck.methods : ['pix', 'card'],
    prefill: { name: '', document: '', phone: '' },
    brand: ck.brand || s.company_name || 'Mapa da Alma',
    accent: ck.accent || '#7a5af8', logo: ck.logo_url, note: ck.unico_note || 'Pagamento único · seu mapa para sempre',
    success: ck.success_message || '', footer: ck.footer || '',
    company: { document: '', city: '', email: '', phone: '' },
    design: ck.design,
  };
  return (
    <>
      <div style={{ position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#2a1259', color: '#f3dfa2', padding: '6px 14px', borderRadius: 999, fontFamily: 'system-ui', fontSize: 12.5, boxShadow: '0 6px 18px rgba(0,0,0,.25)' }}>
        Prévia do checkout · nada é cobrado
      </div>
      <Checkout data={data} demo={tela} />
    </>
  );
}
