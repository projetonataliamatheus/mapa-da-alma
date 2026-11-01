/**
 * Horários:
 * - ATENDIMENTO (settings.hours / reply_24h): quando a IA RESPONDE quem escreveu.
 * - COMERCIAL (settings.commercial, por dia da semana): quando o sistema PODE CHAMAR por conta própria
 *   (follow-up, recuperação, prospecção, retomar quem escreveu de madrugada). Nunca cedo demais.
 * Fuso: Brasília (UTC−3, sem horário de verão).
 */
import { inBusinessHours, spNow } from './util';

export type DayHours = { on: boolean; start: string; end: string };
export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DEFAULT_COMMERCIAL: Record<string, DayHours> = {
  '0': { on: false, start: '10:00', end: '14:00' },
  '1': { on: true, start: '09:00', end: '18:00' },
  '2': { on: true, start: '09:00', end: '18:00' },
  '3': { on: true, start: '09:00', end: '18:00' },
  '4': { on: true, start: '09:00', end: '18:00' },
  '5': { on: true, start: '09:00', end: '18:00' },
  '6': { on: true, start: '09:00', end: '13:00' },
};

const toMin = (t: string) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function commercialOf(settings: any): Record<string, DayHours> {
  const c = settings?.commercial || {};
  const out: Record<string, DayHours> = {};
  for (let d = 0; d < 7; d++) out[d] = { ...DEFAULT_COMMERCIAL[d], ...(c[d] || {}) };
  return out;
}

/** A IA está no horário de ATENDIMENTO (responde quem escreveu)? */
export function inService(settings: any, d = new Date()) {
  return settings?.reply_24h === true || inBusinessHours(settings.hours, d);
}

/** Está no horário COMERCIAL (pode chamar por conta própria)? */
export function inCommercial(settings: any, d = new Date()) {
  const n = spNow(d);
  const day = commercialOf(settings)[n.dow];
  return !!day?.on && n.minutes >= toMin(day.start) && n.minutes < toMin(day.end);
}

/** Próximo início do horário comercial (agora mesmo, se já estiver dentro). */
export function nextCommercialStart(settings: any, from = new Date()): Date {
  if (inCommercial(settings, from)) return from;
  const c = commercialOf(settings);
  for (let i = 0; i < 8; i++) {
    const day = new Date(from.getTime() + i * 86400000);
    const n = spNow(day);
    const h = c[n.dow];
    if (!h?.on) continue;
    const start = new Date(`${n.date}T${h.start.padStart(5, '0')}:00-03:00`);
    if (start.getTime() > from.getTime()) return start;
    // hoje ainda dentro do dia, mas já passou do fim: tenta amanhã
  }
  return new Date(from.getTime() + 12 * 3600000);
}

/** Texto curto para o painel: "08:00 às 19:00 (seg a sáb)" */
export function serviceLabel(settings: any) {
  if (settings?.reply_24h === true) return '24 horas';
  const h = settings?.hours || {};
  const short = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const days: number[] = (h.days || []).slice().sort();
  const seq = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return `${h.start} às ${h.end} (${seq ? `${short[days[0]]} a ${short[days[days.length - 1]]}` : days.map((d) => short[d]).join(', ')})`;
}
