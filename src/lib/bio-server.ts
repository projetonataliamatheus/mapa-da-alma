/** Link na bio no servidor: endereço público, imagens e checagens. */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { appBase } from './util';
import { slugify } from './bio';

const db = () => admin();

/** Endereço público: o domínio olinks quando estiver ativo (Domínios › Link na bio); antes disso, o do painel. */
export async function bioBase() {
  const s: any = await getSettings(db());
  const host = s.domains?.bio;
  return host ? `https://${host}` : `${appBase()}/l`;
}

/** Palavras que não podem virar endereço (rotas do próprio sistema). */
const RESERVED = new Set(['api', 'editar', 'l', 'login', 'admin', 'painel', 'olinks', 'www', 'app', 'site', 'pagar', 'previa', 'bio', 'ajuda', 'termos', 'privacidade', 'suporte']);

export async function freeSlug(wanted: string, exceptId?: string) {
  const base = slugify(wanted);
  for (let i = 0; i < 50; i++) {
    const s = i ? `${base}${i + 1}` : base;
    if (RESERVED.has(s)) continue;
    const { data } = await db().from('bio_pages').select('id').eq('slug', s).maybeSingle();
    if (!data || data.id === exceptId) return s;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}

export function validSlug(s: string) {
  return /^[a-z0-9]{2,30}$/.test(s) && !RESERVED.has(s);
}

/** Guarda a imagem (já reduzida no navegador) no armazenamento público do Supabase. */
export async function saveImage(pageId: string, file: File) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Envie uma imagem JPG, PNG ou WEBP.');
  if (file.size > 1.5 * 1024 * 1024) throw new Error('Imagem muito grande. Use uma de até 1,5 MB.');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `bio/${pageId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const up = await db().storage.from('publico').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (up.error) throw new Error('Não consegui guardar a imagem: ' + up.error.message);
  return db().storage.from('publico').getPublicUrl(path).data.publicUrl;
}

/** Apaga do armazenamento as imagens que a página não usa mais (evita lixo e custo). */
export async function cleanImages(pageId: string, keep: string[]) {
  const { data } = await db().storage.from('publico').list(`bio/${pageId}`, { limit: 200 });
  const used = new Set(keep.map((u) => u.split('/').pop()));
  const old = (data || []).filter((f) => !used.has(f.name)).map((f) => `bio/${pageId}/${f.name}`);
  if (old.length) await db().storage.from('publico').remove(old);
}

export const imagesOf = (d: any) => [d?.avatar, d?.cover, d?.logo, ...(d?.gallery || [])].filter((x) => typeof x === 'string' && x.includes(`/bio/`));
