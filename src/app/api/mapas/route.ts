import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { isMaster, can } from '@/lib/perms';
import { admin as db } from '@/lib/supabase/admin';
import { criarMapa, linkMapa, chaveEquipe } from '@/lib/mapa-alma/servico';
import { montarConteudo, montarCasal } from '@/lib/mapa-alma/mapa/conteudo';

export const dynamic = 'force-dynamic';

const comLinks = (m: any) => ({ ...m, url: linkMapa(m), url_equipe: `${linkMapa(m)}?k=${chaveEquipe(m.slug)}`, pdf_equipe: `${linkMapa(m)}/pdf?k=${chaveEquipe(m.slug)}` });

/** Lista dos mapas + números do mês. ?calcular=1&nome=&nascimento= devolve só o resumo (prévia instantânea no gerador). */
export const GET = withUser(async (req, _ctx, user) => {
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
  const busca = (privados: boolean) => {
    let sel = db().from('mapas').select('*, leads(id,name,whatsapp,memory)').order('created_at', { ascending: false }).limit(300);
    if (q) sel = sel.or(`nome.ilike.%${q}%,nome2.ilike.%${q}%`);
    // mapas privados: só quem marcou como privado vê
    if (privados) sel = sel.or(`privado_de.is.null,privado_de.eq.${user.id}`);
    return sel;
  };
  let { data, error } = await busca(true);
  // banco ainda sem a coluna (SQL 047 não rodado): lista normal, sem mapas privados
  if (error && /privado_de/.test(error.message)) ({ data, error } = await busca(false));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const inicio = new Date(); inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
  const lista = (data || []).map(comLinks);
  // de qual site veio (BR/Espanhol), país e WhatsApp informado no teste grátis
  const slugs = lista.map((m: any) => m.slug).filter(Boolean);
  const { data: sl } = slugs.length ? await db().from('site_leads').select('mapa_slug,site,idioma,pais,whatsapp,recup_status').in('mapa_slug', slugs.slice(0, 300)) : { data: [] as any[] };
  const porSlug = new Map((sl || []).map((x: any) => [x.mapa_slug, x]));
  for (const m of lista as any[]) { const x: any = porSlug.get(m.slug); if (x) m.site_info = { site: x.site || (x.idioma === 'pt' ? 'br' : 'es'), pais: x.pais, whatsapp: x.whatsapp, recup: x.recup_status }; }
  const mes = lista.filter((m: any) => new Date(m.created_at) >= inicio);
  return NextResponse.json({
    mapas: lista,
    pode_privar: isMaster(user.member),
    kpis: { mes: mes.length, liberados_mes: mes.filter((m: any) => m.liberado).length, previas_mes: mes.filter((m: any) => !m.liberado).length, views: lista.reduce((s: number, m: any) => s + (m.views || 0), 0) },
  });
}, { perm: 'mapas' });

/** Cria um mapa pelo painel (prévia ou já liberado). */
export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json();
  if (b.liberado && !can(user.member, 'mapas.liberar')) return NextResponse.json({ error: 'Seu acesso não permite liberar o mapa completo.' }, { status: 403 });
  const m = await criarMapa({ leadId: b.lead_id || null, tipo: b.tipo === 'casal' ? 'casal' : 'pessoal', nome: b.nome, nascimento: b.nascimento, nome2: b.nome2, nascimento2: b.nascimento2, liberado: !!b.liberado, by: 'equipe', porUsuario: user.id }).catch((e: any) => e as Error);
  if (m instanceof Error) return NextResponse.json({ error: /Erro ao gerar mapa/.test(m.message) ? 'Erro ao gerar mapa.' : m.message }, { status: 400 });
  if ((m as any).existente && (m as any).privado_de && (m as any).privado_de !== user.id) return NextResponse.json({ error: 'Erro ao gerar mapa.' }, { status: 409 });
  // mapa privado: só o Master escolhe (e só ele vê)
  if (b.privado && isMaster(user.member)) {
    await db().from('mapas').update({ privado_de: user.id }).eq('id', m.id);
    (m as any).privado_de = user.id;
  }
  return NextResponse.json(comLinks(m));
}, { perm: 'mapas.gerar' });
