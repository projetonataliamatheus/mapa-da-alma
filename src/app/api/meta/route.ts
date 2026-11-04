import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { capiLigado } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

/** Estado do rastreamento avançado do Meta (CAPI) e quantos eventos já foram devolvidos. */
export const GET = withUser(async () => {
  const { count } = await db().from('lead_events').select('id', { count: 'exact', head: true }).eq('type', 'meta_capi');
  const { count: compras } = await db().from('lead_events').select('id', { count: 'exact', head: true }).eq('type', 'meta_capi').like('text', '%Purchase%');
  return NextResponse.json({ ligado: capiLigado(), dataset: !!process.env.META_DATASET_ID, token: !!process.env.META_CAPI_TOKEN, teste: !!process.env.META_TEST_EVENT_CODE, enviados: count || 0, compras: compras || 0 });
}, { perm: 'campanhas' });
