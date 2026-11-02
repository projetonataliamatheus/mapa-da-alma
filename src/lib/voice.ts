/**
 * Respostas em áudio com a voz clonada de alguém da equipe (ElevenLabs).
 * - Clonagem: 10 a 30 s de gravação viram uma voz (uma vez só).
 * - Cada conversa fica presa a uma voz, do primeiro ao último áudio.
 * - O áudio vai como mensagem de voz gravada (o cliente vê "gravando áudio…").
 * - Teto de uso (padrão 10% das mensagens) para controlar o custo.
 */
import { createHash } from 'crypto';
import { admin } from './supabase/admin';
import { evo } from './evolution';

const db = () => admin();
const API = 'https://api.elevenlabs.io/v1';

export function voiceConfigured() {
  return !!process.env.ELEVENLABS_API_KEY;
}

function key() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('Falta ELEVENLABS_API_KEY no Easypanel (radar › painel › Ambiente).');
  return k;
}

async function eleven(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const r = await fetch(API + path, { ...init, headers: { 'xi-api-key': key(), ...(init.headers || {}) }, signal: AbortSignal.timeout(init.timeoutMs || 60_000) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    let msg = t;
    try {
      const j = JSON.parse(t);
      msg = j?.detail?.message || j?.detail?.status || (typeof j?.detail === 'string' ? j.detail : '') || t;
    } catch {}
    if (r.status === 401) throw new Error('A ElevenLabs recusou a chave. Confira ELEVENLABS_API_KEY no Easypanel.');
    if (/quota|credits|character_limit/i.test(msg)) throw new Error('Os créditos de voz da ElevenLabs acabaram este mês. Os áudios voltam a sair como texto até renovar.');
    if (/can_not_use_instant_voice_cloning|subscription|plan/i.test(msg)) throw new Error('O plano da ElevenLabs não permite clonar voz. Assine o Starter (ou superior).');
    throw new Error(`ElevenLabs ${r.status}: ${String(msg).slice(0, 240)}`);
  }
  return r;
}

/** Cria a voz clonada a partir de uma ou mais gravações. */
export async function cloneVoice(name: string, files: { data: Buffer; name: string; type: string }[], denoise = false) {
  const fd = new FormData();
  fd.append('name', name.slice(0, 60));
  fd.append('description', 'Voz da equipe para atendimento no WhatsApp (Mapa da Alma)');
  // limpar ruído só se a gravação tiver barulho: em gravação limpa ele deixa a voz "abafada" e menos parecida
  fd.append('remove_background_noise', denoise ? 'true' : 'false');
  for (const f of files) fd.append('files', new Blob([new Uint8Array(f.data)], { type: f.type || 'audio/mpeg' }), f.name || 'voz.mp3');
  const r = await eleven('/voices/add', { method: 'POST', body: fd as any, timeoutMs: 120_000 });
  const j: any = await r.json();
  if (!j?.voice_id) throw new Error('A ElevenLabs não devolveu a voz criada.');
  return String(j.voice_id);
}

/** Adiciona mais gravações a uma voz que já existe (quanto mais áudio bom, mais parecida). */
export async function addSamples(voiceId: string, name: string, files: { data: Buffer; name: string; type: string }[], denoise = false) {
  const fd = new FormData();
  fd.append('name', name.slice(0, 60));
  fd.append('remove_background_noise', denoise ? 'true' : 'false');
  for (const f of files) fd.append('files', new Blob([new Uint8Array(f.data)], { type: f.type || 'audio/mpeg' }), f.name || 'voz.mp3');
  await eleven(`/voices/${voiceId}/edit`, { method: 'POST', body: fd as any, timeoutMs: 120_000 });
}

/** Vozes que já existem na conta da ElevenLabs ("Minhas vozes"; com all=true inclui as prontas da ElevenLabs). */
export async function listElevenVoices(all = false) {
  const r = await eleven('/voices?show_legacy=false');
  const j: any = await r.json();
  return (j?.voices || [])
    .filter((v: any) => all || v.category !== 'premade')
    .map((v: any) => ({
      voice_id: String(v.voice_id),
      name: String(v.name || 'Sem nome'),
      category: String(v.category || ''),
      preview_url: v.preview_url || null,
      labels: v.labels || {},
    }));
}

export async function deleteVoice(voiceId: string) {
  await eleven(`/voices/${voiceId}`, { method: 'DELETE' }).catch(() => {});
}

/** Deixa o texto falável: sem emoji, sem "rsrs", com valores ditos por extenso do jeito certo. */
export function speakable(text: string) {
  return String(text || '')
    .replace(/\b(rs){2,}\b|\bkk+\b|\bhaha+\b/gi, '')
    .replace(/R\$\s?([\d.]+)(,(\d{2}))?/g, (_m, int, _c, cents) => `${int.replace(/\./g, '')} reais${cents && cents !== '00' ? ` e ${Number(cents)} centavos` : ''}`)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+([?!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const clamp = (x: any, a: number, b: number) => Math.max(a, Math.min(b, Number(x)));

/** Divide o texto em trechos por frase (~220 caracteres), para a narração não "embolar". */
function chunks(text: string, size = 220) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > size && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Modo NARRAÇÃO (como o audiobook da ElevenLabs): gera frase a frase, passando o trecho anterior e o seguinte
 * para manter o mesmo tom (sem travar nem gaguejar em textos longos), com voz mais estável. Junta tudo num mp3 só.
 */
async function narrate(voiceId: string, text: string, settings: any) {
  const v = settings?.voice || {};
  const parts = chunks(text);
  const bufs: Buffer[] = [];
  let prevIds: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const body: any = {
      text: parts[i],
      model_id: 'eleven_multilingual_v2',
      language_code: 'pt',
      apply_text_normalization: 'on',
      previous_text: parts.slice(Math.max(0, i - 2), i).join(' ') || undefined,
      next_text: parts[i + 1] || undefined,
      ...(prevIds.length ? { previous_request_ids: prevIds.slice(-3) } : {}),
      voice_settings: {
        stability: clamp(v.narr_stability ?? 0.6, 0, 1),
        similarity_boost: clamp(v.similarity ?? 0.85, 0, 1),
        style: 0,
        speed: clamp(v.speed ?? 1, 0.7, 1.2),
        use_speaker_boost: true,
      },
    };
    let r: Response;
    try {
      r = await eleven(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body) });
    } catch (e: any) {
      // conta/modelo que não aceita algum ajuste: tenta o básico
      if (!/language|normalization|previous|next|request_ids|voice_settings/i.test(String(e?.message))) throw e;
      delete body.language_code;
      delete body.apply_text_normalization;
      delete body.previous_request_ids;
      r = await eleven(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body) });
    }
    const rid = r.headers.get('request-id');
    if (rid) prevIds.push(rid);
    bufs.push(Buffer.from(await r.arrayBuffer()));
  }
  // mp3 do mesmo formato pode ser emendado direto
  return Buffer.concat(bufs);
}

