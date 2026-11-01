'use client';
/* Relatório de tráfego público (trazido do Lovable). */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const ReportPage = dynamic(() => import('@/lv/pages/ReportPage'), { ssr: false, loading: () => <p style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>Carregando relatório…</p> });

export default function Page() {
  return (
    <LvRoot>
      <ReportPage />
    </LvRoot>
  );
}
