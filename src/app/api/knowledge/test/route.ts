import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { gather, getBrains, brainsBlock, situationBlock, withMaster } from '@/lib/intel';
import { structured, bubbles } from '@/lib/ai';
import { WRITING_RULES } from '@/lib/prompts';
import { getSettings } from '@/lib/settings';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SCHEMA = {
  type: 'object',
  properties: {
    messages: { type: 'array', maxItems: 3, items: { type: 'string' }, description: 'De 1 a 3 balões que a IA mandaria no WhatsApp; o último termina com pergunta.' },
    techniques_used: { type: 'array', items: { type: 'integer' } },
    why: { type: 'string', description: 'Em 1 ou 2 frases, por que essa resposta funciona, citando a técnica aplicada.' },
  },
  required: ['messages', 'techniques_used', 'why'],
};

/** Simula como a IA responderia a uma situação usando a base de conhecimento. */
export const POST = withUser(async (req) => {
  const { situation, stage, niche } = await req.json();
  if (!String(situation || '').trim()) return NextResponse.json({ error: 'Descreva a situação ou cole a mensagem do cliente.' }, { status: 400 });
  const [settings, brains, kb] = await Promise.all([getSettings(admin()), getBrains(), gather(situation, { stage: stage || 'negociando', niche: niche || null })]);
  const brain = brains.books || brains.real;
  const r = await structured<any>(
    withMaster(
      brains.master,
      `Você é ${settings.assistant_name}, assistente comercial de ${settings.company_name}, vendendo sites e serviços digitais pelo WhatsApp para pequenos negócios.\n${WRITING_RULES}\n\n${brainsBlock(brains)}\n\n${situationBlock(kb)}`,
    ),
    `Mensagem ou situação do cliente:\n"${situation}"\n\nEscreva a resposta (em balões) e diga quais técnicas usou.`,
    'teste_base',
    SCHEMA,
    800,
    { task: 'teste' },
  );
  const used = new Set((r.techniques_used || []).map(Number));
  return NextResponse.json({
    reply: bubbles(r, 3).join('\n'),
    messages: bubbles(r, 3),
    why: r.why,
    insights: kb.insights.map((i: any) => ({ ...i, used: used.has(Number(i.id)) })),
    chunks: kb.chunks,
    cases: kb.cases,
    lost: kb.lost,
    snippets: kb.snippets,
    semantic: kb.semantic,
    hasBrain: !!brain,
    hasMaster: !!brains.master,
  });
});
