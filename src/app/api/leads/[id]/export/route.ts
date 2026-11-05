import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Exporta a conversa completa (dados do contato, mensagens e eventos) em arquivo de texto para análise. */
export const GET = withUser(async (_req, ctx) => {
  const db = admin();
  const id = ctx.params.id;
  const { data: lead } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
  const msgs: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('messages').select('*').eq('lead_id', id).order('created_at').range(from, from + 999);
    msgs.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const { data: evs } = await db.from('lead_events').select('*').eq('lead_id', id).order('created_at').limit(2000);
  const L: string[] = [];
  L.push(`CONVERSA EXPORTADA — ${lead.name || ''}`);
  L.push(`Exportado em: ${fmt(new Date().toISOString())}`);
  L.push(`WhatsApp: ${lead.whatsapp || ''} | Idioma: ${lead.idioma || ''} | País: ${lead.pais || ''} | Etapa: ${lead.stage || ''} | Temperatura: ${lead.temperature ?? ''}`);
  if (lead.summary) L.push(`Resumo: ${lead.summary}`);
  if (lead.memory) L.push(`Memória/ficha (JSON): ${JSON.stringify(lead.memory)}`);
  L.push('', '=== MENSAGENS ===');
  for (const m of msgs) {
    const quem = m.direction === 'in' ? 'CLIENTE' : m.author === 'human' ? `EQUIPE${m.meta?.by ? ' (' + m.meta.by + ')' : ''}` : m.author === 'system' ? 'SISTEMA' : 'IA';
    const extra = m.meta?.tipo || m.meta?.type ? ` [${m.meta.tipo || m.meta.type}]` : '';
    L.push(`[${fmt(m.created_at)}] ${quem}${extra}: ${m.body ?? ''}`);
  }
  L.push('', '=== EVENTOS DO SISTEMA ===');
  for (const e of evs || []) L.push(`[${fmt(e.created_at)}] (${e.type}${e.actor_name ? ' · ' + e.actor_name : ''}) ${e.text || ''}`);
  const nome = String(lead.name || 'contato').normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'contato';
  return new NextResponse(L.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="conversa-${nome}.txt"` },
  });
});
