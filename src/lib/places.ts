import { googleAllowed, recordGoogle } from './usage';
import { sleep } from './util';

const URL_SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.photos,places.regularOpeningHours,places.googleMapsUri,places.businessStatus,nextPageToken';

export function googleKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || '').trim().replace(/^["']|["']$/g, '');
}

/** Traduz os erros do Google em causa + solução, em português. */
export function explainGoogleError(status: number, raw: string) {
  let j: any = {};
  try {
    j = JSON.parse(raw);
  } catch {}
  const err = j.error || {};
  const details = (err.details || []).flatMap((d: any) => [d.reason, d.metadata?.consumer, d.metadata?.service].filter(Boolean)).join(' ');
  const reason = (err.details || []).map((d: any) => d.reason).find(Boolean) || '';
  const msg = String(err.message || raw || '');
  const all = `${reason} ${msg} ${details}`;
  let cause = 'O Google recusou a busca.';
  let fix = 'Confira se a Places API (New) está ativada, se o faturamento está ativo e se a chave não tem restrições.';
  if (/API_KEY_INVALID|API key not valid/i.test(all)) {
    cause = 'A chave do Google está errada ou foi apagada.';
    fix = 'Copie a chave de novo em APIs e serviços › Credenciais e cole em GOOGLE_MAPS_API_KEY no Easypanel (sem aspas e sem espaços). Depois clique em Implantar.';
  } else if (/SERVICE_DISABLED|has not been used|is disabled/i.test(all)) {
    cause = 'A Places API (New) não está ativada no projeto desta chave.';
    fix = 'Abra console.cloud.google.com/apis/library/places.googleapis.com no MESMO projeto da chave e clique em Ativar.';
  } else if (/BILLING|billing/i.test(all)) {
    cause = 'O faturamento do projeto não está ativo.';
    fix = 'Em Faturamento, confira se a conta vinculada está ATIVA (sem pendência de cartão ou verificação). O Google exige faturamento ativo até para a cota gratuita.';
  } else if (/REFERER|referer|referrer/i.test(all)) {
    cause = 'A chave está restrita a sites (referenciadores HTTP), e o robô roda num servidor.';
    fix = 'Na chave, em Restrições de aplicativo, escolha Nenhuma (ou Endereços IP com o IP da VPS: 200.141.27.52).';
  } else if (/IP_ADDRESS|ip address/i.test(all)) {
    cause = 'A chave está restrita a endereços IP e o IP da VPS não está na lista.';
    fix = 'Na chave, em Restrições de aplicativo › Endereços IP, adicione 200.141.27.52, ou escolha Nenhuma.';
  } else if (/API_KEY_SERVICE_BLOCKED|are blocked/i.test(all)) {
    cause = 'A chave tem restrição de API e a Places API (New) não está liberada nela.';
    fix = 'Na chave, em Restrições de API, marque Places API (New) (não só a "Places API" antiga) e salve.';
  } else if (/ANDROID|IOS_|android|ios/i.test(all)) {
    cause = 'A chave está restrita a apps Android/iOS.';
    fix = 'Na chave, em Restrições de aplicativo, escolha Nenhuma.';
  } else if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(all)) {
    cause = 'A cota do Google acabou ou há um limite diário muito baixo.';
    fix = 'Em APIs e serviços › Places API (New) › Cotas, aumente o limite de solicitações por dia.';
  } else if (status === 403) {
    cause = 'O Google negou permissão para esta chave usar a Places API (New), sem informar o motivo.';
    fix =
      'Faça nesta ordem: 1) crie uma chave NOVA em Credenciais (sem nenhuma restrição) e coloque no Easypanel; 2) em Faturamento, confira se a conta está Ativa e sem pendência; 3) abra console.cloud.google.com/google/maps-apis/overview e conclua a ativação do Google Maps Platform se aparecer algum aviso.';
  }
  return { status, reason: reason || err.status || '', message: msg, cause, fix };
}

export class GoogleError extends Error {
  info: ReturnType<typeof explainGoogleError>;
  constructor(info: ReturnType<typeof explainGoogleError>) {
    super(`${info.cause} Como resolver: ${info.fix}`);
    this.info = info;
  }
}

