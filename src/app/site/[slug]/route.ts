import { admin } from '@/lib/supabase/admin';
import { publicPreview } from '@/lib/preview';
import { templateHtml, renderPremium, themeFor, fillPlaceholders, cityOf } from '@/lib/premium';
import { previewShare, shareTags } from '@/lib/preview-share';

/** Endereço público de quem abriu (atrás do proxy do Easypanel). */
function publicOrigin(req: Request) {
  const h = req.headers;
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
  return host ? `https://${host}` : new URL(req.url).origin;
}

const UNAVAILABLE = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página indisponível</title><div style="font-family:system-ui,sans-serif;min-height:90vh;display:grid;place-items:center;text-align:center;color:#334"><div><h1 style="font-size:22px">Página temporariamente indisponível</h1><p style="color:#667">Fale com quem te enviou este link.</p></div></div>';

export const dynamic = 'force-dynamic';

/** Prévia premium do cliente: o site do modelo com o conteúdo e as cores dele. Público (link enviado no WhatsApp). */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const p: any = await publicPreview(params.slug, true).catch(() => null);
  if (p && p.visible === false) return new Response(UNAVAILABLE, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  const c = p?.content;
  // prévia antiga (simples): abre na página dela
  if (c && c.kind !== 'premium') return Response.redirect(new URL(`/previa/${params.slug}`, publicOrigin(req)), 302);
  if (!c) return new Response('<h1 style="font-family:sans-serif">Prévia não encontrada</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const { data: tpl } = await admin().from('premium_templates').select('*').eq('slug', c.template).maybeSingle();
  if (!tpl) return new Response('<h1 style="font-family:sans-serif">Modelo indisponível no momento</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  // cores refeitas na hora (pega melhorias do sistema) e nenhum campo vazio/UNKNOWN, mesmo em prévias antigas
  const theme = (c.colors && themeFor(c.colors)) || c.theme;
  const site = c.site ? fillPlaceholders(c.site, tpl.content, cityOf(c.site)) : c.site;
  let html = renderPremium(await templateHtml(tpl), { site, theme, title: c.title });
  // título e imagem de compartilhamento (WhatsApp/Instagram): "Nome | Nicho na região de Cidade"
  const info = await previewShare(params.slug).catch(() => null);
  if (info) {
    const origin = publicOrigin(req);
    const host = new URL(origin).host;
    const url = host.startsWith('previa.') ? `${origin}/${params.slug}` : `${origin}/previa/${params.slug}`;
    const tags = shareTags(info, url, `${origin}/api/og/previa/${params.slug}`);
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<head([^>]*)>/i, (m) => m + tags);
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
