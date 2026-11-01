import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { evo } from '@/lib/evolution';
import { mapLimit } from '@/lib/util';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Fotos de perfil do WhatsApp para a lista de conversas: busca na Evolution, guarda uma cópia (o link do WhatsApp expira)
 * e só tenta de novo depois de 7 dias. Devolve { id: url } dos que têm foto.
 */
export const POST = withUser(async (req) => {
  const { ids } = await req.json();
  const list: string[] = (Array.isArray(ids) ? ids : []).slice(0, 40);
  if (!list.length) return NextResponse.json({});
  const db = admin();
  const { data: leads, error } = await db.from('leads').select('id,whatsapp,number_id,photo_url,photo_at').in('id', list);
  if (error) return NextResponse.json({});
  const week = Date.now() - 7 * 86400000;
  const todo = (leads || []).filter((l: any) => l.whatsapp && String(l.whatsapp).replace(/\D/g, '').length <= 13 && (!l.photo_at || new Date(l.photo_at).getTime() < week));
  const { data: nums } = await db.from('whatsapp_numbers').select('id,instance_name,status').eq('status', 'conectado');
  const inst = (id: string | null) => (nums || []).find((n: any) => n.id === id)?.instance_name || (nums || [])[0]?.instance_name;
  const out: Record<string, string> = {};
  for (const l of leads || []) if (l.photo_url) out[l.id] = l.photo_url;
  await mapLimit(todo.slice(0, 15), 4, async (l: any) => {
    let url: string | null = null;
    try {
      const name = inst(l.number_id);
      if (name) {
        const r: any = await evo.profilePic(name, l.whatsapp);
        const src = r?.profilePictureUrl || r?.picture || r?.url;
        if (src) {
          const img = await fetch(src, { signal: AbortSignal.timeout(10_000) });
          if (img.ok) {
            const buf = Buffer.from(await img.arrayBuffer());
            if (buf.length < 1.5 * 1024 * 1024) {
              const path = `avatars/${l.id}.jpg`;
              const up = await db.storage.from('publico').upload(path, buf, { contentType: img.headers.get('content-type') || 'image/jpeg', cacheControl: '604800', upsert: true });
              if (!up.error) url = db.storage.from('publico').getPublicUrl(path).data.publicUrl + `?v=${Date.now().toString(36)}`;
            }
          }
        }
      }
    } catch {
      /* sem foto (privacidade do contato ou número fora do ar) */
    }
    await db.from('leads').update({ photo_url: url, photo_at: new Date().toISOString() }).eq('id', l.id);
    if (url) out[l.id] = url;
  });
  return NextResponse.json(out);
});
