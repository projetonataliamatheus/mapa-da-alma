/**
 * Área do cliente: login com usuário e senha para editar Link na bio, Catálogo e ver o que é dele.
 * - senha guardada com scrypt (sal aleatório), nunca em texto
 * - sessão num cookie httpOnly assinado (HMAC) que vale 7 dias e cai na hora se a senha for trocada ou o acesso desativado
 * - 5 senhas erradas seguidas bloqueiam o usuário por 15 minutos; por IP também há limite
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { admin } from './supabase/admin';

export const CLI_COOKIE = 'rv_cli';
const MAX_AGE = 7 * 24 * 3600;

function key() {
  const base = process.env.CLIENT_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base) throw new Error('Chave de sessão não configurada');
  return createHmac('sha256', 'radar-cliente-v1').update(base).digest();
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 32);
  return `s1$${salt.toString('base64')}$${h.toString('base64')}`;
}

export function checkPassword(pw: string, stored: string) {
  const [v, s, h] = String(stored || '').split('$');
  if (v !== 's1' || !s || !h) return false;
  const want = Buffer.from(h, 'base64');
  const got = scryptSync(pw, Buffer.from(s, 'base64'), want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Senha forte e fácil de ditar: sem letras confusas (0/O, 1/l). */
export function newPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = randomBytes(10);
  return Array.from(b, (x) => abc[x % abc.length]).join('');
}

export function cleanUser(u: string) {
  return String(u || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40);
}

function sign(payload: string) {
  return createHmac('sha256', key()).update(payload).digest('base64url');
}

export function makeSession(id: string, ver: number) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const p = `${id}.${ver}.${exp}`;
  return `${p}.${sign(p)}`;
}

