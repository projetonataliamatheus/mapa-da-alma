'use client';
/* Relatórios de tráfego pago (importação da planilha do Gerenciador de Anúncios), trazido do Lovable. */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const TrafficReports = dynamic(() => import('@/lv/pages/admin/TrafficReports'), { ssr: false, loading: () => <p className="muted">Carregando…</p> });

export default function Page() {
  return (
    <LvRoot panel>
      <TrafficReports />
    </LvRoot>
  );
}
