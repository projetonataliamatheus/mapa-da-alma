import type { Metadata } from 'next';
import { admin } from '@/lib/supabase/admin';
import { agencyWhatsapp } from './shared';
import './packs.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Packs de artes no Canva' };

/** Vitrine de todos os packs ativos (packs.suaagencia.com.br). */
export default async function Page() {
  const [{ data }, wa] = await Promise.all([admin().from('canva_packs').select('slug,name,niche,cover,images,items').eq('active', true).order('sort').order('created_at'), agencyWhatsapp().catch(() => ({ phone: '', company: '' }))]);
  const list = data || [];
  return (
    <div className="pk">
      <div className="pk-wrap">
        <div className="pk-top">
          <b>{wa.company || 'Packs de artes'}</b>
        </div>
        <div className="pk-hero">
          <h1>Packs de artes prontas no Canva</h1>
          <p>Escolha o pack do seu ramo, veja as prévias e chame a gente no WhatsApp.</p>
        </div>
        {list.length === 0 ? (
          <p className="pk-empty">Em breve.</p>
        ) : (
          <div className="pk-list">
            {list.map((p: any) => (
              <a key={p.slug} className="pk-card" href={`/p/${p.slug}`}>
                {(p.cover || p.images?.[0]) && <img src={p.cover || p.images[0]} alt="" loading="lazy" />}
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.niche || ''}
                    {p.items ? ` · ${p.items} artes` : ''}
                  </small>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
