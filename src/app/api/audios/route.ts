import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { transcribe } from '@/lib/transcribe';
import { connectedNumber, logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Biblioteca de áudios gravados (menu Fluxo › Áudios). ?lead=ID marca os que esse contato já recebeu. */
export const GET = withUser(async (req) => {
  const { data, error } = await db().from('audios').select('*').order('codigo');
  if (error) return NextResponse.json({ audios: [], aviso: /audios/.test(error.message) ? 'Rode o SQL 055 no Supabase para ativar a biblioteca de áudios.' : error.message });
  const leadId = new URL(req.url).searchParams.get('lead');
  let enviados: string[] = [];
  if (leadId) enviados = ((await db().from('leads').select('memory').eq('id', leadId).maybeSingle()).data?.memory?.audios_enviados || []) as string[];
  return NextResponse.json({ audios: (data || []).map((a: any) => ({ ...a, enviado: enviados.includes(a.id) || enviados.includes(a.url) })) });
}, { perm: ['fluxo', 'conversas'] });

/**
 * multipart (file) → guarda o áudio, TRANSCREVE sozinho e cria na biblioteca (ou só devolve url+transcrição com ?so=transcrever).
 * json action: salvar · excluir · enviar ({ lead_id, id }: manda na conversa; nunca duas vezes para o mesmo contato).
 */
export const POST = withUser(async (req, _ctx, user) => {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    need(user, 'fluxo');
    const form = await req.formData();
    const f = form.get('file') as File | null;
    if (!f) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo grande demais (máx. 15 MB).' }, { status: 400 });
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = (f.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    const path = `audios/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const mime = f.type || (ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg');
    const up = await db().storage.from('publico').upload(path, buf, { contentType: mime, cacheControl: '31536000' });
    if (up.error) return NextResponse.json({ error: 'Não consegui guardar o áudio: ' + up.error.message }, { status: 400 });
    const url = db().storage.from('publico').getPublicUrl(path).data.publicUrl;
    const dicaA = form.get('idioma') === 'es' ? 'es' : 'pt';
    const { transcribeIdioma } = await import('@/lib/transcribe');
    const tr = await transcribeIdioma(buf.toString('base64'), mime, dicaA).catch(() => null);
    const transcricao = tr?.texto || null;
    const idiomaA: 'pt' | 'es' = tr?.idioma || dicaA; // o áudio decide o idioma
    if (form.get('so') === 'transcrever') return NextResponse.json({ ok: true, url, nome: f.name, transcricao, idioma: idiomaA, aviso: transcricao ? null : 'Não consegui transcrever (confira a GROQ_API_KEY no Easypanel): escreva o texto à mão.' });
    const nome = String(form.get('nome') || f.name.replace(/\.[^.]+$/, '')).slice(0, 120);
    const r = await db().from('audios').insert({ nome, intuito: form.get('intuito') ? String(form.get('intuito')).slice(0, 500) : null, transcricao, url, mime, idioma: idiomaA }).select().single();
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
    return NextResponse.json({ ok: true, audio: r.data, aviso: transcricao ? null : 'Áudio salvo, mas não consegui transcrever (confira a GROQ_API_KEY): escreva o texto à mão.' });
  }
  const b = await req.json();
  if (b.action === 'enviar') {
    need(user, 'conversas.responder');
    const { data: lead } = await db().from('leads').select('*').eq('id', b.lead_id).maybeSingle();
    const { data: a } = await db().from('audios').select('*').eq('id', b.id).maybeSingle();
    if (!lead || !a) return NextResponse.json({ error: 'Conversa ou áudio não encontrado.' }, { status: 404 });
    const number = await connectedNumber(lead.number_id);
    if (!number) return NextResponse.json({ error: 'Nenhum WhatsApp conectado.' }, { status: 400 });
    const { enviarAudioPronto } = await import('@/lib/mapa-alma/audios');
    const ok = await enviarAudioPronto(number, lead, a as any, 'human');
    if (!ok) return NextResponse.json({ error: 'Esse áudio já foi enviado para este contato.' }, { status: 409 });
    await logEvent(lead.id, 'audio_pronto', 'acc', `${user.member?.name || user.email} mandou o áudio "${a.nome}" para ${lead.name}`);
    return NextResponse.json({ ok: true });
  }
  need(user, 'fluxo');
  if (b.action === 'excluir') {
    await db().from('audios').delete().eq('id', b.id);
    return NextResponse.json({ ok: true });
  }
  const row: any = { updated_at: new Date().toISOString() };
  for (const k of ['nome', 'intuito', 'transcricao']) if (b[k] !== undefined) row[k] = b[k] ? String(b[k]).slice(0, k === 'transcricao' ? 3000 : 500) : null;
  if (typeof b.ativo === 'boolean') row.ativo = b.ativo;
  if (b.idioma === 'es' || b.idioma === 'pt') row.idioma = b.idioma;
  const r = await db().from('audios').update(row).eq('id', b.id).select().single();
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, audio: r.data });
}, { perm: ['fluxo', 'conversas'] });
