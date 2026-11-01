import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { appBase } from './util';
import { CanvaPack, packMatch } from './packs';

/** Endereço público das galerias: o domínio de Packs (Domínios) quando ativo; senão o do painel. */
export async function packsBase() {
  const s: any = await getSettings(admin());
  const host = s.domains?.packs;
  return host ? `https://${host}` : `${appBase()}/p`;
}

/** Packs ativos que combinam com o ramo do cliente (os melhores primeiro). */
export async function packsFor(niche: string | null | undefined, limit = 3): Promise<(CanvaPack & { url: string })[]> {
  if (!niche) return [];
  const { data, error } = await admin().from('canva_packs').select('*').eq('active', true).order('sort');
  if (error || !data?.length) return [];
  const base = await packsBase();
  return (data as CanvaPack[])
    .map((p) => ({ p, s: packMatch(p, niche) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ p }) => ({ ...p, url: `${base}/${p.slug}` }));
}
