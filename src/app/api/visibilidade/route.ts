import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const KINDS: Record<string, { table: string; key: string; perm: string; label: string }> = {
  previa: { table: 'previews', key: 'slug', perm: 'previas.gerar', label: 'A prévia' },
  bio: { table: 'bio_pages', key: 'id', perm: 'bio.editar', label: 'O link na bio' },
  catalogo: { table: 'catalogs', key: 'id', perm: 'catalogo.editar', label: 'O catálogo' },
};

/** Liga/desliga uma página para o cliente (oculta mostra "Página indisponível"). */
export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json().catch(() => ({}));
  const k = KINDS[b.kind];
  if (!k || !b.id) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  need(user, k.perm);
  const visible = b.visible !== false;
  const { data, error } = await admin().from(k.table).update({ visible }).eq(k.key, b.id).select('lead_id').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data?.lead_id) await logEvent(data.lead_id, 'visibility', 'acc', `${k.label} ficou ${visible ? 'visível' : 'oculta'} para o cliente`).catch(() => {});
  return NextResponse.json({ ok: true, visible });
});
