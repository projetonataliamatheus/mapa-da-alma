/**
 * Saldo ao vivo dos serviços pagos e alertas de "saldo acabando".
 *  - Claude: o saldo é informado uma vez (a Anthropic não expõe o saldo por API); o painel desconta tudo o que o sistema gastar depois.
 *    Se existir ANTHROPIC_ADMIN_KEY, também traz o gasto da conta inteira (todas as chaves) no mês.
 *  - ElevenLabs: créditos direto da conta (API).
 *  - Browserless: PDFs gerados no mês × limite do plano (1000).
 * Alertas: Claude ≤ US$ 5 (e a cada US$ 1 abaixo); Browserless ≤ 500 (e a cada 100); ElevenLabs a cada 1000 créditos usados.
 */
import { admin } from './supabase/admin';

const mesSP = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 7);
const inicioMes = () => new Date(`${mesSP()}-01T03:00:00.000Z`).toISOString();

export type EstadoServico = {
  id: 'anthropic' | 'elevenlabs' | 'browserless' | 'grok';
  nome: string;
  unidade: string;
  usado_mes: number;
  restante: number | null;       // na unidade do serviço (US$, créditos, PDFs)
  limite: number | null;
  gasto_mes_usd: number;
  ativo_alerta: boolean;         // abaixo do limite de aviso agora (aba vermelha)
  extra?: any;
};

let cacheEleven: { at: number; v: any } | null = null;
export async function elevenAssinatura(): Promise<any | null> {
  if (cacheEleven && Date.now() - cacheEleven.at < 60_000) return cacheEleven.v;
  let v: any = null;
  try {
    const k = process.env.ELEVENLABS_API_KEY;
    if (k) {
      const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': k }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const j: any = await r.json();
        v = { usado: Number(j.character_count) || 0, limite: Number(j.character_limit) || 0, plano: j.tier, renova: j.next_character_count_reset_unix ? new Date(j.next_character_count_reset_unix * 1000).toISOString() : null, fatura_usd: j.next_invoice?.amount_due_cents != null ? Number(j.next_invoice.amount_due_cents) / 100 : null, moeda: j.currency || 'usd' };
      }
    }
  } catch {}
  cacheEleven = { at: Date.now(), v };
  return v;
}

