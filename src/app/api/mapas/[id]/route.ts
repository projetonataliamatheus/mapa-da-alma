import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { liberarMapa, pdfDoMapa, enviarMapaCompleto, linkMapa, type MapaRow } from '@/lib/mapa-alma/servico';
import { connectedNumber, sendAndRecord, logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Ações num mapa: liberar, refazer o PDF, enviar no WhatsApp (prévia ou completo). */
export const POST = withUser(async (req, { params }: any) => {
  const { acao, whatsapp } = await req.json();
  const { data: m } = await db().from('mapas').select('*').eq('id', params.id).maybeSingle();
  if (!m) return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
  if (acao === 'liberar') { await liberarMapa(m.id); return NextResponse.json({ ok: true }); }
  if (acao === 'pdf') { await pdfDoMapa(m as MapaRow, true); return NextResponse.json({ ok: true }); }
  if (acao === 'enviar_previa' || acao === 'enviar_completo') {
    let lead: any = m.lead_id ? (await db().from('leads').select('*').eq('id', m.lead_id).maybeSingle()).data : null;
    const fone = String(whatsapp || '').replace(/\D/g, '');
    if (fone) lead = (await db().from('leads').select('*').eq('whatsapp', fone.startsWith('55') ? fone : '55' + fone).maybeSingle()).data || lead;
    if (!lead?.whatsapp) return NextResponse.json({ error: 'Esse mapa não está ligado a uma conversa. Informe o WhatsApp de um contato que já conversou com a gente.' }, { status: 400 });
    const number = await connectedNumber(lead.number_id);
    if (!number) return NextResponse.json({ error: 'Nenhum número de WhatsApp conectado.' }, { status: 400 });
    if (!m.lead_id) await db().from('mapas').update({ lead_id: lead.id }).eq('id', m.id);
    if (acao === 'enviar_previa') {
      await sendAndRecord(number, lead, `Preparei a prévia do seu Mapa da Alma ✨👇\n${linkMapa(m)}\n\nMe conta o que mais chamou a sua atenção!`, 'human', true, { preview: m.slug });
    } else {
      await enviarMapaCompleto(m as MapaRow, lead, number, (t) => sendAndRecord(number, lead, t, 'human', true));
    }
    await logEvent(lead.id, 'mapa_enviado', 'ok', `${acao === 'enviar_previa' ? 'Prévia do mapa' : 'Mapa completo'} enviado para ${lead.name}`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
});

export const DELETE = withUser(async (_req, { params }: any) => {
  await db().from('mapas').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}, { admin: true });
