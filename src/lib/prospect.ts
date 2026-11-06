/**
 * Prospecção manual (busca no Google → lista de selecionados → Iniciar).
 * Cada abordagem vira um RASCUNHO que a equipe vê (e pode editar) antes de sair; depois de alguns segundos sai sozinho.
 * A 1ª mensagem é só um cumprimento para validar o contato (sem oferta) — evita bloqueio no WhatsApp.
 */
import { admin } from './supabase/admin';
import { logEvent, withSteps, sendBubbles, hasWhatsapp, withAgent } from './engine';
import { greetingWord } from './prompts';
import { spNow } from './util';
import { getSettings } from './settings';

const db = () => admin();

export type ProspectCfg = {
  running: boolean;
  numbers: string[]; // chips que prospectam (vazio = todos conectados)
  daily_per_chip: number; // primeiras mensagens por chip por dia
  interval_min: number; // minutos entre abordagens do mesmo chip (mín.)
  interval_max: number;
  review_s: number; // segundos para revisar o rascunho antes de sair (0 = sai direto)
  max_followups: number; // lembretes se não responder (0 = não insiste)
  openings: string; // modelos da 1ª mensagem, um por linha ({saudacao}, {empresa})
};

export const PROSPECT_DEFAULT: ProspectCfg = {
  running: false,
  numbers: [],
  daily_per_chip: 15,
  interval_min: 4,
  interval_max: 9,
  review_s: 60,
  max_followups: 1,
  openings: ['{Saudacao}, tudo bem? Falo com {empresa}?', 'Oi, {saudacao}! Tudo bem? Esse número é de {empresa}?', '{Saudacao}! Tudo certo por aí? Esse é o WhatsApp de {empresa}?'].join('\n'),
};

export function prospectCfg(settings: any): ProspectCfg {
  const p = { ...PROSPECT_DEFAULT, ...(settings?.prospect || {}) };
  p.numbers = Array.isArray(p.numbers) ? p.numbers.filter(Boolean) : [];
  p.daily_per_chip = Math.max(1, Math.min(80, Number(p.daily_per_chip) || 15));
  p.interval_min = Math.max(1, Math.min(120, Number(p.interval_min) || 4));
  p.interval_max = Math.max(p.interval_min, Math.min(180, Number(p.interval_max) || 9));
  p.review_s = Math.max(0, Math.min(600, Number(p.review_s ?? 60)));
  p.max_followups = Math.max(0, Math.min(3, Number(p.max_followups ?? 1)));
  return p;
}

/** Nome curto do negócio para a mensagem ("Padaria Pão Quente - Centro" → "Padaria Pão Quente"). */
export function shortName(name: string) {
  let n = String(name || '').split(/\s[-–|•]\s|\s\|\s/)[0].trim();
  if (n.length > 40) n = n.slice(0, 40).replace(/\s+\S*$/, '');
  return n || 'vocês';
}

/** 1ª mensagem: cumprimento pelo horário + confirmação do contato. Sem IA (custo zero) e sem oferta. */
export function openingFor(lead: any, settings: any) {
  const cfg = prospectCfg(settings);
  const list = String(cfg.openings || PROSPECT_DEFAULT.openings)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  const tpl = list[Math.floor(Math.random() * list.length)] || PROSPECT_DEFAULT.openings.split('\n')[0];
  const g = greetingWord(settings, spNow().minutes); // "Boa tarde"
  const low = g.charAt(0).toLowerCase() + g.slice(1);
  return tpl.replace(/\{Saudacao\}/g, g).replace(/\{saudacao\}/g, low).replace(/\{empresa\}/gi, shortName(lead.name)).trim();
}

/** Escolhe o chip (entre os selecionados, em ordem aleatória) que pode abordar agora. */
async function pickNumber(cfg: ProspectCfg) {
  const today = spNow().date;
  const nowIso = new Date().toISOString();
  let { data: nums } = await db().from('whatsapp_numbers').select('*').eq('status', 'conectado');
  nums = (nums || []).filter((n: any) => !n.recuperacao && (!cfg.numbers.length || cfg.numbers.includes(n.id)));
  nums.sort(() => Math.random() - 0.5);
  for (const n of nums) {
    if (n.paused_until && new Date(n.paused_until) > new Date()) continue;
    const sentToday = n.prospect_date === today ? Number(n.prospect_today || 0) : 0;
    if (sentToday >= cfg.daily_per_chip) continue;
    if (n.prospect_next_at && n.prospect_next_at > nowIso) continue;
    return { n, sentToday, today };
  }
  return null;
}

