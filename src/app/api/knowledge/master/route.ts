import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Prompt Master: diretriz fixa da agência, que vai no topo de todo prompt do WhatsApp. */
export const GET = withUser(async () => {
  const { data, error } = await admin().from('prompt_master').select('*').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ content: '', missing: true });
  return NextResponse.json(data || { content: '' });
});

export const PUT = withUser(
  async (req, _ctx, user) => {
    const { content } = await req.json();
    const text = String(content || '').replace(/\u0000/g, '').slice(0, 60000);
    const { error } = await admin()
      .from('prompt_master')
      .upsert({ id: 1, content: text.trim() || null, updated_at: new Date().toISOString(), updated_by: user.member?.name || user.email || null });
    if (error) return NextResponse.json({ error: /prompt_master/.test(error.message) ? 'Rode a migração 013_base_ativa.sql no Supabase.' : error.message }, { status: 400 });
    await admin().from('lead_events').insert({ type: 'prompt_master', channel: 'acc', text: `${user.member?.name || 'Master'} atualizou o Prompt Master da agência` });
    return NextResponse.json({ ok: true });
  },
  { master: true },
);
