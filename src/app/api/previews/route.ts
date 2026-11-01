import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { generatePreview, previewUrl } from '@/lib/preview';
import { connectedNumber, logEvent, sendPreviewLink } from '@/lib/engine';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** Gera (ou refaz) a prévia de um lead. send=true também manda no WhatsApp. */
export const POST = withUser(async (req) => {
  const { lead_id, send, template, reuse } = await req.json();
  if (!lead_id) return NextResponse.json({ error: 'Lead não informado.' }, { status: 400 });
  let p: any;
  try {
    const { data: l0 } = await admin().from('leads').select('preview_slug').eq('id', lead_id).maybeSingle();
    if (reuse && l0?.preview_slug) p = { slug: l0.preview_slug, url: previewUrl(await getSettings(admin()), l0.preview_slug) };
    else p = await generatePreview(lead_id, 'equipe', { template: template || null });
  } catch (e: any) {
    return NextResponse.json({ error: 'Não consegui gerar a prévia: ' + String(e?.message || e).slice(0, 200) }, { status: 400 });
  }
  if (send) {
    const db = admin();
    const { data: lead } = await db.from('leads').select('*').eq('id', lead_id).single();
    const number = await connectedNumber(lead.number_id);
    if (!number) return NextResponse.json({ ...p, warning: 'Prévia criada, mas nenhum número de WhatsApp está conectado para enviar.' });
    const s = await getSettings(db);
    await sendPreviewLink(number, lead, p, s, 'human');
    await logEvent(lead_id, 'preview_sent', 'acc', `Prévia do site enviada para ${lead.name} pela equipe`);
  }
  return NextResponse.json(p);
}, { perm: 'previas.gerar' });

/** Desvincula a prévia do cliente (apaga o link). A próxima prévia sai nova, já com o modelo premium. */
export const DELETE = withUser(async (req) => {
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: 'Prévia não informada.' }, { status: 400 });
  const db = admin();
  const { data: p } = await db.from('previews').select('lead_id').eq('slug', slug).maybeSingle();
  await db.from('previews').delete().eq('slug', slug);
  if (p?.lead_id) {
    const { data: l } = await db.from('leads').select('preview_slug,memory,name').eq('id', p.lead_id).maybeSingle();
    if (l?.preview_slug === slug) {
      const mem: any = { ...(l.memory || {}) };
      delete mem.revisoes_previa;
      await db.from('leads').update({ preview_slug: null, memory: mem }).eq('id', p.lead_id);
    }
    await logEvent(p.lead_id, 'preview_removed', 'acc', `Prévia de ${l?.name || 'cliente'} desvinculada pela equipe`);
  }
  return NextResponse.json({ ok: true });
}, { perm: 'previas.gerar' });
