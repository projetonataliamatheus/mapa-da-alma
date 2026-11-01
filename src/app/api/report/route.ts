import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { buildWeeklyReport } from '@/lib/report';

export const dynamic = 'force-dynamic';

/** Prévia do relatório semanal (Configurações). */
export const GET = withUser(async () => NextResponse.json({ text: await buildWeeklyReport() }), { perm: 'visao' });
