'use client';
/* Prévia de modelo de orçamento (aberta pelo Editor de Modelos). */
import dynamic from 'next/dynamic';
import LvRoot from '@/lv/LvRoot';

const TemplatePreview = dynamic(() => import('@/lv/pages/admin/TemplatePreview'), { ssr: false });

export default function Page() {
  return (
    <LvRoot>
      <TemplatePreview />
    </LvRoot>
  );
}
