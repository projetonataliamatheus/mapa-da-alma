import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { toWhatsapp, waKey } from '@/lib/phone';
import { connectedNumber, sendFirstContact, sendFollowUp, sendAndRecord, logEvent, withSteps, leadForNumber } from '@/lib/engine';
import { evo } from '@/lib/evolution';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Começa (ou retoma) uma conversa com um número digitado pela equipe.
 * mode 'ia': a IA escreve e manda a primeira mensagem agora. mode 'manual': manda o texto da equipe.
 * ai: se a IA continua a conversa quando o cliente responder.
 */
export const POST = withUser(
  async (req, _ctx, user) => {
    const b = await req.json();
    const wa = toWhatsapp(b.phone);
    if (!wa) return NextResponse.json({ error: 'Número inválido. Use um celular com DDD, ex.: (19) 99999-9999.' }, { status: 400 });
    const k = waKey(wa);
    const db = admin();
    const { data: blocked } = await db.from('blocked_phones').select('wa_key').eq('wa_key', k).maybeSingle();
    if (blocked) return NextResponse.json({ error: 'Este contato pediu para não receber mensagens.' }, { status: 400 });
    const number = await connectedNumber(b.number_id || null);
    if (!number) return NextResponse.json({ error: 'Nenhum número de WhatsApp conectado.' }, { status: 400 });
    if (b.mode === 'manual' && !String(b.text || '').trim()) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 });

    // tem WhatsApp?
    try {
      const r: any = await evo.exists(number.instance_name, [wa]);
      const item = Array.isArray(r) ? r[0] : r?.[0];
      if (item && item.exists === false) return NextResponse.json({ error: 'Esse número não tem WhatsApp.' }, { status: 400 });
    } catch {
      /* se a checagem falhar, tenta enviar mesmo assim */
    }

    const context = String(b.context || '').trim();
    // conversa deste contato no número escolhido (se ele já fala com outro número, abre uma conversa nova aqui)
    const found = await leadForNumber(k, number.id);
    let lead = found.lead;
    if (!lead) {
      const r = await leadForNumber(k, number.id, {
        name: String(b.name || '').trim() || wa.slice(2),
        ...(String(b.niche || '').trim() ? { niche: String(b.niche).trim() } : {}),
        source: 'manual',
        whatsapp: wa,
        stage: 'novo',
        ai_enabled: b.ai !== false,
        summary: context ? `Contexto passado pela equipe: ${context}` : null,
        next_step: 'Conversa iniciada pela equipe.',
      });
      if (!r.lead) return NextResponse.json({ error: 'Não consegui criar a conversa.' }, { status: 400 });
      lead = r.lead;
    } else {
      const patch: any = { ai_enabled: !lead.ai_locked && b.ai !== false, opted_out: false };
      if (context) patch.summary = `${lead.summary ? lead.summary + ' ' : ''}Contexto passado pela equipe: ${context}`;
      if (b.name && /^\d+$/.test(lead.name)) patch.name = b.name;
      if (b.niche && !lead.niche) patch.niche = b.niche;
      await db.from('leads').update(patch).eq('id', lead.id);
      lead = { ...lead, ...patch };
    }

    // conversa gratuita / teste: só o Master liga
    if (b.cortesia && ['master', 'admin'].includes(String(user?.member?.role || ''))) {
      await db.from('leads').update({ cortesia: true }).eq('id', lead.id);
      lead = { ...lead, cortesia: true };
    }
    if (lead.ai_locked && b.mode !== 'manual')
      return NextResponse.json({ error: 'A IA está pausada definitivamente para este contato. Envie como mensagem da equipe ou reative a IA na conversa.' }, { status: 409 });
    const settings = await getSettings(db);
    const { count } = await db.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id);
    if (b.mode === 'manual') {
      await sendAndRecord(number, lead, String(b.text).trim(), 'human', false);
      await db
        .from('leads')
        .update({ stage: lead.stage === 'novo' ? 'abordado' : lead.stage, wa_status: lead.wa_status === 'conversa' ? 'conversa' : 'enviado', last_outbound_at: new Date().toISOString(), steps: withSteps(lead.steps, 'wa') })
        .eq('id', lead.id);
    } else if (!count) {
      const r = await sendFirstContact(number, lead, settings);
      if (r === 'skip') return NextResponse.json({ error: 'Não foi possível enviar (número sem WhatsApp ou bloqueado).' }, { status: 400 });
    } else {
      // já existe conversa: a IA retoma de onde parou
      await sendFollowUp(number, { ...lead, stage: lead.stage === 'novo' ? 'abordado' : lead.stage }, settings);
    }
    if (!count) await db.from('whatsapp_numbers').update({ sent_today: (number.sent_today || 0) + 1 }).eq('id', number.id);
    await logEvent(lead.id, 'manual_start', 'wa', `${user.member?.name || user.email} iniciou conversa com ${lead.name} (${b.mode === 'manual' ? 'mensagem da equipe' : 'mensagem da IA'})`);
    return NextResponse.json({ id: lead.id });
  },
  { perm: 'conversas.responder' },
);
