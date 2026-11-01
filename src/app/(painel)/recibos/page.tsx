'use client';
/* Recibos manuais em PDF (trazido do Lovable, com o visual do painel). */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const Receipts = dynamic(() => import('@/lv/pages/admin/Receipts'), { ssr: false, loading: () => <p className="muted">Carregando…</p> });

export default function Page() {
  return (
    <LvRoot panel>
      <Receipts />
    </LvRoot>
  );
}
