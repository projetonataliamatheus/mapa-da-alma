/**
 * Campanhas de anúncio: cada linha de Configurações › Textos dos anúncios é uma campanha.
 * Formato opcional "Nome da campanha = texto do anúncio"; sem nome, o próprio texto (curto) vira o nome.
 */
import { similar } from './engine';

export type AdCampaign = { name: string; text: string };

export function adCampaigns(settings: any): AdCampaign[] {
  return String(settings?.ad_messages || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 8)
    .map((l) => {
      const m = l.match(/^(.{2,60}?)\s*=\s*(.{8,})$/);
      const text = (m ? m[2] : l).trim();
      const name = (m ? m[1] : text.length > 48 ? text.slice(0, 46).replace(/\s+\S*$/, '') + '…' : text).trim();
      return { name, text };
    });
}

/** A mensagem é o texto pronto de algum anúncio? Devolve a campanha. */
export function campaignOf(settings: any, msg: string): AdCampaign | null {
  const t = String(msg || '').trim();
  if (!t) return null;
  let best: AdCampaign | null = null;
  let score = 0;
  for (const c of adCampaigns(settings)) {
    const s = similar(c.text, t);
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return score >= 0.75 ? best : null;
}

export const SOURCE_LABEL: Record<string, string> = { anuncio: 'Anúncio', google: 'Prospecção', whatsapp: 'Direto no WhatsApp', checkout: 'Link de pagamento', manual: 'Cadastro manual' };
