import { admin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';

/** WhatsApp da agência para o botão das galerias: Configurações › Packs (packs.whatsapp) ou o primeiro chip conectado. */
export async function agencyWhatsapp() {
  const s: any = await getSettings(admin());
  const fixed = String(s.packs?.whatsapp || '').replace(/\D/g, '');
  if (fixed) return { phone: fixed, company: s.company_name || '' };
  const { data } = await admin().from('whatsapp_numbers').select('phone,status').eq('status', 'conectado').order('created_at').limit(1);
  return { phone: String(data?.[0]?.phone || '').replace(/\D/g, ''), company: s.company_name || '' };
}

export const WA_ICON =
  '<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.6c.2-.5.5-.6.8-.6h.6c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.1.3 0 .5.5.9 1.3 1.7 2.3 2.2.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.3.6-.1.9-.8 1.6-1.7 1.7-1.9.2-5.6-1.5-6.9-4.7-.4-1.1-.3-2.2.3-3z"/>';
