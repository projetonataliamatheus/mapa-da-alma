// @ts-nocheck
/** Endereços públicos: usam os subdomínios configurados em Sistema › Domínios (orcamento., relatorio., pagamento.);
 *  sem eles, ficam no próprio sistema (/orcamento/…, /relatorio/…). */
const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');
const dom = (k: string) => (typeof window !== 'undefined' ? (window as any).__LV_DOMAINS?.[k] : null);
const https = (h: string) => `https://${String(h).replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
export const getSalesBaseUrl = () => origin();
export const getQuotesBaseUrl = () => (dom('orcamento') ? https(dom('orcamento')) : origin());
export const getReportsBaseUrl = () => (dom('relatorio') ? https(dom('relatorio')) : origin());
export const getPaymentsBaseUrl = () => (dom('checkout') ? https(dom('checkout')) : origin());
export const getAdminBaseUrl = () => origin();
export const getCheckoutUrl = (slug: string) => (dom('checkout') && /^pagamento\./.test(dom('checkout')) ? `${https(dom('checkout'))}/${slug}` : `${getPaymentsBaseUrl()}/pagar/${slug}`);
export const getSalesPageUrl = (slug?: string) => origin() + (slug ? `/${slug}` : '');
export const getQuoteUrl = (slug: string) => (dom('orcamento') ? `${https(dom('orcamento'))}/${slug}` : `${origin()}/orcamento/${slug}`);
export const getReportUrl = (token: string) => (dom('relatorio') ? `${https(dom('relatorio'))}/${token}` : `${origin()}/relatorio/${token}`);
export const getReportShareUrl = (token: string) => getReportUrl(token);
