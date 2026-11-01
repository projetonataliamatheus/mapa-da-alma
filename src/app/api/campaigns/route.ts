import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Funil por origem/campanha: chegaram → conversaram → viram a prévia → pagaram (+ receita).
 * Anúncio: cada campanha separada. Prospecção: abordados → responderam → prévia → pagaram.
 */
export const GET = withUser(async (req) => {
  const days = Math.max(1, Math.min(365, Number(new URL(req.url).searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await admin()
    .from('leads')
    .select('source,campaign,stage,steps,preview_slug,paid_amount,last_inbound_at,last_outbound_at,wa_status,created_at')
    .gte('created_at', since)
    .limit(20000);
  if (error) return NextResponse.json({ error: /campaign/.test(error.message) ? 'Rode a atualização 035 no Supabase.' : error.message }, { status: 400 });
  const groups: Record<string, any> = {};
  for (const l of data || []) {
    const src = l.source === 'anuncio' ? 'anuncio' : l.source === 'google' ? 'google' : 'direto';
    if (src === 'google' && !['enviado', 'conversa'].includes(l.wa_status) && !l.last_outbound_at) continue; // só quem foi abordado
    const key = src === 'anuncio' ? `anuncio:${l.campaign || 'sem nome'}` : src;
    const g = (groups[key] ||= { key, source: src, name: src === 'anuncio' ? l.campaign || 'Anúncio' : src === 'google' ? 'Prospecção (Google)' : 'Direto no WhatsApp', chegaram: 0, conversaram: 0, previa: 0, pagaram: 0, receita: 0 });
    const steps: string[] = l.steps || [];
    g.chegaram++;
    const talked = src === 'google' ? !!l.last_inbound_at : steps.includes('interest') || ['interessado', 'negociando', 'pix', 'pago'].includes(l.stage) || (steps.includes('talk') && !!l.last_outbound_at && !!l.last_inbound_at);
    if (talked) g.conversaram++;
    if (l.preview_slug || steps.includes('preview')) g.previa++;
    if (l.stage === 'pago') {
      g.pagaram++;
      g.receita += Number(l.paid_amount || 0);
    }
  }
  const rows = Object.values(groups).sort((a: any, b: any) => b.receita - a.receita || b.chegaram - a.chegaram);
  return NextResponse.json({ days, rows });
}, { perm: 'visao' });
