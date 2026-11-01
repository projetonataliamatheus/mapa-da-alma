/**
 * Importa as conversas que já existem no WhatsApp do número (histórico guardado pela Evolution).
 * As mensagens antigas entram como estão; a IA só passa a responder se você escolher.
 */
import { admin } from './supabase/admin';
import { evo, phoneJid } from './evolution';
import { extractText, logEvent, handleIncoming, leadForNumber } from './engine';
import { waKey } from './phone';

const db = () => admin();

function recordsOf(r: any): any[] {
  if (Array.isArray(r)) return r;
  return r?.messages?.records || r?.records || r?.messages || r?.data || [];
}
function tsOf(m: any): number {
  const t = Number(m?.messageTimestamp?.low ?? m?.messageTimestamp ?? 0);
  if (t) return t > 1e12 ? t : t * 1000;
  return new Date(m?.createdAt || m?.updatedAt || 0).getTime();
}

export type ImportResult = { chats: number; imported: number; messages: number; skipped: number; empty: boolean };

export async function importHistory(numberId: string, opts: { days?: number; maxChats?: number; perChat?: number; ai?: boolean } = {}): Promise<ImportResult> {
  const days = opts.days ?? 30;
  const maxChats = Math.min(opts.maxChats ?? 300, 1000);
  const perChat = Math.min(opts.perChat ?? 40, 100);
  const { data: number } = await db().from('whatsapp_numbers').select('*').eq('id', numberId).single();
  if (!number) throw new Error('Número não encontrado');

  const chatsRaw = await evo.findChats(number.instance_name);
  const chats: any[] = Array.isArray(chatsRaw) ? chatsRaw : chatsRaw?.chats || chatsRaw?.data || [];
  const since = Date.now() - days * 86400000;
  const list = chats
    .filter((c) => {
      const jid = String(c.remoteJid || c.id || '');
      return jid && !jid.endsWith('@g.us') && !jid.endsWith('@broadcast') && !jid.endsWith('@newsletter') && jid !== 'status@broadcast';
    })
    .map((c) => ({ c, t: new Date(c.updatedAt || c.lastMessage?.messageTimestamp * 1000 || 0).getTime() || 0 }))
    .filter((x) => !x.t || x.t >= since)
    .sort((a, b) => b.t - a.t)
    .slice(0, maxChats)
    .map((x) => x.c);

  const res: ImportResult = { chats: list.length, imported: 0, messages: 0, skipped: 0, empty: chats.length === 0 };
  for (const c of list) {
    try {
      const remote = String(c.remoteJid || c.id);
      const r = await evo.findMessages(number.instance_name, remote, perChat);
      const msgs = recordsOf(r)
        .filter((m: any) => tsOf(m) >= since)
        .sort((a: any, b: any) => tsOf(a) - tsOf(b));
      if (!msgs.length) {
        res.skipped++;
        continue;
      }
      const jid = phoneJid({ remoteJid: remote }, c) || msgs.map((m: any) => phoneJid(m.key || {}, m)).find(Boolean) || null;
      if (!jid) {
        res.skipped++;
        continue;
      }
      const digits = jid.split('@')[0].replace(/\D/g, '');
      const k = waKey(jid);
      if (!k) {
        res.skipped++;
        continue;
      }
      const inbound = msgs.filter((m: any) => !m.key?.fromMe);
      const name = c.pushName || c.name || inbound.find((m: any) => m.pushName)?.pushName || digits;

      // histórico deste número vai para a conversa deste número (o mesmo contato em outro número fica separado)
      let lead = (await leadForNumber(k, number.id)).lead;
      if (!lead) {
        const created = (
          await leadForNumber(k, number.id, {
            name,
            source: 'whatsapp',
            whatsapp: digits,
            stage: inbound.length ? 'respondeu' : 'abordado',
            wa_status: 'conversa',
            ai_enabled: !!opts.ai,
            summary: 'Conversa importada do histórico do WhatsApp.',
            next_step: opts.ai ? 'A IA responde quando o contato mandar uma nova mensagem.' : 'Equipe atendendo (IA desligada para este contato).',
          })
        ).lead;
        if (!created) {
          res.skipped++;
          continue;
        }
        lead = created;
        res.imported++;
        // conversas antigas não viram "caso perdido" automaticamente
        await db().from('leads').update({ case_done: true }).eq('id', lead.id).then(() => {}, () => {});
      }

      const rows = msgs
        .map((m: any) => {
          const { kind, text } = extractText(m.message);
          if (kind === 'reaction' || (kind === 'other' && !text)) return null;
          const fromMe = !!m.key?.fromMe;
          return {
            lead_id: lead.id,
            number_id: number.id,
            direction: fromMe ? 'out' : 'in',
            author: fromMe ? 'human' : 'lead',
            kind,
            body: kind === 'audio' ? '🎤 Áudio (histórico)' : text || '[mídia]',
            wa_message_id: m.key?.id || null,
            created_at: new Date(tsOf(m) || Date.now()).toISOString(),
          };
        })
        .filter(Boolean) as any[];
      const withId = rows.filter((x) => x.wa_message_id);
      if (withId.length) {
        const { error } = await db().from('messages').upsert(withId, { onConflict: 'wa_message_id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        res.messages += withId.length;
        // histórico antigo não entra na medição das mensagens campeãs
        await db().from('messages').update({ scored: true }).eq('lead_id', lead.id).then(() => {}, () => {});
      }
      const lastIn = [...rows].reverse().find((x) => x.direction === 'in');
      const lastOut = [...rows].reverse().find((x) => x.direction === 'out');
      const patch: any = {};
      if (lastIn && (!lead.last_inbound_at || lastIn.created_at > lead.last_inbound_at)) patch.last_inbound_at = lastIn.created_at;
      if (lastOut && (!lead.last_outbound_at || lastOut.created_at > lead.last_outbound_at)) patch.last_outbound_at = lastOut.created_at;
      if (Object.keys(patch).length) await db().from('leads').update(patch).eq('id', lead.id);
    } catch (e: any) {
      res.skipped++;
      console.error('importar conversa:', e?.message || e);
    }
  }
  await logEvent(null, 'wa_import', 'wa', `${number.label}: ${res.imported} conversas novas e ${res.messages} mensagens importadas do WhatsApp`);
  return res;
}

/**
 * Conferência: compara as conversas ativas da última hora com o WhatsApp e registra
 * qualquer mensagem que o aviso da Evolution não entregou (e agenda a resposta, se for do cliente).
 */
export async function syncRecentMessages(minutes = 60, maxLeads = 15) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data: leads } = await db()
    .from('leads')
    .select('id,whatsapp,number_id')
    .or(`last_inbound_at.gt.${since},last_outbound_at.gt.${since}`)
    .not('whatsapp', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(maxLeads);
  if (!leads?.length) return 0;
  const { data: nums } = await db().from('whatsapp_numbers').select('id,instance_name,status');
  const byId = new Map((nums || []).map((n: any) => [n.id, n]));
  const anyConnected = (nums || []).find((n: any) => n.status === 'conectado');
  let found = 0;
  for (const l of leads) {
    const n: any = byId.get(l.number_id) || anyConnected;
    if (!n || n.status !== 'conectado') continue;
    try {
      const recs = recordsOf(await evo.findMessages(n.instance_name, `${l.whatsapp}@s.whatsapp.net`, 15)).filter((m: any) => m?.key?.id && tsOf(m) >= Date.now() - (minutes + 5) * 60_000);
      if (!recs.length) continue;
      const ids = recs.map((m: any) => m.key.id);
      const { data: have } = await db().from('messages').select('wa_message_id').in('wa_message_id', ids);
      const known = new Set((have || []).map((x: any) => x.wa_message_id));
      const missing = recs.filter((m: any) => !known.has(m.key.id)).sort((a: any, b: any) => tsOf(a) - tsOf(b));
      for (const m of missing) {
        await handleIncoming(n.instance_name, m).catch((e: any) => console.error('conferência', e?.message || e));
        found++;
      }
    } catch (e: any) {
      console.error('conferência de mensagens:', e?.message || e);
    }
  }
  if (found) await logEvent(null, 'wa_sync', 'wa', `Conferência: ${found} mensagem(ns) que não tinham chegado foram recuperadas`);
  return found;
}
