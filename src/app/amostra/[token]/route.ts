import { admin } from '@/lib/supabase/admin';
import { templateHtml, renderPremium } from '@/lib/premium';
import { readSampleToken } from '@/lib/sample-link';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const page = (title: string, msg: string) =>
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><body style="margin:0;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;background:#f5f6f8;color:#101828;text-align:center;padding:24px"><div><div style="font-size:42px">⏳</div><h1 style="font-size:22px;margin:8px 0">${title}</h1><p style="color:#667085;max-width:360px;margin:0 auto">${msg}</p></div></body></html>`;

/** Modelo aberto por link provisório (público, sem login). Depois do prazo mostra "link expirado". */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const t = readSampleToken(params.token);
  const head = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (!t) return new Response(page('Link inválido', 'Peça um novo link para quem te enviou.'), { status: 404, headers: head });
  if (t.expired) return new Response(page('Este link expirou', 'Era um link provisório para ver o modelo. Peça um novo para quem te atendeu 😊'), { status: 410, headers: head });
  const { data: tpl } = await admin().from('premium_templates').select('*').eq('slug', t.slug).maybeSingle();
  if (!tpl?.build_ok) return new Response(page('Modelo indisponível', 'Peça um novo link para quem te enviou.'), { status: 404, headers: head });
  const s: any = await getSettings(admin());
  const until = t.expires.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  let html = renderPremium(await templateHtml(tpl), { title: `Modelo de site · ${s.company_name || ''}`, ribbon: `Modelo de exemplo · ${s.company_name || 'Agência'} · link válido até ${until}` });
  html = html.replace(/<head([^>]*)>/i, (m) => `${m}<meta name="robots" content="noindex"><meta property="og:title" content="Modelo de site para o seu negócio"><meta property="og:description" content="Veja este modelo e me diga se gostou ✨ (link provisório)">`);
  return new Response(html, { headers: head });
}
