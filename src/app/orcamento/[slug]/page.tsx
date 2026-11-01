'use client';
/* Orçamento público (gerador trazido do Lovable). */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const QuotePage = dynamic(() => import('@/lv/pages/QuotePage'), { ssr: false, loading: () => <p style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>Carregando orçamento…</p> });

export default function Page() {
  return (
    <LvRoot>
      <QuotePage />
    </LvRoot>
  );
}
