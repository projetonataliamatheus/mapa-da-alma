import { unstable_noStore as noStore } from 'next/cache';
import { admin } from './supabase/admin';
import { Brand, brandOf, DEFAULT_BRAND } from './brand';

/**
 * Marca salva, lida a cada carregamento de página (nunca fica "congelada" na hora do Implantar).
 * Guarda 10 s na memória do servidor só para não consultar o banco a cada clique; salvar troca na hora.
 */
let memo: { at: number; b: Brand } | null = null;

export function setBrandCache(b: Brand) {
  memo = { at: Date.now(), b };
}

export async function getBrand(): Promise<Brand> {
  noStore();
  if (memo && Date.now() - memo.at < 10_000) return memo.b;
  try {
    const { data } = await admin().from('settings').select('data').eq('id', 1).maybeSingle();
    const b = brandOf((data?.data as any)?.brand);
    memo = { at: Date.now(), b };
    return b;
  } catch {
    return memo?.b || DEFAULT_BRAND;
  }
}
