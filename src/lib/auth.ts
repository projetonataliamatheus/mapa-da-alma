// Login do painel: senha com scrypt + cookie de sessão assinado (HMAC).
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'

export function hashSenha(senha: string): string {
  const sal = randomBytes(16).toString('hex')
  return `${sal}:${scryptSync(senha, sal, 64).toString('hex')}`
}

export function conferirSenha(senha: string, hash: string): boolean {
  const [sal, h] = String(hash || '').split(':')
  if (!sal || !h) return false
  const a = scryptSync(senha, sal, 64), b = Buffer.from(h, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

const segredo = () => {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) throw new Error('Falta SESSION_SECRET (mínimo 16 caracteres)')
  return s
}
const assinar = (v: string) => createHmac('sha256', segredo()).update(v).digest('base64url')

/** Cria o valor do cookie: id.expira.assinatura (vale 14 dias). */
export function criarSessao(adminId: string): string {
  const exp = Date.now() + 14 * 864e5
  const corpo = `${adminId}.${exp}`
  return `${corpo}.${assinar(corpo)}`
}

export function lerSessao(cookie?: string): string | null {
  if (!cookie) return null
  const m = /(?:^|;\s*)sessao=([^;]+)/.exec(cookie)
  if (!m) return null
  const [id, exp, sig] = decodeURIComponent(m[1]).split('.')
  if (!id || !exp || !sig) return null
  const esperado = assinar(`${id}.${exp}`)
  if (sig.length !== esperado.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null
  if (Number(exp) < Date.now()) return null
  return id
}

export const cookieSessao = (valor: string) =>
  `sessao=${encodeURIComponent(valor)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${14 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
export const cookieSair = 'sessao=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
