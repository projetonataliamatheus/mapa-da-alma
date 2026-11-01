import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { webhookUrl } from '@/lib/evolution';
import { appBase } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Quais integrações estão configuradas (sem mostrar as chaves). */
export const GET = withUser(async () => {
  const has = (k: string) => !!process.env[k];
  const app = appBase();
  return NextResponse.json({
    items: [
      { key: 'supabase', label: 'Banco de dados (Supabase)', ok: has('SUPABASE_SERVICE_ROLE_KEY') },
      { key: 'app', label: 'Endereço do painel (APP_URL)', ok: app.startsWith('http') },
      { key: 'secret', label: 'Senha dos webhooks (WEBHOOK_SECRET)', ok: has('WEBHOOK_SECRET') },
      { key: 'ai', label: 'Inteligência artificial (Claude)', ok: has('ANTHROPIC_API_KEY') },
      { key: 'google', label: 'Google Maps (Places API)', ok: has('GOOGLE_MAPS_API_KEY') },
      { key: 'evolution', label: 'WhatsApp (Evolution API)', ok: has('EVOLUTION_API_URL') && has('EVOLUTION_API_KEY') },
      { key: 'groq', label: 'Transcrição de áudios (Groq)', ok: has('GROQ_API_KEY') },
      { key: 'asaas', label: 'Pix (Asaas)', ok: has('ASAAS_API_KEY') },
      { key: 'asaas_hook', label: 'Aviso de pagamento do Asaas (token)', ok: has('ASAAS_WEBHOOK_TOKEN') },
      { key: 'pdf', label: 'Recibos em PDF (Browserless)', ok: has('BROWSERLESS_TOKEN') },
    ],
    model: `${process.env.AI_MODEL_FAST || 'claude-haiku-5-5'} (padrão) · ${process.env.AI_MODEL || 'claude-sonnet-5-5'} (conversas quentes)`,
    asaasEnv: process.env.ASAAS_ENV === 'sandbox' ? 'sandbox (testes)' : 'produção',
    webhooks: {
      whatsapp: app ? webhookUrl().replace(/token=[^&]+/, 'token=•••') : null,
      asaas: app ? `${app}/api/webhooks/asaas` : null,
    },
  });
}, { master: true });
