/** Catálogo digital no servidor: endereço público, slug livre, imagens. */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { appBase } from './util';
import { slugify } from './bio';

const db = () => admin();

/** Endereço público: domínio próprio do catálogo; senão olinks.com.br/c/…; senão o do painel. */
export async function catBase() {
  const s: any = await getSettings(db());
  if (s.domains?.catalogo) return `https://${s.domains.catalogo}`;
  if (s.domains?.bio) return `https://${s.domains.bio}/c`;
  return `${appBase()}/c`;
}
/** Link de edição do dono (sempre /c/editar/…, em qualquer domínio). */
export async function catEditBase() {
  const s: any = await getSettings(db());
  if (s.domains?.bio) return `https://${s.domains.bio}/c/editar`;
  return `${appBase()}/c/editar`;
}

const RESERVED = new Set(['editar', 'api', 'qr', 'admin', 'painel', 'c', 'l']);

export async function freeCatSlug(wanted: string, exceptId?: string) {
  const base = slugify(wanted);
  for (let i = 0; i < 50; i++) {
    const s = i ? `${base}${i + 1}` : base;
    if (RESERVED.has(s)) continue;
    const { data } = await db().from('catalogs').select('id').eq('slug', s).maybeSingle();
    if (!data || data.id === exceptId) return s;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}
export const validCatSlug = (s: string) => /^[a-z0-9]{2,30}$/.test(s) && !RESERVED.has(s);

export async function saveCatImage(id: string, file: File) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Envie uma imagem JPG, PNG ou WEBP.');
  if (file.size > 1.5 * 1024 * 1024) throw new Error('Imagem muito grande. Use uma de até 1,5 MB.');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `catalogo/${id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const up = await db().storage.from('publico').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: '31536000' });
  if (up.error) throw new Error('Não consegui guardar a imagem: ' + up.error.message);
  return db().storage.from('publico').getPublicUrl(path).data.publicUrl;
}

export const catImages = (d: any) => [d?.logo, d?.cover, ...((d?.products || []) as any[]).flatMap((p) => p.photos || [])].filter((x) => typeof x === 'string' && x.includes('/catalogo/'));

/** Apaga as fotos que não estão mais no catálogo (economiza armazenamento). */
export async function cleanCatImages(id: string, keep: string[]) {
  const { data } = await db().storage.from('publico').list(`catalogo/${id}`, { limit: 1000 });
  const used = new Set(keep.map((u) => u.split('/').pop()));
  const old = (data || []).filter((f) => !used.has(f.name)).map((f) => `catalogo/${id}/${f.name}`);
  if (old.length) await db().storage.from('publico').remove(old);
}
