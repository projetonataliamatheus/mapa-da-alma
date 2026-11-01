'use client';
/* Contratos de prestação de serviço com assinatura digital (trazido do Lovable, com o visual do painel). */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const Contracts = dynamic(() => import('@/lv/pages/admin/Contracts'), { ssr: false, loading: () => <p className="muted">Carregando…</p> });

export default function Page() {
  return (
    <LvRoot panel>
      <Contracts />
    </LvRoot>
  );
}
