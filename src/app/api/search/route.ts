import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { runSearch } from '@/lib/search';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = withUser(async (req, _ctx, user) => {
  const body = await req.json();
  if (!body.niche || !body.city) return NextResponse.json({ error: 'Preencha o nicho e a cidade.' }, { status: 400 });
  const r = await runSearch(body, user.id);
  return NextResponse.json(r);
}, { perm: 'prospeccao.buscar' });
