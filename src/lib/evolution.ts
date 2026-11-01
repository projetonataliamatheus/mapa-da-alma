/** Conexão com a Evolution API (WhatsApp por QR Code). */
import { appBase } from './util';

function base() {
  const u = process.env.EVOLUTION_API_URL;
  if (!u) throw new Error('WhatsApp não configurado: falta EVOLUTION_API_URL');
  return u.replace(/\/$/, '');
}

async function call(path: string, method = 'GET', body?: any) {
  const extra = Number(body?.delay || 0);
  const r = await fetch(base() + path, {
    signal: AbortSignal.timeout(30_000 + extra),
    method,
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!r.ok) throw new Error(`WhatsApp (${path.split('/')[1]}): ${r.status} ${text.slice(0, 300)}`);
  return json;
}

export function webhookUrl() {
  return `${appBase()}/api/webhooks/evolution?token=${encodeURIComponent(process.env.WEBHOOK_SECRET || '')}`;
}

export const evo = {
  create: (name: string) =>
    call('/instance/create', 'POST', {
      instanceName: name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      syncFullHistory: true,
      webhook: {
        url: webhookUrl(),
        byEvents: false,
        base64: true,
        events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'PRESENCE_UPDATE'],
      },
    }),
  setWebhook: (name: string) =>
    call(`/webhook/set/${name}`, 'POST', {
      webhook: { enabled: true, url: webhookUrl(), byEvents: false, base64: true, events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'PRESENCE_UPDATE'] },
    }),
  connect: (name: string) => call(`/instance/connect/${name}`),
  state: (name: string) => call(`/instance/connectionState/${name}`),
  info: (name: string) => call(`/instance/fetchInstances?instanceName=${encodeURIComponent(name)}`),
  logout: (name: string) => call(`/instance/logout/${name}`, 'DELETE'),
  remove: (name: string) => call(`/instance/delete/${name}`, 'DELETE'),
  /** delay em ms: a Evolution mostra "digitando…" durante esse tempo antes de enviar. */
  sendText: (name: string, number: string, text: string, delay = 0, quoted?: any) => call(`/message/sendText/${name}`, 'POST', { number, text, delay, ...(quoted ? { quoted } : {}) }),
  /** Imagem (foto) com legenda opcional; quoted = responder a uma mensagem específica. */
  sendImage: (name: string, number: string, base64: string, mimetype: string, caption = '', fileName = 'imagem.jpg', quoted?: any) =>
    call(`/message/sendMedia/${name}`, 'POST', { number, mediatype: 'image', mimetype, media: base64, caption, fileName, ...(quoted ? { quoted } : {}) }),
  /**
   * Envia áudio como mensagem de voz gravada (bolinha azul, não "encaminhado").
   * delay em ms: durante esse tempo o cliente vê "gravando áudio…".
   */
  sendAudio: (name: string, number: string, base64: string, delay = 0) => call(`/message/sendWhatsAppAudio/${name}`, 'POST', { number, audio: base64, delay, encoding: true }),
  /** Envia um arquivo (PDF) em base64. */
  sendDocument: (name: string, number: string, base64: string, fileName: string, caption = '') =>
    call(`/message/sendMedia/${name}`, 'POST', { number, mediatype: 'document', mimetype: 'application/pdf', media: base64, fileName, caption }),
  /** Mostra "digitando…" (composing) ou para de mostrar (paused) por alguns milissegundos. */
  presence: async (name: string, number: string, presence: 'composing' | 'paused' | 'available', delay = 1200) => {
    const d = Math.round(delay);
    try {
      return await call(`/chat/sendPresence/${name}`, 'POST', { number, presence, delay: d });
    } catch (e: any) {
      // versões antigas da Evolution usam o formato com "options"
      if (/\b400\b/.test(String(e?.message))) return call(`/chat/sendPresence/${name}`, 'POST', { number, options: { presence, delay: d, number } });
      throw e;
    }
  },
  /** Marca as mensagens como lidas (dois tiques azuis). */
  markRead: (name: string, remoteJid: string, ids: string[]) =>
    call(`/chat/markMessageAsRead/${name}`, 'POST', { readMessages: ids.map((id) => ({ remoteJid, fromMe: false, id })) }),
  /** Liga o recebimento do histórico (vale na próxima conexão por QR Code). */
  historyOn: (name: string) =>
    call(`/settings/set/${name}`, 'POST', { rejectCall: false, groupsIgnore: true, alwaysOnline: false, readMessages: false, readStatus: false, syncFullHistory: true }),
  /** Conversas que a Evolution guardou deste número. */
  findChats: (name: string) => call(`/chat/findChats/${name}`, 'POST', {}),
  /** Mensagens de uma conversa (mais recentes primeiro). */
  findMessages: (name: string, remoteJid: string, limit = 40) => call(`/chat/findMessages/${name}`, 'POST', { where: { key: { remoteJid } }, page: 1, offset: limit }),
  /** Contatos da agenda do celular (Evolution v2 traz isSaved). */
  findContacts: (name: string, remoteJid?: string) => call(`/chat/findContacts/${name}`, 'POST', remoteJid ? { where: { remoteJid } } : {}),
  exists: (name: string, numbers: string[]) => call(`/chat/whatsappNumbers/${name}`, 'POST', { numbers }),
  /** Foto de perfil do WhatsApp (link temporário). Grátis: não gasta crédito. */
  profilePic: (name: string, number: string) => call(`/chat/fetchProfilePictureUrl/${name}`, 'POST', { number }),
  /** Baixa a mídia (foto, áudio, vídeo, PDF) de uma mensagem. Com o remoteJid a Evolution acha a mensagem com mais segurança. */
  media: (name: string, id: string, remoteJid?: string | null, fromMe = false) =>
    call(`/chat/getBase64FromMediaMessage/${name}`, 'POST', { message: { key: { id, ...(remoteJid ? { remoteJid, fromMe } : {}) } }, convertToMp4: false }),
};

/**
 * Tempo de "digitando…" como uma pessoa no celular: ~15 a 22 letras por segundo,
 * com variação natural. Mensagem curta: 2–4 s; média: 5–8 s; longa: até ~13 s.
 */
export function typingMs(text: string, speed: string = 'normal') {
  // letras por segundo de quem digita no celular
  const cps = speed === 'lenta' ? 9 : speed === 'rapida' ? 22 : 14;
  const ms = 1200 + (text.length / (cps * (0.85 + Math.random() * 0.3))) * 1000 + (Math.random() * 1000 - 300);
  return Math.round(Math.min(25000, Math.max(2500, ms)));
}

/**
 * Descobre o telefone de um contato. O WhatsApp às vezes usa um código interno (@lid) no lugar do número;
 * nesses casos a Evolution manda o número de verdade em outro campo.
 */
export function phoneJid(key: any, extra: any = {}): string | null {
  const cands = [key?.remoteJid, key?.remoteJidAlt, key?.senderPn, key?.participantAlt, extra?.remoteJidAlt, extra?.senderPn, extra?.lastMessage?.key?.remoteJidAlt, extra?.lastMessage?.key?.senderPn];
  for (const c of cands) if (typeof c === 'string' && c.endsWith('@s.whatsapp.net')) return c;
  return null;
}
