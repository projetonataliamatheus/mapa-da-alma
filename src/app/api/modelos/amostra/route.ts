import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { makeSampleToken } from '@/lib/sample-link';
import { getSettings } from '@/lib/settings';
import { appBase } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Gera o link provisório (10 min por padrão) de um modelo para mostrar a um cliente. */
export const POST = withUser(async (req) => {
  const b = await req.json().catch(() => ({}));
  const { data: tpl } = await admin().from('premium_templates').select('slug,name,build_ok').eq('slug', String(b.slug || '')).maybeSingle();
  if (!tpl?.build_ok) return NextResponse.json({ error: 'Modelo ainda compilando ou com erro.' }, { status: 400 });
  const { token, expires } = makeSampleToken(tpl.slug, Number(b.minutes) || 10);
  const s: any = await getSettings(admin());
  const own = String(s.domains?.previa || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const base = own ? `https://${own}` : appBase();
  return NextResponse.json({ url: `${base}/amostra/${token}`, expires: expires.toISOString(), name: tpl.name });
}, { perm: ['modelos', 'modelos_premium'] });
