import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** Endereços ativos por função (Sistema › Domínios), para os links copiados nas telas do Lovable. */
export const GET = withUser(async () => {
  const s: any = await getSettings(admin());
  return NextResponse.json(s.domains || {});
});