/** Campos de telefone/site/avaliação são do nível Enterprise (cota grátis menor). */
function tierOf(mask: string): 'google_pro' | 'google_ent' {
  return /websiteUri|PhoneNumber|rating|userRatingCount|regularOpeningHours/.test(mask) ? 'google_ent' : 'google_pro';
}

async function textSearch(body: any, mask: string, task = 'busca') {
  const key = googleKey();
  if (!key) throw new Error('Google Maps não configurado: falta GOOGLE_MAPS_API_KEY no Easypanel.');
  const tier = tierOf(mask);
  const gate = await googleAllowed(tier);
  if (!gate.ok)
    throw new Error(`Limite grátis do Google deste mês atingido (${gate.used} de ${gate.cap} consultas). As buscas voltam no dia 1º. Para não pagar nada, o sistema bloqueia aqui; dá para mudar o teto em Custos.`);
  await recordGoogle(tier, task);
  const r = await fetch(URL_SEARCH, {
    signal: AbortSignal.timeout(60_000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new GoogleError(explainGoogleError(r.status, text));
  return JSON.parse(text);
}

/** Teste rápido da chave (usado em Configurações). */
export async function testGoogle() {
  const key = googleKey();
  if (!key) return { ok: false, cause: 'A variável GOOGLE_MAPS_API_KEY está vazia.', fix: 'Cole a chave no Easypanel › radar › painel › Ambiente e clique em Implantar.' };
  const shape = /^AIza[0-9A-Za-z_-]{35}$/.test(key);
  try {
    const j = await textSearch({ textQuery: 'fisioterapeuta em Limeira, SP', languageCode: 'pt-BR', regionCode: 'BR', pageSize: 3 }, 'places.displayName,places.googleMapsUri', 'teste');
    return { ok: true, sample: (j.places || []).map((p: any) => ({ name: p.displayName?.text, url: p.googleMapsUri })), keyShape: shape };
  } catch (e: any) {
    if (e instanceof GoogleError) return { ok: false, ...e.info, keyShape: shape, keyStart: key.slice(0, 6) + '…' };
    return { ok: false, cause: 'Não consegui falar com o Google.', fix: String(e.message || e), keyShape: shape };
  }
}

/** Encontra o centro (latitude/longitude) de uma cidade ou endereço. */
const geoCache = new Map<string, { lat: number; lng: number; address: string }>();
export async function geocode(city: string): Promise<{ lat: number; lng: number; address: string }> {
  const ck = city.trim().toLowerCase();
  if (geoCache.has(ck)) return geoCache.get(ck)!;
  const j = await textSearch({ textQuery: city, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 1 }, 'places.location,places.formattedAddress', 'cidade');
  const p = j.places?.[0];
  if (!p?.location) throw new Error('Não encontrei a cidade "' + city + '". Tente "Cidade, UF".');
  const out = { lat: p.location.latitude, lng: p.location.longitude, address: p.formattedAddress };
  geoCache.set(ck, out);
  return out;
}

export type Place = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: any[];
  regularOpeningHours?: any;
  googleMapsUri?: string;
  businessStatus?: string;
};

/** Busca negócios do nicho perto do centro. Até 3 páginas de 20. */
export async function searchPlaces(niche: string, city: string, center: { lat: number; lng: number }, radiusKm: number, want: number): Promise<Place[]> {
  const out: Place[] = [];
  let token: string | undefined;
  for (let page = 0; page < 3; page++) {
    const body: any = {
      textQuery: `${niche} em ${city}`,
      languageCode: 'pt-BR',
      regionCode: 'BR',
      pageSize: 20,
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(radiusKm * 1000, 50000) } },
    };
    if (token) body.pageToken = token;
    const j = await textSearch(body, MASK);
    out.push(...(j.places || []).filter((p: Place) => p.businessStatus !== 'CLOSED_PERMANENTLY'));
    token = j.nextPageToken;
    if (!token || out.length >= want) break;
    await sleep(1500);
  }
  return out;
}
