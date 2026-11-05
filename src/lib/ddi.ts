// País pelo DDI do WhatsApp (sem dependências do servidor: serve para o painel inteiro).
export interface PaisDDI { iso: string; nome: string; ddi: string }
export const PAISES_DDI: PaisDDI[] = [
  { iso: 'BR', nome: 'Brasil', ddi: '55' }, { iso: 'AR', nome: 'Argentina', ddi: '54' }, { iso: 'CL', nome: 'Chile', ddi: '56' },
  { iso: 'CO', nome: 'Colombia', ddi: '57' }, { iso: 'PE', nome: 'Perú', ddi: '51' }, { iso: 'PY', nome: 'Paraguay', ddi: '595' },
  { iso: 'BO', nome: 'Bolivia', ddi: '591' }, { iso: 'UY', nome: 'Uruguay', ddi: '598' }, { iso: 'EC', nome: 'Ecuador', ddi: '593' },
  { iso: 'MX', nome: 'México', ddi: '52' }, { iso: 'VE', nome: 'Venezuela', ddi: '58' }, { iso: 'US', nome: 'Estados Unidos', ddi: '1' },
  { iso: 'ES', nome: 'España', ddi: '34' }, { iso: 'PT', nome: 'Portugal', ddi: '351' }, { iso: 'PA', nome: 'Panamá', ddi: '507' },
  { iso: 'CR', nome: 'Costa Rica', ddi: '506' }, { iso: 'DO', nome: 'Rep. Dominicana', ddi: '1809' }, { iso: 'GT', nome: 'Guatemala', ddi: '502' },
]
const ORDEM = [...PAISES_DDI].sort((a, b) => b.ddi.length - a.ddi.length)
export const nomePais = (iso?: string | null) => PAISES_DDI.find((p) => p.iso === String(iso || '').toUpperCase())?.nome || (iso ? String(iso) : 'Outro')
/** ISO do país a partir do número (ou null se não reconhece). */
export function paisDoWhatsapp(w?: string | null): string | null {
  const d = String(w || '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('55') && d.length >= 12) return 'BR'
  return ORDEM.find((p) => d.startsWith(p.ddi))?.iso || null
}
/** País do registro: o salvo no lead ou, se faltar, o do DDI. */
export const paisDoLeadRow = (l: any): string | null => (l?.pais && /^[A-Za-z]{2}$/.test(l.pais) ? String(l.pais).toUpperCase() : paisDoWhatsapp(l?.whatsapp))
