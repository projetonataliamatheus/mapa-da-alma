import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { defaultData, fromLead } from '@/lib/bio';
import { bioBase, freeSlug } from '@/lib/bio-server';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Lista as páginas de link na bio. */
export const GET = withUser(
  async () => {
    const { data, error } = await admin().from('bio_pages').select('id,slug,status,data,views,clicks,lead_id,visible,account_id,updated_at,published_at,client_edited_at,leads(name,niche,city)').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ base: await bioBase(), pages: data || [] });
  },
  { perm: 'bio' },
);

/** Cria uma página nova (em branco ou a partir de um lead). */
export const POST = withUser(
  async (req, _ctx, user: any) => {
    need(user, 'bio.editar');
    const b = await req.json().catch(() => ({}));
    let data = defaultData(String(b.name || 'Novo cliente').slice(0, 80));
    let leadId: string | null = null;
    if (b.lead_id) {
      const { data: lead } = await admin().from('leads').select('*').eq('id', b.lead_id).maybeSingle();
      if (lead) {
        data = fromLead(lead);
        leadId = lead.id;
      }
    }
    const slug = await freeSlug(b.slug || data.name);
    const { data: row, error } = await admin()
      .from('bio_pages')
      .insert({ slug, lead_id: leadId, data, status: 'rascunho', created_by_name: user.member?.name || user.email })
      .select('id,slug')
      .single();
    if (error) throw new Error(error.message);
    if (leadId) await logEvent(leadId, 'bio_created', 'acc', `Link na bio criado: ${slug}`).catch(() => {});
    return NextResponse.json(row);
  },
  { perm: 'bio' },
);
