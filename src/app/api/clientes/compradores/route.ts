import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { nascimentoDe } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '');

/** Lista de clientes compradores em Excel (.xlsx): um pagamento confirmado por linha, com os dados do comprador e o que foi enviado ao Meta. */
export const GET = withUser(async () => {
  const db = admin();
  const pags: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('payments').select('id,lead_id,provider,provider_id,service,amount,status,paid_at,method,moeda,valor_local').eq('status', 'pago').order('paid_at', { ascending: false }).range(from, from + 999);
    pags.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const ids = [...new Set(pags.map((p) => p.lead_id).filter(Boolean))];
  const leads: Record<string, any> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('leads').select('id,name,whatsapp,pais,idioma,gender,source,campaign,campanha_id,cortesia,is_client,client_since,memory').in('id', ids.slice(i, i + 200));
    for (const l of data || []) leads[l.id] = l;
  }
  const meta: Record<string, string[]> = {};
  const { data: ev } = await db.from('meta_eventos').select('lead_id,evento,ok').eq('ok', true).limit(20000).then((r: any) => r, () => ({ data: [] }));
  for (const e of ev || []) (meta[e.lead_id] ||= []).push(e.evento);

  const rows = pags.filter((p) => leads[p.lead_id] && !leads[p.lead_id].cortesia).map((p) => {
    const l = leads[p.lead_id];
    const m = l.memory || {}, c = m.cliente || {};
    const nasc = nascimentoDe(l);
    const origem = m.site?.ref ? 'Site (teste gratuito)' : l.campanha_id || m.ads?.ad_id || l.source === 'anuncio' ? 'Anúncio (WhatsApp)' : l.source || 'Orgânico';
    return {
      'Data da compra': fmt(p.paid_at),
      'Nome completo': m.mapa_nome_completo || c.nome || l.name,
      'Nome no WhatsApp': l.name,
      'WhatsApp': l.whatsapp,
      'E-mail': c.email || m.email || '',
      'País': String(c.pais || l.pais || 'BR').toUpperCase(),
      'Idioma': l.idioma,
      'Nascimento': m.mapa_nascimento || '',
      'Idade': nasc?.idade ?? '',
      'Signo': m.signo || '',
      'Gênero': l.gender || '',
      'Cidade': c.cidade || '',
      'Estado': c.estado || '',
      'CEP': c.cep || '',
      'Produto': p.service || '',
      'Valor pago': Number(p.valor_local ?? p.amount) || 0,
      'Moeda': p.moeda || 'BRL',
      'Gateway': p.provider,
      'Forma de pagamento': p.method || '',
      'Pedido / ID': p.provider_id || '',
      'Origem': origem,
      'Campanha': l.campaign || '',
      'ID do anúncio': m.ads?.ad_id || '',
      'UTM source': m.site?.utm?.utm_source || '',
      'UTM campaign': m.site?.utm?.utm_campaign || '',
      'Compra enviada ao Meta': (meta[l.id] || []).includes('Purchase') || (m.capi || []).includes('Purchase') ? 'Sim' : 'Não',
      'Cliente desde': fmt(l.client_since),
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || { a: 1 }).map((k) => ({ wch: Math.min(40, Math.max(12, k.length + 2)) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes compradores');
  const porMoeda: Record<string, { n: number; total: number }> = {};
  for (const r of rows) { const x = (porMoeda[r['Moeda']] ||= { n: 0, total: 0 }); x.n++; x.total += r['Valor pago']; }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(porMoeda).map(([moeda, v]) => ({ Moeda: moeda, Vendas: v.n, Total: v.total }))), 'Resumo');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="clientes-compradores-${new Date().toISOString().slice(0, 10)}.xlsx"` } });
}, { perm: 'financeiro' });
