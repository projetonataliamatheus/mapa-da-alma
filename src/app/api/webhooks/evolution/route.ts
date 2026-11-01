import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { handleIncoming, handlePresence, logEvent } from '@/lib/engine';
import { startReplyRunner } from '@/lib/reply-runner';

export const dynamic = 'force-dynamic';

/** Recebe os eventos do WhatsApp (Evolution API). */
export async function POST(req: Request) {
  startReplyRunner();
  const url = new URL(req.url);
  if (!process.env.WEBHOOK_SECRET || url.searchParams.get('token') !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'token inválido' }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const event = String(body.event || '').toLowerCase().replace(/_/g, '.');
  const instance = body.instance || body.instanceName;
  const db = admin();
  try {
    if (event === 'qrcode.updated') {
      const qr = body.data?.qrcode?.base64 || body.data?.base64 || null;
      if (qr) await db.from('whatsapp_numbers').update({ qr, status: 'qr' }).eq('instance_name', instance);
    } else if (event === 'connection.update') {
      const state = body.data?.state;
      const { data: n } = await db.from('whatsapp_numbers').select('*').eq('instance_name', instance).maybeSingle();
      if (n) {
        if (state === 'open' && n.status !== 'conectado') {
          const phone = body.data?.wuid ? String(body.data.wuid).split('@')[0] : n.phone;
          await db.from('whatsapp_numbers').update({ status: 'conectado', qr: null, phone }).eq('id', n.id);
          await logEvent(null, 'number_status', 'wa', `${n.label} conectado`);
        } else if (state === 'close' && n.status === 'conectado') {
          await db.from('whatsapp_numbers').update({ status: 'desconectado' }).eq('id', n.id);
          await logEvent(null, 'number_status', 'warn', `${n.label} desconectou. Leia o QR Code de novo em Números WhatsApp`);
        }
      }
    } else if (event === 'presence.update') {
      // cliente digitando / parou de digitar: a IA espera ele terminar
      void handlePresence(instance, body.data).catch(() => {});
    } else if (event === 'messages.upsert') {
      const items = Array.isArray(body.data) ? body.data : [body.data];
      // responde à Evolution na hora (sem risco de ela desistir) e processa em seguida, uma por uma
      void (async () => {
        for (const d of items) await handleIncoming(instance, d).catch((e) => console.error('mensagem recebida', e?.message || e));
      })();
    }
  } catch (e: any) {
    console.error('webhook evolution', e);
  }
  return NextResponse.json({ ok: true });
}
