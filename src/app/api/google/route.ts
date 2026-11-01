import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { testGoogle } from '@/lib/places';

export const dynamic = 'force-dynamic';

/** Diagnóstico da chave do Google Maps. */
export const GET = withUser(async () => NextResponse.json(await testGoogle()), { master: true });
