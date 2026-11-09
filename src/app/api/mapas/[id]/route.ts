import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { isMaster } from '@/lib/perms';

/** Mapa privado de outra pessoa: para os demais ele simplesmente não existe. */
const escondido = (m: any, user: any) => !!m?.privado_de && m.privado_de !== user.id;
import { admin as db } from '@/lib/supabase/admin';
import { liberarMapa, novaSenha, pdfDoMapa, enviarMapaCompleto, linkMapa, chaveEquipe, textosPersonalizados, type MapaRow } from '@/lib/mapa-alma/servico';
import { montarAnalise } from '@/lib/mapa-alma/analise';
import { connectedNumber, sendAndRecord, logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Análise completa do mapa para a equipe (painel). ?pessoa=2 analisa a segunda pessoa do mapa do casal. */
export const GET = withUser(async (req, { params }: any, user) => {
  const { data: m } = await db().from('mapas').select('*').eq('id', params.id).maybeSingle();
  if (!m || escondido(m, user)) return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
  const segunda = new URL(req.url).searchParams.get('pessoa') === '2' && m.nome2 && m.nascimento2;
  const ov = await textosPersonalizados();
  const analise = montarAnalise(segunda ? m.nome2 : m.nome, segunda ? m.nascimento2 : m.nascimento, ov, new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
  const k = chaveEquipe(m.slug);
  return NextResponse.json({ pode_privar: isMaster(user.member), mapa: { ...m, url: linkMapa(m), url_equipe: `${linkMapa(m)}?k=${k}`, pdf_equipe: `${linkMapa(m)}/pdf?k=${k}` }, analise });
}, { perm: 'mapas' });

/** Ações num mapa: liberar, refazer o PDF, enviar no WhatsApp (prévia ou completo). */
export const POST = withUser(async (req, { params }: any, user) => {
  const { acao, whatsapp, privado, versao: versaoPedida } = await req.json();
  const { data: m } = await db().from('mapas').select('*').eq('id', params.id).maybeSingle();
  if (!m || escondido(m, user)) return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
  if (acao === 'privado') {
    if (!isMaster(user.member)) return NextResponse.json({ error: 'Só o Master pode deixar um mapa privado.' }, { status: 403 });
    await db().from('mapas').update({ privado_de: privado ? user.id : null }).eq('id', m.id);
    return NextResponse.json({ ok: true, privado: !!privado });
  }
  if (acao === 'liberar' || acao === 'nova_senha' || acao === 'versao') need(user, 'mapas.liberar');
  if (acao === 'versao') {
    const versao = versaoPedida === 'simples' ? 'simples' : 'completa';
    await db().from('mapas').update({ versao, pdf_path: null }).eq('id', m.id);
    return NextResponse.json({ ok: true, versao });
  }
  if (acao === 'renovar_previa') {
    need(user, 'mapas.enviar');
    await db().from('mapas').update({ previa_inicio: null }).eq('id', m.id);
    return NextResponse.json({ ok: true });
  }
  if (acao === 'enviar_previa' || acao === 'enviar_completo') need(user, 'mapas.enviar');
  if (acao === 'liberar') { const senha = await liberarMapa(m.id); return NextResponse.json({ ok: true, senha }); }
  if (acao === 'nova_senha') { const senha = await novaSenha(m.id); return NextResponse.json({ ok: true, senha }); }
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
      await db().from('mapas').update({ previa_inicio: new Date().toISOString() }).eq('id', m.id).then(() => {}, () => {}); // prévia reenviada = tempo renovado (conta a partir do envio)
      const es = lead.idioma === 'es';
      const aviso = await import('@/lib/mapa-alma/previa').then((x) => x.avisoValidadePrevia(lead)).catch(() => '');
      await sendAndRecord(number, lead, es ? `Preparé la vista previa de tu Mapa del Alma ✨👇\n${linkMapa({ slug: m.slug, idioma: 'es' })}\n\n${aviso}\n\n¡Cuéntame qué es lo que más te llamó la atención!` : `Preparei a prévia do seu Mapa da Alma ✨👇\n${linkMapa(m)}\n\n${aviso}\n\nMe conta o que mais chamou a sua atenção!`, 'human', true, { preview: m.slug });
    } else {
      await enviarMapaCompleto(m as MapaRow, lead, number, (t) => sendAndRecord(number, lead, t, 'human', true));
    }
    await logEvent(lead.id, 'mapa_enviado', 'ok', `${acao === 'enviar_previa' ? 'Prévia do mapa' : 'Mapa completo'} enviado para ${lead.name}`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}, { perm: 'mapas' });

export const DELETE = withUser(async (_req, { params }: any, user) => {
  const { data: m } = await db().from('mapas').select('privado_de').eq('id', params.id).maybeSingle();
  if (!m || escondido(m, user)) return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
  await db().from('mapas').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}, { perm: 'mapas.excluir' });
