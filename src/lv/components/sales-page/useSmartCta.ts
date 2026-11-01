// @ts-nocheck
"use client";
import { useCallback } from "react";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";
import { useSimulatorContext, SIMULATOR_ANCHOR_ID } from "@/lv/components/sales-page/SimulatorContext";

/**
 * Smart CTA behavior for any WhatsApp button on the sales page.
 *
 * If the visitor has not interacted with the simulator AND this CTA is configured
 * to "force the simulator first", the click smooth-scrolls to the simulator
 * section instead of opening WhatsApp.
 *
 * Otherwise the link is built from the configured `whatsappMessageTemplate` and
 * the visitor's selected plan (if any).
 *
 * Pass `ctaKey` matching the toggle field on the config (e.g. "hero1", "pillRed",
 * "footer", "widget"). If the config is missing, defaults to `true` (force).
 */
export function useSmartCta(ctaKey: "hero1" | "pillRed" | "footer" | "widget" | "extra") {
  const c = usePublicConfig();
  const { interacted, buildWhatsAppLink, scrollToSimulator } = useSimulatorContext();

  const baseLink = c.whatsappLink || "https://wa.me/5519998701408";
  const template =
    c.whatsappMessageTemplate ||
    "Olá! Quero o plano {plano} — {clientes_dia} clientes/dia ({clientes_mes}/mês). Investimento total: {total} (Anúncios {anuncios} + Gestão {gestao}).";

  // Per-CTA force flags — default true (require interaction)
  const forceMap: Record<string, boolean> = {
    hero1: c.ctaForceSimulatorHero1 !== false,
    pillRed: c.ctaForceSimulatorPillRed !== false,
    footer: c.ctaForceSimulatorFooter === true, // footer default = false (free contact)
    widget: c.ctaForceSimulatorWidget !== false,
    extra: c.ctaForceSimulatorWidget !== false,
  };
  const force = forceMap[ctaKey];

  // Build href: when interacted, prefilled wa.me with plan info; else fallback baseLink (used when force=false).
  const wa = buildWhatsAppLink(baseLink, template);
  const href = !force || interacted ? (wa || baseLink) : `#${SIMULATOR_ANCHOR_ID}`;

  const onClick = useCallback(
    (e?: React.MouseEvent) => {
      if (force && !interacted) {
        e?.preventDefault();
        scrollToSimulator();
      }
    },
    [force, interacted, scrollToSimulator],
  );

  return { href, onClick, target: !force || interacted ? "_blank" : undefined, rel: !force || interacted ? "noopener noreferrer" : undefined, requiresSimulator: force && !interacted };
}
