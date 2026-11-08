/**
 * RETOMADA DE CONVERSAS PARADAS (automática, sobrevive a reinício do servidor: tudo vem do banco).
 * Quem chamou em dias anteriores, foi atendido e parou de responder recebe UM toque de curiosidade na MESMA conversa e no MESMO chip
 * ("estava revendo o seu mapa e achei algo importante: uma dica para a situação que você contou"). Nunca para quem pagou,
 * pediu para parar, recusou, está com a equipe ou é do site/Recuperação. Saída espaçada, só em horário decente no fuso da pessoa.
 */
import { admin as db } from './supabase/admin';
import { logEvent, sendBubbles, hasWhatsapp, writeReaquecimento, withAgent } from './engine';

export const RETOMADA_PADRAO = {
  ativo: true,
  max: 1, // toques por conversa (1 = só a curiosidade; 2 = depois de 3+ dias um último toque de despedida)
  min_horas: 20, // só retoma depois de pelo menos isto sem conversa
  max_dias: 14, // não retoma conversa mais velha que isto
  max_dia_chip: 25, // teto de retomadas por dia em cada chip
  intervalo_min: { min: 4, max: 9 }, // minutos entre uma retomada e a próxima no mesmo chip
};

const FUSO: Record<string, number> = { BR: -3, AR: -3, UY: -3, PY: -3, CL: -4, BO: -4, VE: -4, DO: -4, CO: -5, PE: -5, EC: -5, PA: -5, US: -5, MX: -6, CR: -6, GT: -6, PT: 0, ES: 1 };

/** Horário educado no país da pessoa: seg–sáb 9h–20h, domingo 10h–18h. */
export function horarioRetomada(pais: string | null | undefined, agora = Date.now()): boolean {
  const off = FUSO[String(pais || 'BR').toUpperCase()] ?? -3;
  const d = new Date(agora + off * 3600_000);
  const dia = d.getUTCDay();
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return dia === 0 ? h >= 10 && h < 18 : h >= 9 && h < 20;
}

const RE_RECUSA = /(no (me )?(escribas?|molest|interesa|quiero)|ya no|d[eé]jame|dejen? de|para de (me )?(mandar|escrever)|n[aã]o (quero|tenho interesse|me (chame|mande))|nao quero|pare de|me tira|sem interesse|stop|spam|no gracias|bloque)/i;

export function cfgRetomada(settings: any) {
  const c = { ...RETOMADA_PADRAO, ...((settings || {}).retomada || {}) };
  c.intervalo_min = { ...RETOMADA_PADRAO.intervalo_min, ...(c.intervalo_min || {}) };
  return c;
}

/** Próxima conversa deste chip a retomar (ou null). */
export async function dueRetomada(number: any, settings: any): Promise<any | null> {
  const c = cfgRetomada(settings);
  if (c.ativo === false || number.recuperacao) return null;
  const agora = Date.now();
  const iso = (t: number) => new Date(t).toISOString();

  // teto diário por chip
  const inicioDia = new Date(agora - 3 * 3600_000);
  inicioDia.setUTCHours(3, 0, 0, 0); // 00:00 de Brasília
  const { data: evs } = await db().from('lead_events').select('lead_id').eq('type', 'retomada').gte('created_at', inicioDia.toISOString()).limit(500);
  if (evs?.length) {
    const ids = evs.map((e: any) => e.lead_id).filter(Boolean);
    const { count } = await db().from('leads').select('id', { count: 'exact', head: true }).in('id', ids).eq('number_id', number.id);
    if ((count || 0) >= c.max_dia_chip) return null;
  }
  // o chip está ocupado atendendo gente ao vivo: retomada espera
  const { count: ocupado } = await db().from('leads').select('id', { count: 'exact', head: true }).eq('number_id', number.id).not('reply_due_at', 'is', null).lte('reply_due_at', iso(agora + 10 * 60_000));
  if ((ocupado || 0) > 0) return null;

  const { data: cands } = await db()
    .from('leads')
    .select('*')
    .eq('number_id', number.id)
    .eq('ai_enabled', true)
    .eq('ai_locked', false)
    .eq('opted_out', false)
    .is('archived_at', null)
    .eq('cortesia', false)
    .is('needs_human', null)
    .in('stage', ['abordado', 'respondeu', 'interessado', 'negociando', 'pix'])
    .not('whatsapp', 'is', null)
    .not('last_inbound_at', 'is', null)
    .lt('last_inbound_at', iso(agora - c.min_horas * 3600_000))
    .gt('last_inbound_at', iso(agora - c.max_dias * 86400_000))
    .order('temperature', { ascending: false })
    .limit(60);
  for (const l of cands || []) {
    if (l.source === 'google' || l.source === 'recuperacao_site') continue;
    const m = l.memory || {};
    const feitas: any[] = Array.isArray(m.retomadas) ? m.retomadas : m.reaquecido_em ? [{ em: new Date(m.reaquecido_em).getTime() }] : [];
    if (feitas.length >= c.max) continue;
    const inAt = new Date(l.last_inbound_at).getTime();
    const outAt = l.last_outbound_at ? new Date(l.last_outbound_at).getTime() : 0;
    if (inAt > outAt + 60_000) continue; // cliente esperando resposta: é caso do resgate, não de retomada
    const ultimo = Math.max(inAt, outAt);
    if (agora - ultimo < c.min_horas * 3600_000) continue;
    if (feitas.length) {
      const ult = Math.max(...feitas.map((f) => Number(f.em || 0)));
      if (agora - ult < 3 * 86400_000) continue; // segundo toque só depois de 3 dias
    }
    if (!horarioRetomada(l.pais || (l.idioma === 'es' ? 'MX' : 'BR'), agora)) continue;
    if (!(await elegivel(l))) continue;
    return l;
  }
  return null;
}

