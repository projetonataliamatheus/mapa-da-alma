import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { createLink, updateLink } from '@/lib/checkout';
import { logEvent } from '@/lib/engine';
import { brl } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Cria um link de pagamento (pela equipe). */
export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json();
  if (!String(b.title || '').trim()) return NextResponse.json({ error: 'Informe o nome do serviço.' }, { status: 400 });
  const link = await createLink({
    title: b.title,
    description: b.description,
    includes: b.includes,
    amount: Number(String(b.amount).replace(',', '.')),
    billing: b.billing === 'mensal' ? 'mensal' : 'unico',
    max_installments: Number(b.max_installments) || undefined,
    methods: b.methods,
    service_slug: b.service_slug || null,
    combo: Array.isArray(b.combo) && b.combo.length >= 2 ? b.combo.slice(0, 8).map((c: any) => ({ slug: String(c.slug || ''), name: String(c.name || ''), price: Number(c.price) || 0 })) : null,
    lead_id: b.lead_id || null,
    created_by: 'equipe',
    created_by_user: user.id,
    expires_days: b.expires_days === undefined ? undefined : Number(b.expires_days),
  });
  if (link.lead_id) await logEvent(link.lead_id, 'link_created', 'pay', `Link de pagamento criado pela equipe: ${link.title} · ${brl(link.amount)}`);
  return NextResponse.json(link);
}, { perm: 'links.criar' });

/** Edita valor, descrição, parcelas ou status (cancelar/reativar). */
export const PATCH = withUser(async (req) => {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: 'Link não informado.' }, { status: 400 });
  if ('amount' in patch) patch.amount = Number(String(patch.amount).replace(',', '.'));
  return NextResponse.json(await updateLink(id, patch));
}, { perm: 'links.criar' });
