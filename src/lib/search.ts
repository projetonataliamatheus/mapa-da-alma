import { admin } from './supabase/admin';
import { geocode, searchPlaces } from './places';
import { analyzeWebsite, instagramFromUrl } from './website';
import { toWhatsapp, waKey } from './phone';
import { computeScore } from './score';
import { getSettings } from './settings';
import { haversineKm, mapLimit } from './util';
import { logEvent } from './engine';

export type SearchInput = {
  niche: string;
  city: string;
  radius: number;
  qty: number;
  noSite?: boolean;
  needWa?: boolean;
  needIg?: boolean;
};

/** Busca no Google Maps, analisa cada negócio, pontua e salva como leads. */
export async function runSearch(input: SearchInput, userId: string | null) {
  const db = admin();
  const settings = await getSettings(db);
  const niche = input.niche.trim();
  const city = input.city.trim();
  const radius = Math.max(1, Math.min(50, Number(input.radius) || 10));
  const qty = Number(input.qty) === 50 ? 50 : 20;

  const center = await geocode(city);
  const places = await searchPlaces(niche, city, center, radius, qty * 2);

  const inRadius = places
    .map((p) => ({ p, dist: p.location ? haversineKm(center, { lat: p.location.latitude, lng: p.location.longitude }) : 999 }))
    .filter((x) => x.dist <= radius * 1.1);

  const { data: blocked } = await db.from('blocked_phones').select('wa_key');
  const blockedSet = new Set((blocked || []).map((b: any) => b.wa_key));

  const analyzed = await mapLimit(inRadius, 6, async ({ p, dist }) => {
    const site = await analyzeWebsite(p.websiteUri);
    const whatsapp = toWhatsapp(p.nationalPhoneNumber || p.internationalPhoneNumber) || site.whatsapp;
    const instagram = site.instagram || (p.websiteUri ? instagramFromUrl(p.websiteUri) : null);
    const base = {
      site_status: site.status,
      reviews: p.userRatingCount || 0,
      rating: p.rating ?? null,
      photos: (p.photos || []).length,
      has_hours: !!p.regularOpeningHours,
      whatsapp,
      instagram,
    };
    const { score, parts } = computeScore(base as any, settings.weights);
    return {
      place_id: p.id,
      name: p.displayName?.text || 'Sem nome',
      niche,
      city: city.split(',')[0].trim(),
      address: p.formattedAddress || null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      distance_km: Math.round(dist * 10) / 10,
      phone: p.nationalPhoneNumber || null,
      whatsapp,
      wa_key: waKey(whatsapp),
      instagram,
      website: p.websiteUri || null,
      site_status: site.status,
      site_reasons: site.reasons,
      rating: p.rating ?? null,
      reviews: p.userRatingCount || 0,
      photos: (p.photos || []).length,
      has_hours: !!p.regularOpeningHours,
      maps_url: p.googleMapsUri || null,
      score,
      score_parts: parts,
    };
  });

  let rows = analyzed.filter((r) => !(r.wa_key && blockedSet.has(r.wa_key)));
  if (input.noSite) rows = rows.filter((r) => r.site_status === 'nenhum');
  if (input.needWa) rows = rows.filter((r) => r.whatsapp);
  if (input.needIg) rows = rows.filter((r) => r.instagram);
  rows.sort((a, b) => b.score - a.score);
  rows = rows.slice(0, qty);

  const { data: search } = await db
    .from('searches')
    .insert({ niche, city, radius_km: radius, qty, filters: { noSite: !!input.noSite, needWa: !!input.needWa, needIg: !!input.needIg }, center_lat: center.lat, center_lng: center.lng, found: rows.length, created_by: userId })
    .select('*')
    .single();

  // não sobrescreve o andamento de leads que já existiam
  const ids = rows.map((r) => r.place_id);
  const { data: existing } = ids.length ? await db.from('leads').select('id,place_id').in('place_id', ids) : { data: [] as any[] };
  const existingSet = new Set((existing || []).map((e: any) => e.place_id));
  const fresh = rows.filter((r) => !existingSet.has(r.place_id)).map((r) => ({ ...r, search_id: search.id, steps: ['maps', 'valid'], summary: 'Encontrado na busca. Ainda sem conversa.', next_step: 'Enviar para a fila de abordagem.' }));
  if (fresh.length) await db.from('leads').insert(fresh);
  for (const r of rows.filter((r) => existingSet.has(r.place_id))) {
    await db.from('leads').update({ score: r.score, score_parts: r.score_parts, rating: r.rating, reviews: r.reviews, photos: r.photos, site_status: r.site_status, site_reasons: r.site_reasons }).eq('place_id', r.place_id);
  }

  const { data: saved } = ids.length ? await db.from('leads').select('*').in('place_id', ids) : { data: [] as any[] };
  const result = (saved || []).sort((a: any, b: any) => b.score - a.score);
  const noSite = result.filter((r: any) => r.site_status === 'nenhum').length;
  await logEvent(null, 'search', 'gg', `Busca concluída: ${result.length} "${niche}" em ${city} (raio ${radius} km)`, { search_id: search.id, noSite });
  return { search, leads: result, newCount: fresh.length };
}
