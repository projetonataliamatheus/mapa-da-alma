import { NextResponse } from 'next/server';
import { isMaster } from '@/lib/perms';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { logEvent, markPaid, refreshSummary, handleReply, connectedNumber, enviarPiramides, enviarApresentacao, enviarPixDireto } from '@/lib/engine';
import { sendVoice, voiceConfigured } from '@/lib/voice';
import { getSettings } from '@/lib/settings';
import { explainAiError } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Ações sobre um lead:
 *  paid      → marca como pago (pagamento recebido por fora)
 *  approve   → aprova um desconto até um valor
 *  dismiss   → limpa o alerta "Precisa de você"
 *  summary   → refaz o resumo com a IA
 *  ai        → liga/desliga a IA para este contato
 */
export const POST = withUser(async (req, ctx, user) => {
  const id = ctx.params.id;
  const body = await req.json();
  const db = admin();
  const { data: lead } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });

  switch (body.action) {
    case 'idioma': {
      // troca manual do idioma do atendimento (pt/es); vale daqui em diante e vence a detecção automática
      need(user, 'conversas.responder');
      const idi = body.idioma === 'es' ? 'es' : 'pt';
      await db.from('leads').update({ idioma: idi, memory: { ...(lead.memory || {}), idioma_fixo: idi } }).eq('id', id);
      break;
    }
    case 'paid':
      need(user, 'leads.pago');
      await markPaid(id, body.amount ? Number(body.amount) : null, 'manual');
      break;
    case 'approve': {
      need(user, 'leads.desconto');
      const v = Number(body.price);
      if (!v) return NextResponse.json({ error: 'Informe o valor aprovado.' }, { status: 400 });
      const memA = { ...(lead.memory || {}), desconto: `a equipe liberou fechar por até R$ ${v}: pode aceitar esse valor com naturalidade (sem dizer que alguém aprovou)` };
      await db.from('leads').update({ approved_price: v, needs_human: null, memory: memA, reply_due_at: lead.ai_enabled ? new Date().toISOString() : null }).eq('id', id);
      await logEvent(id, 'approved', 'acc', `Equipe aprovou desconto até R$ ${v} para ${lead.name}`);
      break;
    }
    case 'deny': {
      // a equipe não libera o valor pedido: a IA volta com o mínimo + um bônus, sem dizer que alguém recusou
      need(user, 'leads.desconto');
      const memD = { ...(lead.memory || {}), desconto: 'o valor que o cliente pediu não dá: mantenha o menor preço permitido e ofereça um bônus da lista para compensar (sem dizer que alguém recusou)' };
      await db.from('leads').update({ needs_human: null, memory: memD, reply_due_at: lead.ai_enabled ? new Date().toISOString() : null }).eq('id', id);
      await logEvent(id, 'approval_denied', 'acc', `Equipe não liberou o desconto pedido por ${lead.name}`);
      break;
    }
    case 'cortesia': {
      // conversa GRATUITA / TESTE: a IA atende normal e entrega sem cobrar (o cliente não percebe). Só o Master.
      if (!isMaster(user.member)) return NextResponse.json({ error: 'Só o Master pode marcar uma conversa como gratuita/teste.' }, { status: 403 });
      const on = !!body.on;
      await db.from('leads').update({ cortesia: on }).eq('id', id);
      await logEvent(id, 'cortesia', 'acc', `${lead.name}: conversa ${on ? 'marcada como GRATUITA/TESTE (entrega sem cobrança)' : 'voltou ao atendimento normal (com cobrança)'}`);
      return NextResponse.json({ ok: true, cortesia: on });
    }
    case 'dismiss':
      await db.from('leads').update({ needs_human: null }).eq('id', id);
      break;
    case 'reply_now': {
      need(user, 'conversas.responder');
      if (lead.ai_locked) return NextResponse.json({ error: 'A IA está pausada definitivamente nesta conversa. Clique em "Reativar IA" primeiro.' }, { status: 409 });
      // responde agora pelo próprio painel e mostra o erro, se houver
      try {
        await db.from('leads').update({ ai_enabled: true }).eq('id', id);
        await handleReply(id, { force: true });
      } catch (e: any) {
        return NextResponse.json({ error: explainAiError(e) + ' — detalhe: ' + String(e?.message || e).slice(0, 300) }, { status: 500 });
      }
      break;
    }
    case 'reply_audio': {
      // a IA responde a conversa agora, em áudio com a voz da conversa (botão do painel)
      need(user, 'conversas.responder');
      if (lead.ai_locked) return NextResponse.json({ error: 'A IA está pausada definitivamente nesta conversa. Reative a IA primeiro.' }, { status: 409 });
      if (!voiceConfigured()) return NextResponse.json({ error: 'Falta ELEVENLABS_API_KEY no Easypanel (Ambiente) e Implantar.' }, { status: 400 });
      const started = new Date().toISOString();
      try {
        await db.from('leads').update({ ai_enabled: true }).eq('id', id);
        await handleReply(id, { force: true, audio: true });
      } catch (e: any) {
        return NextResponse.json({ error: explainAiError(e) + ' — detalhe: ' + String(e?.message || e).slice(0, 300) }, { status: 500 });
      }
      const { data: out } = await db.from('messages').select('kind').eq('lead_id', id).eq('direction', 'out').gte('created_at', started).order('created_at', { ascending: false }).limit(3);
      if (!out?.length) return NextResponse.json({ error: 'A IA não tinha o que responder agora (a última mensagem não pedia resposta).' }, { status: 400 });
      if (!out.some((m: any) => m.kind === 'audio')) {
        const { data: ev } = await db.from('lead_events').select('text').eq('lead_id', id).eq('type', 'voice_error').gte('created_at', started).limit(1);
        return NextResponse.json({ error: 'A resposta saiu em texto, não em áudio. ' + (ev?.[0]?.text || 'Confira se há uma voz ativa no menu Vozes (ElevenLabs) e se a resposta não tinha link.') }, { status: 400 });
      }
      break;
    }
    case 'say_audio': {
      // a equipe escreve e o texto vai como áudio com a voz da conversa
      need(user, 'conversas.responder');
      const text = String(body.text || '').trim();
      if (!text) return NextResponse.json({ error: 'Escreva o que o áudio deve dizer.' }, { status: 400 });
      if (!voiceConfigured()) return NextResponse.json({ error: 'Falta ELEVENLABS_API_KEY no Easypanel (Ambiente) e Implantar.' }, { status: 400 });
      const number = await connectedNumber(lead.number_id);
      if (!number) return NextResponse.json({ error: 'Nenhum número de WhatsApp conectado.' }, { status: 400 });
      try {
        const ok = await sendVoice(number, lead, text, await getSettings(db), {}, 'human');
        if (!ok) return NextResponse.json({ error: 'Não deu para gerar o áudio (sem voz ativa, texto com link ou longo demais).' }, { status: 400 });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      await db.from('leads').update({ ai_enabled: false, reply_due_at: null, last_outbound_at: new Date().toISOString() }).eq('id', id);
      break;
    }
    case 'summary':
      return NextResponse.json(await refreshSummary(id));
    case 'assign': {
      // responsável pela conversa (um membro da equipe ou ninguém)
      need(user, 'conversas.responder');
      let name: string | null = null;
      if (body.member) {
        const { data: m } = await db.from('team_members').select('name,email').eq('id', body.member).maybeSingle();
        if (!m) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
        name = m.name || m.email;
      }
      await db.from('leads').update({ assigned_to: body.member || null, assigned_name: name }).eq('id', id);
      await logEvent(id, 'assign', 'acc', name ? `Conversa com ${lead.name} agora é responsabilidade de ${name}` : `Conversa com ${lead.name} ficou sem responsável`);
      break;
    }
    case 'note': {
      // nota interna: só a equipe vê (o cliente nunca recebe)
      const txt = String(body.text || '').trim().slice(0, 2000);
      if (!txt) return NextResponse.json({ error: 'Escreva a nota.' }, { status: 400 });
      await db.from('lead_notes').insert({ lead_id: id, author_id: user.id, author_name: user.member?.name || user.email, text: txt });
      await logEvent(id, 'note', 'acc', `Nota interna: "${txt.slice(0, 80)}"`);
      break;
    }
    case 'archive': {
      // arquivar: some da lista (volta sozinha se o cliente escrever); a IA não muda
      need(user, 'conversas.responder');
      await db.from('leads').update({ archived_at: body.on === false ? null : new Date().toISOString() }).eq('id', id);
      await logEvent(id, 'archive', 'acc', body.on === false ? `Conversa com ${lead.name} desarquivada` : `Conversa com ${lead.name} arquivada por ${user.email}`);
      break;
    }
    case 'delete': {
      // excluir: apaga a conversa e o histórico deste contato (não tem volta)
      need(user, 'leads.excluir');
      await db.from('leads').delete().eq('id', id);
      await logEvent(null, 'lead_deleted', 'warn', `Conversa com ${lead.name} (${lead.whatsapp || 'sem número'}) excluída por ${user.email}`);
      return NextResponse.json({ ok: true, deleted: true });
    }
    case 'limpar': {
      // EXCLUIR CONVERSA = começar do zero com este contato: apaga as mensagens, a memória e o andamento,
      // mas mantém o contato (número, nome, IA ligada). As mensagens antigas do WhatsApp não voltam para o painel.
      need(user, 'leads.excluir');
      await db.from('messages').delete().eq('lead_id', id);
      await db.from('lead_events').delete().eq('lead_id', id).then(() => {}, () => {});
      await db.from('mapas').update({ lead_id: null }).eq('lead_id', id).then(() => {}, () => {});
      const limpo = {
        memory: { historico_limpo_em: Date.now() }, summary: null, next_step: null, stage: 'novo', steps: [], temperature: 0, close_probability: 0,
        pains: [], objections: [], needs_human: null, reply_due_at: null, preview_due_at: null, preview_slug: null, mapa_slug: null,
        deal_service: null, deal_price: null, accepted_offer: null, last_inbound_at: null, last_outbound_at: null, archived_at: null,
        ai_enabled: !lead.ai_locked, wa_status: 'conversa',
      };
      const { error: e1 } = await db.from('leads').update(limpo).eq('id', id);
      if (e1) {
        // alguma coluna não existe neste banco: limpa o essencial
        await db.from('leads').update({ memory: limpo.memory, summary: null, next_step: null, stage: 'novo', steps: [], temperature: 0, needs_human: null, reply_due_at: null, preview_slug: null, mapa_slug: null }).eq('id', id);
      }
      await logEvent(id, 'conversa_limpa', 'warn', `Conversa com ${lead.name} limpa por ${user.email}: começa do zero`);
      const { data: novo } = await db.from('leads').select('*').eq('id', id).maybeSingle();
      return NextResponse.json({ ...(novo || {}), limpa: true });
    }
    case 'gender': {
      // a equipe corrige se o cliente é homem ou mulher (escolhe o modelo masculino/feminino da prévia)
      const g = body.gender === 'masculino' || body.gender === 'feminino' ? body.gender : null;
      await db.from('leads').update({ gender: g }).eq('id', id);
      break;
    }
    case 'piramides': {
      // atalho da conversa: link só com as pirâmides escolhidas (1 a 3); enviar = manda no WhatsApp, senão só devolve o link
      need(user, 'conversas.responder');
      const slug = lead.mapa_slug || lead.preview_slug;
      if (!slug) return NextResponse.json({ error: 'Esta conversa ainda não tem mapa. Gere o mapa (nome completo + data) primeiro.' }, { status: 400 });
      try {
        if (!body.enviar) {
          const { linkPiramides } = await import('@/lib/mapa-alma/servico');
          return NextResponse.json({ ok: true, url: await linkPiramides(slug, body.so || []) });
        }
        const number = await connectedNumber(lead.number_id);
        if (!number) return NextResponse.json({ error: 'Nenhum WhatsApp conectado.' }, { status: 400 });
        const url = await enviarPiramides(number, lead, body.so || [], 'human', user.member?.name || user.email);
        return NextResponse.json({ ok: true, url });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }
    case 'previa': {
      // atalho da conversa: link da prévia com bloqueios (o que a IA já comentou fica aberto); enviar | link | renovar (reinicia a contagem)
      need(user, 'conversas.responder');
      const slug = lead.mapa_slug || lead.preview_slug;
      if (!slug) return NextResponse.json({ error: 'Esta conversa ainda não tem mapa. Gere o mapa (nome completo + data) primeiro.' }, { status: 400 });
      const { linkMapa } = await import('@/lib/mapa-alma/servico');
      const es = lead.idioma === 'es';
      const url = linkMapa({ slug, idioma: es ? 'es' : 'pt' });
      if (body.modo === 'renovar') {
        await db.from('mapas').update({ previa_inicio: null }).eq('slug', slug);
        return NextResponse.json({ ok: true, url });
      }
      if (body.modo === 'enviar') {
        const number = await connectedNumber(lead.number_id);
        if (!number) return NextResponse.json({ error: 'Nenhum WhatsApp conectado.' }, { status: 400 });
        const { sendAndRecord } = await import('@/lib/engine');
        await sendAndRecord(number, lead, es ? `Aquí está tu mapa 👇\n${url}\n\nLo que ya conversamos está abierto; el resto se libera con el pago.` : `Preparei o seu mapa 👇\n${url}\n\nO que já conversamos está aberto; o restante você libera com o pagamento.`, 'human', true, { preview: slug });
        await logEvent(id, 'mapa_enviado', 'ok', `${user.member?.name || user.email} mandou o link da prévia (com bloqueios) para ${lead.name}`);
      }
      return NextResponse.json({ ok: true, url });
    }
    case 'apresentacao': {
      need(user, 'conversas.responder');
      const number = await connectedNumber(lead.number_id);
      if (!number) return NextResponse.json({ error: 'Nenhum WhatsApp conectado.' }, { status: 400 });
      try {
        await enviarApresentacao(number, lead, 'human', user.member?.name || user.email);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      break;
    }
    case 'enviar_pix': {
      // Pix copia e cola (Asaas) mandado pela equipe nesta conversa (idioma do lead); valor do mapa no Brasil se não informado
      need(user, 'conversas.responder');
      const number = await connectedNumber(lead.number_id);
      if (!number) return NextResponse.json({ error: 'O chip desta conversa está desconectado.' }, { status: 400 });
      const { data: svc } = await db.from('services').select('*').eq('slug', 'mapa-completo').maybeSingle();
      const preco = Number(body.valor) || Number(svc?.price_steps?.[0] ?? svc?.min_price ?? 49) || 49;
      try {
        await enviarPixDireto(number, lead, svc, preco, await getSettings());
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      await db.from('leads').update({ stage: 'pix', needs_human: null, last_outbound_at: new Date().toISOString() }).eq('id', id);
      await logEvent(id, 'pix_manual', 'acc', `Pix de R$ ${preco} enviado para ${lead.name} pela equipe`);
      break;
    }
    case 'ai': {
      need(user, 'conversas.responder');
      const on = !!body.on;
      if (on && lead.ai_locked) return NextResponse.json({ error: 'A IA está pausada definitivamente nesta conversa. Use "Reativar IA".' }, { status: 409 });
      const { data: last } = await db.from('messages').select('direction').eq('lead_id', id).order('created_at', { ascending: false }).limit(1);
      const waiting = on && last?.[0]?.direction === 'in';
      await db.from('leads').update({ ai_enabled: on, reply_due_at: waiting ? new Date().toISOString() : null }).eq('id', id);
      await logEvent(id, 'ai_toggle', on ? 'ai' : 'acc', on ? `Conversa com ${lead.name} devolvida para a IA` : `A equipe assumiu a conversa com ${lead.name}`);
      break;
    }
    case 'lock': {
      // pausa definitiva: a IA não volta sozinha de jeito nenhum; só reativando aqui
      need(user, 'conversas.responder');
      const on = !!body.on;
      if (on) {
        const { error } = await db
          .from('leads')
          .update({ ai_locked: true, ai_locked_at: new Date().toISOString(), ai_locked_by: user.member?.name || user.email || user.id, ai_enabled: false, reply_due_at: null })
          .eq('id', id);
        if (error) return NextResponse.json({ error: /ai_locked/.test(error.message) ? 'Rode a migração 012_pausa_definitiva.sql no Supabase.' : error.message }, { status: 400 });
        await logEvent(id, 'ai_lock', 'acc', `IA pausada definitivamente na conversa com ${lead.name}`);
      } else {
        const { data: last } = await db.from('messages').select('direction').eq('lead_id', id).order('created_at', { ascending: false }).limit(1);
        const waiting = last?.[0]?.direction === 'in';
        await db.from('leads').update({ ai_locked: false, ai_locked_at: null, ai_locked_by: null, ai_enabled: true, reply_due_at: waiting ? new Date().toISOString() : null }).eq('id', id);
        await logEvent(id, 'ai_lock', 'ai', `IA reativada manualmente na conversa com ${lead.name}`);
      }
      break;
    }
    default:
      return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  }
  const { data } = await db.from('leads').select('*').eq('id', id).single();
  return NextResponse.json(data);
});
