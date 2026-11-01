// @ts-nocheck
"use client";
import { Rocket } from "lucide-react";
import type { CSSProperties } from "react";

export interface BestPlanStyleConfig {
  enabled: boolean;
  label: string;
  color: string;
  pulseSpeed: number; // seconds
  glowIntensity: number; // 0-100
  animation: "pulse" | "glow" | "bounce" | "rocket-shake";
  rocketEnabled: boolean;
  syncMetricsTable: boolean;
}

export const DEFAULT_BEST_PLAN_STYLE: BestPlanStyleConfig = {
  enabled: true,
  label: "🚀 Melhor Plano para Você",
  color: "#10b981",
  pulseSpeed: 2,
  glowIntensity: 60,
  animation: "pulse",
  rocketEnabled: true,
  syncMetricsTable: true,
};

export function parseBestPlanStyle(raw: any): BestPlanStyleConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BEST_PLAN_STYLE };
  return {
    enabled: raw.enabled !== false,
    label: typeof raw.label === "string" && raw.label ? raw.label : DEFAULT_BEST_PLAN_STYLE.label,
    color: raw.color || DEFAULT_BEST_PLAN_STYLE.color,
    pulseSpeed: Number(raw.pulseSpeed) > 0 ? Number(raw.pulseSpeed) : DEFAULT_BEST_PLAN_STYLE.pulseSpeed,
    glowIntensity: Number.isFinite(Number(raw.glowIntensity)) ? Number(raw.glowIntensity) : DEFAULT_BEST_PLAN_STYLE.glowIntensity,
    animation: ["pulse", "glow", "bounce", "rocket-shake"].includes(raw.animation) ? raw.animation : DEFAULT_BEST_PLAN_STYLE.animation,
    rocketEnabled: raw.rocketEnabled !== false,
    syncMetricsTable: raw.syncMetricsTable !== false,
  };
}

interface Props {
  label: string;
  config: BestPlanStyleConfig;
}

export default function BestPlanBadge({ label, config }: Props) {
  const animClass = `best-plan-anim-${config.animation}`;
  const intensity = Math.max(0, Math.min(100, config.glowIntensity)) / 100;
  const style: CSSProperties = {
    background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
    color: "#fff",
    boxShadow: `0 0 ${20 * intensity + 4}px ${config.color}${Math.round(intensity * 255).toString(16).padStart(2, "0")}, 0 4px 18px ${config.color}55`,
    "--bp-color": config.color,
    "--bp-speed": `${config.pulseSpeed}s`,
    "--bp-intensity": String(intensity),
  } as CSSProperties;

  return (
    <div className={`absolute -top-5 left-1/2 -translate-x-1/2 z-20 ${animClass}`} style={style}>
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
        {config.rocketEnabled && (
          <span className="relative inline-flex items-center justify-center">
            <Rocket className="h-3.5 w-3.5 best-plan-rocket" strokeWidth={2.5} />
            <span className="best-plan-flame" aria-hidden />
          </span>
        )}
        <span>{label}</span>
      </div>
    </div>
  );
}
