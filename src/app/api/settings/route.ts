import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { deepMerge, getSettings } from '@/lib/settings';
import { logEvent } from '@/lib/engine';
import { brandOf } from '@/lib/brand';
import { setBrandCache } from '@/lib/brand-server';
import { isMaster } from '@/lib/perms';
import { Forbidden } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () => NextResponse.json(await getSettings(admin())));

/** Salva parte das configurações (o resto continua como está). */
export const PATCH = withUser(async (req, _ctx, user) => {
  const body = await req.json();
  const keys = Object.keys(body || {});
  // pausar: quem tem a permissão; prévias: quem edita modelos; o resto só o Master
  // marca do painel: só o Master
  if ('brand' in (body || {}) && !isMaster(user.member)) throw new Forbidden('Só o Master pode trocar a marca do painel.');
  for (const k of keys) if (k !== 'brand') need(user, k === 'paused' ? 'automacao.pausar' : k === 'previews' ? 'modelos.editar' : k === 'budget' ? 'custos.tetos' : k === 'checkout' ? 'checkout.editor' : k === 'mapa_marca' || k === 'mapa_estilo' ? 'mapas.aparencia' : 'config');
  const db = admin();
  const { data } = await db.from('settings').select('data').eq('id', 1).maybeSingle();
  const { brand, ...rest } = body || {};
  const merged = deepMerge(data?.data || {}, rest);
  if (brand !== undefined) merged.brand = brandOf(brand);
  await db.from('settings').upsert({ id: 1, data: merged, updated_at: new Date().toISOString() });
  if (brand !== undefined) {
    setBrandCache(merged.brand);
    await logEvent(null, 'config', 'acc', `Marca do painel atualizada por ${user.email}`);
  }
  if (typeof body.paused === 'boolean') await logEvent(null, 'pause', body.paused ? 'warn' : 'ok', body.paused ? `Automação pausada por ${user.email}` : `Automação retomada por ${user.email}`);
  return NextResponse.json(await getSettings(db));
});
