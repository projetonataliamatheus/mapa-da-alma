import { admin as db } from '@/lib/supabase/admin';
import { paginaDoMapa, chaveEquipe, acessoLiberado, cookieSenha, marcaDoMapa, type MapaRow } from '@/lib/mapa-alma/servico';
import { telaSenha } from '@/lib/mapa-alma/mapa/html';

export const dynamic = 'force-dynamic';
const H = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

/** Mapa ao vivo do cliente: prévia (parte bloqueada) até o pagamento; depois, completo com PDF e protegido por senha. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return new Response('Mapa não encontrado', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const u = new URL(req.url);
  const k = u.searchParams.get('k');
  const equipe = !!k && k === chaveEquipe(m.slug);
  // ?previa=1: mostra o modelo de prévia (com as partes bloqueadas), mesmo de um mapa já liberado
  const previa = u.searchParams.get('previa') === '1';
  if (previa) return new Response(await paginaDoMapa(m as MapaRow, { previa: true }), { headers: H });
  if (!acessoLiberado(m, req, equipe)) return new Response(telaSenha(m.nome, await marcaDoMapa()), { headers: H });
  if (!equipe) {
    await db().from('mapas').update({ views: (m.views || 0) + 1 }).eq('id', m.id).then(() => {}, () => {});
    if (!m.views && m.lead_id)
      await db().from('lead_events').insert({ lead_id: m.lead_id, type: 'preview_view', channel: 'acc', text: `${m.nome.split(' ')[0]} abriu ${m.liberado ? 'o mapa completo' : 'a prévia do mapa'}` }).then(() => {}, () => {});
  }
  const html = await paginaDoMapa(m as MapaRow, { equipe, k: equipe ? k! : undefined });
  return new Response(html, { headers: H });
}

/** Login com a senha do mapa: grava um cookie por 1 ano e volta para o mapa. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const { data: m } = await db().from('mapas').select('*').eq('slug', params.slug).maybeSingle();
  if (!m) return new Response('Mapa não encontrado', { status: 404 });
  const form = await req.formData().catch(() => null);
  const senha = String(form?.get('senha') || '').trim().toUpperCase().replace(/\s/g, '');
  if (!m.senha || senha !== String(m.senha).toUpperCase())
    return new Response(telaSenha(m.nome, await marcaDoMapa(), true), { status: 401, headers: H });
  return new Response(null, { status: 303, headers: { Location: `/mapa/${m.slug}`, 'Set-Cookie': `mapa_${m.slug}=${cookieSenha(m)}; Path=/mapa/${m.slug}; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` } });
}
