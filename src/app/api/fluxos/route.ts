import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { TIPOS } from '@/lib/mapa-alma/fluxo';
import { voiceConfigured } from '@/lib/voice';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Menu Fluxo: lista os fluxos (com campanhas que usam cada um). */
export const GET = withUser(async () => {
  const { data, error } = await db().from('fluxos').select('*').order('created_at');
  if (error) return NextResponse.json({ fluxos: [], tipos: TIPOS, aviso: /fluxos/.test(error.message) ? 'Rode o SQL 054 no Supabase para ativar os Fluxos.' : error.message });
  const { data: camps } = await db().from('campanhas').select('id,nome,fluxo_id');
  // painel de testes: voz da IA (ElevenLabs)
  const s: any = await getSettings(db());
  const { count: vozes } = await db().from('voices').select('id', { count: 'exact', head: true }).eq('active', true).then((r: any) => r, () => ({ count: 0 }));
  const v = s.voice || {};
  const mom = (m: string, def = true) => (typeof v.moments?.[m]?.on === 'boolean' ? v.moments[m].on : m === 'cliente_audio' ? v.on_client_audio !== false : m === 'fechamento' ? v.on_closing !== false : def);
  const voz = { chave: voiceConfigured(), vozes: vozes || 0, ligada: !!v.enabled, cliente_audio: mom('cliente_audio'), fechamento: mom('fechamento'), boas_vindas: mom('boas_vindas'), max_por_conversa: Number(v.max_per_conversation ?? 4), max_pct: Number(v.max_pct ?? 10) };
  return NextResponse.json({ fluxos: data || [], tipos: TIPOS, campanhas: camps || [], voz });
}, { perm: 'fluxo' });

/**
 * action: salvar · excluir · upload (multipart: file → URL pública no Storage).
 * Só um fluxo pode ser o "padrão" (abertura de quem não veio de campanha com fluxo próprio).
 */
export const POST = withUser(async (req, _ctx, user) => {
  need(user, 'fluxo');
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const f = form.get('file') as File | null;
    if (!f) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo grande demais (máx. 15 MB).' }, { status: 400 });
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    const path = `fluxo/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const up = await db().storage.from('publico').upload(path, Buffer.from(await f.arrayBuffer()), { contentType: f.type || 'application/octet-stream', cacheControl: '31536000' });
    if (up.error) return NextResponse.json({ error: 'Não consegui guardar o arquivo: ' + up.error.message }, { status: 400 });
    const url = db().storage.from('publico').getPublicUrl(path).data.publicUrl;
    // áudio: já transcreve para preencher "o que o áudio diz"
    let transcricao: string | null = null;
    if ((f.type || '').startsWith('audio/') || /\.(mp3|ogg|m4a|wav|opus)$/i.test(f.name)) {
      const { transcribe } = await import('@/lib/transcribe');
      transcricao = await transcribe(Buffer.from(await f.arrayBuffer()).toString('base64'), f.type || 'audio/mpeg').catch(() => null);
    }
    return NextResponse.json({ ok: true, url, nome: f.name, transcricao });
  }
  const b = await req.json();
  // painel de testes: qual abertura vale agora (um fluxo, ou nenhum = a IA abre sozinha pelo roteiro)
  if (b.action === 'abertura') {
    await db().from('fluxos').update({ padrao: false }).neq('id', b.id || '00000000-0000-0000-0000-000000000000');
    if (b.id) await db().from('fluxos').update({ padrao: true, ativo: true }).eq('id', b.id);
    return NextResponse.json({ ok: true });
  }
  // painel de testes: voz da IA (ElevenLabs)
  if (b.action === 'voz') {
    const { data: raw } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
    const s: any = raw?.data || {};
    const v = { ...((await getSettings(db())) as any).voice, ...(s.voice || {}) };
    if (typeof b.ligada === 'boolean') v.enabled = b.ligada;
    for (const m of ['cliente_audio', 'fechamento', 'boas_vindas']) if (typeof b[m] === 'boolean') v.moments = { ...(v.moments || {}), [m]: { ...(v.moments?.[m] || {}), on: b[m] } };
    if (b.max_por_conversa != null) v.max_per_conversation = Math.max(0, Math.min(20, Number(b.max_por_conversa) || 0));
    if (b.max_pct != null) v.max_pct = Math.max(0, Math.min(100, Number(b.max_pct) || 0));
    const { error } = await db().from('settings').update({ data: { ...s, voice: v }, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'excluir') {
    await db().from('fluxos').delete().eq('id', b.id);
    return NextResponse.json({ ok: true });
  }
  const passos = (Array.isArray(b.passos) ? b.passos : []).slice(0, 40).map((p: any, i: number) => ({
    id: String(p.id || `p${Date.now().toString(36)}${i}`),
    tipo: TIPOS[p.tipo as keyof typeof TIPOS] ? p.tipo : 'texto',
    texto: p.texto ? String(p.texto).slice(0, 4000) : undefined,
    url: p.url ? String(p.url).slice(0, 800) : undefined,
    nome_arquivo: p.nome_arquivo ? String(p.nome_arquivo).slice(0, 160) : undefined,
    transcricao: p.transcricao ? String(p.transcricao).slice(0, 2000) : undefined,
    audio_id: p.audio_id ? String(p.audio_id) : undefined,
    atraso: Array.isArray(p.atraso) ? p.atraso.slice(0, 2).map(Number) : undefined,
    minutos: Array.isArray(p.minutos) ? p.minutos.slice(0, 2).map(Number) : undefined,
    apos_resposta: Array.isArray(p.apos_resposta) ? p.apos_resposta.slice(0, 2).map(Number) : undefined,
    limite: p.limite != null && p.limite !== '' ? Number(p.limite) : null,
  }));
  const row: any = { nome: String(b.nome || 'Fluxo').slice(0, 120), descricao: b.descricao ? String(b.descricao).slice(0, 500) : null, ativo: !!b.ativo, padrao: !!b.padrao, passos, updated_at: new Date().toISOString() };
  const r = b.id ? await db().from('fluxos').update(row).eq('id', b.id).select().single() : await db().from('fluxos').insert(row).select().single();
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
  if (row.padrao) await db().from('fluxos').update({ padrao: false }).neq('id', r.data.id);
  return NextResponse.json({ ok: true, fluxo: r.data });
}, { perm: 'fluxo' });