/** Texto em áudio (mp3) com a voz escolhida. Modo "narracao" = estilo audiobook (frase a frase, mais estável). */
export async function tts(voiceId: string, text: string, settings: any) {
  const v = settings?.voice || {};
  if (v.mode === 'narracao') return narrate(voiceId, text, settings);
  const body: any = {
    text,
    model_id: v.model || 'eleven_multilingual_v2',
    language_code: 'pt',
    voice_settings: {
      stability: clamp(v.stability ?? 0.45, 0, 1),
      similarity_boost: clamp(v.similarity ?? 0.9, 0, 1),
      style: clamp(v.style ?? 0.1, 0, 1),
      speed: clamp(v.speed ?? 1, 0.7, 1.2),
      use_speaker_boost: true,
    },
    apply_text_normalization: 'on',
  };
  const go = (b: any) => eleven(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(b) });
  let r: Response;
  try {
    r = await go(body);
  } catch (e: any) {
    // modelos que não aceitam escolher o idioma (ou algum ajuste): tenta sem
    if (!/language|style|speed|voice_settings|normalization/i.test(String(e?.message))) throw e;
    delete body.language_code;
    delete body.apply_text_normalization;
    if (/style|speed|voice_settings/i.test(String(e?.message))) {
      delete body.voice_settings.style;
      delete body.voice_settings.speed;
    }
    r = await go(body);
  }
  return Buffer.from(await r.arrayBuffer());
}

/** Registra o consumo (caracteres) para a página de Custos. Starter: ~US$ 5 por 30 mil créditos. */
async function recordVoice(chars: number, model: string, leadId?: string | null) {
  const credits = chars * (/flash|turbo/i.test(model) ? 0.5 : 1); // multilingual v2 e v3: 1 crédito por caractere
  await db()
    .from('usage_log')
    .insert({ kind: 'voz', task: 'audio', model, input_tokens: chars, output_tokens: 0, calls: 1, cost_usd: (credits * 5) / 30000, lead_id: leadId || null })
    .then(() => {}, () => {});
}

