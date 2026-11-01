// @ts-nocheck
"use client";
/**
 * Professional animated SVG icons for the Instagram Strategy section
 * Matching the style of ReportMetricIcons with floating animation
 *
 * Use emoji keys: "ig-profile-visits", "ig-new-followers", "ig-money", "ig-growth"
 */
import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

/* ── Floating wrapper with inject-once animation ── */
const floatKeyframes = `
@keyframes ig-icon-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
@keyframes ig-icon-pulse {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(225,48,108,0.3)); }
  50% { filter: drop-shadow(0 0 8px rgba(225,48,108,0.6)); }
}`;
let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = floatKeyframes;
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
        animation: "ig-icon-float 2.8s ease-in-out infinite, ig-icon-pulse 3s ease-in-out infinite",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ── 1. Profile Visits: Eye + Instagram profile silhouette ── */
export const ProfileVisitsIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      {/* Glow bg */}
      <circle cx="24" cy="24" r="22" fill="url(#pvGrad)" opacity="0.15" />
      {/* Profile silhouette */}
      <circle cx="24" cy="17" r="7" fill="#E1306C" />
      <ellipse cx="24" cy="34" rx="12" ry="8" fill="#E1306C" opacity="0.8" />
      {/* Eye overlay */}
      <ellipse cx="24" cy="24" rx="14" ry="8" stroke="#ffffff" strokeWidth="2" fill="none" />
      <circle cx="24" cy="24" r="4" fill="#ffffff" />
      <circle cx="24" cy="24" r="2" fill="#833AB4" />
      {/* Sparkle top-right */}
      <path d="M38 8 L39 11 L42 12 L39 13 L38 16 L37 13 L34 12 L37 11Z" fill="#FCAF45" opacity="0.9" />
      <defs>
        <radialGradient id="pvGrad">
          <stop offset="0%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </radialGradient>
      </defs>
    </svg>
  </FloatWrap>
);

/* ── 2. New Followers: Person + plus badge ── */
export const NewFollowersIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      {/* Glow bg */}
      <circle cx="24" cy="24" r="22" fill="url(#nfGrad)" opacity="0.12" />
      {/* Main person */}
      <circle cx="20" cy="16" r="7" fill="#833AB4" />
      <ellipse cx="20" cy="33" rx="11" ry="8" fill="#833AB4" opacity="0.8" />
      {/* Second person (behind, smaller) */}
      <circle cx="32" cy="18" r="5" fill="#C13584" opacity="0.5" />
      <ellipse cx="32" cy="30" rx="7" ry="5.5" fill="#C13584" opacity="0.4" />
      {/* Plus badge */}
      <circle cx="38" cy="12" r="7" fill="#22c55e" />
      <line x1="38" y1="8.5" x2="38" y2="15.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34.5" y1="12" x2="41.5" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arrow up */}
      <path d="M8 38 L8 28 L5 31 M8 28 L11 31" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <radialGradient id="nfGrad">
          <stop offset="0%" stopColor="#833AB4" />
          <stop offset="100%" stopColor="#E1306C" />
        </radialGradient>
      </defs>
    </svg>
  </FloatWrap>
);

/* ── 3. Instagram + Money: IG camera + dollar coin ── */
export const InstagramMoneyIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      {/* IG rounded rect */}
      <rect x="4" y="6" width="28" height="28" rx="8" stroke="url(#imGrad)" strokeWidth="2.5" fill="none" />
      {/* IG lens circle */}
      <circle cx="18" cy="20" r="8" stroke="url(#imGrad)" strokeWidth="2" fill="none" />
      {/* IG dot */}
      <circle cx="27" cy="11" r="2" fill="#FCAF45" />
      {/* Dollar coin */}
      <circle cx="36" cy="36" r="10" fill="#22c55e" />
      <circle cx="36" cy="36" r="8" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* $ sign */}
      <text x="36" y="40" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ffffff" fontFamily="Arial">$</text>
      {/* Sparkles */}
      <circle cx="42" cy="8" r="1.5" fill="#FCAF45" opacity="0.8" />
      <circle cx="44" cy="14" r="1" fill="#E1306C" opacity="0.6" />
      <defs>
        <linearGradient id="imGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#833AB4" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#FCAF45" />
        </linearGradient>
      </defs>
    </svg>
  </FloatWrap>
);

/* ── 4. Followers Growth + Money: Multiple people + chart arrow + coin ── */
export const FollowersGrowthIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      {/* Background glow */}
      <circle cx="24" cy="24" r="22" fill="url(#fgGrad)" opacity="0.1" />
      {/* Person 1 (left) */}
      <circle cx="10" cy="18" r="4.5" fill="#833AB4" />
      <ellipse cx="10" cy="28" rx="6" ry="4.5" fill="#833AB4" opacity="0.7" />
      {/* Person 2 (center) */}
      <circle cx="22" cy="15" r="5" fill="#E1306C" />
      <ellipse cx="22" cy="26" rx="7" ry="5" fill="#E1306C" opacity="0.7" />
      {/* Person 3 (right) */}
      <circle cx="34" cy="18" r="4.5" fill="#C13584" />
      <ellipse cx="34" cy="28" rx="6" ry="4.5" fill="#C13584" opacity="0.7" />
      {/* Growth arrow */}
      <path d="M6 42 L16 35 L26 38 L40 24" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="40,21 43,26 37,26" fill="#22c55e" />
      {/* Mini dollar */}
      <circle cx="42" cy="14" r="5" fill="#22c55e" />
      <text x="42" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#ffffff" fontFamily="Arial">$</text>
      {/* Sparkle */}
      <path d="M4 8 L5 10 L7 11 L5 12 L4 14 L3 12 L1 11 L3 10Z" fill="#FCAF45" opacity="0.8" />
      <defs>
        <radialGradient id="fgGrad">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#833AB4" />
        </radialGradient>
      </defs>
    </svg>
  </FloatWrap>
);

/** Map of special emoji keys → icon components */
export const IG_STRATEGY_ICONS: Record<string, React.FC<IconProps>> = {
  "ig-profile-visits": ProfileVisitsIcon,
  "ig-new-followers": NewFollowersIcon,
  "ig-money": InstagramMoneyIcon,
  "ig-growth": FollowersGrowthIcon,
  // Common emoji fallbacks for existing data
  "💡": ProfileVisitsIcon,
  "🎬": NewFollowersIcon,
  "🎁": InstagramMoneyIcon,
  "❓": FollowersGrowthIcon,
  "📱": InstagramMoneyIcon,
  "💰": FollowersGrowthIcon,
  "🎥": NewFollowersIcon,
};
