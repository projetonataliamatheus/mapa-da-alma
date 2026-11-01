// @ts-nocheck
"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SimulatorPlan } from "@/lv/components/sales-page/sections/SimulatorSection";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export interface SimulatorState {
  /** Has the visitor interacted with the simulator (slider/strip) at least once? */
  interacted: boolean;
  /** Currently selected plan (default = preselected initial step). */
  plan: SimulatorPlan | null;
  setStepInteracted: (plan: SimulatorPlan) => void;
}

interface SimulatorContextValue extends SimulatorState {
  /**
   * Builds a wa.me URL with a prefilled message based on the selected plan and a
   * configurable template. If the visitor has not interacted yet, returns null
   * so callers can fall back to the anchor behavior.
   */
  buildWhatsAppLink: (
    baseLink: string,
    template: string,
    opts?: { force?: boolean },
  ) => string | null;
  /** Smooth-scroll to the simulator section (used as fallback for CTAs). */
  scrollToSimulator: () => void;
  /** Anchor id to use for the simulator section. */
  anchorId: string;
}

export const SIMULATOR_ANCHOR_ID = "simulador";

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function applyPlanTemplate(template: string, plan: SimulatorPlan): string {
  const anyPlan = plan as any;
  const hasDayRange = anyPlan.perDayMax != null && anyPlan.perDayMax !== plan.perDay;
  const hasMonthRange = anyPlan.perMonthMax != null && anyPlan.perMonthMax !== plan.perMonth;
  const daySep = anyPlan.perDaySeparator || "a";
  const monthSep = anyPlan.perMonthSeparator || "a";
  const dayStr = hasDayRange ? `${plan.perDay} ${daySep} ${anyPlan.perDayMax}` : String(plan.perDay);
  const monthStr = hasMonthRange ? `${plan.perMonth} ${monthSep} ${anyPlan.perMonthMax}` : String(plan.perMonth);
  const replacements: Record<string, string> = {
    "{plano}": plan.name || `Plano ${dayStr} clientes/dia`,
    "{nome_plano}": plan.name || `Plano ${dayStr} clientes/dia`,
    "{dia}": dayStr,
    "{clientes_dia}": dayStr,
    "{mes}": monthStr,
    "{clientes_mes}": monthStr,
    "{total}": fmtBRL(plan.total),
    "{anuncios}": fmtBRL(plan.ads),
    "{gestao}": fmtBRL(plan.management),
    "{prefixo}": plan.prefix || "",
  };
  let out = template;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  return out;
}

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [interacted, setInteracted] = useState(false);
  const planRef = useRef<SimulatorPlan | null>(null);
  const [plan, setPlan] = useState<SimulatorPlan | null>(null);

  const setStepInteracted = useCallback((p: SimulatorPlan) => {
    planRef.current = p;
    setPlan(p);
    setInteracted(true);
  }, []);

  const scrollToSimulator = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(SIMULATOR_ANCHOR_ID);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const buildWhatsAppLink = useCallback(
    (baseLink: string, template: string, opts?: { force?: boolean }) => {
      const currentPlan = planRef.current;
      if (!opts?.force && (!interacted || !currentPlan)) return null;
      const target = currentPlan ?? plan;
      if (!target) return null;
      const msg = applyPlanTemplate(
        template ||
          "Olá! Quero o plano {plano} — {clientes_dia} clientes/dia ({clientes_mes}/mês). Investimento total: {total} (Anúncios {anuncios} + Gestão {gestao}).",
        target,
      );
      const linkBase = (baseLink || "https://wa.me/5519998701408").split("?")[0];
      return `${linkBase}?text=${encodeURIComponent(msg)}`;
    },
    [interacted, plan],
  );

  const value = useMemo<SimulatorContextValue>(
    () => ({ interacted, plan, setStepInteracted, buildWhatsAppLink, scrollToSimulator, anchorId: SIMULATOR_ANCHOR_ID }),
    [interacted, plan, setStepInteracted, buildWhatsAppLink, scrollToSimulator],
  );

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export function useSimulatorContext(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext);
  if (!ctx) {
    // Safe defaults so usage outside the provider doesn't crash.
    return {
      interacted: false,
      plan: null,
      setStepInteracted: () => {},
      buildWhatsAppLink: () => null,
      scrollToSimulator: () => {
        if (typeof document !== "undefined") {
          const el = document.getElementById(SIMULATOR_ANCHOR_ID);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      anchorId: SIMULATOR_ANCHOR_ID,
    };
  }
  return ctx;
}
