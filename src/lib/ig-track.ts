/**
 * Acompanhamento do Instagram dos clientes, sem login e sem conectar conta:
 * lê só os números PÚBLICOS do perfil (seguidores, seguindo, posts e curtidas/comentários dos posts recentes)
 * uma vez por dia e guarda a foto do dia. Não usa senha nem token do cliente: zero risco para a conta dele.
 */
import { admin } from './supabase/admin';

const db = () => admin();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export function cleanIgUser(u: string) {
  return String(u || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#\s]/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30);
}

export type IgStats = { followers: number | null; following: number | null; posts: number | null; likes: number | null; comments: number | null; recent: number; views: number | null; full_name?: string; pic?: string; private?: boolean };

async function viaApi(user: string): Promise<IgStats | null> {
  const r = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(user)}`, {
    headers: { 'x-ig-app-id': '936619743392459', 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    cache: 'no-store',
  });
  if (r.status === 404) throw new Error('Perfil não encontrado. Confira o @.');
  if (!r.ok) return null;
  const j: any = await r.json().catch(() => null);
  const u = j?.data?.user;
  if (!u) return null;
  const edges = (u.edge_owner_to_timeline_media?.edges || []).map((e: any) => e.node);
  const likes = edges.reduce((t: number, n: any) => t + (n.edge_liked_by?.count ?? n.edge_media_preview_like?.count ?? 0), 0);
  const comments = edges.reduce((t: number, n: any) => t + (n.edge_media_to_comment?.count ?? 0), 0);
  const views = edges.reduce((t: number, n: any) => t + (n.video_view_count ?? 0), 0);
  return {
    followers: u.edge_followed_by?.count ?? null,
    following: u.edge_follow?.count ?? null,
    posts: u.edge_owner_to_timeline_media?.count ?? null,
    likes: edges.length ? likes : null,
    comments: edges.length ? comments : null,
    views: edges.length ? views : null,
    recent: edges.length,
    full_name: u.full_name || '',
    pic: u.profile_pic_url_hd || u.profile_pic_url || '',
    private: !!u.is_private,
  };
}

/** Plano B: a página pública traz "X seguidores, Y seguindo, Z posts" na descrição. */
async function viaPage(user: string): Promise<IgStats | null> {
  const r = await fetch(`https://www.instagram.com/${encodeURIComponent(user)}/`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, cache: 'no-store' });
  if (r.status === 404) throw new Error('Perfil não encontrado. Confira o @.');
  if (!r.ok) return null;
  const html = await r.text();
  const m = html.match(/<meta[^>]+(?:property|name)="(?:og:)?description"[^>]+content="([^"]+)"/i);
  if (!m) return null;
  const num = (s?: string) => {
    if (!s) return null;
    const t = s.replace(/,/g, '').trim().toUpperCase();
    const n = parseFloat(t);
    if (isNaN(n)) return null;
    return Math.round(t.endsWith('K') ? n * 1e3 : t.endsWith('M') ? n * 1e6 : n);
  };
  const d = m[1].replace(/&#x2c;|&#44;/g, ',');
  const f = d.match(/([\d.,]+[KM]?)\s+Followers/i);
  const g = d.match(/([\d.,]+[KM]?)\s+Following/i);
  const p = d.match(/([\d.,]+[KM]?)\s+Posts/i);
  if (!f) return null;
  return { followers: num(f[1]), following: num(g?.[1]), posts: num(p?.[1]), likes: null, comments: null, views: null, recent: 0 };
}

export async function fetchIg(username: string): Promise<IgStats> {
  const user = cleanIgUser(username);
  if (!user) throw new Error('Informe o @ do Instagram.');
  const a = await viaApi(user).catch((e) => {
    if (/não encontrado/.test(e.message)) throw e;
    return null;
  });
  if (a) return a;
  const b = await viaPage(user).catch((e) => {
    if (/não encontrado/.test(e.message)) throw e;
    return null;
  });
  if (b) return b;
  throw new Error('O Instagram não respondeu agora (limite temporário). Tento de novo mais tarde.');
}

const todaySP = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

/** Lê o perfil e grava a foto do dia (substitui a do mesmo dia). */
export async function snapshotProfile(p: { id: string; username: string }, source = 'auto') {
  try {
    const s = await fetchIg(p.username);
    await db()
      .from('ig_snapshots')
      .upsert({ profile_id: p.id, day: todaySP(), followers: s.followers, following: s.following, posts: s.posts, likes: s.likes, comments: s.comments, recent: s.recent, views: s.views, source }, { onConflict: 'profile_id,day' });
    await db()
      .from('ig_profiles')
      .update({ last_fetch_at: new Date().toISOString(), last_error: s.private ? 'Perfil privado: só os números gerais aparecem.' : null, ...(s.full_name ? { full_name: s.full_name } : {}), ...(s.pic ? { pic_url: s.pic } : {}) })
      .eq('id', p.id);
    return s;
  } catch (e: any) {
    await db().from('ig_profiles').update({ last_fetch_at: new Date().toISOString(), last_error: String(e?.message || e).slice(0, 200) }).eq('id', p.id);
    throw e;
  }
}

/** Robô: uma leitura por perfil por dia, espaçada (não chama atenção do Instagram). */
export async function trackInstagramDaily(max = 3) {
  const day = todaySP();
  const { data: profs } = await db().from('ig_profiles').select('id,username,last_fetch_at').eq('active', true).order('last_fetch_at', { ascending: true, nullsFirst: true }).limit(50);
  const { data: done } = await db().from('ig_snapshots').select('profile_id').eq('day', day).in('profile_id', (profs || []).map((p: any) => p.id));
  const has = new Set((done || []).map((x: any) => x.profile_id));
  let n = 0;
  for (const p of profs || []) {
    if (n >= max) break;
    if (has.has(p.id)) continue;
    // deu erro há pouco: espera 2h para tentar de novo
    if (p.last_fetch_at && Date.now() - new Date(p.last_fetch_at).getTime() < 2 * 3600_000) continue;
    n++;
    await snapshotProfile(p).catch(() => {});
    await new Promise((r) => setTimeout(r, 4000 + Math.random() * 6000));
  }
  return n;
}
