/**
 * VALOR REAL DA KIWIFY: o webhook traz o que o cliente pagou (bruto, em US$) e o que fica para o produtor depois das taxas
 * (campo Commissions). Aqui isso vira: bruto US$, taxa US$, líquido US$ e líquido em R$ (câmbio do dia da venda).
 * payments.amount passa a guardar o LÍQUIDO EM R$ — é ele que soma no financeiro, nas métricas e nos clientes.
 */
import { admin } from './supabase/admin';
import { taxas } from './cambio';

const cents = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && String(v ?? '') !== '' ? n / 100 : null;
};
const arred = (n: number) => Math.round(n * 100) / 100;
/** Parte do líquido quando o webhook não traz Commissions (aprox. observado: ~78% do bruto). Marcado como "estimado". */
export const LIQUIDO_ESTIMADO = 0.78;

export type Liquido = {
  bruto_usd: number | null;
  taxa_usd: number | null;
  liquido_usd: number | null;
  liquido_brl: number | null;
  cambio_brl: number | null;
  origem: 'kiwify' | 'estimado';
  raw: any;
};

export async function liquidoDoEvento(ev: any, brutoPadraoUsd = 10): Promise<Liquido> {
  const c = ev?.Commissions || ev?.commissions || {};
  const moedaCobrada = String(c.currency || c.product_base_price_currency || 'USD').toUpperCase();
  const bruto = cents(c.charge_amount ?? c.product_base_price);
  const moedaLiq = String(c.my_commission_currency || c.currency || c.settlement_amount_currency || moedaCobrada).toUpperCase();
  const liq = cents(c.my_commission);
  const taxa = cents(c.kiwify_fee);
  const liqSettle = cents(c.settlement_amount);
  const moedaSettle = String(c.settlement_amount_currency || '').toUpperCase();

  const t = await taxas().catch(() => null);
  const cambio = t?.taxas?.BRL ? Number(t.taxas.BRL) : null;

  let bruto_usd = moedaCobrada === 'USD' && bruto != null ? bruto : brutoPadraoUsd;
  let liquido_usd: number | null = null;
  let liquido_brl: number | null = null;
  let origem: Liquido['origem'] = 'kiwify';

  if (liq != null && moedaLiq === 'USD') liquido_usd = liq;
  if (liq != null && moedaLiq === 'BRL') liquido_brl = liq; // já veio em reais: exato
  if (liquido_brl == null && liqSettle != null && moedaSettle === 'BRL') liquido_brl = liqSettle;
  if (liquido_usd == null && liquido_brl == null) {
    liquido_usd = arred(bruto_usd * LIQUIDO_ESTIMADO);
    origem = 'estimado';
  }
  if (liquido_brl == null && liquido_usd != null && cambio) liquido_brl = arred(liquido_usd * cambio);
  const taxa_usd = moedaCobrada === 'USD' && taxa != null ? taxa : liquido_usd != null ? arred(bruto_usd - liquido_usd) : null;
  return { bruto_usd, taxa_usd, liquido_usd, liquido_brl, cambio_brl: cambio, origem, raw: c };
}

/** Campos prontos para gravar em payments. */
export const camposLiquido = (l: Liquido, amountAtual: number | null) => ({
  amount: l.liquido_brl ?? amountAtual,
  valor_local: l.bruto_usd,
  moeda: 'USD',
  liquido_usd: l.liquido_usd,
  taxa_usd: l.taxa_usd,
  liquido_brl: l.liquido_brl,
  cambio_brl: l.cambio_brl,
  liquido_origem: l.origem,
  kiwify_raw: l.raw && Object.keys(l.raw).length ? l.raw : null,
});

/** Completa o R$ das vendas Kiwify que têm líquido em US$ mas ainda não têm o valor em reais (ex.: lançadas à mão). */
export async function completarLiquidosKiwify(): Promise<number> {
  const db = admin();
  const { data } = await db.from('payments').select('id,liquido_usd').eq('provider', 'kiwify').eq('status', 'pago').is('liquido_brl', null).not('liquido_usd', 'is', null).limit(50);
  if (!data?.length) return 0;
  const t = await taxas();
  const cambio = Number(t.taxas?.BRL);
  if (!cambio || !t.ao_vivo) return 0;
  for (const p of data) {
    const brl = arred(Number(p.liquido_usd) * cambio);
    await db.from('payments').update({ liquido_brl: brl, cambio_brl: cambio, amount: brl }).eq('id', p.id);
  }
  return data.length;
}
