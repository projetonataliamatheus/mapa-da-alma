/** Funções pequenas usadas pelo painel, pela API e pelo robô. */

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Partes da data/hora em São Paulo. */
export function spNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const dows: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(g('hour')) % 24;
  return {
    date: `${g('year')}-${g('month')}-${g('day')}`,
    dow: dows[g('weekday')],
    minutes: hour * 60 + Number(g('minute')),
    hhmm: `${String(hour).padStart(2, '0')}:${g('minute')}`,
  };
}

/** Início do dia de hoje (São Paulo) em ISO. */
export function startOfTodayISO() {
  return `${spNow().date}T00:00:00-03:00`;
}

export function toMinutes(hhmm: string) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function inBusinessHours(hours: { start: string; end: string; days: number[] }, d = new Date()) {
  const n = spNow(d);
  if (!hours.days.includes(n.dow)) return false;
  return n.minutes >= toMinutes(hours.start) && n.minutes < toMinutes(hours.end);
}

export function brl(v: number | null | undefined) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function norm(s: string) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Distância em km entre dois pontos. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Quantos dias desde uma data. */
export function daysSince(iso: string | null | undefined) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Endereço base do painel (só "https://dominio"), mesmo se APP_URL vier com caminho ou barra no fim. */
export function appBase(raw = process.env.APP_URL || '') {
  const t = String(raw || '').trim();
  if (!t) return '';
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).origin;
  } catch {
    return t.replace(/\/+$/, '');
  }
}
