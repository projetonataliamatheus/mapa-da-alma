import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { admin } from '@/lib/supabase/admin';
import { catMerge } from '@/lib/catalog';
import { catBase } from '@/lib/catalog-server';
import { PrintButton } from './PrintButton';
import '../../qr.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'QR Code do cardápio', robots: { index: false } };

/** Plaquinha de mesa para imprimir (QR Code + logo + nome). */
export default async function Qr({ params }: { params: { slug: string } }) {
  const { data: c } = await admin().from('catalogs').select('slug,data').eq('slug', params.slug).maybeSingle();
  if (!c) return <p style={{ padding: 30 }}>Catálogo não encontrado.</p>;
  const d = catMerge(c.data);
  const url = `${await catBase()}/${c.slug}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
  const cards = [0, 1];
  return (
    <div className="qrp" style={{ ['--c' as any]: d.color }}>
      <div className="qrp-bar">
        <span>Plaquinha de mesa · 2 por folha A4 (corte na linha)</span>
        <PrintButton />
      </div>
      <div className="qrp-sheet">
        {cards.map((i) => (
          <div key={i} className="qrp-card">
            {d.logo ? <img className="qrp-logo" src={d.logo} alt="" /> : <b className="qrp-name">{d.name}</b>}
            <p className="qrp-call">Escaneie e veja o nosso cardápio</p>
            <div className="qrp-code" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="qrp-how">Abra a câmera do celular e aponte para o código</p>
            <small className="qrp-url">{url.replace(/^https?:\/\//, '')}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
