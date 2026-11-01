// @ts-nocheck
/** Compara a senha digitada com o hash que o servidor manda (a senha em texto não sai do servidor). */
export async function pwMatch(input: string, stored?: string | null) {
  if (!stored) return true;
  if (!stored.startsWith('sha256:')) return input === stored;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return 'sha256:' + hex === stored;
}