/** Gasto do mês de toda a conta Anthropic (todas as chaves), se houver chave de administrador. */
async function anthropicContaInteira(): Promise<number | null> {
  try {
    const k = process.env.ANTHROPIC_ADMIN_KEY;
    if (!k) return null;
    const r = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(inicioMes())}&bucket_width=1d&limit=31`, { headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j: any = await r.json();
    let cents = 0;
    for (const b of j.data || []) for (const x of b.results || []) cents += Number(x.amount) || 0;
    return Number.isFinite(cents) ? cents / 100 : null;
  } catch { return null; }
}

export async function estadoConsumo(): Promise<{ servicos: EstadoServico[]; contaAnthropic: number | null; cfg: Record<string, any> }> {
  const db = admin();
  const { data: cfgRows } = await db.from('consumo_config').select('*');
  const cfg: Record<string, any> = Object.fromEntries((cfgRows || []).map((c: any) => [c.service, c]));
  const mes = inicioMes();
  const soma = async (service: string, desde: string, campo: 'cost_usd' | 'units') => {
    let t = 0;
    for (let from = 0; from < 50000; from += 1000) {
      const { data } = await db.from('usage_log').select(`${campo},service,kind`).or(`service.eq.${service},kind.eq.${service === 'anthropic' ? 'ai' : service}`).gte('created_at', desde).range(from, from + 999);
      for (const r of data || []) t += Number((r as any)[campo] ?? (campo === 'units' ? 1 : 0)) || 0;
      if (!data || data.length < 1000) break;
    }
    return t;
  };
  const servicos: EstadoServico[] = [];

  // Claude
  const c = cfg.anthropic || {};
  const gastoMes = await soma('anthropic', mes, 'cost_usd');
  let restC: number | null = null;
  if (c.saldo_usd != null && c.saldo_em) restC = Number(c.saldo_usd) - (await soma('anthropic', c.saldo_em, 'cost_usd'));
  servicos.push({ id: 'anthropic', nome: 'Claude (Anthropic)', unidade: 'US$', usado_mes: gastoMes, restante: restC, limite: null, gasto_mes_usd: gastoMes, ativo_alerta: restC != null && restC <= 5 });

  // ElevenLabs
  const e = await elevenAssinatura();
  const eRest = e ? Math.max(0, e.limite - e.usado) : null;
  servicos.push({ id: 'elevenlabs', nome: 'ElevenLabs (voz)', unidade: 'créditos', usado_mes: e?.usado ?? 0, restante: eRest, limite: e?.limite ?? null, gasto_mes_usd: ((e?.usado ?? 0) * 5) / 30000, ativo_alerta: eRest != null && eRest <= 2000, extra: e });

  // Browserless
  const b = cfg.browserless || {};
  const limiteB = Number(b.limite_unidades) || 1000;
  const usadosB = await soma('browserless', mes, 'units');
  let restB = limiteB - usadosB;
  if (b.saldo_usd != null && b.saldo_em && new Date(b.saldo_em).getTime() >= new Date(mes).getTime()) restB = Number(b.saldo_usd) - (await soma('browserless', b.saldo_em, 'units'));
  servicos.push({ id: 'browserless', nome: 'Browserless (PDF)', unidade: 'PDFs', usado_mes: usadosB, restante: Math.max(0, restB), limite: limiteB, gasto_mes_usd: usadosB * (Number(b.custo_unidade) || 0), ativo_alerta: restB <= 500 });

  // Grok (ainda não usado pelo sistema)
  servicos.push({ id: 'grok', nome: 'Grok (xAI)', unidade: 'US$', usado_mes: 0, restante: cfg.grok?.saldo_usd != null ? Number(cfg.grok.saldo_usd) : null, limite: null, gasto_mes_usd: 0, ativo_alerta: false });
  return { servicos, contaAnthropic: await anthropicContaInteira(), cfg };
}

async function novoAlerta(chave: string, service: string, nivel: 'aviso' | 'critico', titulo: string, mensagem: string): Promise<boolean> {
  const { error } = await admin().from('consumo_alertas').insert({ chave, service, nivel, titulo, mensagem });
  return !error; // chave repetida = já avisado
}

/** Cria os alertas que ainda não foram dados (roda no robô a cada poucos minutos e quando a tela abre). */
export async function avaliarConsumo(): Promise<number> {
  let n = 0;
  const { servicos, cfg } = await estadoConsumo();
  const mes = mesSP();
  const usd = (x: number) => 'US$ ' + x.toFixed(2).replace('.', ',');
  for (const s of servicos) {
    if (s.id === 'anthropic') {
      if (s.restante == null) {
        if (await novoAlerta('claude:sem-saldo', s.id, 'aviso', 'Informe o saldo do Claude', 'Para o painel avisar quando o saldo da IA estiver acabando, informe o saldo atual em Sistema › Consumo › Claude › Informar saldo.')) n++;
        continue;
      }
      const base = new Date(cfg.anthropic?.saldo_em || 0).getTime();
      const r = s.restante;
      const nivel = r <= 0 ? 0 : [0.5, 1, 2, 3, 4, 5].find((t) => r <= t);
      if (nivel != null) {
        const txt = r <= 0 ? 'O saldo do Claude ACABOU: a IA para de atender. Recarregue agora no Console da Anthropic.' : `O saldo do Claude está acabando: restam ${usd(r)}. Recarregue para a IA não parar de atender.`;
        if (await novoAlerta(`claude:${base}:${nivel}`, s.id, r <= 1 ? 'critico' : 'aviso', r <= 0 ? 'Saldo do Claude acabou' : 'Saldo do Claude acabando', txt)) n++;
      }
    }
    if (s.id === 'browserless' && s.restante != null && s.restante <= 500) {
      const nivel = Math.ceil(s.restante / 100) * 100;
      const txt = s.restante <= 0 ? 'Os PDFs do Browserless ACABARAM neste mês: mapas e recibos em PDF param até renovar o plano.' : `Restam ${s.restante} PDFs no Browserless neste mês (de ${s.limite}).`;
      if (await novoAlerta(`browserless:${mes}:${nivel}`, s.id, s.restante <= 100 ? 'critico' : 'aviso', s.restante <= 0 ? 'PDFs do Browserless acabaram' : 'PDFs do Browserless acabando', txt)) n++;
    }
    if (s.id === 'elevenlabs' && s.extra) {
      const blocos = Math.floor((s.extra.usado || 0) / 1000);
      if (blocos >= 1) {
        const rest = s.restante ?? 0;
        if (await novoAlerta(`eleven:${mes}:${blocos}`, s.id, rest <= 2000 ? 'critico' : 'aviso', rest <= 2000 ? 'Créditos da ElevenLabs acabando' : 'Consumo de voz (ElevenLabs)', `${(s.extra.usado || 0).toLocaleString('pt-BR')} créditos usados neste ciclo; restam ${rest.toLocaleString('pt-BR')} de ${(s.limite || 0).toLocaleString('pt-BR')}.`)) n++;
      }
    }
  }
  return n;
}