export function setSessionCookie(res: { cookies: { set: (...a: any[]) => any } }, value: string) {
  res.cookies.set(CLI_COOKIE, value, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
}
export function clearSessionCookie(res: { cookies: { set: (...a: any[]) => any } }) {
  res.cookies.set(CLI_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

/** Cliente logado (confere assinatura, validade, versão da senha e se o acesso está ativo). */
export async function currentClient(): Promise<{ id: string; name: string; username: string; lead_id: string | null } | null> {
  const { cookies } = await import('next/headers');
  const raw = cookies().get(CLI_COOKIE)?.value || '';
  const parts = raw.split('.');
  if (parts.length !== 4) return null;
  const [id, ver, exp, sig] = parts;
  const want = sign(`${id}.${ver}.${exp}`);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await admin().from('client_accounts').select('id,name,username,lead_id,pass_ver,active').eq('id', id).maybeSingle();
  if (!data || !data.active || String(data.pass_ver) !== ver) return null;
  return { id: data.id, name: data.name, username: data.username, lead_id: data.lead_id };
}

/** Limite por IP (memória do servidor): 20 tentativas a cada 15 min. */
const ipHits = new Map<string, number[]>();
export function ipLimited(ip: string) {
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < 15 * 60_000);
  arr.push(now);
  ipHits.set(ip, arr);
  if (ipHits.size > 5000) ipHits.clear();
  return arr.length > 20;
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'ip';
}

/** A página (bio/catálogo) pertence ao cliente logado? */
export async function ownsPage(table: 'bio_pages' | 'catalogs', token: string) {
  if (!/^[a-f0-9]{20,64}$/i.test(token || '')) return { page: null as any, reason: 'invalido' as const };
  const { data: page } = await admin().from(table).select('*').eq('edit_token', token).maybeSingle();
  if (!page) return { page: null as any, reason: 'invalido' as const };
  if (!page.account_id) return { page: null as any, reason: 'sem_acesso' as const };
  const me = await currentClient();
  if (!me) return { page: null as any, reason: 'login' as const, me: null };
  if (me.id !== page.account_id) return { page: null as any, reason: 'outro' as const, me };
  return { page, reason: 'ok' as const, me };
}

export const OWN_ERR: Record<string, [number, string]> = {
  invalido: [404, 'Link de edição inválido ou trocado. Peça um novo para quem te atendeu.'],
  sem_acesso: [403, 'O acesso para editar esta página ainda não foi liberado. Peça seu usuário e senha para quem te atendeu.'],
  login: [401, 'Entre com seu usuário e senha para editar.'],
  outro: [403, 'Este usuário não tem acesso a esta página. Saia e entre com o usuário certo.'],
};

/** Usuário sugerido: nome da página (slug) sem repetir um que já existe. */
async function freeUsername(base: string) {
  const b = cleanUser(base) || 'cliente';
  for (let i = 0; i < 50; i++) {
    const u = i ? `${b}${i + 1}` : b;
    const { data } = await admin().from('client_accounts').select('id').eq('username', u).maybeSingle();
    if (!data) return u;
  }
  return `${b}${Date.now().toString(36)}`;
}

/**
 * Garante que a página tem um acesso de cliente. Se o cliente (lead) já tem acesso, reaproveita (senha não muda).
 * Devolve a senha só quando ela acabou de ser criada (é a única vez que ela aparece).
 */
export async function ensureAccess(table: 'bio_pages' | 'catalogs', pageId: string, opts: { username?: string; byName?: string } = {}) {
  const db = admin();
  const { data: page } = await db.from(table).select('id,slug,lead_id,account_id,data').eq('id', pageId).single();
  if (page!.account_id) {
    const { data: a } = await db.from('client_accounts').select('id,username').eq('id', page!.account_id).maybeSingle();
    if (a) return { id: a.id, username: a.username, password: null as string | null, existed: true };
  }
  if (page!.lead_id && !opts.username) {
    const { data: a } = await db.from('client_accounts').select('id,username').eq('lead_id', page!.lead_id).eq('active', true).order('created_at').limit(1).maybeSingle();
    if (a) {
      await db.from(table).update({ account_id: a.id }).eq('id', pageId);
      return { id: a.id, username: a.username, password: null as string | null, existed: true };
    }
  }
  let name = (page!.data as any)?.name || page!.slug;
  if (page!.lead_id) {
    const { data: l } = await db.from('leads').select('name').eq('id', page!.lead_id).maybeSingle();
    if (l?.name) name = l.name;
  }
  const username = opts.username ? cleanUser(opts.username) : await freeUsername(page!.slug);
  if (!username || username.length < 3) throw new Error('O usuário precisa ter pelo menos 3 letras ou números.');
  const password = newPassword();
  const { data: a, error } = await db
    .from('client_accounts')
    .insert({ username, name, lead_id: page!.lead_id, pass_hash: hashPassword(password), created_by_name: opts.byName || null })
    .select('id')
    .single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Este usuário já existe. Escolha outro.' : error.message);
  await db.from(table).update({ account_id: a.id }).eq('id', pageId);
  return { id: a.id, username, password, existed: false };
}

/** Mensagem pronta para mandar ao cliente com o acesso. */
export function accessMessage(siteBase: string, username: string, password: string | null) {
  const area = `${siteBase.replace(/\/$/, '')}/cliente`;
  return password
    ? `Seu acesso para editar suas páginas quando quiser 👇\n${area}\n\nUsuário: ${username}\nSenha: ${password}\n\nGuarde com cuidado e não compartilhe. Dá pra trocar a senha lá dentro.`
    : `Para editar, entre na sua área com o mesmo usuário e senha que você já recebeu (usuário: ${username}) 👇\n${area}`;
}

/** Acesso do cliente pela central (Clientes): um usuário por cliente, ligado a todas as páginas dele. */
export async function ensureLeadAccess(leadId: string, opts: { username?: string; byName?: string } = {}) {
  const db = admin();
  const { data: lead } = await db.from('leads').select('id,name').eq('id', leadId).single();
  let { data: acc } = await db.from('client_accounts').select('id,username').eq('lead_id', leadId).order('created_at').limit(1).maybeSingle();
  let password: string | null = null;
  if (!acc) {
    const username = opts.username ? cleanUser(opts.username) : await freeUsername(lead!.name || 'cliente');
    if (!username || username.length < 3) throw new Error('O usuário precisa ter pelo menos 3 letras ou números.');
    password = newPassword();
    const { data, error } = await db.from('client_accounts').insert({ username, name: lead!.name || '', lead_id: leadId, pass_hash: hashPassword(password), created_by_name: opts.byName || null }).select('id,username').single();
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Este usuário já existe. Escolha outro.' : error.message);
    acc = data;
  }
  await db.from('bio_pages').update({ account_id: acc!.id }).eq('lead_id', leadId).is('account_id', null);
  await db.from('catalogs').update({ account_id: acc!.id }).eq('lead_id', leadId).is('account_id', null);
  return { id: acc!.id, username: acc!.username, password, existed: !password };
}
