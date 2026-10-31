// Cliente mínimo do Supabase (PostgREST + Storage) usando fetch. Sem dependências.

const url = () => {
  const u = process.env.SUPABASE_URL
  if (!u) throw new Error('Banco não configurado: falta SUPABASE_URL')
  return u.replace(/\/$/, '')
}
const key = () => {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!k) throw new Error('Banco não configurado: falta SUPABASE_SERVICE_ROLE_KEY')
  return k
}
const headers = (extra: Record<string, string> = {}) => ({
  apikey: key(), Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...extra,
})

async function req(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const r = await fetch(url() + path, { ...init, headers: headers(init.headers), signal: AbortSignal.timeout(30_000) })
  const text = await r.text()
  if (!r.ok) throw new Error(`Banco ${r.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

const enc = encodeURIComponent

/** Monta filtros PostgREST: { id: 'eq.123', status: 'in.(a,b)' } */
function qs(params: Record<string, string | number | undefined>) {
  return Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${enc(k)}=${enc(String(v))}`).join('&')
}

export const db = {
  /** Lista linhas. filtros no formato PostgREST, ex.: { cliente_id: 'eq.x', order: 'criado_em.desc', limit: 50 } */
  select: <T = any>(tabela: string, filtros: Record<string, string | number | undefined> = {}, select = '*'): Promise<T[]> =>
    req(`/rest/v1/${tabela}?${qs({ select, ...filtros })}`),
  one: async <T = any>(tabela: string, filtros: Record<string, string | number | undefined>, select = '*'): Promise<T | null> =>
    (await req(`/rest/v1/${tabela}?${qs({ select, ...filtros, limit: 1 })}`))[0] ?? null,
  insert: async <T = any>(tabela: string, dados: any): Promise<T> =>
    (await req(`/rest/v1/${tabela}`, { method: 'POST', body: JSON.stringify(dados), headers: { Prefer: 'return=representation' } }))[0],
  upsert: async <T = any>(tabela: string, dados: any, conflito: string): Promise<T> =>
    (await req(`/rest/v1/${tabela}?on_conflict=${enc(conflito)}`, { method: 'POST', body: JSON.stringify(dados), headers: { Prefer: 'return=representation,resolution=merge-duplicates' } }))[0],
  update: async <T = any>(tabela: string, filtros: Record<string, string>, dados: any): Promise<T[]> =>
    req(`/rest/v1/${tabela}?${qs(filtros)}`, { method: 'PATCH', body: JSON.stringify(dados), headers: { Prefer: 'return=representation' } }),
  remove: (tabela: string, filtros: Record<string, string>) => req(`/rest/v1/${tabela}?${qs(filtros)}`, { method: 'DELETE' }),
  count: async (tabela: string, filtros: Record<string, string | number | undefined> = {}): Promise<number> => {
    const r = await fetch(`${url()}/rest/v1/${tabela}?${qs({ select: 'id', ...filtros, limit: 1 })}`, { headers: headers({ Prefer: 'count=exact' }) })
    const range = r.headers.get('content-range') || '*/0'
    return Number(range.split('/')[1]) || 0
  },
  /** Chama uma função SQL (rpc). */
  rpc: <T = any>(fn: string, args: any = {}): Promise<T> => req(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }),
}

/** Arquivos (PDFs) no Supabase Storage, bucket privado "pdfs". */
export const storage = {
  put: async (caminho: string, dados: Buffer, tipo = 'application/pdf') => {
    const r = await fetch(`${url()}/storage/v1/object/pdfs/${caminho}`, {
      method: 'POST', body: dados, headers: { apikey: key(), Authorization: `Bearer ${key()}`, 'Content-Type': tipo, 'x-upsert': 'true' },
    })
    if (!r.ok) throw new Error('Storage: ' + r.status + ' ' + (await r.text()).slice(0, 200))
    return caminho
  },
  get: async (caminho: string): Promise<Buffer | null> => {
    const r = await fetch(`${url()}/storage/v1/object/pdfs/${caminho}`, { headers: { apikey: key(), Authorization: `Bearer ${key()}` } })
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null
  },
}

/** Configurações (tabela config: chave/valor jsonb) com cache curto. */
let cache: { at: number; dados: Record<string, any> } | null = null
export async function config(): Promise<Record<string, any>> {
  if (cache && Date.now() - cache.at < 15_000) return cache.dados
  const linhas = await db.select<{ chave: string; valor: any }>('config')
  cache = { at: Date.now(), dados: Object.fromEntries(linhas.map(l => [l.chave, l.valor])) }
  return cache.dados
}
export async function salvarConfig(chave: string, valor: any) {
  await db.upsert('config', { chave, valor }, 'chave')
  cache = null
}
