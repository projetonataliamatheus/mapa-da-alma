'use client';
/* Contrato público: o cliente lê e assina (trazido do Lovable). */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const PublicContract = dynamic(() => import('@/lv/pages/PublicContract'), { ssr: false, loading: () => <p style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>Carregando contrato…</p> });

export default function Page() {
  return (
    <LvRoot>
      <PublicContract />
    </LvRoot>
  );
}
