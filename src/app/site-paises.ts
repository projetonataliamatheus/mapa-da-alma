/** Países do campo WhatsApp dos testes grátis (código ISO, nome, DDI). */
export const PAISES_WA: { c: string; n: string; d: string }[] = [
  { c: 'BR', n: 'Brasil', d: '55' }, { c: 'PT', n: 'Portugal', d: '351' }, { c: 'US', n: 'Estados Unidos', d: '1' },
  { c: 'AR', n: 'Argentina', d: '54' }, { c: 'BO', n: 'Bolivia', d: '591' }, { c: 'CL', n: 'Chile', d: '56' }, { c: 'CO', n: 'Colombia', d: '57' },
  { c: 'CR', n: 'Costa Rica', d: '506' }, { c: 'DO', n: 'República Dominicana', d: '1' }, { c: 'EC', n: 'Ecuador', d: '593' }, { c: 'ES', n: 'España', d: '34' },
  { c: 'GT', n: 'Guatemala', d: '502' }, { c: 'MX', n: 'México', d: '52' }, { c: 'PA', n: 'Panamá', d: '507' }, { c: 'PY', n: 'Paraguay', d: '595' },
  { c: 'PE', n: 'Perú', d: '51' }, { c: 'UY', n: 'Uruguay', d: '598' }, { c: 'VE', n: 'Venezuela', d: '58' },
]
/** Junta DDI + número local e confere o tamanho. Devolve só dígitos (com DDI) ou null. */
export function juntarWhatsapp(ddi: string, local: string): string | null {
  let n = String(local || '').replace(/\D/g, '').replace(/^0+/, '')
  if (n.startsWith(ddi) && n.length > (ddi === '55' ? 11 : 10)) n = n.slice(ddi.length)
  const ok = ddi === '55' ? n.length === 10 || n.length === 11 : n.length >= 6 && n.length <= 13
  return ok ? ddi + n : null
}
