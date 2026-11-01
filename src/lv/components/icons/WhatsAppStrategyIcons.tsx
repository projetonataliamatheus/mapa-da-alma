// @ts-nocheck
"use client";
/**
 * Professional animated SVG icons for the WhatsApp Strategy section
 * Matching the style of ReportMetricIcons / InstagramStrategyIcons
 *
 * Keys: "wa-speed", "wa-human", "wa-reminder", "wa-postservice", "wa-script", "wa-filter", "wa-machine"
 */
import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

const floatKf = `
@keyframes wa-icon-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
@keyframes wa-icon-glow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(37,211,102,0.3)); }
  50% { filter: drop-shadow(0 0 8px rgba(37,211,102,0.6)); }
}`;
let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = floatKf;
  document.head.appendChild(s);
  injected = true;
}

function FloatWrap({ children, className, style, size }: IconProps & { children: React.ReactNode }) {
  inject();
  const s = size || 48;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s,
        height: s,
        animation: "wa-icon-float 2.8s ease-in-out infinite, wa-icon-glow 3s ease-in-out infinite",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ── 1. Speed / Lightning bolt + clock — "Para de perder cliente por demora" ── */
export const SpeedIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      <circle cx="24" cy="24" r="22" fill="#FBBF24" opacity="0.1" />
      {/* Lightning bolt */}
      <polygon points="27,4 14,26 22,26 19,44 36,20 26,20" fill="#FBBF24" />
      <polygon points="27,4 14,26 22,26 19,44 36,20 26,20" fill="url(#speedGrad2)" opacity="0.35" />
      {/* Speed lines */}
      <line x1="7" y1="17" x2="13" y2="17" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="5" y1="24" x2="12" y2="24" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="7" y1="31" x2="13" y2="31" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Clock badge */}
      <circle cx="38" cy="38" r="7" fill="#1a1a2e" stroke="#FBBF24" strokeWidth="1.8" />
      <line x1="38" y1="38" x2="38" y2="34" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="38" y1="38" x2="41" y2="39" stroke="#FBBF24" strokeWidth="1.4" strokeLinecap="round" />
      <defs>
        <linearGradient id="speedGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
    </svg>
  </FloatWrap>
);

/* ── 2. Script / Chat bubble — "Você sabe exatamente o que falar" ── */
export const ScriptIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      <circle cx="24" cy="24" r="22" fill="#25D366" opacity="0.08" />
      {/* Main chat bubble */}
      <rect x="6" y="8" width="30" height="22" rx="6" fill="#25D366" />
      <polygon points="14,30 18,30 12,38" fill="#25D366" />
      {/* Chat lines */}
      <line x1="13" y1="15" x2="29" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="20" x2="25" y2="20" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="13" y1="25" x2="21" y2="25" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Checkmark badge */}
      <circle cx="40" cy="14" r="6" fill="#22c55e" />
      <path d="M37 14 L39 16.5 L43 11.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Sparkle */}
      <path d="M42 28 L43 30 L45 31 L43 32 L42 34 L41 32 L39 31 L41 30Z" fill="#FBBF24" opacity="0.7" />
    </svg>
  </FloatWrap>
);

/* ── 3. Filter / Target + filter — "Filtra curioso e foca em quem compra" ── */
export const FilterIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      <circle cx="24" cy="24" r="22" fill="#EF4444" opacity="0.08" />
      {/* Target rings */}
      <circle cx="22" cy="22" r="18" stroke="#EF4444" strokeWidth="2" fill="none" opacity="0.3" />
      <circle cx="22" cy="22" r="12" stroke="#EF4444" strokeWidth="2" fill="none" opacity="0.5" />
      <circle cx="22" cy="22" r="6" stroke="#EF4444" strokeWidth="2.5" fill="none" />
      <circle cx="22" cy="22" r="2" fill="#EF4444" />
      {/* Crosshair lines */}
      <line x1="22" y1="2" x2="22" y2="10" stroke="#EF4444" strokeWidth="1.2" opacity="0.4" />
      <line x1="22" y1="34" x2="22" y2="42" stroke="#EF4444" strokeWidth="1.2" opacity="0.4" />
      <line x1="2" y1="22" x2="10" y2="22" stroke="#EF4444" strokeWidth="1.2" opacity="0.4" />
      <line x1="34" y1="22" x2="42" y2="22" stroke="#EF4444" strokeWidth="1.2" opacity="0.4" />
      {/* Dollar badge */}
      <circle cx="40" cy="38" r="7" fill="#22c55e" />
      <text x="40" y="42" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff" fontFamily="Arial">$</text>
    </svg>
  </FloatWrap>
);

/* ── 4. Sales Machine / Dollar + gears — "WhatsApp vira máquina de vendas" ── */
export const SalesMachineIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      <circle cx="24" cy="24" r="22" fill="#22c55e" opacity="0.08" />
      {/* Money bag */}
      <ellipse cx="24" cy="32" rx="14" ry="12" fill="#22c55e" />
      <path d="M18 20 Q24 12 30 20" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* $ sign */}
      <text x="24" y="37" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#ffffff" fontFamily="Arial">$</text>
      {/* Coins flying */}
      <circle cx="8" cy="14" r="5" fill="#FBBF24" />
      <text x="8" y="17.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#B45309" fontFamily="Arial">$</text>
      <circle cx="40" cy="10" r="4" fill="#FBBF24" opacity="0.8" />
      <text x="40" y="13" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#B45309" fontFamily="Arial">$</text>
      {/* Up arrows */}
      <path d="M36 22 L36 14 L33 17 M36 14 L39 17" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 28 L42 22 L40 24 M42 22 L44 24" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      {/* Sparkle */}
      <path d="M14 6 L15 9 L18 10 L15 11 L14 14 L13 11 L10 10 L13 9Z" fill="#FBBF24" opacity="0.8" />
    </svg>
  </FloatWrap>
);

/* ── Legacy icons kept for backward compatibility ── */
export const HumanIcon = ScriptIcon;
export const ReminderIcon = FilterIcon;
export const PostServiceIcon = SalesMachineIcon;

/** Map of special emoji keys → icon components */
export const WA_STRATEGY_ICONS: Record<string, React.FC<IconProps>> = {
  "wa-speed": SpeedIcon,
  "wa-script": ScriptIcon,
  "wa-filter": FilterIcon,
  "wa-machine": SalesMachineIcon,
  // Legacy keys
  "wa-human": ScriptIcon,
  "wa-reminder": FilterIcon,
  "wa-postservice": SalesMachineIcon,
  // Common emoji fallbacks for existing data
  "⚡": SpeedIcon,
  "💬": ScriptIcon,
  "🎯": FilterIcon,
  "🤖": SalesMachineIcon,
  "🔥": SpeedIcon,
  "📱": ScriptIcon,
  "💰": SalesMachineIcon,
  "🚀": SalesMachineIcon,
  "🤝": ScriptIcon,
  "🔔": FilterIcon,
  "⭐": SalesMachineIcon,
  "👋": ScriptIcon,
  "✅": ScriptIcon,
  "💎": SalesMachineIcon,
  "📊": FilterIcon,
};
