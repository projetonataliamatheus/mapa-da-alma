// @ts-nocheck
import { supabase } from "@/lv/integrations/supabase/client";

type PublicAdminEvent = {
  type: string;
  title?: string;
  message?: string;
  amount?: number | null;
  link_url?: string | null;
  metadata?: Record<string, unknown>;
};

export async function notifyAdminEvent(event: PublicAdminEvent) {
  try {
    await supabase.functions.invoke("admin-notification-event", {
      body: {
        ...event,
        link_url: event.link_url || (typeof window !== "undefined" ? window.location.href : null),
      },
    });
  } catch {
    // Evento auxiliar: nunca deve bloquear contrato, checkout ou pagamento.
  }
}
