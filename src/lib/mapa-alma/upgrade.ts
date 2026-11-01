// Passagem da versão SIMPLES para a COMPLETA (pirâmides no mesmo link). O Master escolhe em Vendas › Mapas e preços:
//   cheio     → paga o preço normal da versão completa
//   diferenca → paga só a diferença entre a completa e o que já pagou na simples
//   fixo      → paga um valor fixo definido pelo Master
export type ModoUpgrade = 'cheio' | 'diferenca' | 'fixo'
export interface ConfigUpgrade { modo: ModoUpgrade; valor?: number | null }

export const UPGRADE_PADRAO: ConfigUpgrade = { modo: 'diferenca', valor: 15 }

/** Cliente que já comprou a versão simples e ainda não tem a completa. */
export const comprouSimples = (lead: any) => lead?.stage === 'pago' && String(lead?.deal_service || '') === 'mapa-pessoal'

/** Preço da passagem para este cliente (null se não se aplica ou se é o preço cheio). */
export function precoUpgrade(lead: any, settings: any, services: any[]): number | null {
  if (!comprouSimples(lead)) return null
  const cfg: ConfigUpgrade = { ...UPGRADE_PADRAO, ...(settings?.mapa_upgrade || {}) }
  const completo = (services || []).find((s: any) => s.slug === 'mapa-completo')
  const cheio = Number(completo?.price_steps?.[0] || completo?.max_price || 0)
  if (cfg.modo === 'fixo' && Number(cfg.valor) > 0) return Math.round(Number(cfg.valor) * 100) / 100
  if (cfg.modo === 'diferenca' && cheio) return Math.max(5, Math.round((cheio - Number(lead?.paid_amount || 0)) * 100) / 100)
  return null
}
