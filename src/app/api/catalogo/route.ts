import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { catDefault, catFromLead } from '@/lib/catalog';
import { catBase, freeCatSlug } from '@/lib/catalog-server';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export const GET = withUser(
  async () => {
    const { data, error } = await admin().from('catalogs').select('id,slug,status,plan,data,views,opens,lead_id,visible,account_id,updated_at,client_edited_at,leads(name,niche,city)').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    const pages = (data || []).map((c: any) => ({ ...c, data: { name: c.data?.name, logo: c.data?.logo, color: c.data?.color, color2: c.data?.color2 }, nprod: (c.data?.products || []).length }));
    return NextResponse.json({ base: await catBase(), pages });
  },
  { perm: 'catalogo' },
);

export const POST = withUser(
  async (req, _ctx, user: any) => {
    need(user, 'catalogo.editar');
    const b = await req.json().catch(() => ({}));
    let data = catDefault(String(b.name || 'Novo estabelecimento').slice(0, 80));
    let leadId: string | null = null;
    if (b.lead_id) {
      const { data: lead } = await admin().from('leads').select('*').eq('id', b.lead_id).maybeSingle();
      if (lead) {
        data = catFromLead(lead);
        leadId = lead.id;
      }
    } else if (b.sample) data = catFromLead({ name: data.name, niche: String(b.sample) });
    const slug = await freeCatSlug(b.slug || data.name);
    const { data: row, error } = await admin().from('catalogs').insert({ slug, lead_id: leadId, data, created_by_name: user.member?.name || user.email }).select('id,slug').single();
    if (error) throw new Error(error.message);
    if (leadId) await logEvent(leadId, 'catalog_created', 'acc', `Catálogo digital criado: ${slug}`).catch(() => {});
    return NextResponse.json(row);
  },
  { perm: 'catalogo' },
);
