import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { enviar, EVENTOS_META, type EventoMeta } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

/** Marca um contato no Meta pela equipe (botões da conversa). Usa nome completo, WhatsApp, país e idade do contato. */
export const POST = withUser(async (req) => {
  const b = await req.json();
  const evento = String(b.evento || '') as EventoMeta;
  if (!EVENTOS_META.some((e) => e.id === evento)) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
  const r = await enviar(String(b.leadId || ''), evento, { forcar: true, manual: true, refazer: !!b.refazer });
  if (!r.ok) return NextResponse.json({ error: r.motivo || 'Não consegui enviar ao Meta.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}, { perm: 'conversas.responder' });
