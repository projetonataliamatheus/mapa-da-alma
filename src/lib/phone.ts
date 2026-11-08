/**
 * Telefones brasileiros.
 * toWhatsapp: devolve o número no formato 55DDD9XXXXXXXX quando parece celular (WhatsApp), senão null.
 * waKey: chave de comparação (DDD + 8 últimos dígitos), igual com ou sem o nono dígito.
 */
export function toWhatsapp(raw?: string | null): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  d = d.replace(/^0+/, '');
  if (d.length === 11 && d[2] === '9') return '55' + d;
  if (d.length === 10 && /[6-9]/.test(d[2])) return '55' + d.slice(0, 2) + '9' + d.slice(2);
  return null;
}

export function waKey(raw?: string | null): string | null {
  if (!raw) return null;
  let d = String(raw).split('@')[0].replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  d = d.replace(/^0+/, '');
  if (d.length < 10) return null;
  return d.slice(0, 2) + d.slice(-8);
}

export function formatPhone(raw?: string | null) {
  if (!raw) return '';
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  // celular BR: DDD + 9 + 8 dígitos. Qualquer outra coisa (ex.: 507 6767 6804, Panamá) é número internacional: não formatar como BR
  if (d.length === 11 && d[2] === '9') return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10 && /[2-9]/.test(d[2])) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (/^\d{8,15}$/.test(d)) return `+${String(raw).replace(/\D/g, '')}`;
  return raw;
}