/** Última checagem de segurança antes de falar com a pessoa de novo. */
async function elegivel(l: any): Promise<boolean> {
  // quem já pagou (neste ou em outro chip) NUNCA recebe retomada
  if (l.stage === 'pago' || l.paid_at) return false;
  if (l.wa_key) {
    const { data: sib } = await db().from('leads').select('id,stage').eq('wa_key', l.wa_key).limit(10);
    if ((sib || []).some((x: any) => x.stage === 'pago')) return false;
    const { data: bl } = await db().from('blocked_phones').select('wa_key').eq('wa_key', l.wa_key).maybeSingle();
    if (bl) return false;
  }
  const { count: pg } = await db().from('payments').select('id', { count: 'exact', head: true }).eq('lead_id', l.id).eq('status', 'pago');
  if (pg) return false;
  // a equipe conversou há pouco: não atropela
  const { data: hum } = await db().from('messages').select('created_at').eq('lead_id', l.id).eq('direction', 'out').eq('author', 'human').order('created_at', { ascending: false }).limit(1);
  if (hum?.[0] && Date.now() - new Date(hum[0].created_at).getTime() < 3 * 86400_000) return false;
  // pediu para parar / recusou
  const { data: ins } = await db().from('messages').select('body,transcript').eq('lead_id', l.id).eq('direction', 'in').order('created_at', { ascending: false }).limit(4);
  if ((ins || []).some((x: any) => RE_RECUSA.test(String(x.transcript || x.body || '')))) return false;
  return true;
}

/** Escreve (curiosidade + dica) e envia na mesma conversa, no mesmo chip. Devolve true se enviou. */
export async function enviarRetomada(number: any, lead: any, settings0: any): Promise<boolean> {
  const settings = withAgent(settings0, number);
  const m = lead.memory || {};
  const feitas: any[] = Array.isArray(m.retomadas) ? m.retomadas : [];
  const tentativa = feitas.length + 1;
  // reserva antes de gerar (se o servidor reiniciar no meio, não manda em dobro)
  const reserva = [...feitas, { em: Date.now(), reservada: true }];
  const { data: ok } = await db().from('leads').update({ memory: { ...m, retomadas: reserva } }).eq('id', lead.id).eq('ai_enabled', true).select('id');
  if (!ok?.length) return false;
  const desfazer = async () => { await db().from('leads').update({ memory: { ...m, retomadas: feitas } }).eq('id', lead.id).then(() => {}, () => {}); };
  try {
    if (!(await hasWhatsapp(number, lead))) {
      await db().from('leads').update({ memory: { ...m, retomadas: [...feitas, { em: Date.now(), sem_whatsapp: true }] } }).eq('id', lead.id);
      return false;
    }
    const { data: history } = await db().from('messages').select('*').eq('lead_id', lead.id).order('created_at').limit(40);
    const parts = await writeReaquecimento(lead, settings, history || [], { tentativa });
    if (!parts.length) { await desfazer(); return false; }
    // última checagem: o cliente não pode ter escrito enquanto a IA pensava
    const { data: fresco } = await db().from('leads').select('last_inbound_at,ai_enabled,stage').eq('id', lead.id).single();
    if (!fresco?.ai_enabled || fresco.stage === 'pago' || (fresco.last_inbound_at && new Date(fresco.last_inbound_at).getTime() > new Date(lead.last_inbound_at).getTime())) { await desfazer(); return false; }
    await sendBubbles(number, lead, parts, 'ai', settings.typing !== false, { retomada: tentativa });
    await db().from('leads').update({
      last_outbound_at: new Date().toISOString(),
      memory: { ...m, retomadas: [...feitas, { em: Date.now(), n: tentativa }], reaquecido_em: new Date().toISOString() },
      next_step: tentativa >= cfgRetomada(settings).max ? 'Retomada feita. Se responder, continuar a conversa; senão não insistir.' : 'Retomada feita; um último toque depois de 3 dias, se continuar sem resposta.',
    }).eq('id', lead.id);
    await logEvent(lead.id, 'retomada', 'wa', `${number.label} retomou a conversa de ${lead.name} (toque ${tentativa}): dica ligada ao que a pessoa contou, para despertar a curiosidade`);
    return true;
  } catch (e: any) {
    await desfazer();
    throw e;
  }
}