/** Voz desta conversa (fixa): a já usada com o cliente, senão a padrão, senão a primeira ativa. */
/** Voz do número de WhatsApp que atende este cliente (e se esse número pode mandar áudio). */
export async function chipVoice(lead: any): Promise<{ on: boolean; id: string | null; agent: string | null }> {
  if (!lead?.number_id) return { on: true, id: null, agent: null };
  const { data } = await db().from('whatsapp_numbers').select('*').eq('id', lead.number_id).maybeSingle();
  return { on: data?.voice_enabled !== false, id: data?.voice_id || null, agent: String(data?.agent_name || '').trim() || null };
}

/**
 * Voz usada com este cliente: a do número que atende (fixa) > a já usada na conversa > a padrão > a primeira ativa.
 * Número com áudio desligado não manda áudio nenhum.
 */
export async function voiceForLead(lead: any, settings: any, force = false) {
  const chip = await chipVoice(lead);
  // número com áudio desligado: a IA não manda áudio; a equipe ainda pode mandar quando pede (force)
  if (!chip.on && !force) return null;
  const { data: list } = await db().from('voices').select('*').eq('active', true).order('created_at');
  const voices = list || [];
  if (!voices.length) return null;
  // a voz fixa do número (chip) sempre vale primeiro, para soar sempre a mesma pessoa
  return (
    voices.find((v: any) => v.id === chip.id) ||
    voices.find((v: any) => v.id === lead.voice_id) ||
    voices.find((v: any) => v.id === settings?.voice?.default_voice) ||
    voices[0]
  );
}

/**
 * Pode mandar áudio agora? Respeita: ligado nas configurações, chave da ElevenLabs, voz cadastrada,
 * teto de % das mensagens da IA (últimos 30 dias) e teto por conversa.
 */
export async function audioAllowed(lead: any, settings: any) {
  const v = settings?.voice || {};
  if (!v.enabled || !voiceConfigured()) return false;
  // número com áudio desligado: só texto
  if (!(await chipVoice(lead)).on) return false;
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [{ count: total }, { count: audios }, { count: here }] = await Promise.all([
    db().from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('author', 'ai').gte('created_at', since),
    db().from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('author', 'ai').eq('kind', 'audio').gte('created_at', since),
    db().from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('direction', 'out').eq('kind', 'audio').is('meta->>fluxo', null), // áudios gravados do Fluxo não contam
  ]);
  if ((here || 0) >= Number(v.max_per_conversation ?? 4)) return false;
  const pct = Math.max(0, Math.min(100, Number(v.max_pct ?? 10))) / 100;
  // começo: libera os primeiros áudios para dar para testar; depois vale a porcentagem
  if ((audios || 0) < 3) return true;
  return ((audios || 0) + 1) / ((total || 0) + 1) <= pct;
}

export type Moment = 'boas_vindas' | 'link_pagamento' | 'pagamento_confirmado';

/** O momento está ligado? (fechamento e cliente_audio aceitam as opções antigas) */
export function momentOn(settings: any, m: string) {
  const v = settings?.voice || {};
  const x = v.moments?.[m];
  if (x && typeof x.on === 'boolean') return x.on;
  if (m === 'cliente_audio') return v.on_client_audio !== false;
  if (m === 'fechamento') return v.on_closing !== false;
  return true;
}

