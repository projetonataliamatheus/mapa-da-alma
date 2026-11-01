import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getSettings, deepMerge } from '@/lib/settings';
import { logEvent } from '@/lib/engine';
import { prospectCfg, sendDraft, openingFor, PROSPECT_DEFAULT } from '@/lib/prospect';
import { spNow } from '@/lib/util';

export const dynamic = 'force-dynamic';

const COLS = 'id,name,niche,city,whatsapp,score,site_status,rating,reviews,wa_status,prospect,draft,draft_at,draft_hold,stage,number_id,last_inbound_at,last_outbound_at,lost_reason,lost_at,temperature';

/** Tudo da tela de Prospecção › Selecionados: lista, rascunhos, andamento, recusas, chips e regras. */
export const GET = withUser(async () => {
  const db = admin();
  const s: any = await getSettings(db);
  const [sel, fila, drafts, recent, lost, nums] = await Promise.all([
    db.from('leads').select(COLS).eq('prospect', 'selecionado').order('score', { ascending: false }).limit(500),
    db.from('leads').select(COLS).in('wa_status', ['fila', 'preparando']).order('score', { ascending: false }).limit(500),
    db.from('leads').select(COLS).in('wa_status', ['rascunho', 'enviando']).order('draft_at').limit(50),
    db.from('leads').select(COLS).eq('source', 'google').in('wa_status', ['enviado', 'conversa']).order('last_outbound_at', { ascending: false }).limit(60),
    db.from('leads').select(COLS).eq('source', 'google').not('lost_reason', 'is', null).order('lost_at', { ascending: false }).limit(60),
    db.from('whatsapp_numbers').select('id,label,agent_name,status,prospect_today,prospect_date,prospect_next_at').order('created_at'),
  ]);
  const today = spNow().date;
  return NextResponse.json({
    cfg: prospectCfg(s),
    selected: sel.data || [],
    queued: fila.data || [],
    drafts: drafts.data || [],
    recent: recent.data || [],
    lost: lost.data || [],
    numbers: (nums.data || []).map((n: any) => ({ ...n, prospect_today: n.prospect_date === today ? n.prospect_today : 0 })),
    missing: !!sel.error,
  });
}, { perm: 'prospeccao.buscar' });

export const POST = withUser(async (req, _ctx, user) => {
  const b = await req.json();
  const db = admin();
  const s: any = await getSettings(db);
  const saveCfg = async (patch: any) => {
    const { data } = await db.from('settings').select('data').eq('id', 1).maybeSingle();
    const cur = (data?.data as any) || {};
    const merged = deepMerge(cur, { prospect: { ...(cur.prospect || {}), ...patch } });
    if (Array.isArray(patch.numbers)) merged.prospect.numbers = patch.numbers;
    await db.from('settings').upsert({ id: 1, data: merged, updated_at: new Date().toISOString() });
    return prospectCfg(merged);
  };
  const ids: string[] = Array.isArray(b.ids) ? b.ids.slice(0, 500) : [];
  switch (b.action) {
    case 'config': {
      const c = b.cfg || {};
      const allowed: any = {};
      for (const k of Object.keys(PROSPECT_DEFAULT)) if (k !== 'running' && c[k] !== undefined) allowed[k] = c[k];
      return NextResponse.json({ cfg: await saveCfg(allowed) });
    }
    case 'start': {
      // selecionados marcados entram na fila e a prospecção liga
      if (ids.length) await db.from('leads').update({ prospect: null, wa_status: 'fila', next_step: 'Na fila da prospecção (rascunho antes de enviar).' }).in('id', ids).eq('prospect', 'selecionado');
      const cfg = await saveCfg({ ...(b.cfg || {}), running: true });
      await logEvent(null, 'prospect', 'acc', `Prospecção iniciada por ${user.email}${ids.length ? ` com ${ids.length} contato(s)` : ''}`);
      return NextResponse.json({ cfg });
    }
    case 'pause': {
      const cfg = await saveCfg({ running: false });
      await logEvent(null, 'prospect', 'warn', `Prospecção pausada por ${user.email}`);
      return NextResponse.json({ cfg });
    }
    case 'remove': {
      // tira da lista (ou da fila) sem enviar nada
      if (ids.length) {
        await db.from('leads').update({ prospect: null }).in('id', ids).eq('prospect', 'selecionado');
        await db.from('leads').update({ wa_status: 'nao', draft: null, draft_at: null }).in('id', ids).in('wa_status', ['fila', 'rascunho']);
      }
      return NextResponse.json({ ok: true });
    }
    case 'unqueue': {
      if (ids.length) await db.from('leads').update({ wa_status: 'nao', prospect: 'selecionado', draft: null, draft_at: null }).in('id', ids).in('wa_status', ['fila', 'rascunho']);
      return NextResponse.json({ ok: true });
    }
    case 'draft': {
      // equipe editou a mensagem: salva e dá mais um tempinho antes de sair
      const { data: l } = await db.from('leads').select('draft,draft_at,wa_status').eq('id', b.id).maybeSingle();
      if (!l || l.wa_status !== 'rascunho') return NextResponse.json({ error: 'Esta abordagem já saiu ou não está mais na fila.' }, { status: 409 });
      const patch: any = {};
      if (Array.isArray(b.parts)) {
        const parts = b.parts.map((x: any) => String(x || '').trim().slice(0, 1500)).filter(Boolean).slice(0, 3);
        if (!parts.length) return NextResponse.json({ error: 'A mensagem não pode ficar vazia.' }, { status: 400 });
        patch.draft = { ...(l.draft || {}), parts, edited: true };
        const min = Date.now() + 10_000;
        if (!l.draft_at || new Date(l.draft_at).getTime() < min) patch.draft_at = new Date(min).toISOString();
      }
      if (typeof b.hold === 'boolean') {
        patch.draft_hold = b.hold;
        if (!b.hold) patch.draft_at = new Date(Date.now() + 10_000).toISOString();
      }
      await db.from('leads').update(patch).eq('id', b.id);
      return NextResponse.json({ ok: true });
    }
    case 'send_now': {
      const ok = await sendDraft(b.id, 'human');
      if (!ok) return NextResponse.json({ error: 'Não deu para enviar agora (já saiu ou o chip está desconectado).' }, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    case 'skip': {
      await db.from('leads').update({ wa_status: 'nao', prospect: 'selecionado', draft: null, draft_at: null, draft_hold: false }).eq('id', b.id).eq('wa_status', 'rascunho');
      return NextResponse.json({ ok: true });
    }
    case 'new_opening': {
      const { data: l } = await db.from('leads').select('*').eq('id', b.id).maybeSingle();
      if (!l || l.wa_status !== 'rascunho') return NextResponse.json({ error: 'Esta abordagem já saiu.' }, { status: 409 });
      const { data: n } = await db.from('whatsapp_numbers').select('agent_name').eq('id', l.draft?.number_id).maybeSingle();
      const parts = [openingFor(l, { ...s, assistant_name: n?.agent_name || s.assistant_name })];
      await db.from('leads').update({ draft: { ...(l.draft || {}), parts } }).eq('id', b.id);
      return NextResponse.json({ parts });
    }
  }
  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}, { perm: 'prospeccao.buscar' });
