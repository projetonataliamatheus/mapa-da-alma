import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Leva leads da busca para a lista de SELECIONADOS (nada é enviado até clicar em Iniciar na Prospecção). */
export const POST = withUser(async (req) => {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'Selecione pelo menos um lead.' }, { status: 400 });
  const db = admin();
  const { data: leads } = await db.from('leads').select('id,whatsapp,wa_status,opted_out').in('id', ids);
  const ok = (leads || []).filter((l: any) => l.whatsapp && !l.opted_out && ['nao', null, undefined].includes(l.wa_status)).map((l: any) => l.id);
  if (ok.length) await db.from('leads').update({ prospect: 'selecionado', next_step: 'Na lista de selecionados da Prospecção (aguardando Iniciar).' }).in('id', ok);
  await logEvent(null, 'queue', 'acc', `${ok.length} lead(s) adicionados aos selecionados da prospecção`);
  return NextResponse.json({ wa: ok.length, skipped: ids.length - ok.length });
}, { perm: 'prospeccao.buscar' });
