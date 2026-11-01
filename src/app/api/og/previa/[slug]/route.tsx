import { ImageResponse } from 'next/og';
import { previewShare } from '@/lib/preview-share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Imagem de compartilhamento da prévia (1200x630): parece um anúncio com o nome do cliente. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const i = (await previewShare(params.slug).catch(() => null)) || { name: 'Seu novo site', line: 'Site profissional', agency: '', color: '#e8562a', business: '' };
  const c = i.color;
  const big = i.name.length > 22 ? 64 : 80;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: `linear-gradient(135deg, #0b0f17 0%, #111827 55%, ${c} 160%)`, color: '#fff', fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -120, top: -120, width: 520, height: 520, borderRadius: 520, background: c, opacity: 0.25, display: 'flex' }} />
        <div style={{ position: 'absolute', right: 80, bottom: 70, width: 380, height: 260, borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', padding: 18 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 12, background: '#ff5f57', display: 'flex' }} />
            <div style={{ width: 12, height: 12, borderRadius: 12, background: '#febc2e', display: 'flex' }} />
            <div style={{ width: 12, height: 12, borderRadius: 12, background: '#28c840', display: 'flex' }} />
          </div>
          <div style={{ marginTop: 22, width: 220, height: 18, borderRadius: 9, background: c, display: 'flex' }} />
          <div style={{ marginTop: 14, width: 300, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.25)', display: 'flex' }} />
          <div style={{ marginTop: 10, width: 260, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.18)', display: 'flex' }} />
          <div style={{ marginTop: 24, width: 140, height: 40, borderRadius: 20, background: c, display: 'flex' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', width: 760 }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 999, background: c, color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>PRÉVIA EXCLUSIVA DO SEU SITE</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: big, fontWeight: 800, lineHeight: 1.05 }}>{i.name}</div>
          <div style={{ display: 'flex', marginTop: 16, fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>{i.line}</div>
          {i.business ? <div style={{ display: 'flex', marginTop: 8, fontSize: 28, color: 'rgba(255,255,255,0.6)' }}>{i.business}</div> : null}
          <div style={{ display: 'flex', marginTop: 40, fontSize: 26, color: 'rgba(255,255,255,0.7)' }}>Toque para ver como ficou ✨ {i.agency ? `· ${i.agency}` : ''}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=600' } },
  );
}
