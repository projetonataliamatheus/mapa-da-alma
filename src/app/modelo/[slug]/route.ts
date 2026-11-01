import { admin } from '@/lib/supabase/admin';
import { currentMember } from '@/lib/supabase/server';
import { templateHtml, renderPremium } from '@/lib/premium';
import { markContent } from '@/lib/premium-edit';
import { EDITOR_JS } from '@/lib/premium-editor-script';

export const dynamic = 'force-dynamic';

/** Visão interna do modelo como ele é (sem os dados de nenhum cliente). Só para a equipe logada. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const edit = new URL(req.url).searchParams.get('edit') === '1';
  const me = await currentMember();
  if (!me?.member) return new Response('Faça login no painel para ver o modelo.', { status: 401 });
  const { data: tpl } = await admin().from('premium_templates').select('*').eq('slug', params.slug).maybeSingle();
  if (!tpl?.build_ok) return new Response('<h1 style="font-family:sans-serif">Modelo ainda compilando ou com erro. Veja em Modelos premium.</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  if (edit) {
    // modo edição (editor visual): textos e imagens marcados + script que deixa tudo clicável
    let html = renderPremium(await templateHtml(tpl), { site: markContent(tpl.content || {}), title: `Editando: ${tpl.name}` });
    html = html.replace(/<\/body>/i, () => `<script>${EDITOR_JS}</script></body>`);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'SAMEORIGIN' } });
  }
  const html = renderPremium(await templateHtml(tpl), { title: `Modelo: ${tpl.name}`, ribbon: `Modelo "${tpl.name}" · visão interna, sem os dados do cliente` });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
