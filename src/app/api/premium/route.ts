import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { ghConfig, ghConfigured, repoUrl, lastBuildRun } from '@/lib/github';
import { syncTemplates, importZip, renameTemplate, deleteTemplate, rankTemplates, duplicateTemplate, setAudience, saveEdits, uploadAsset } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/** Lista os modelos premium (com ?lead=ID, em ordem do que mais combina com o cliente). */
export const GET = withUser(async (req) => {
  const url = new URL(req.url);
  const leadId = url.searchParams.get('lead');
  const one = url.searchParams.get('slug');
  const db = admin();
  // um modelo com o conteúdo inteiro (editor visual)
  if (one) {
    const { data } = await db.from('premium_templates').select('*').eq('slug', one).maybeSingle();
    if (!data) return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 });
    const { embedding: _e, ...tpl } = data as any;
    return NextResponse.json({ template: tpl });
  }
  const c = ghConfig();
  const info = { configured: ghConfigured(), repo: c.repo, dir: c.dir, url: ghConfigured() ? repoUrl() : null };
  if (leadId) {
    const { data: lead } = await db.from('leads').select('*').eq('id', leadId).maybeSingle();
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    const list = await rankTemplates(lead, 20).catch(() => []);
    return NextResponse.json({ ...info, chosen: lead.premium_template || null, niche: lead.niche || lead.memory?.negocio || null, templates: list });
  }
  let r: any = await db.from('premium_templates').select('slug,name,niche,niches,keywords,style,description,thumb_url,build_ok,build_error,status,active,uses,updated_at,audience,family,edited_at').order('name');
  // sem a migração 020 ainda: lista sem público/família
  if (r.error) r = await db.from('premium_templates').select('slug,name,niche,niches,keywords,style,description,thumb_url,build_ok,build_error,status,active,uses,updated_at').order('name');
  const { data, error } = r;
  const run = ghConfigured() ? await lastBuildRun().catch(() => null) : null;
  return NextResponse.json({ ...info, missingTable: !!error, run, templates: data || [] });
}, { perm: ['modelos', 'modelos_premium'] });

/** Envia um .zip da Arena para a pasta Modelos do GitHub (novo ou substituindo). */
export const POST = withUser(async (req, _ctx, user) => {
  need(user, 'modelos.editar');
  const form = await req.formData();
  // imagem do editor visual
  const asset = form.get('asset') as File | null;
  if (asset) {
    try {
      return NextResponse.json({ url: await uploadAsset(String(form.get('slug') || 'geral'), asset) });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  const file = form.get('file') as File | null;
  const name = String(form.get('name') || '').trim();
  const niche = String(form.get('niche') || '').trim() || null;
  const replace = String(form.get('replace') || '').trim() || null;
  if (!file) return NextResponse.json({ error: 'Escolha o arquivo .zip do modelo.' }, { status: 400 });
  if (!/\.zip$/i.test(file.name)) return NextResponse.json({ error: 'Envie em .zip (a Arena já baixa em .zip). Arquivos .rar não são aceitos.' }, { status: 400 });
  if (!name && !replace) return NextResponse.json({ error: 'Dê um nome ao modelo (ex.: Fisioterapia Premium).' }, { status: 400 });
  try {
    let label = name;
    if (replace && !label) label = (await admin().from('premium_templates').select('name').eq('slug', replace).maybeSingle()).data?.name || replace;
    const r = await importZip(Buffer.from(await file.arrayBuffer()), label, niche, replace);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}, { perm: ['modelos', 'modelos_premium'] });

/** sync · rename · delete · active · choose (modelo do cliente) · duplicate · audience · edit (editor visual) */
export const PATCH = withUser(async (req, _ctx, user) => {
  const b = await req.json();
  const db = admin();
  try {
    switch (b.action) {
      case 'sync':
        return NextResponse.json(await syncTemplates());
      case 'rename':
        need(user, 'modelos.editar');
        await renameTemplate(b.slug, String(b.name || '').trim() || b.slug, b.niche ?? undefined);
        return NextResponse.json({ ok: true });
      case 'delete':
        need(user, 'modelos.editar');
        await deleteTemplate(b.slug);
        return NextResponse.json({ ok: true });
      case 'duplicate':
        need(user, 'modelos.editar');
        return NextResponse.json({ ok: true, ...(await duplicateTemplate(b.slug, { audience: b.audience, name: b.name || null, originalAudience: b.original_audience })) });
      case 'audience':
        need(user, 'modelos.editar');
        return NextResponse.json({ ok: true, audience: await setAudience(b.slug, b.audience) });
      case 'edit':
        need(user, 'modelos.editar');
        await saveEdits(b.slug, b.content, user?.email || null);
        return NextResponse.json({ ok: true });
      case 'active':
        need(user, 'modelos.editar');
        await db.from('premium_templates').update({ active: !!b.active }).eq('slug', b.slug);
        return NextResponse.json({ ok: true });
      case 'choose':
        need(user, 'previas.gerar');
        await db.from('leads').update({ premium_template: b.slug || null }).eq('id', b.lead);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}, { perm: ['modelos', 'modelos_premium'] });
