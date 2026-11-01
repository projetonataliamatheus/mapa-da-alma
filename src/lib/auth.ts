// Login do painel pelo Supabase Auth (igual ao Radar).
// Os acessos ficam em Supabase → Authentication → Users.

const base = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const chave = () => process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function auth(path: string, init: { method?: string; body?: any; token?: string } = {}) {
  const r = await fetch(base() + '/auth/v1' + path, {
    method: init.method || 'GET', signal: AbortSignal.timeout(20_000),
    headers: { apikey: chave(), Authorization: `Bearer ${init.token || chave()}`, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const t = await r.text()
  let j: any = null
  try { j = t ? JSON.parse(t) : null } catch { j = { raw: t } }
  return { ok: r.ok, status: r.status, dados: j }
}

export interface Sessao { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }
export interface Usuario { id: string; email: string; nome?: string }

const traduz = (m: string) => /invalid login/i.test(m) ? 'E-mail ou senha incorretos'
  : /not confirmed/i.test(m) ? 'E-mail ainda não confirmado no Supabase'
  : /already been registered|already registered|exists/i.test(m) ? 'Esse e-mail já tem acesso'
  : /password/i.test(m) ? 'Senha fraca: use pelo menos 8 caracteres'
  : m

/** Entra com e-mail e senha. */
export async function entrar(email: string, senha: string): Promise<{ sessao?: Sessao; erro?: string }> {
  const r = await auth('/token?grant_type=password', { method: 'POST', body: { email, password: senha } })
  if (!r.ok) return { erro: traduz(r.dados?.error_description || r.dados?.msg || r.dados?.message || 'Não foi possível entrar') }
  return { sessao: r.dados }
}

/** Troca o refresh token por uma sessão nova. */
export async function renovar(refresh: string): Promise<Sessao | null> {
  const r = await auth('/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refresh } })
  return r.ok ? r.dados : null
}

const cache = new Map<string, { u: Usuario; ate: number }>()
/** Confere o token no Supabase (com cache de 1 minuto). */
export async function usuarioDoToken(token?: string | null): Promise<Usuario | null> {
  if (!token) return null
  const c = cache.get(token)
  if (c && c.ate > Date.now()) return c.u
  const r = await auth('/user', { token })
  if (!r.ok || !r.dados?.id) { cache.delete(token); return null }
  const u = { id: r.dados.id, email: r.dados.email, nome: r.dados.user_metadata?.nome }
  cache.set(token, { u, ate: Date.now() + 60_000 })
  if (cache.size > 500) cache.clear()
  return u
}

export async function sair(token?: string | null) {
  if (token) { cache.delete(token); await auth('/logout', { method: 'POST', token }).catch(() => {}) }
}

/* -------- administração dos acessos (chave service_role) -------- */
export async function listarUsuarios(): Promise<Usuario[]> {
  const r = await auth('/admin/users?per_page=100')
  if (!r.ok) throw new Error('Supabase Auth: ' + (r.dados?.msg || r.dados?.message || r.status))
  return (r.dados?.users || []).map((u: any) => ({ id: u.id, email: u.email, nome: u.user_metadata?.nome }))
}

export async function existeUsuario(): Promise<boolean> {
  const r = await auth('/admin/users?per_page=1')
  if (!r.ok) throw new Error('Supabase Auth: ' + (r.dados?.msg || r.dados?.message || r.status))
  return (r.dados?.users || []).length > 0
}

export async function criarUsuario(email: string, senha: string, nome: string): Promise<{ erro?: string }> {
  const r = await auth('/admin/users', { method: 'POST', body: { email, password: senha, email_confirm: true, user_metadata: { nome } } })
  return r.ok ? {} : { erro: traduz(r.dados?.msg || r.dados?.message || 'Não foi possível criar o acesso') }
}

export async function removerUsuario(id: string) {
  await auth(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/* -------- cookies -------- */
const seguro = () => (process.env.NODE_ENV === 'production' ? '; Secure' : '')
export const cookiesSessao = (s: Sessao) => [
  `sb_access=${encodeURIComponent(s.access_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${s.expires_in || 3600}${seguro()}`,
  `sb_refresh=${encodeURIComponent(s.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${seguro()}`,
]
export const cookiesSair = [
  'sb_access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  'sb_refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
]
export function lerCookie(cookie: string | undefined, nome: string): string | null {
  const m = new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`).exec(cookie || '')
  return m ? decodeURIComponent(m[1]) : null
}
