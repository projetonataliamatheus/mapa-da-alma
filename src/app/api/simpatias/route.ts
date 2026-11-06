import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { TEMAS_SIMPATIA, traduzirSimpatia, garantirSimpatiasES } from '@/lib/mapa-alma/simpatias/servico';
import { connectedNumber, enviarSimpatia } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Biblioteca de simpatias e orações (menu Simpatias). */
export const GET = withUser(async () => {
  const { data, error } = await db().from('simpatias').select('*').order('tema').order('codigo');
  if (error) return NextResponse.json({ simpatias: [], temas: TEMAS_SIMPATIA, aviso: /simpatias/.test(error.message) ? 'Rode o SQL 053 no Supabase para ativar as Simpatias.' : error.message });
  return NextResponse.json({ simpatias: data || [], temas: TEMAS_SIMPATIA });
}, { perm: ['simpatias', 'conversas'] });

/**
 * action: salvar (cria/edita) · excluir · enviar (manda no WhatsApp de uma conversa: { lead_id, codigo }).
 */
export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json();
  if (b.action === 'enviar') {
    need(user, 'conversas.responder');
    const { data: lead } = await db().from('leads').select('*').eq('id', b.lead_id).maybeSingle();
    if (!lead) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
    const number = await connectedNumber(lead.number_id);
    if (!number) return NextResponse.json({ error: 'Nenhum WhatsApp conectado.' }, { status: 400 });
    try {
      await enviarSimpatia(number, lead, b.codigo, 'human', user.member?.name || user.email);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  need(user, 'simpatias.editar');
  if (b.action === 'traduzir_todas') return NextResponse.json({ ok: true, traduzidas: await garantirSimpatiasES() });
  if (b.action === 'excluir') {
    await db().from('simpatias').delete().eq('id', b.id);
    return NextResponse.json({ ok: true });
  }
  const row = {
    tema: TEMAS_SIMPATIA[b.tema] ? b.tema : 'amor',
    tipo: b.tipo === 'oracao' ? 'oracao' : 'simpatia',
    titulo: String(b.titulo || '').trim().slice(0, 140),
    texto: String(b.texto || '').trim().slice(0, 4000),
    ativo: b.ativo !== false,
    updated_at: new Date().toISOString(),
  };
  if (!row.titulo || !row.texto) return NextResponse.json({ error: 'Preencha o título e o texto.' }, { status: 400 });
  const r = b.id ? await db().from('simpatias').update(row).eq('id', b.id).select().single() : await db().from('simpatias').insert(row).select().single();
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
  if (r.data) await db().from('simpatias').update({ titulo_es: null, texto_es: null }).eq('id', r.data.id).then(() => {}, () => {});
  // espanhol pronto para envio: traduz agora (uma vez) e guarda
  const es = r.data ? await traduzirSimpatia(r.data) : null;
  return NextResponse.json({ ok: true, simpatia: r.data, espanhol: !!es });
}, { perm: ['simpatias', 'conversas'] });
