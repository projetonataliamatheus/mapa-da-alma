import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/**
 * Baixa em UM arquivo .txt as conversas COMPLETAS (desde o início do contato) de todos os contatos que tiveram
 * mensagem no dia (?dia=AAAA-MM-DD, padrão hoje no fuso de São Paulo). ?dias=N pega os últimos N dias.
 */
export const GET = withUser(async (req, _ctx, user) => {
  need(user, 'conversas.responder');
  const db = admin();
  const url = new URL(req.url);
  const hojeSP = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('dia') || '') ? String(url.searchParams.get('dia')) : hojeSP;
  const dias = Math.min(14, Math.max(1, Number(url.searchParams.get('dias')) || 1));
  const fim = new Date(`${dia}T03:00:00.000Z`).getTime() + 86400_000; // 00:00 de Brasília do dia seguinte
  const ini = fim - dias * 86400_000;

  // contatos com mensagem na janela
  const ids = new Set<string>();
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await db.from('messages').select('lead_id').gte('created_at', new Date(ini).toISOString()).lt('created_at', new Date(fim).toISOString()).range(from, from + 999);
    for (const m of data || []) if (m.lead_id) ids.add(m.lead_id);
    if (!data || data.length < 1000) break;
  }
  const lista = [...ids];
  const out: string[] = [];
  out.push(`TODAS AS CONVERSAS DO PERÍODO — ${fmt(new Date(ini).toISOString())} até ${fmt(new Date(fim - 1).toISOString())}`);
  out.push(`Exportado em: ${fmt(new Date().toISOString())} | Contatos: ${lista.length}`);
  out.push('Cada bloco traz a conversa COMPLETA desde o primeiro contato.', '');

  for (let i = 0; i < lista.length; i += 20) {
    const lote = lista.slice(i, i + 20);
    const { data: leads } = await db.from('leads').select('id,name,whatsapp,idioma,pais,stage,temperature,summary,needs_human,ai_enabled,created_at').in('id', lote);
    for (const lead of leads || []) {
      const msgs: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await db.from('messages').select('direction,author,body,transcript,created_at,meta').eq('lead_id', lead.id).order('created_at').range(from, from + 999);
        msgs.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const { data: evs } = await db.from('lead_events').select('type,text,created_at').eq('lead_id', lead.id).in('type', ['needs_human', 'reply_skip', 'idioma_bloqueado', 'resgate', 'retomada', 'stage', 'pix_created', 'pix_manual', 'pix_error', 'valor_corrigido', 'preview_blocked', 'ai_toggle']).order('created_at').limit(80);
      out.push('='.repeat(70));
      out.push(`CONTATO: ${lead.name || ''} | WhatsApp: ${lead.whatsapp || ''} | Idioma: ${lead.idioma || ''} | País: ${lead.pais || ''} | Etapa: ${lead.stage || ''} | Temperatura: ${lead.temperature ?? ''} | IA ${lead.ai_enabled ? 'ligada' : 'desligada'}${lead.needs_human ? ' | ALERTA: ' + lead.needs_human : ''}`);
      if (lead.summary) out.push(`Resumo: ${lead.summary}`);
      out.push('--- mensagens ---');
      for (const m of msgs) {
        const quem = m.direction === 'in' ? 'CLIENTE' : m.author === 'human' ? 'EQUIPE' : m.author === 'system' ? 'SISTEMA' : 'IA';
        out.push(`[${fmt(m.created_at)}] ${quem}: ${m.transcript || m.body || ''}`);
      }
      if (evs?.length) {
        out.push('--- eventos importantes ---');
        for (const e of evs) out.push(`[${fmt(e.created_at)}] (${e.type}) ${e.text || ''}`);
      }
      out.push('');
    }
  }
  return new NextResponse(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="conversas-${dia}${dias > 1 ? '-' + dias + 'dias' : ''}.txt"` },
  });
});
