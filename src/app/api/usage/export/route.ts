import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Exporta o consumo de IA do mês (cada chamada: dia, tarefa, modelo, tokens, custo, contato) + resumos, em .txt para análise. */
export const GET = withUser(async (req) => {
  const dias = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get('dias')) || 30));
  const db = admin();
  const desde = new Date(Date.now() - dias * 86400_000).toISOString();
  const rows: any[] = [];
  for (let from = 0; from < 60000; from += 1000) {
    const { data } = await db.from('usage_log').select('created_at,kind,task,model,input_tokens,output_tokens,cost_usd,lead_id').eq('kind', 'ai').gte('created_at', desde).order('created_at').range(from, from + 999);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const ids = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))];
  const nomes: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('leads').select('id,name,idioma,stage').in('id', ids.slice(i, i + 200));
    for (const l of data || []) nomes[l.id] = `${l.name} [${l.idioma || ''}/${l.stage || ''}]`;
  }
  const soma = (chave: (r: any) => string) => {
    const m: Record<string, { n: number; usd: number; i: number; o: number }> = {};
    for (const r of rows) { const k = chave(r) || '(sem)'; const x = (m[k] ||= { n: 0, usd: 0, i: 0, o: 0 }); x.n++; x.usd += Number(r.cost_usd) || 0; x.i += Number(r.input_tokens) || 0; x.o += Number(r.output_tokens) || 0; }
    return Object.entries(m).sort((a, b) => b[1].usd - a[1].usd);
  };
  const linha = ([k, v]: [string, any]) => `${k.padEnd(48)} chamadas ${String(v.n).padStart(6)} · US$ ${v.usd.toFixed(3).padStart(8)} · entrada ${String(v.i).padStart(10)} · saída ${String(v.o).padStart(8)}`;
  const total = rows.reduce((a, r) => a + (Number(r.cost_usd) || 0), 0);
  const L: string[] = [`CONSUMO DE IA — últimos ${dias} dias`, `Total: US$ ${total.toFixed(2)} em ${rows.length} chamadas`, '', '=== POR TAREFA ==='];
  L.push(...soma((r) => r.task).map(linha), '', '=== POR MODELO ===', ...soma((r) => r.model).map(linha), '', '=== POR DIA ===', ...soma((r) => new Date(r.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })).map(linha));
  L.push('', '=== 40 CONTATOS QUE MAIS CONSUMIRAM ===', ...soma((r) => (r.lead_id ? nomes[r.lead_id] || r.lead_id : '')).slice(0, 40).map(linha));
  L.push('', '=== CHAMADAS (dia/hora · tarefa · modelo · entrada · saída · US$ · contato) ===');
  for (const r of rows) L.push(`${new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${r.task} · ${r.model} · ${r.input_tokens} · ${r.output_tokens} · ${Number(r.cost_usd).toFixed(4)} · ${r.lead_id ? nomes[r.lead_id] || '' : ''}`);
  return new NextResponse(L.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="consumo-ia-${dias}dias.txt"` } });
}, { perm: 'custos' });
