// @ts-nocheck
/**
 * Rastreamento unificado de visualizações (Orçamentos + Relatórios).
 *
 * Dedup por dispositivo (localStorage), com identificação automática de
 * acesso INTERNO (usuário logado da equipe/admin) x EXTERNO (cliente).
 * A classificação final é feita no servidor pelo RPC track_page_view.
 */
import { supabase } from "@/lv/integrations/supabase/client";

const DEVICE_KEY = "mr_device_id";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        (crypto.randomUUID?.() as string) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // Fallback em modo privado sem localStorage
    return `ephemeral-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export async function trackView(
  targetType: "quote" | "report",
  slugOrToken: string,
): Promise<void> {
  if (!slugOrToken) return;
  try {
    const device = getDeviceId();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;
    const { error } = await (supabase.rpc as any)("track_page_view", {
      _target_type: targetType,
      _target_slug: slugOrToken,
      _device: device,
      _user_agent: ua,
    });
    if (error) console.error("[viewTracker]", targetType, error.message);
  } catch (err) {
    console.error("[viewTracker] exception", err);
  }
}
