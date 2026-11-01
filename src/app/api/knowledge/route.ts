import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { saveDocument, relearn, rebuildBrain, digestNext, explainAiError, deleteInsights, rateInsights, deleteDocument, syncActiveBase } from '@/lib/knowledge';

/** Refaz o Cérebro de vendas em segundo plano (a tela não precisa esperar). */
function rebuildLater() {
  rebuildBrain(true).catch((e) => console.error('cérebro de vendas:', e?.message || e));
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Envia um PDF (livros de qualquer tamanho) ou um texto para a base de conhecimento. */
export const POST = withUser(async (req) => {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const { name, text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Cole algum texto.' }, { status: 400 });
    const doc = await saveDocument(name || 'Anotação da equipe', 'texto', text, null);
    return NextResponse.json(doc);
  }
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Escolha um arquivo PDF.' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  let text = '';
  let pages: number | null = null;
  if (file.name.toLowerCase().endsWith('.pdf')) {
    // @ts-ignore - caminho interno evita o arquivo de teste do pacote
    const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const parsed = await pdf(buf, { max: 0 });
    text = parsed.text;
    pages = parsed.numpages;
  } else {
    text = buf.toString('utf8');
  }
  const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letters < 500)
    return NextResponse.json(
      { error: 'Não consegui ler o texto deste PDF. Ele parece ser escaneado (só imagens). Envie uma versão com texto selecionável.' },
      { status: 400 },
    );
  const name = file.name.replace(/\.(pdf|txt|md)$/i, '');
  const { data: same } = await admin().from('knowledge_docs').select('id,status').ilike('name', name.replace(/[%_]/g, '\\$&')).neq('status', 'erro').limit(1);
  if (same?.length) return NextResponse.json({ error: 'Este livro já está na base (mesmo nome). Não precisa enviar de novo.' }, { status: 409 });
  const doc = await saveDocument(name, 'pdf', text, pages);
  return NextResponse.json(doc);
}, { perm: 'conhecimento.enviar' });

/** Ações: reaprender um livro ou atualizar o Cérebro de vendas. */
export const PATCH = withUser(async (req) => {
  const body = await req.json();
  const { id, action } = body;
  if (action === 'relearn' && id) {
    await relearn(id);
    return NextResponse.json({ ok: true });
  }
  if (action === 'digest') {
    // estuda pelo próprio painel por até ~3 min e mostra o resultado (diagnóstico e plano B do robô)
    const started = Date.now();
    let parts = 0;
    try {
      while (Date.now() - started < 175_000) {
        const worked = await digestNext();
        if (!worked) break;
        parts++;
      }
      return NextResponse.json({ ok: true, parts });
    } catch (e: any) {
      return NextResponse.json({ ok: false, parts, error: explainAiError(e), raw: String(e?.message || e).slice(0, 400) });
    }
  }
  if (action === 'sync') {
    // Sincronizar base ativa: tira órfãos e técnicas de linguagem corporal; refaz o cérebro só com os livros da lista
    const r = await syncActiveBase();
    rebuildLater();
    return NextResponse.json(r);
  }
  if (action === 'priority' && id) {
    const priority = body.priority === 'primario' ? 'primario' : 'secundario';
    const { error } = await admin().from('knowledge_docs').update({ priority }).eq('id', id);
    if (error) return NextResponse.json({ error: /priority/.test(error.message) ? 'Rode a migração 013_base_ativa.sql no Supabase.' : error.message }, { status: 400 });
    return NextResponse.json({ ok: true, priority });
  }
  if (action === 'delete_insights') {
    const n = await deleteInsights(Array.isArray(body.ids) ? body.ids : []);
    return NextResponse.json({ deleted: n });
  }
  if (action === 'delete_weak') {
    const { data } = await admin().from('knowledge_insights').select('id').lt('quality', Number(body.below) || 4).limit(5000);
    const n = await deleteInsights((data || []).map((x: any) => x.id));
    return NextResponse.json({ deleted: n });
  }
  if (action === 'rate') {
    let n = 0;
    const started = Date.now();
    while (Date.now() - started < 150_000) {
      const k = await rateInsights(40);
      if (!k) break;
      n += k;
    }
    return NextResponse.json({ rated: n });
  }
  if (action === 'brain') {
    const content = await rebuildBrain(true);
    return NextResponse.json({ content });
  }
  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}, { perm: 'conhecimento.enviar' });

export const DELETE = withUser(async (req) => {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Material não informado.' }, { status: 400 });
  try {
    // exclusão em cascata: técnicas aprendidas + trechos + o material
    const r = await deleteDocument(id);
    rebuildLater(); // o cérebro deixa de ter qualquer coisa deste livro
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}, { perm: 'conhecimento.enviar' });
