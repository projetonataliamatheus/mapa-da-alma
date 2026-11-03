/**
 * Respostas de reserva: roda dentro do próprio painel.
 * Normalmente quem responde é o robô; se ele ficar sem sinal por mais de 45 s, o painel assume
 * na hora e os clientes nunca ficam sem resposta. Cada resposta é "reservada" no banco, então nunca sai em dobro.
 */
import { admin } from './supabase/admin';
import { getSettings } from './settings';
import { handleReply, logEvent, processPreviewJobs, maybeRefreshSummary } from './engine';
import { inBusinessHours } from './util';
import { syncRecentMessages } from './wa-import';
import { processPendingReceipts } from './receipt';

const g = globalThis as any;

async function robotAlive() {
  const { data, error } = await admin().from('worker_status').select('beat_at').eq('id', 1).maybeSingle();
  if (error || !data) return false;
  return Date.now() - new Date(data.beat_at).getTime() < 45_000;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: any;
  return Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error('a resposta demorou demais')), ms)))]).finally(() => clearTimeout(t));
}

async function round() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ANTHROPIC_API_KEY) return;
  if (await robotAlive()) return;
  // rede de segurança: sem o robô, o painel também devolve à fila atendimentos parados
  if (Date.now() - (g.__radarLastResgate || 0) > 60_000) {
    g.__radarLastResgate = Date.now();
    void import('./resgate').then((m) => m.resgatarConversas()).catch(() => {});
  }
  if (Date.now() - (g.__radarLastSync || 0) > 60_000) {
    g.__radarLastSync = Date.now();
    await syncRecentMessages().catch(() => 0);
  }
  const settings = await getSettings(admin());
  // recibo de pagamento não pode esperar o robô voltar
  if (!g.__radarReceipts && Date.now() - (g.__radarLastReceipts || 0) > 20_000) {
    g.__radarReceipts = true;
    g.__radarLastReceipts = Date.now();
    processPendingReceipts(settings, (...a: any[]) => console.log('[painel] recibo:', ...a))
      .catch((e) => console.error('[painel] recibos:', e?.message || e))
      .finally(() => (g.__radarReceipts = false));
  }
  if (settings.paused) return;
  if (!settings.reply_24h && !inBusinessHours(settings.hours)) return;
  await withTimeout(processPreviewJobs(1), 4 * 60_000).catch(() => {});
  await withTimeout(import('./bio-auto').then((m) => m.processBioJobs(1)), 2 * 60_000).catch(() => {});
  const { data: due } = await admin().from('leads').select('id,name').lte('reply_due_at', new Date().toISOString()).order('reply_due_at').limit(4);
  const busy: Set<string> = g.__radarReplying;
  await Promise.all(
    (due || [])
      .filter((l: any) => !busy.has(l.id))
      .slice(0, 2)
      .map(async (l: any) => {
        busy.add(l.id);
        try {
          console.log('[painel] robô sem sinal: respondendo', l.name);
          await withTimeout(handleReply(l.id), 4 * 60_000);
          // resumo vivo da conversa (ficha para retomar dias depois), em segundo plano
          void maybeRefreshSummary(l.id).catch(() => {});
        } catch (e: any) {
          await admin().from('leads').update({ reply_due_at: new Date(Date.now() + 60_000).toISOString() }).eq('id', l.id);
          await logEvent(l.id, 'reply_error', 'warn', `Erro ao responder ${l.name}: ${e?.message || e}`).catch(() => {});
        } finally {
          busy.delete(l.id);
        }
      }),
  );
}

export function startReplyRunner() {
  if (g.__radarReplyRunner) return;
  g.__radarReplyRunner = true;
  g.__radarReplying = new Set<string>();
  const loop = async () => {
    try {
      await round();
    } catch (e: any) {
      console.error('[painel] reserva de respostas:', e?.message || e);
    }
    setTimeout(loop, 5000);
  };
  setTimeout(loop, 8000);
  // uma vez ao ligar: desfaz marcações de "Contato salvo" feitas por engano
  setTimeout(() => import('./engine').then((m) => m.recheckSavedContacts()).then((n) => n && console.log(`[painel] ${n} conversa(s) desmarcada(s) de contato salvo`)).catch(() => {}), 25_000);
  console.log('[painel] reserva de respostas ligada');
}
