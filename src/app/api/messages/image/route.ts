import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { currentActor } from '@/lib/actor';
import { evo } from '@/lib/evolution';
import { quotedFor, markSentByUs } from '@/lib/engine';
import { prepare, afterSend, SendError } from '@/lib/team-send';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Foto enviada pela equipe na conversa (anexo, Ctrl+V ou arrastar), com legenda e resposta citada opcionais. */
export const POST = withUser(
  async (req) => {
    const fd = await req.formData();
    const leadId = String(fd.get('leadId') || '');
    const file = fd.get('file') as File | null;
    const caption = String(fd.get('caption') || '').trim().slice(0, 1000);
    const replyTo = String(fd.get('replyTo') || '') || null;
    const clientId = String(fd.get('clientId') || '').slice(0, 40) || null;
    if (!leadId || !file) return NextResponse.json({ error: 'Escolha uma imagem.' }, { status: 400 });
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return NextResponse.json({ error: 'Envie uma imagem JPG, PNG, WEBP ou GIF.' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Imagem muito grande (máximo 8 MB).' }, { status: 400 });
    try {
      const { lead, number, quoted } = await prepare(leadId, replyTo);
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const name = `foto.${ext}`;
      const r: any = await evo.sendImage(number.instance_name, lead.whatsapp, buf.toString('base64'), file.type, caption, name, quotedFor(lead, quoted));
      const waId = r?.key?.id || null;
      markSentByUs(waId);
      // guarda uma cópia para aparecer no histórico do painel
      const db = admin();
      const path = `chat/${lead.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await db.storage.from('publico').upload(path, buf, { contentType: file.type, cacheControl: '31536000' });
      const url = up.error ? null : db.storage.from('publico').getPublicUrl(path).data.publicUrl;
      const by = currentActor();
      await db.from('messages').insert({
        lead_id: lead.id,
        number_id: number.id,
        direction: 'out',
        author: 'human',
        kind: 'image',
        body: caption || '📷 Imagem',
        wa_message_id: waId,
        meta: { url, mime: file.type, temp: lead.temperature ?? 0, stage: lead.stage, ...(quoted ? { quoted } : {}), ...(clientId ? { cid: clientId } : {}), ...(by ? { by: by.name, by_id: by.id } : {}) },
      });
      afterSend(lead, number, caption ? `📷 ${caption}` : '📷 Imagem');
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      if (e instanceof SendError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }
  },
  { perm: 'conversas.responder' },
);
