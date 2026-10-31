// Tabelas fixas da numerologia. `confirmado: true` = conferido com mapa de referência.
// As demais linhas são a tabela tradicional e serão conferidas com mapas de teste;
// todas podem ser ajustadas no painel (Configurações → Tabelas).

/** Harmonia conjugal, pela Missão. A linha 4 confere com o mapa de referência. */
export const HARMONIA_CONJUGAL: Record<number, { vibra: number[]; atrai: number[]; oposto: number[]; muitoOposto: number[]; passivo: number[]; confirmado?: boolean }> = {
  1: { vibra: [9], atrai: [4, 8], oposto: [6, 7], muitoOposto: [], passivo: [2, 3, 5] },
  2: { vibra: [8], atrai: [7, 9], oposto: [5], muitoOposto: [], passivo: [1, 3, 4, 6] },
  3: { vibra: [7], atrai: [5, 6, 9], oposto: [4, 8], muitoOposto: [], passivo: [1, 2] },
  4: { vibra: [6], atrai: [1, 8], oposto: [3, 5], muitoOposto: [], passivo: [2, 7, 9], confirmado: true },
  5: { vibra: [5], atrai: [3, 9], oposto: [4, 6], muitoOposto: [], passivo: [1, 2, 7, 8] },
  6: { vibra: [4], atrai: [3, 7, 9], oposto: [5], muitoOposto: [], passivo: [1, 2, 8] },
  7: { vibra: [3], atrai: [2, 6], oposto: [1, 9], muitoOposto: [], passivo: [4, 5, 8] },
  8: { vibra: [2], atrai: [1, 4], oposto: [3, 7], muitoOposto: [], passivo: [5, 6, 9] },
  9: { vibra: [1], atrai: [2, 3, 6], oposto: [7, 8], muitoOposto: [], passivo: [4, 5] },
}

/** Dias favoráveis: dias do mês cuja redução cai nestes números, pelo dia de nascimento reduzido. Linha 6 confirmada. */
export const DIAS_BASE: Record<number, { numeros: number[]; confirmado?: boolean }> = {
  1: { numeros: [1, 5] }, 2: { numeros: [2, 4] }, 3: { numeros: [3, 6] }, 4: { numeros: [2, 4] }, 5: { numeros: [1, 5] },
  6: { numeros: [3, 6], confirmado: true }, 7: { numeros: [2, 7] }, 8: { numeros: [4, 8] }, 9: { numeros: [3, 9] },
}

/** Números harmônicos, pelo dia de nascimento reduzido. Linha 6 confirmada. */
export const HARMONICOS: Record<number, { harmoniza: number[]; neutro: number[]; dissonante: number[]; confirmado?: boolean }> = {
  1: { harmoniza: [1, 2, 3, 5, 9], neutro: [4, 6], dissonante: [7, 8] },
  2: { harmoniza: [1, 2, 4, 6, 7], neutro: [3, 9], dissonante: [5, 8] },
  3: { harmoniza: [1, 3, 5, 6, 9], neutro: [2, 7], dissonante: [4, 8] },
  4: { harmoniza: [2, 4, 6, 7, 8], neutro: [1], dissonante: [3, 5, 9] },
  5: { harmoniza: [1, 3, 5, 6, 9], neutro: [2, 8], dissonante: [4, 7] },
  6: { harmoniza: [2, 3, 4, 5, 6, 9], neutro: [1], dissonante: [7, 8], confirmado: true },
  7: { harmoniza: [2, 4, 7], neutro: [1, 5, 6], dissonante: [3, 8, 9] },
  8: { harmoniza: [2, 4, 8], neutro: [1, 6, 7], dissonante: [3, 5, 9] },
  9: { harmoniza: [1, 3, 5, 6, 9], neutro: [2, 7], dissonante: [4, 8] },
}

const red = (n: number) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n }

export function diasFavoraveis(diaNascimento: number): number[] {
  const alvo = DIAS_BASE[red(diaNascimento)].numeros
  const out: number[] = []
  for (let d = 1; d <= 31; d++) if (alvo.includes(red(d))) out.push(d)
  return out
}
