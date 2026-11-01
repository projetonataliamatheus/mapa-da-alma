/**
 * Cofre de senhas (página Acessos): criptografa no servidor com AES-256-GCM.
 * Chave: ACESSOS_KEY (se existir no Easypanel) ou derivada da chave de serviço do Supabase.
 * Cada registro guarda o "kid" (impressão da chave) para avisar com clareza se a chave mudar.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function key() {
  const base = process.env.ACESSOS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error('Cofre sem chave: falta SUPABASE_SERVICE_ROLE_KEY');
  return createHash('sha256').update('radar-acessos:v1:' + base).digest();
}
export function keyId() {
  return createHash('sha256').update(key()).digest('hex').slice(0, 10);
}

export function seal(plain: string) {
  if (!plain) return null;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function open(sealed: string | null, kid?: string | null) {
  if (!sealed) return '';
  if (kid && kid !== keyId()) throw new Error('A chave do cofre mudou desde que esta senha foi salva. Volte a chave antiga (ACESSOS_KEY) ou cadastre a senha de novo.');
  const [v, iv, tag, data] = sealed.split(':');
  if (v !== 'v1') throw new Error('Formato de senha desconhecido');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}
