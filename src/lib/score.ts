import { DEFAULT_SETTINGS } from './settings';

export type ScoreInput = {
  site_status: 'nenhum' | 'fraco' | 'ok';
  reviews: number;
  rating: number | null;
  photos: number;
  has_hours: boolean;
  whatsapp: string | null;
  instagram: string | null;
};

/** Pontuação de 0 a 100: quanto maior, maior a chance de fechar. */
export function computeScore(x: ScoreInput, w = DEFAULT_SETTINGS.weights) {
  const parts: [string, number][] = [];
  if (x.site_status === 'nenhum') parts.push(['Sem site', w.nosite]);
  else if (x.site_status === 'fraco') parts.push(['Site fraco', w.weak]);
  if (x.reviews < 10) parts.push(['Poucas avaliações', w.fewrev]);
  else if (x.reviews < 30) parts.push(['Avaliações medianas', Math.round(w.fewrev / 2)]);
  if (x.rating !== null && x.rating !== undefined && x.rating > 0 && x.rating < 4.3) parts.push(['Nota baixa', w.lowrate]);
  if (x.photos < 5) parts.push(['Poucas fotos', w.photos]);
  if (!x.has_hours) parts.push(['Ficha incompleta (sem horário)', w.incomplete]);
  // negócio estabelecido (bem avaliado e com movimento) tem dinheiro e clientes: prioridade, principalmente sem site
  const estab = (x.rating || 0) >= 4.3 && x.reviews >= 30;
  if (estab) parts.push([x.site_status === 'nenhum' ? 'Bem avaliado e sem site' : 'Bem avaliado no Google', x.site_status === 'nenhum' ? (w as any).estab ?? 25 : Math.round(((w as any).estab ?? 25) / 2)]);
  if (x.whatsapp) parts.push(['Tem WhatsApp', w.wa]);
  if (x.instagram) parts.push(['Tem Instagram', w.ig]);
  const total = parts.reduce((a, p) => a + p[1], 0);
  return { score: Math.max(0, Math.min(100, Math.round(total))), parts };
}
