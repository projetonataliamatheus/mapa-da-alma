'use client';
/* Texto com os glifos dos signos (♈…♓) trocados pelos ícones próprios desenhados. */
import { RE_GLIFO, svgSigno } from '@/lib/mapa-alma/signosIcones';

export function TxtSigno({ t }: { t: unknown }) {
  const s = String(t ?? '');
  if (!/[♈-♓]/.test(s)) return <>{s}</>;
  const partes: React.ReactNode[] = [];
  let ult = 0, i = 0;
  for (const m of s.matchAll(RE_GLIFO)) {
    if (m.index! > ult) partes.push(s.slice(ult, m.index));
    partes.push(<span key={i++} className="zs-ico" dangerouslySetInnerHTML={{ __html: svgSigno(m[0][0]) }} />);
    ult = m.index! + m[0].length;
  }
  if (ult < s.length) partes.push(s.slice(ult));
  return <>{partes}</>;
}