function fill(t: string, vars: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Frase pronta para um momento (boas-vindas, link, pagamento confirmado), ou null se não vai ter áudio agora.
 * Respeita: ligado, chave, voz cadastrada, teto por conversa e "uma vez por conversa" para cada momento.
 */
export async function momentScript(m: Moment, lead: any, settings: any) {
  const v = settings?.voice || {};
  if (!v.enabled || !voiceConfigured() || !momentOn(settings, m)) return null;
  const scripts: string[] = (v.moments?.[m]?.scripts || []).map((x: string) => String(x || '').trim()).filter(Boolean);
  if (!scripts.length) return null;
  const voice = await voiceForLead(lead, settings);
  if (!voice) return null;
  const { data: sent } = await db().from('messages').select('meta').eq('lead_id', lead.id).eq('direction', 'out').eq('kind', 'audio');
  if ((sent || []).length >= Number(v.max_per_conversation ?? 4)) return null;
  if ((sent || []).some((x: any) => x.meta?.moment === m)) return null;
  const pick = scripts[Math.floor(Math.random() * scripts.length)];
  const agent = (await chipVoice(lead)).agent;
  return fill(pick, { atendente: agent || voice.name, assistente: agent || settings?.assistant_name || voice.name, empresa: settings?.company_name || '' });
}

/** Mesmo texto + mesma voz + mesmos ajustes = reaproveita o áudio já gerado (não gasta crédito de novo). */
async function cachedTts(voiceId: string, say: string, settings: any) {
  const v = settings?.voice || {};
  const key = createHash('sha1').update([voiceId, say, v.mode, v.model, v.stability, v.similarity, v.style, v.speed, v.narr_stability].join('|')).digest('hex');
  const path = `voz-cache/${key}.mp3`;
  try {
    const { data } = await db().storage.from('publico').download(path);
    if (data) return { mp3: Buffer.from(await data.arrayBuffer()), cached: true };
  } catch {}
  const mp3 = await tts(voiceId, say, settings);
  await db().storage.from('publico').upload(path, mp3, { contentType: 'audio/mpeg', upsert: true }).catch(() => {});
  return { mp3, cached: false };
}

/** Manda o áudio de um momento (frase pronta). Devolve true se saiu. */
export async function sendMoment(number: any, lead: any, m: Moment, settings: any, script?: string | null) {
  const say0 = script ?? (await momentScript(m, lead, settings));
  if (!say0) return false;
  try {
    return !!(await sendVoice(number, lead, say0, settings, { moment: m }, 'ai', true));
  } catch (e: any) {
    await db().from('lead_events').insert({ lead_id: lead.id, type: 'voice_error', channel: 'warn', text: `Áudio de ${m} não saiu (foi em texto): ${String(e?.message || e).slice(0, 200)}` }).then(() => {}, () => {});
    return false;
  }
}

/**
 * Gera e envia o áudio com a voz da conversa. Devolve true se enviou (senão o chamador manda em texto).
 * O texto falado fica salvo no histórico (com 🔊) para a equipe e para a IA lerem depois.
 */
export async function sendVoice(number: any, lead: any, text: string, settings: any, meta: any = {}, author: 'ai' | 'human' = 'ai', cache = false) {
  let say = speakable(String(text || '').replace(/https?:\/\/\S+/gi, ''));
  // longo demais para um áudio de WhatsApp: corta no fim de uma frase (até ~1100 caracteres, cerca de 1min20)
  if (say.length > 1100) say = (say.slice(0, 1100).match(/^[\s\S]*[.!?]/) || [say.slice(0, 1100)])[0];
  if (!say) return false;
  // pausa definitiva da IA nesta conversa: não manda nada
  const { data: cur } = await db().from('leads').select('*').eq('id', lead.id).maybeSingle();
  if (cur?.ai_locked && author === 'ai') return false;
  const voice = await voiceForLead(lead, settings, author === 'human');
  if (!voice) {
    if (author === 'human') throw new Error('Nenhuma voz ativa. Cadastre ou ligue uma voz no menu Vozes (ElevenLabs).');
    return false;
  }
  const gen = cache ? await cachedTts(voice.voice_id, say, settings) : { mp3: await tts(voice.voice_id, say, settings), cached: false };
  const mp3 = gen.mp3;
  // "gravando áudio…" por um tempo parecido com o de gravar de verdade (~14 caracteres por segundo)
  const recordMs = Math.max(3000, Math.min(20000, Math.round((say.length / 14) * 1000)));
  const r: any = await evo.sendAudio(number.instance_name, lead.whatsapp, mp3.toString('base64'), recordMs);
  const waId = r?.key?.id || null;
  // cópia do áudio para tocar no painel
  let url: string | null = null;
  try {
    const path = `chat/${lead.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.mp3`;
    const up = await db().storage.from('publico').upload(path, mp3, { contentType: 'audio/mpeg', cacheControl: '31536000' });
    if (!up.error) url = db().storage.from('publico').getPublicUrl(path).data.publicUrl;
  } catch {}
  await db()
    .from('messages')
    .insert({ lead_id: lead.id, number_id: number.id, direction: 'out', author, kind: 'audio', body: '🔊 ' + say, transcript: say, wa_message_id: waId, meta: { ...meta, voice: voice.name, url, mime: 'audio/mpeg', mode: settings?.voice?.mode || 'tts' } });
  if (lead.voice_id !== voice.id) await db().from('leads').update({ voice_id: voice.id }).eq('id', lead.id);
  if (!gen.cached) await recordVoice(say.length, settings?.voice?.model || 'eleven_multilingual_v2', lead.id);
  return waId || true;
}

/** Amostra para ouvir no painel (não envia para ninguém). override: ajustes ainda não salvos, para comparar. */
export async function previewVoice(voiceId: string, text: string, settings: any, override?: any) {
  const say = speakable(text).slice(0, 300);
  if (override) settings = { ...settings, voice: { ...(settings?.voice || {}), ...override } };
  const mp3 = await tts(voiceId, say, settings);
  await recordVoice(say.length, settings?.voice?.model || 'eleven_multilingual_v2', null);
  return mp3.toString('base64');
}
