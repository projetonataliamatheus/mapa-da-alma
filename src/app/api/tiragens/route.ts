import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { cartaPorId, TIRAGENS } from '@/lib/mapa-alma/taro/cartas';
import { linkTiragem, criarTiragem, entregarTaro } from '@/lib/mapa-alma/taro/servico';
import { toWhatsapp, waKey } from '@/lib/phone';
import { connectedNumber, leadForNumber, sendAndRecord, logEvent } from '@/lib/engine';
import { nomeProprio } from '@/lib/mapa-alma/nome';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Tiragens de tarô feitas (menu Tarô). */
export const GET = withUser(async () => {
  const { data, error } = await db().from('tiragens').select('*, leads(id,name,whatsapp)').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ tiragens: [], aviso: /tiragens/.test(error.message) ? 'Rode o SQL 048 no Supabase para ativar o tarô.' : error.message });
  return NextResponse.json({
    tiragens: (data || []).map((t: any) => ({
      ...t, url: linkTiragem(t), tipo_nome: TIRAGENS[t.tipo]?.nome || t.tipo,
      cartas_nomes: (t.cartas || []).map((x: any) => cartaPorId(x.id)?.nome || x.id),
    })),
  });
}, { perm: ['taro', 'mapas'] });

/**
 * Tiragem MANUAL (equipe): sorteia as cartas para alguém.
 * Com WhatsApp e "enviar": manda o link na conversa daquele número e a IA faz a leitura ao vivo em 2 a 4 minutos (sem cobrar).
 * Sem WhatsApp: só gera a tiragem e devolve o link para a equipe usar como quiser.
 */
export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json();
  const tipo = TIRAGENS[b.tipo] ? b.tipo : '3cartas';
  const nome = nomeProprio(String(b.nome || '').trim()) || null;
  const pergunta = String(b.pergunta || '').trim().slice(0, 300) || null;
  const wa = b.phone ? toWhatsapp(b.phone) : null;
  if (b.phone && !wa) return NextResponse.json({ error: 'Número inválido. Use um celular com DDD, ex.: (19) 99999-9999.' }, { status: 400 });
  if (!wa || !b.enviar) {
    const t = await criarTiragem({ tipo, pergunta, nome });
    await logEvent(null, 'taro_manual', 'acc', `${user.member?.name || user.email} tirou o tarô (${TIRAGENS[tipo].nome}) para ${nome || 'um contato'}`);
    return NextResponse.json({ ok: true, url: linkTiragem(t), slug: t.slug });
  }
  const number = await connectedNumber(b.number_id || null);
  if (!number) return NextResponse.json({ error: 'Nenhum número de WhatsApp conectado.' }, { status: 400 });
  const k = waKey(wa);
  let lead = (await leadForNumber(k, number.id)).lead;
  if (!lead) lead = (await leadForNumber(k, number.id, { name: nome || wa.slice(2), source: 'manual', whatsapp: wa, stage: 'novo', ai_enabled: true, next_step: 'Tarô tirado pela equipe.' })).lead;
  if (!lead) return NextResponse.json({ error: 'Não consegui abrir a conversa com esse número.' }, { status: 400 });
  const mem = { ...(lead.memory || {}), taro_tipo: tipo, ...(pergunta ? { taro_pergunta: pergunta } : {}), ...(nome && !lead.memory?.nome_cliente ? { nome_cliente: nome } : {}) };
  await db().from('leads').update({ memory: mem, ai_enabled: !lead.ai_locked }).eq('id', lead.id);
  lead = { ...lead, memory: mem };
  const t = await entregarTaro(lead, TIRAGENS[tipo].servico, null, (txt: string) => sendAndRecord(number, lead, txt, 'human', true));
  if (!t) return NextResponse.json({ error: 'Já foi tirada uma tiragem para este contato nos últimos minutos.' }, { status: 409 });
  await logEvent(lead.id, 'taro_manual', 'acc', `${user.member?.name || user.email} tirou o tarô (${TIRAGENS[tipo].nome}) para ${lead.name}: a IA faz a leitura na conversa`);
  return NextResponse.json({ ok: true, url: linkTiragem(t), slug: t.slug, lead_id: lead.id });
}, { perm: 'taro.gerar' });

/** Exclui uma tiragem (e o PDF guardado). Se era a tiragem ativa de uma conversa, a conversa esquece dela. */
export const DELETE = withUser(async (req, _ctx, user) => {
  const b = await req.json().catch(() => ({}));
  const { data: t } = await db().from('tiragens').select('id,slug,lead_id,nome').eq('id', b.id).maybeSingle();
  if (!t) return NextResponse.json({ error: 'Tiragem não encontrada.' }, { status: 404 });
  await db().from('tiragens').delete().eq('id', t.id);
  await db().storage.from('mapas').remove([`taro/${t.slug}.pdf`]).then(() => {}, () => {});
  if (t.lead_id) {
    const { data: l } = await db().from('leads').select('memory').eq('id', t.lead_id).maybeSingle();
    if (l?.memory?.taro_ativa === t.slug) {
      const m = { ...l.memory };
      delete m.taro_ativa;
      await db().from('leads').update({ memory: m }).eq('id', t.lead_id);
    }
  }
  await logEvent(t.lead_id || null, 'taro_excluido', 'acc', `${user.member?.name || user.email} excluiu a tiragem de ${t.nome || 'um cliente'}`);
  return NextResponse.json({ ok: true });
}, { perm: 'taro.gerar' });
