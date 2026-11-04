import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { paisesCfg, PAISES_PADRAO } from '@/lib/internacional';
import { stripeLigado } from '@/lib/stripe';
import { appBase } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Países, moedas e preços do atendimento em espanhol + estado do Stripe. */
export const GET = withUser(async () => {
  return NextResponse.json({
    paises: await paisesCfg(),
    stripe: { chave: stripeLigado(), webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET, webhook_url: `${appBase()}/api/webhooks/stripe` },
  });
}, { perm: 'internacional' });

export const POST = withUser(async (req, _ctx, user) => {
  need(user, 'internacional');
  const b = await req.json();
  const base = b.restaurar ? PAISES_PADRAO : Array.isArray(b.paises) ? b.paises : null;
  if (!base) return NextResponse.json({ error: 'Nada para salvar.' }, { status: 400 });
  const paises = base.slice(0, 60).map((p: any) => ({
    codigo: String(p.codigo || '').toUpperCase().slice(0, 4), nome: String(p.nome || '').slice(0, 60), ddi: String(p.ddi || '').replace(/\D/g, '').slice(0, 4),
    moeda: String(p.moeda || 'USD').toUpperCase().slice(0, 5), nome_moeda: String(p.nome_moeda || '').slice(0, 40),
    preco: Number(p.preco) > 0 ? Number(p.preco) : 10, brl: Number(p.brl) > 0 ? Number(p.brl) : 60,
    link: p.link ? String(p.link).trim().slice(0, 500) : '', ativo: p.ativo !== false,
  })).filter((p: any) => p.codigo);
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const { error } = await db().from('settings').upsert({ id: 1, data: { ...((data as any)?.data || {}), paises }, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, paises });
}, { perm: 'internacional' });
