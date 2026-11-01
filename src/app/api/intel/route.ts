import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { intelStats, rebuildRealBrain, studyPendingCases, gather } from '@/lib/intel';
import { rebuildBrain } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Tudo da tela Inteligência: números, os dois cérebros, casos, mensagens campeãs e motivos de perda. */
export const GET = withUser(
  async (req) => {
    const url = new URL(req.url);
    const niche = url.searchParams.get('niche') || '';
    const db = admin();
    const nicheF = (q: any) => (niche ? q.ilike('niche', niche) : q);
    const [stats, brain, won, lost, top, bad, niches] = await Promise.all([
      intelStats(),
      db.from('knowledge_brain').select('*').eq('id', 1).maybeSingle(),
      nicheF(db.from('sales_cases').select('id,niche,channel,price,days_to_close,summary,lesson,turning_point,objections,tags,used,wins,created_at').eq('outcome', 'ganho')).order('created_at', { ascending: false }).limit(40),
      nicheF(db.from('sales_cases').select('id,niche,channel,lost_reason,summary,lesson,turning_point,created_at').eq('outcome', 'perdido')).order('created_at', { ascending: false }).limit(80),
      nicheF(db.from('msg_snippets').select('id,message_id,kind,niche,author,situation,text,score,got_reply,temp_delta,advanced,won,feedback,used,wins').gte('score', 1.5)).order('score', { ascending: false }).limit(60),
      nicheF(db.from('msg_snippets').select('id,message_id,kind,niche,author,situation,text,score,feedback').or('feedback.eq.-1,score.lte.-0.5')).order('updated_at', { ascending: false }).limit(30),
      db.from('sales_cases').select('niche').not('niche', 'is', null).limit(1000),
    ]);
    // motivos de perda agrupados
    const reasons: Record<string, number> = {};
    for (const c of lost.data || []) {
      const k = String(c.lost_reason || 'não informado').toLowerCase().trim();
      reasons[k] = (reasons[k] || 0) + 1;
    }
    // conversão por tipo de mensagem
    const { data: allSn } = await nicheF(db.from('msg_snippets').select('kind,got_reply,won,author')).limit(5000);
    const kinds: Record<string, { total: number; replied: number; won: number }> = {};
    for (const s of allSn || []) {
      const k = (kinds[s.kind] = kinds[s.kind] || { total: 0, replied: 0, won: 0 });
      k.total++;
      if (s.got_reply) k.replied++;
      if (s.won) k.won++;
    }
    return NextResponse.json({
      stats,
      brain: brain.data || null,
      won: won.data || [],
      lost: lost.data || [],
      reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 12),
      top: top.data || [],
      bad: bad.data || [],
      kinds,
      niches: Array.from(new Set((niches.data || []).map((n: any) => String(n.niche).toLowerCase()))).sort(),
      missing: !!(won.error || top.error),
    });
  },
  { perm: ['inteligencia', 'aprendizado'] },
);

/** Ações: refazer cérebros, estudar agora, simular busca. */
export const POST = withUser(
  async (req, _ctx, user) => {
    const body = await req.json();
    const { action, text, niche, stage } = body;
    if (action === 'search') return NextResponse.json(await gather(String(text || ''), { niche: niche || null, stage: stage || 'negociando' }));
    need(user, 'conhecimento.enviar');
    if (action === 'delete') {
      const { kind, id } = await Promise.resolve({ kind: body.kind, id: Number(body.id) });
      if (!id) return NextResponse.json({ error: 'Item não informado.' }, { status: 400 });
      // mensagem excluída: some das campeãs e não volta (marcada com 👎)
      if (kind === 'snippet') await admin().from('msg_snippets').update({ feedback: -1 }).eq('id', id);
      else if (kind === 'case') await admin().from('sales_cases').delete().eq('id', id);
      else return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'real') return NextResponse.json({ content: await rebuildRealBrain() });
    if (action === 'books') return NextResponse.json({ content: await rebuildBrain(true) });
    if (action === 'study') return NextResponse.json({ studied: await studyPendingCases(5) });
    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  },
  { perm: ['inteligencia', 'aprendizado'] },
);
