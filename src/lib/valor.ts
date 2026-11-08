/**
 * TRAVA DE VALOR e de SAUDAÇÃO — regras que não dependem da IA "lembrar":
 * 1) nenhum valor em dinheiro pode sair numa mensagem se não for o preço oficial (US$ 10) ou a conversão dele pelo câmbio do dia;
 * 2) quem já está conversando não recebe um novo "¡Hola!" no meio do atendimento.
 */
import { taxas, MOEDAS } from './cambio';

const MARCA = '(?:US\\$|USD|COP|MXN|ARS|CLP|PEN|UYU|BOB|PYG|CRC|GTQ|DOP|EUR|€|\\$)';
const MOEDA_PALAVRA = '(?:d[oó]lares?|pesos?|soles?|usd|bolivianos?|guaran[ií]es|colones|quetzales|euros?)';
const RE_VALOR = new RegExp(`${MARCA}\\s?(\\d[\\d.,]*)|(\\d[\\d.,]*)\\s?${MOEDA_PALAVRA}`, 'gi');

function numero(s: string): number {
  let t = s.replace(/[.,]+$/, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  return Number(t);
}

/** Valores em dinheiro citados no texto (já como número). */
export function valoresCitados(texto: string): number[] {
  const out: number[] = [];
  for (const m of texto.matchAll(RE_VALOR)) {
    const n = numero(m[1] || m[2] || '');
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

/** Devolve os valores citados que NÃO são o preço oficial (usd) nem a conversão dele em alguma moeda da tabela (±8%). */
export async function valoresInvalidos(partes: string[], usd: number): Promise<number[]> {
  const t = await taxas();
  const cheio = 19; // preço "de" da promoção (de US$ 19 por US$ 10): também é permitido citar
  const permitidos = [usd, cheio, ...Object.keys(MOEDAS).flatMap((k) => [usd * (t.taxas[k] || 0), cheio * (t.taxas[k] || 0)]).filter((v) => v > 0)];
  const ruins: number[] = [];
  for (const p of partes) {
    for (const v of valoresCitados(p)) {
      if (!permitidos.some((a) => Math.abs(v - a) <= a * 0.08 + 0.01)) ruins.push(v);
    }
  }
  return ruins;
}

const SAUDACAO = /^[¡!\s]*(hola|buenas( tardes| noches| d[ií]as)?|buen d[ií]a|buenos d[ií]as|oi+|ol[aá]|bom dia|boa tarde|boa noite)(,?\s+\p{Lu}\p{L}+)?\s*[!.,:]+\s*/iu;

/** Tira o "¡Hola!"/"Oi!" do começo do balão (usar só quando já há conversa em andamento). */
export function semSaudacao(p: string): string {
  const r = p.replace(SAUDACAO, '').trim();
  if (r.replace(/[^\p{L}]/gu, '').length < 8) return p; // só era a saudação: não zera o balão por aqui
  return r.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}
