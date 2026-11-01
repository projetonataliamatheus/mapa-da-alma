'use client';
/* Orçamentos: gerador completo (planos, conectores, ícones, editor de modelos, FAQ e rodapé), trazido do Lovable. */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const QuoteHub = dynamic(() => import('@/lv/pages/admin/QuoteHub'), { ssr: false, loading: () => <p className="muted">Carregando…</p> });

export default function Page() {
  return (
    <LvRoot panel>
      <QuoteHub />
    </LvRoot>
  );
}
