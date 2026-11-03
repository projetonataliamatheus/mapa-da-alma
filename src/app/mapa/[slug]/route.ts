import { admin as db } from '@/lib/supabase/admin';
import { paginaDoMapa, chaveEquipe, acessoLiberado, cookieSenha, marcaDoMapa, type MapaRow } from '@/lib/mapa-alma/servico';
import { telaSenha } from '@/lib/mapa-alma/mapa/html';
import { estadoPrevia } from '@/lib/mapa-alma/servico';

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
  // prévia com bloqueios: a contagem começa quando o cliente abre o link; passou o tempo, a prévia expira (a equipe pode renovar)
  if (!equipe && !m.liberado && m.tipo !== 'casal') {
    const ep = await estadoPrevia(m as any);
    if (ep.cfg.ativo) {
      if (!m.previa_inicio) await db().from('mapas').update({ previa_inicio: new Date().toISOString() }).eq('id', m.id).then(() => {}, () => {});
      else if (ep.expirou) return new Response(telaExpirada(m.nome, await marcaDoMapa()), { headers: H });
    }
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

function telaExpirada(nome: string, marca: { nome: string; whatsapp?: string }) {
  const wa = marca.whatsapp ? String(marca.whatsapp).replace(/\D/g, '') : '';
  const e = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(marca.nome)}</title><meta name="robots" content="noindex"></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 65%,#0d0620);color:#fff;font-family:system-ui,Arial,sans-serif;text-align:center;padding:20px">
<div style="max-width:380px"><div style="font-size:44px">⏳</div><h1 style="color:#f3dfa2;font-size:22px">A prévia do mapa de ${e(nome.split(' ')[0])} expirou</h1>
<p style="opacity:.9">O tempo da prévia acabou. Fale com a gente no WhatsApp que a gente reabre o seu mapa para você.</p>
${wa ? `<p><a href="https://wa.me/${wa}?text=${encodeURIComponent('Minha prévia do Mapa da Alma expirou. Pode reabrir?')}" style="display:inline-block;background:linear-gradient(135deg,#f3dfa2,#c9a24a);color:#2a1259;font-weight:700;padding:14px 22px;border-radius:14px;text-decoration:none">Reabrir meu mapa ✨</a></p>` : ''}</div></body></html>`;
}
