import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Perfil do contato no WhatsApp (como no WhatsApp Web): foto grande, nome, recado, conta comum ou comercial e dados da empresa. */
export const GET = withUser(async (_req, ctx) => {
  const id = ctx.params.id;
  const db = admin();
  const { data: lead } = await db.from('leads').select('id,name,whatsapp,number_id,photo_url').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  const { data: nums } = await db.from('whatsapp_numbers').select('id,instance_name,status').eq('status', 'conectado');
  const inst = (nums || []).find((n: any) => n.id === lead.number_id)?.instance_name || (nums || [])[0]?.instance_name;
  const base = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
  const call = async (path: string) => {
    try {
      const r = await fetch(`${base}${path}/${inst}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY || '' },
        body: JSON.stringify({ number: lead.whatsapp }),
        signal: AbortSignal.timeout(12_000),
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  };
  const [p, b]: any[] = inst && lead.whatsapp ? await Promise.all([call('/chat/fetchProfile'), call('/chat/fetchBusinessProfile')]) : [null, null];
  const biz = b && (b.description || b.category || b.email || b.website || b.address) ? b : null;
  const isBusiness = !!(p?.isBusiness || biz);
  const web = Array.isArray(biz?.website) ? biz.website : biz?.website ? [biz.website] : p?.website ? [].concat(p.website) : [];
  return NextResponse.json({
    name: p?.name || null,
    status: (typeof p?.status === 'string' ? p.status : typeof p?.status?.status === 'string' ? p.status.status : '').trim() || null,
    picture: lead.photo_url || p?.picture || p?.profilePictureUrl || null,
    isBusiness,
    business: isBusiness
      ? {
          category: biz?.category || p?.category || null,
          description: biz?.description || p?.description || null,
          email: biz?.email || p?.email || null,
          address: biz?.address || null,
          website: web.filter(Boolean),
        }
      : null,
  });
});
