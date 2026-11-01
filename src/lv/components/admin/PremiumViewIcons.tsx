// @ts-nocheck
"use client";
/**
 * Sophisticated 3D-style SVG icons + row action menu used by admin tables
 * (Quotes, TrafficReports) — replaces flat emoji indicators and cluttered
 * action button rows with a premium Apple-inspired treatment.
 */
import React from "react";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/lv/components/ui/popover";

interface IconProps {
  size?: number;
  active?: boolean;
  className?: string;
}

/** Internal view — shield with user silhouette, indigo/violet gradient. */
export function InternalViewIcon({ size = 22, active = true, className }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  const dim = active ? 1 : 0.35;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} fill="none">
      <defs>
        <linearGradient id={`iv-${id}`} x1="8" y1="4" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818CF8" />
          <stop offset="0.55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
        <radialGradient id={`ivg-${id}`} cx="35%" cy="25%" r="60%">
          <stop stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={`ivs-${id}`} x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#312E81" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#ivs-${id})`} opacity={dim}>
        <path
          d="M20 3.5 6 7.8v10.4c0 8.2 5.8 15.4 14 18 8.2-2.6 14-9.8 14-18V7.8L20 3.5Z"
          fill={`url(#iv-${id})`}
          stroke="#C7D2FE"
          strokeOpacity="0.7"
          strokeWidth="0.9"
        />
        <path
          d="M20 3.5 6 7.8v10.4c0 8.2 5.8 15.4 14 18 8.2-2.6 14-9.8 14-18V7.8L20 3.5Z"
          fill={`url(#ivg-${id})`}
        />
        <circle cx="20" cy="16.5" r="3.4" fill="#F8FAFC" />
        <path d="M13.4 26c1.2-3.4 3.8-5 6.6-5s5.4 1.6 6.6 5c-1.9 1.6-4.2 2.4-6.6 2.4s-4.7-.8-6.6-2.4Z" fill="#F8FAFC" />
      </g>
    </svg>
  );
}

/** External view — glass globe with orbit ring, emerald/teal gradient. */
export function ExternalViewIcon({ size = 22, active = true, className }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  const dim = active ? 1 : 0.4;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} fill="none">
      <defs>
        <linearGradient id={`ev-${id}`} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5EEAD4" />
          <stop offset="0.55" stopColor="#10B981" />
          <stop offset="1" stopColor="#065F46" />
        </linearGradient>
        <radialGradient id={`evg-${id}`} cx="35%" cy="28%" r="55%">
          <stop stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={`evs-${id}`} x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#064E3B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g opacity={dim}>
        <ellipse cx="20" cy="20" rx="17.5" ry="6" stroke="#34D399" strokeOpacity={active ? "0.7" : "0.35"} strokeWidth="1" transform="rotate(-22 20 20)" />
        <g filter={`url(#evs-${id})`}>
          <circle cx="20" cy="20" r="12" fill={`url(#ev-${id})`} stroke="#A7F3D0" strokeOpacity="0.7" strokeWidth="0.9" />
          <circle cx="20" cy="20" r="12" fill={`url(#evg-${id})`} />
          <path d="M8.5 18h23M8.5 22h23M20 8c3 3.6 4.5 7.7 4.5 12S23 28.4 20 32c-3-3.6-4.5-7.7-4.5-12S17 11.6 20 8Z" stroke="#F0FDF4" strokeOpacity="0.85" strokeWidth="1" fill="none" />
        </g>
      </g>
    </svg>
  );
}

/** Compact view-count pill: sophisticated icon + number + optional timestamp. */
export function ViewCountBadge({
  variant,
  count,
  lastAt,
}: {
  variant: "internal" | "external";
  count: number;
  lastAt?: string | null;
}) {
  const active = count > 0;
  const isInt = variant === "internal";
  const Icon = isInt ? InternalViewIcon : ExternalViewIcon;
  const colorClass = active
    ? isInt
      ? "text-indigo-600 dark:text-indigo-400"
      : "text-emerald-600 dark:text-emerald-400"
    : "text-muted-foreground/60";
  const ringClass = active
    ? isInt
      ? "ring-indigo-500/25 bg-indigo-500/5"
      : "ring-emerald-500/25 bg-emerald-500/5"
    : "ring-border/50 bg-muted/30";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ring-1 ${ringClass}`}>
        <Icon size={18} active={active} />
        <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>{count}</span>
      </div>
      {lastAt && (
        <span className="text-[10px] text-muted-foreground tabular-nums">{lastAt}</span>
      )}
    </div>
  );
}

export interface RowActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  tone?: "default" | "success" | "danger";
  hidden?: boolean;
}

/** Sophisticated gear-menu that consolidates row actions into a Popover. */
export function RowActionsMenu({ items }: { items: RowActionItem[] }) {
  const visible = items.filter((i) => !i.hidden);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-primary/40 hover:from-primary/5 transition-all group"
          title="Ações"
        >
          <Settings2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:rotate-45 duration-300" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5 rounded-2xl border-border/70 shadow-xl">
        <div className="flex flex-col gap-0.5">
          {visible.map((item, idx) => {
            const Icon = item.icon;
            const tone =
              item.tone === "danger"
                ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                : item.tone === "success"
                ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                : "text-foreground hover:bg-primary/10 hover:text-primary";
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${tone}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
