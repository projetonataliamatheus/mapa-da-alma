import { admin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';

export async function companyInfo() {
  const s: any = await getSettings(admin()).catch(() => ({}));
  const c = s.company || {};
  return {
    name: c.legal_name || s.company_name || 'Agência',
    brand: s.company_name || c.legal_name || 'Agência',
    doc: c.document || '',
    email: c.email || '',
    phone: c.phone || '',
    address: [c.address, c.city].filter(Boolean).join(' · '),
  };
}
