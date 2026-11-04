import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (req) => {
  const es = new URL(req.url).searchParams.get('idioma') === 'es';
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const m: any = (data as any)?.data?.mapa_marca || {};
  const u = es ? m.apresentacao_url_es : m.apresentacao_url || '/apresentacao-mapa.jpg';
  return u ? NextResponse.redirect(new URL(u, req.url)) : NextResponse.json({ error: 'Nenhuma imagem enviada para este idioma.' }, { status: 404 });
}, { perm: ['mapas', 'conversas'] });

/** Imagem de apresentação do mapa, uma por idioma (pt e es). multipart: file + idioma. json: { idioma, remover:true }. */
export const POST = withUser(async (req, _ctx, user) => {
  need(user, 'mapas');
  const ct = req.headers.get('content-type') || '';
  let idioma = 'pt', url: string | null = null;
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const f = form.get('file') as File | null;
    idioma = form.get('idioma') === 'es' ? 'es' : 'pt';
    if (!f) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    if (!(f.type || '').startsWith('image/')) return NextResponse.json({ error: 'Envie uma imagem (JPG ou PNG).' }, { status: 400 });
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Imagem grande demais (máx. 15 MB).' }, { status: 400 });
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    const path = `apresentacao/${idioma}-${Date.now().toString(36)}.${ext}`;
    const up = await db().storage.from('publico').upload(path, Buffer.from(await f.arrayBuffer()), { contentType: f.type, cacheControl: '31536000' });
    if (up.error) return NextResponse.json({ error: 'Não consegui guardar a imagem: ' + up.error.message }, { status: 400 });
    url = db().storage.from('publico').getPublicUrl(path).data.publicUrl;
  } else {
    const b = await req.json();
    idioma = b.idioma === 'es' ? 'es' : 'pt';
  }
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const s: any = (data as any)?.data || {};
  const marca = { ...(s.mapa_marca || {}), [idioma === 'es' ? 'apresentacao_url_es' : 'apresentacao_url']: url };
  const { error } = await db().from('settings').upsert({ id: 1, data: { ...s, mapa_marca: marca }, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, url, idioma });
}, { perm: 'mapas' });
