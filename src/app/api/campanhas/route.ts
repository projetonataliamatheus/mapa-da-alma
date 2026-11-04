import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { ORIGENS } from '@/lib/mapa-alma/campanhas';

export const dynamic = 'force-dynamic';

/** Menu Campanhas: campanhas cadastradas + números de cada uma (conversas, vendas, receita, conversão). */
export const GET = withUser(async () => {
  const { data, error } = await db().from('campanhas').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ campanhas: [], origens: ORIGENS, aviso: /campanhas/.test(error.message) ? 'Rode o SQL 054 no Supabase para ativar as Campanhas.' : error.message });
  const { data: leads } = await db().from('leads').select('campanha_id,campaign,source,stage,paid_amount,created_at').gte('created_at', new Date(Date.now() - 365 * 86400000).toISOString()).limit(20000);
  const st: Record<string, any> = {};
  let semCampanha = { conversas: 0, vendas: 0, receita: 0 };
  for (const l of leads || []) {
    const c = (data || []).find((x: any) => x.id === l.campanha_id) || (!l.campanha_id && l.campaign ? (data || []).find((x: any) => x.nome === l.campaign) : null);
    const alvo = c ? (st[c.id] ||= { conversas: 0, vendas: 0, receita: 0, primeira: null, ultima: null }) : semCampanha;
    alvo.conversas++;
    if (l.stage === 'pago') { alvo.vendas++; alvo.receita += Number(l.paid_amount || 0); }
    if (c) {
      if (!alvo.primeira || l.created_at < alvo.primeira) alvo.primeira = l.created_at;
      if (!alvo.ultima || l.created_at > alvo.ultima) alvo.ultima = l.created_at;
    }
  }
  const { data: fluxos } = await db().from('fluxos').select('id,nome,ativo');
  return NextResponse.json({ campanhas: (data || []).map((c: any) => ({ ...c, stats: st[c.id] || { conversas: 0, vendas: 0, receita: 0 } })), origens: ORIGENS, fluxos: fluxos || [], semCampanha });
}, { perm: 'campanhas' });

export const POST = withUser(async (req, _ctx, user) => {
  need(user, 'campanhas');
  const b = await req.json();
  if (b.action === 'excluir') {
    await db().from('campanhas').delete().eq('id', b.id);
    return NextResponse.json({ ok: true });
  }
  const row: any = {
    nome: String(b.nome || '').trim().slice(0, 120),
    origem: ORIGENS[b.origem] ? b.origem : 'meta',
    mensagem: b.mensagem ? String(b.mensagem).trim().slice(0, 1000) : null,
    palavras: b.palavras ? String(b.palavras).slice(0, 1000) : null,
    inicio: b.inicio || null,
    fim: b.fim || null,
    ativo: b.ativo !== false,
    fluxo_id: b.fluxo_id || null,
    idioma: b.idioma === 'es' || b.idioma === 'pt' ? b.idioma : null,
    verba: b.verba !== '' && b.verba != null ? Number(String(b.verba).replace(',', '.')) || null : null,
    notas: b.notas ? String(b.notas).slice(0, 2000) : null,
    updated_at: new Date().toISOString(),
  };
  if (!row.nome) return NextResponse.json({ error: 'Dê um nome para a campanha.' }, { status: 400 });
  const r = b.id ? await db().from('campanhas').update(row).eq('id', b.id).select().single() : await db().from('campanhas').insert(row).select().single();
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, campanha: r.data });
}, { perm: 'campanhas' });
