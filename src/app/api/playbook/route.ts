import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { generatePlaybook } from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = withUser(async (req) => {
  const { niche } = await req.json();
  if (!niche) return NextResponse.json({ error: 'Escolha um nicho.' }, { status: 400 });
  const content = await generatePlaybook(niche);
  return NextResponse.json({ content });
}, { perm: 'aprendizado' });