/** Cria o próximo rascunho de abordagem (se a prospecção estiver ligada e houver chip livre). */
export async function prepareNextDraft(settings: any) {
  const cfg = prospectCfg(settings);
  if (!cfg.running) return false;
  const pick = await pickNumber(cfg);
  if (!pick) return false;
  const { data } = await db().from('leads').select('*').eq('wa_status', 'fila').eq('opted_out', false).not('whatsapp', 'is', null).order('score', { ascending: false }).limit(10);
  for (const lead of data || []) {
    const { data: claimed } = await db().from('leads').update({ wa_status: 'preparando' }).eq('id', lead.id).eq('wa_status', 'fila').select('*');
    if (!claimed?.[0]) continue;
    const n = pick.n;
    const blocked = await db().from('blocked_phones').select('wa_key').eq('wa_key', lead.wa_key || '').maybeSingle();
    if (blocked.data) {
      await db().from('leads').update({ wa_status: 'bloqueado', opted_out: true, prospect: null }).eq('id', lead.id);
      continue;
    }
    if (!(await hasWhatsapp(n, lead))) {
      await db().from('leads').update({ wa_status: 'invalido', prospect: null }).eq('id', lead.id);
      await logEvent(lead.id, 'wa_invalid', 'wa', `${lead.name}: o número não tem WhatsApp`);
      continue;
    }
    const s2 = withAgent(settings, n);
    const parts = [openingFor(lead, s2)];
    const at = new Date(Date.now() + cfg.review_s * 1000).toISOString();
    await db()
      .from('leads')
      .update({ wa_status: 'rascunho', prospect: null, number_id: n.id, draft: { parts, number_id: n.id, number_label: n.label, agent: s2.assistant_name }, draft_at: at, draft_hold: false })
      .eq('id', lead.id);
    // reserva o chip: conta no dia e espera o intervalo antes da próxima
    const next = Date.now() + (cfg.interval_min + Math.random() * (cfg.interval_max - cfg.interval_min)) * 60_000;
    await db().from('whatsapp_numbers').update({ prospect_today: pick.sentToday + 1, prospect_date: pick.today, prospect_next_at: new Date(next).toISOString() }).eq('id', n.id);
    return true;
  }
  return false;
}

/** Envia um rascunho (o que estiver escrito nele agora, inclusive editado pela equipe). */
export async function sendDraft(leadId: string, by: 'ai' | 'human' = 'ai') {
  const { data: claimed } = await db().from('leads').update({ wa_status: 'enviando' }).eq('id', leadId).eq('wa_status', 'rascunho').select('*');
  const lead = claimed?.[0];
  if (!lead) return false;
  const d = lead.draft || {};
  const parts: string[] = (Array.isArray(d.parts) ? d.parts : []).map((x: any) => String(x || '').trim()).filter(Boolean);
  const { data: n } = await db().from('whatsapp_numbers').select('*').eq('id', d.number_id || lead.number_id).maybeSingle();
  if (!parts.length || !n || n.status !== 'conectado') {
    await db().from('leads').update({ wa_status: 'fila', draft: null, draft_at: null }).eq('id', leadId);
    return false;
  }
  const settings = await getSettings(db());
  try {
    await sendBubbles(n, lead, parts, by, (settings as any).typing !== false, { prospect: true, edited: !!d.edited });
  } catch (e) {
    await db().from('leads').update({ wa_status: 'rascunho', draft_at: new Date(Date.now() + 5 * 60_000).toISOString() }).eq('id', leadId);
    throw e;
  }
  await db()
    .from('leads')
    .update({
      wa_status: 'enviado',
      stage: lead.stage === 'novo' ? 'abordado' : lead.stage,
      number_id: n.id,
      ai_enabled: true,
      draft: null,
      draft_at: null,
      draft_hold: false,
      steps: withSteps(lead.steps, 'maps', 'valid', 'wa'),
      last_outbound_at: new Date().toISOString(),
      followups_sent: 0,
      next_step: 'Aguardar resposta (só um cumprimento foi enviado). A IA apresenta a agência quando ele responder.',
    })
    .eq('id', leadId);
  await logEvent(lead.id, 'wa_first', 'wa', `${n.label} abordou ${lead.name} (prospecção${d.edited ? ', mensagem editada pela equipe' : ''})`, { number_id: n.id });
  return true;
}

/** Rascunhos que já deram a hora (e não estão segurados pela equipe) saem sozinhos. */
export async function processDrafts(settings: any) {
  const { data } = await db().from('leads').select('id').eq('wa_status', 'rascunho').eq('draft_hold', false).lte('draft_at', new Date().toISOString()).limit(5);
  for (const l of data || []) await sendDraft(l.id).catch((e) => logEvent(l.id, 'send_error', 'warn', `Erro ao enviar abordagem: ${String(e?.message || e).slice(0, 160)}`));
  await prepareNextDraft(settings).catch(() => {});
}
