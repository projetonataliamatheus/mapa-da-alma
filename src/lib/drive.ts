/**
 * Google Drive como backup dos clientes (login da própria conta Google da empresa, via OAuth).
 * Escopo "drive.file": o sistema só enxerga as pastas e arquivos que ele mesmo criou.
 * O token fica na tabela integrations (só o servidor lê).
 */
import { admin } from './supabase/admin';
import { appBase } from './util';

const db = () => admin();
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER = 'application/vnd.google-apps.folder';
const GDOC = 'application/vnd.google-apps.document';

export function oauthConfigured() {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri() {
  return `${appBase()}/api/google/drive/callback`;
}

export function authUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPE + ' openid email',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function getDriveIntegration(): Promise<any | null> {
  const { data, error } = await db().from('integrations').select('*').eq('key', 'google_drive').maybeSingle();
  if (error) return null;
  return data?.data || null;
}

async function saveIntegration(data: any) {
  await db().from('integrations').upsert({ key: 'google_drive', data, updated_at: new Date().toISOString() });
}

/** Troca o código do login do Google pelo token permanente e cria a pasta raiz. */
export async function finishOAuth(code: string) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '', client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '', redirect_uri: redirectUri(), grant_type: 'authorization_code' }),
  });
  const j: any = await r.json();
  if (!r.ok || !j.refresh_token) throw new Error(j.error_description || j.error || 'O Google não devolveu a autorização. Tente conectar de novo.');
  if (j.scope && !String(j.scope).includes('drive.file'))
    throw new Error('A permissão do Google Drive não foi marcada. Clique em Conectar de novo e, na tela do Google, marque a caixa de acesso ao Drive (ou "Selecionar tudo").');
  let email = '';
  try {
    email = JSON.parse(Buffer.from(String(j.id_token || '').split('.')[1] || '', 'base64').toString()).email || '';
  } catch {}
  const prev = (await getDriveIntegration()) || {};
  await saveIntegration({ ...prev, refresh_token: j.refresh_token, email, connected_at: new Date().toISOString(), error: null });
  token = null;
  await ensureRoot();
  return email;
}

export async function disconnectDrive() {
  const cur = await getDriveIntegration();
  if (cur?.refresh_token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(cur.refresh_token)}`, { method: 'POST' }).catch(() => {});
  await saveIntegration({ root_id: cur?.root_id || null, root_url: cur?.root_url || null, disconnected_at: new Date().toISOString() });
  token = null;
}

let token: { value: string; until: number } | null = null;

async function accessToken() {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const cur = await getDriveIntegration();
  if (!cur?.refresh_token) throw new Error('Google Drive não conectado. Conecte em Produção › Google Drive.');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '', client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '', refresh_token: cur.refresh_token, grant_type: 'refresh_token' }),
  });
  const j: any = await r.json();
  if (!r.ok) {
    const msg = j.error === 'invalid_grant' ? 'A autorização do Google Drive expirou ou foi removida. Conecte de novo em Produção › Google Drive.' : j.error_description || j.error || 'Falha no login do Google';
    await saveIntegration({ ...cur, error: msg });
    throw new Error(msg);
  }
  token = { value: j.access_token, until: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return token.value;
}

async function g(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${await accessToken()}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(180_000) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Google Drive ${r.status}: ${t.slice(0, 240)}`);
  }
  return r;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
export const safeName = (s: string) => String(s || '').replace(/[\\/:*?"<>|#%{}~]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Sem nome';

/** Cria a pasta (ou reaproveita uma com o mesmo nome dentro da mesma pasta). */
export async function folder(name: string, parent?: string | null): Promise<{ id: string; url: string }> {
  const q = `name='${esc(name)}' and mimeType='${FOLDER}' and trashed=false` + (parent ? ` and '${parent}' in parents` : '');
  const found: any = await (await g(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,webViewLink)&pageSize=1`)).json();
  if (found.files?.[0]) return { id: found.files[0].id, url: found.files[0].webViewLink };
  const r: any = await (
    await g('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER, parents: parent ? [parent] : undefined }),
    })
  ).json();
  return { id: r.id, url: r.webViewLink };
}

/** Envia um arquivo (qualquer tamanho; upload em partes). asDoc converte HTML em Google Docs. */
export async function upload(name: string, mime: string, data: Buffer, parent: string, asDoc = false): Promise<{ id: string; url: string }> {
  const meta: any = { name, parents: [parent] };
  if (asDoc) meta.mimeType = GDOC;
  const start = await g('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(data.length) },
    body: JSON.stringify(meta),
  });
  const loc = start.headers.get('location');
  if (!loc) throw new Error('O Google Drive não abriu o envio do arquivo.');
  const r: any = await (await g(loc, { method: 'PUT', headers: { 'Content-Type': mime }, body: new Uint8Array(data) as any })).json();
  return { id: r.id, url: r.webViewLink };
}

/** Troca o conteúdo de um Google Docs (o link continua o mesmo). */
export async function updateDoc(id: string, html: string) {
  const r: any = await (
    await g(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&fields=id,webViewLink`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      body: html,
    })
  ).json();
  return { id: r.id, url: r.webViewLink };
}

export async function exists(id: string) {
  try {
    const r: any = await (await g(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`)).json();
    return !r.trashed;
  } catch {
    return false;
  }
}

/** Pasta raiz de todos os clientes no Drive da empresa. */
export async function ensureRoot() {
  const cur = (await getDriveIntegration()) || {};
  if (cur.root_id && (await exists(cur.root_id))) return { id: cur.root_id as string, url: cur.root_url as string };
  const name = process.env.DRIVE_ROOT_NAME || 'Radar de Vendas - Clientes';
  const f = await folder(name, null);
  await saveIntegration({ ...cur, root_id: f.id, root_url: f.url });
  return f;
}

export async function driveReady() {
  if (!oauthConfigured()) return false;
  const cur = await getDriveIntegration();
  return !!cur?.refresh_token;
}
