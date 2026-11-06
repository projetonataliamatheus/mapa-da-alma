import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Conferência do Pixel (últimos 30 dias): vendas confirmadas × compras enviadas ao Meta, duplicidades,
 * e-mails coletados e o que cada evento levou. Só confere; não envia nada ao Meta.
 */
export const GET = withUser(async () => {
  const db = admin();
  const desde = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: pags } = await db.from('payments').select('id,lead_id,provider,amount,moeda,valor_local,paid_at').eq('status', 'pago').gte('paid_at', desde).limit(2000);
  const ids = [...new Set((pags || []).map((p: any) => p.lead_id).filter(Boolean))] as string[];
  const leads: Record<string, any> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('leads').select('id,name,cortesia,source,campanha_id,memory').in('id', ids.slice(i, i + 200));
    for (const l of data || []) leads[l.id] = l;
  }
  const { data: ev } = await db.from('meta_eventos').select('lead_id,evento,ok,resposta,campos,created_at,teste').gte('created_at', desde).order('created_at', { ascending: false }).limit(5000);
  const eventos = ev || [];
  const compras: Record<string, number> = {};
  for (const e of eventos) if (e.evento === 'Purchase' && e.ok && !e.teste) compras[e.lead_id] = (compras[e.lead_id] || 0) + 1;

  const vendas = (pags || []).filter((p: any) => leads[p.lead_id] && !leads[p.lead_id].cortesia);
  const porGateway: Record<string, number> = {};
  const semCompra: any[] = [];
  let comEmail = 0;
  for (const p of vendas) {
    const l = leads[p.lead_id];
    porGateway[p.provider] = (porGateway[p.provider] || 0) + 1;
    if (l.memory?.cliente?.email || l.memory?.email) comEmail++;
    if (!compras[l.id]) {
      const veioDeAnuncio = !!(l.campanha_id || l.source === 'anuncio' || l.memory?.ads?.ad_id || l.memory?.ads?.ctwa_clid || l.memory?.site?.ref);
      semCompra.push({ nome: l.name, pago_em: p.paid_at, motivo: !veioDeAnuncio ? 'não veio de anúncio/site (não vai ao Meta)' : l.memory?.capi?.includes?.('Purchase') ? 'enviada antes da auditoria existir' : (l.memory?.cliente?.email || l.memory?.email) ? 'pendente: o robô envia em até 10 min' : 'aguardando o e-mail (até 15 min) ou falha: veja os recusados' });
    }
  }
  const duplicadas = Object.entries(compras).filter(([, n]) => n > 1).map(([id, n]) => ({ nome: leads[id]?.name || id, vezes: n }));
  const recusados = eventos.filter((e: any) => !e.ok).slice(0, 10).map((e: any) => ({ evento: e.evento, em: e.created_at, motivo: e.resposta }));
  // cobertura de cada dado nos eventos enviados
  const ok = eventos.filter((e: any) => e.ok && !e.teste);
  const cobertura: Record<string, number> = {};
  for (const campo of ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'db', 'ge', 'external_id', 'fbp', 'fbc', 'client_ip_address', 'client_user_agent']) cobertura[campo] = ok.length ? Math.round((ok.filter((e: any) => (e.campos || []).includes(campo)).length / ok.length) * 100) : 0;
  return NextResponse.json({
    vendas: vendas.length, por_gateway: porGateway, compras_enviadas: Object.keys(compras).length, com_email: comEmail,
    sem_compra: semCompra.slice(0, 20), duplicadas, recusados, cobertura, eventos_enviados: ok.length,
  });
}, { perm: 'custos' });
