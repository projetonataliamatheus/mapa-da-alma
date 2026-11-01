import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { cloneVoice, addSamples, deleteVoice, previewVoice, voiceConfigured, listElevenVoices } from '@/lib/voice';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/** Lista as vozes e o consumo do mês. */
export const GET = withUser(async () => {
  const db = admin();
  const { data, error } = await db.from('voices').select('*').order('created_at');
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const { data: use } = await db.from('usage_log').select('input_tokens,cost_usd').eq('kind', 'voz').gte('created_at', month.toISOString());
  const chars = (use || []).reduce((a: number, r: any) => a + (r.input_tokens || 0), 0);
  const usd = (use || []).reduce((a: number, r: any) => a + Number(r.cost_usd || 0), 0);
  return NextResponse.json({ configured: voiceConfigured(), missingTable: !!error, voices: data || [], month: { chars, usd, audios: use?.length || 0 } });
});

/** Cria uma voz: nome + 1 a 3 gravações de 10 a 30 segundos (só o Master). */
export const POST = withUser(
  async (req, _ctx, user) => {
    const form = await req.formData();
    const name = String(form.get('name') || '').trim();
    const member = String(form.get('member') || '').trim() || null;
    const consent = String(form.get('consent') || '') === 'true';
    if (!name && !form.get('voice')) return NextResponse.json({ error: 'Dê um nome para a voz (ex.: Natália).' }, { status: 400 });
    if (!consent) return NextResponse.json({ error: 'Confirme que a pessoa dona da voz autorizou o uso.' }, { status: 400 });
    const files = form.getAll('files').filter((f: any) => f && typeof f === 'object' && 'arrayBuffer' in f) as File[];
    if (!files.length) return NextResponse.json({ error: 'Envie ou grave pelo menos um áudio de 10 a 30 segundos.' }, { status: 400 });
    const total = files.reduce((a, f) => a + f.size, 0);
    if (total > 60 * 1024 * 1024) return NextResponse.json({ error: 'Áudio grande demais (máx. 60 MB no total).' }, { status: 400 });
    const denoise = String(form.get('denoise') || '') === 'true';
    const list = await Promise.all(files.map(async (f) => ({ data: Buffer.from(await f.arrayBuffer()), name: f.name || 'voz.webm', type: f.type || 'audio/webm' })));
    // mais gravações numa voz que já existe
    const addTo = String(form.get('voice') || '');
    if (addTo) {
      const { data: v } = await admin().from('voices').select('*').eq('id', addTo).maybeSingle();
      if (!v) return NextResponse.json({ error: 'Voz não encontrada.' }, { status: 404 });
      try {
        await addSamples(v.voice_id, v.name, list, denoise);
        return NextResponse.json(v);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }
    try {
      const voiceId = await cloneVoice(name, list, denoise);
      const { data, error } = await admin().from('voices').insert({ name, member, voice_id: voiceId, created_by: user.member?.name || user.email }).select('*').single();
      if (error) {
        await deleteVoice(voiceId);
        return NextResponse.json({ error: /voices/.test(error.message) ? 'Rode a migração 015_vozes.sql no Supabase.' : error.message }, { status: 400 });
      }
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  },
  { perm: ['config', 'vozes.editar'] },
);

/** Ouvir um teste da voz, ativar/desativar. */
export const PATCH = withUser(async (req) => {
  const { id, action, text, active, override, all, voice_id, name, member } = await req.json();
  const db = admin();
  // "Minhas vozes" da ElevenLabs, para trazer para o painel
  if (action === 'remote') {
    try {
      const list = await listElevenVoices(!!all);
      const { data: mine } = await db.from('voices').select('voice_id');
      const have = new Set((mine || []).map((x: any) => x.voice_id));
      return NextResponse.json({ voices: list.map((x: any) => ({ ...x, imported: have.has(x.voice_id) })) });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  if (action === 'import') {
    if (!voice_id) return NextResponse.json({ error: 'Escolha a voz.' }, { status: 400 });
    const { data: ex } = await db.from('voices').select('*').eq('voice_id', voice_id).maybeSingle();
    if (ex) return NextResponse.json(ex);
    // provider "elevenlabs_import": excluir no painel não apaga a voz da conta da ElevenLabs
    const { data, error } = await db.from('voices').insert({ name: String(name || 'Voz').slice(0, 60), member: member || null, voice_id, provider: 'elevenlabs_import' }).select('*').single();
    if (error) return NextResponse.json({ error: /voices/.test(error.message) ? 'Rode a migração 015_vozes.sql no Supabase.' : error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  const { data: v } = await db.from('voices').select('*').eq('id', id).maybeSingle();
  if (!v) return NextResponse.json({ error: 'Voz não encontrada.' }, { status: 404 });
  if (action === 'test') {
    try {
      const settings = await getSettings(db);
      const audio = await previewVoice(v.voice_id, String(text || 'Oi! Tudo bem? Aqui é a ' + v.name + ', da equipe. Vi o seu negócio no Google e fiquei curiosa: vocês já têm site?'), settings, override);
      return NextResponse.json({ audio: `data:audio/mpeg;base64,${audio}` });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  if (action === 'active') {
    await db.from('voices').update({ active: !!active }).eq('id', id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}, { perm: ['config', 'vozes.editar'] });

export const DELETE = withUser(
  async (req) => {
    const { id } = await req.json();
    const { data: v } = await admin().from('voices').select('*').eq('id', id).maybeSingle();
    if (!v) return NextResponse.json({ ok: true });
    // voz criada pelo painel sai também da ElevenLabs; voz importada fica lá, só sai do painel
    if (v.provider !== 'elevenlabs_import') await deleteVoice(v.voice_id);
    await admin().from('voices').delete().eq('id', id);
    return NextResponse.json({ ok: true });
  },
  { perm: ['config', 'vozes.editar'] },
);
