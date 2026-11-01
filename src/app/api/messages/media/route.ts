import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { evo } from '@/lib/evolution';

export const dynamic = 'force-dynamic';

/** Foto que o cliente mandou: busca no WhatsApp só quando alguém clica em "Ver imagem" (não ocupa espaço no banco). */
export const GET = withUser(
  async (req) => {
    const id = new URL(req.url).searchParams.get('id') || '';
    const db = admin();
    const { data: m } = await db.from('messages').select('id,lead_id,direction,wa_message_id,number_id,kind,meta').eq('id', id).maybeSingle();
    if (!m?.wa_message_id && !m?.meta?.url) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    if (m.meta?.url) return NextResponse.json({ src: m.meta.url, mime: m.meta.mime });
    const { data: n } = await db.from('whatsapp_numbers').select('instance_name').eq('id', m.number_id).maybeSingle();
    if (!n) return NextResponse.json({ error: 'O número desta conversa não está mais conectado.' }, { status: 400 });
    try {
      const { data: lead } = await db.from('leads').select('whatsapp').eq('id', m.lead_id).maybeSingle();
      const jid = lead?.whatsapp ? `${String(lead.whatsapp).replace(/\D/g, '')}@s.whatsapp.net` : null;
      const r: any = await evo.media(n.instance_name, m.wa_message_id, jid, m.direction === 'out');
      const b64 = r?.base64 || r?.data?.base64;
      if (!b64) throw new Error();
      const mime = String(r?.mimetype || m.meta?.mime || 'image/jpeg').split(';')[0];
      // guarda a cópia: da próxima vez abre na hora
      try {
        const buf = Buffer.from(b64, 'base64');
        const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5);
        const path = `chat/${m.lead_id}/${Date.now().toString(36)}.${ext}`;
        const up = await db.storage.from('publico').upload(path, buf, { contentType: mime, cacheControl: '31536000' });
        if (!up.error) {
          const url = db.storage.from('publico').getPublicUrl(path).data.publicUrl;
          await db.from('messages').update({ meta: { ...(m.meta || {}), url, mime } }).eq('id', m.id);
          return NextResponse.json({ src: url, mime });
        }
      } catch {}
      return NextResponse.json({ src: `data:${mime};base64,${b64}`, mime }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
    } catch {
      return NextResponse.json({ error: 'O WhatsApp não liberou este arquivo (pode ser antigo ou ter sido apagado do celular).' }, { status: 400 });
    }
  },
  { perm: 'conversas' },
);
