import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { importHistory } from '@/lib/wa-import';
import { admin } from '@/lib/supabase/admin';
import { evo } from '@/lib/evolution';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** QR Code e estado atual. */
export const GET = withUser(async (_req, ctx) => {
  const db = admin();
  const { data: n } = await db.from('whatsapp_numbers').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!n) return NextResponse.json({ error: 'Número não encontrado.' }, { status: 404 });
  let status = n.status;
  let qr = n.qr;
  try {
    const st: any = await evo.state(n.instance_name);
    const state = st?.instance?.state || st?.state;
    if (state === 'open') {
      status = 'conectado';
      qr = null;
      let phone = n.phone;
      try {
        const info: any = await evo.info(n.instance_name);
        const owner = (Array.isArray(info) ? info[0] : info)?.ownerJid || (Array.isArray(info) ? info[0] : info)?.instance?.owner;
        if (owner) phone = String(owner).split('@')[0];
      } catch {}
      if (n.status !== 'conectado') {
        await db.from('whatsapp_numbers').update({ status, qr: null, phone }).eq('id', n.id);
        await logEvent(null, 'number_status', 'wa', `${n.label} conectado`);
      }
    } else {
      const c: any = await evo.connect(n.instance_name);
      qr = c?.base64 || qr;
      status = 'qr';
      await db.from('whatsapp_numbers').update({ status, qr }).eq('id', n.id);
    }
  } catch (e: any) {
    return NextResponse.json({ ...n, error: e.message });
  }
  return NextResponse.json({ ...n, status, qr });
});

/** Pausar, retomar, renomear, trocar a cor, escolher a voz, reiniciar fase. */
export const PATCH = withUser(async (req, ctx) => {
  const body = await req.json();
  const db = admin();
  const patch: any = {};
  if (body.action === 'pause') {
    patch.paused_until = new Date(Date.now() + 365 * 86400000).toISOString();
    patch.pause_reason = 'Pausado pela equipe';
  }
  if (body.action === 'resume') {
    patch.paused_until = null;
    patch.pause_reason = null;
    patch.next_send_at = new Date().toISOString();
  }
  if (body.action === 'restart_phase') patch.phase_started_at = new Date().toISOString();
  if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label.trim().slice(0, 40);
  // etiqueta de cor do número (vale para toda a equipe)
  if ('color' in body) patch.color = /^#[0-9a-f]{6}$/i.test(String(body.color || '')) ? String(body.color).toLowerCase() : null;
  // voz deste número (ElevenLabs) e se ele manda áudio
  if ('voice_id' in body) patch.voice_id = body.voice_id || null;
  if ('voice_enabled' in body) patch.voice_enabled = body.voice_enabled !== false;
  // nome de quem atende este número (a IA se apresenta com ele)
  if ('agent_name' in body) patch.agent_name = String(body.agent_name || '').trim().slice(0, 40) || null;
  // número fixo de Recuperação (só um): tira a marca dos outros antes
  if ('recuperacao' in body) {
    if (body.recuperacao) await db.from('whatsapp_numbers').update({ recuperacao: false }).eq('recuperacao', true);
    patch.recuperacao = !!body.recuperacao;
  }
  if (body.action === 'import') {
    const r = await importHistory(ctx.params.id, { days: Number(body.days) || 30, ai: !!body.ai });
    if (r.empty) {
      const { data: n } = await db.from('whatsapp_numbers').select('instance_name').eq('id', ctx.params.id).single();
      await evo.historyOn(n.instance_name).catch(() => {});
    }
    return NextResponse.json(r);
  }
  if (body.action === 'webhook') {
    const { data: n } = await db.from('whatsapp_numbers').select('*').eq('id', ctx.params.id).single();
    await evo.setWebhook(n.instance_name);
  }
  const { data } = await db.from('whatsapp_numbers').update(patch).eq('id', ctx.params.id).select('*').single();
  return NextResponse.json(data);
}, { perm: 'numeros.gerenciar' });

/** Desconecta e apaga. */
export const DELETE = withUser(
  async (_req, ctx) => {
    const db = admin();
    const { data: n } = await db.from('whatsapp_numbers').select('*').eq('id', ctx.params.id).maybeSingle();
    if (!n) return NextResponse.json({ ok: true });
    try {
      await evo.logout(n.instance_name);
    } catch {}
    try {
      await evo.remove(n.instance_name);
    } catch {}
    await db.from('whatsapp_numbers').delete().eq('id', n.id);
    await logEvent(null, 'number_removed', 'warn', `${n.label} foi removida`);
    return NextResponse.json({ ok: true });
  },
  { perm: 'numeros.gerenciar' },
);
