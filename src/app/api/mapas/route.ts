import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { criarMapa, linkMapa, chaveEquipe } from '@/lib/mapa-alma/servico';
import { montarConteudo, montarCasal } from '@/lib/mapa-alma/mapa/conteudo';

export const dynamic = 'force-dynamic';

const comLinks = (m: any) => ({ ...m, url: linkMapa(m), url_equipe: `${linkMapa(m)}?k=${chaveEquipe(m.slug)}`, pdf_equipe: `${linkMapa(m)}/pdf?k=${chaveEquipe(m.slug)}` });

/** Lista dos mapas + números do mês. ?calcular=1&nome=&nascimento= devolve só o resumo (prévia instantânea no gerador). */
export const GET = withUser(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get('calcular')) {
    try {
      const n = u.searchParams.get('nome') || '', d = u.searchParams.get('nascimento') || '';
      const n2 = u.searchParams.get('nome2') || '', d2 = u.searchParams.get('nascimento2') || '';
      const c = n2 && d2 ? montarCasal(n, d, n2, d2) : montarConteudo(n, d);
      return NextResponse.json({ resumo: c.resumo, signo: c.signo });
    } catch (e: any) {
      return NextResponse.json({ error: 'Confira o nome e a data.' }, { status: 400 });
    }
  }
  const q = (u.searchParams.get('q') || '').trim();
  let sel = db().from('mapas').select('*, leads(id,name,whatsapp,memory)').order('created_at', { ascending: false }).limit(300);
  if (q) sel = sel.or(`nome.ilike.%${q}%,nome2.ilike.%${q}%`);
  const { data, error } = await sel;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const inicio = new Date(); inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
  const lista = (data || []).map(comLinks);
  const mes = lista.filter((m: any) => new Date(m.created_at) >= inicio);
  return NextResponse.json({
    mapas: lista,
    kpis: { mes: mes.length, liberados_mes: mes.filter((m: any) => m.liberado).length, previas_mes: mes.filter((m: any) => !m.liberado).length, views: lista.reduce((s: number, m: any) => s + (m.views || 0), 0) },
  });
});

/** Cria um mapa pelo painel (prévia ou já liberado). */
export const POST = withUser(async (req) => {
  const b = await req.json();
  const m = await criarMapa({ leadId: b.lead_id || null, tipo: b.tipo === 'casal' ? 'casal' : 'pessoal', nome: b.nome, nascimento: b.nascimento, nome2: b.nome2, nascimento2: b.nascimento2, liberado: !!b.liberado, by: 'equipe' });
  return NextResponse.json(comLinks(m));
});
