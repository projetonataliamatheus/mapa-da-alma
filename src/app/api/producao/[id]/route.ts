import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { logEvent } from '@/lib/engine';
import { refreshProject, ensureClientFolder, PRODUCTION_STEPS } from '@/lib/production';
import { driveReady } from '@/lib/drive';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/**
 * Ações da Produção:
 *  status   → muda a etapa (fila, materiais, producao, revisao, entregue, pausado)
 *  update   → responsável, prazo, anotações, tarefas
 *  refresh  → refaz o resumo do projeto e o Google Docs agora
 *  start    → coloca um cliente na Produção manualmente
 *  folder   → cria/confere a pasta no Drive agora
 */
export const POST = withUser(async (req, ctx, user) => {
  const id = ctx.params.id;
  const body = await req.json();
  const db = admin();
  const { data: lead } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  need(user, 'producao.editar');
  const who = user.member?.name || user.email;
  try {
    switch (body.action) {
      case 'status': {
        const st = String(body.status || '');
        if (!PRODUCTION_STEPS.some((x) => x[0] === st)) return NextResponse.json({ error: 'Etapa inválida.' }, { status: 400 });
        const patch: any = { production_status: st, doc_dirty: true };
        if (st === 'entregue') patch.delivered_at = new Date().toISOString();
        if (st === 'producao' && !lead.production_started_at) patch.production_started_at = new Date().toISOString();
        await db.from('leads').update(patch).eq('id', id);
        await logEvent(id, 'production', 'acc', `${who} moveu ${lead.name} para "${PRODUCTION_STEPS.find((x) => x[0] === st)?.[1]}"`);
        break;
      }
      case 'update': {
        const patch: any = {};
        if ('owner' in body) patch.production_owner = body.owner || null;
        if ('due' in body) patch.production_due = body.due || null;
        if ('notes' in body) patch.production_notes = String(body.notes || '').slice(0, 8000);
        if (Array.isArray(body.tasks)) patch.project_tasks = body.tasks.slice(0, 80).map((t: any) => ({ title: String(t.title || '').slice(0, 200), done: !!t.done, ...(t.manual ? { manual: true } : {}) })).filter((t: any) => t.title);
        await db.from('leads').update(patch).eq('id', id);
        break;
      }
      case 'refresh':
        await refreshProject(id);
        break;
      case 'start':
        await db.from('leads').update({ production_status: lead.production_status || 'fila', production_started_at: lead.production_started_at || new Date().toISOString(), doc_dirty: true }).eq('id', id);
        await logEvent(id, 'production', 'acc', `${who} colocou ${lead.name} na Produção`);
        break;
      case 'folder':
        if (!(await driveReady())) return NextResponse.json({ error: 'Conecte o Google Drive primeiro (topo da página Produção).' }, { status: 400 });
        await ensureClientFolder(lead);
        break;
      default:
        return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }
  } catch (e: any) {
    if (/no column|production_|drive_|project_/i.test(String(e?.message))) return NextResponse.json({ error: 'Rode a migração 016_producao_drive.sql no Supabase.' }, { status: 400 });
    return NextResponse.json({ error: String(e?.message || e).slice(0, 300) }, { status: 500 });
  }
  const { data } = await db.from('leads').select('*').eq('id', id).single();
  return NextResponse.json(data);
}, { perm: 'producao' });
