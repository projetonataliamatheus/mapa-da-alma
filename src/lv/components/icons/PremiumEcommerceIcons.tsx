// @ts-nocheck
"use client";
import React from "react";

/**
 * Premium Apple-style 3D icons for the Loja Virtual (E-commerce) quote layout.
 * Each icon is a self-contained SVG with tactile gradients, inner gloss and
 * soft drop shadow — matches the visual language of PremiumSiteIcons.
 */

interface IconProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

const base = "block";

const Base3D: React.FC<
  IconProps & { grad: [string, string]; children: React.ReactNode; id: string }
> = ({ className = "h-7 w-7", size, style, grad, children, id }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={`${base} ${className}`} style={style} aria-hidden>
    <defs>
      <linearGradient id={`ec-bg-${id}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={grad[0]} />
        <stop offset="1" stopColor={grad[1]} />
      </linearGradient>
      <linearGradient id={`ec-gloss-${id}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`ec-shad-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodOpacity="0.35" />
      </filter>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="12" fill={`url(#ec-bg-${id})`} />
    <rect x="4" y="4" width="40" height="18" rx="12" fill={`url(#ec-gloss-${id})`} />
    <g filter={`url(#ec-shad-${id})`} fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  </svg>
);

// ---------- CARDS (o que você receberá) ----------

export const ShoppingBagIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="bag" grad={["#EC4899", "#831843"]}>
    <path d="M14 18h20l-2 20H16l-2-20z" strokeWidth="1.8" />
    <path d="M19 18v-3a5 5 0 0110 0v3" strokeWidth="1.8" />
    <circle cx="19" cy="26" r="1.1" fill="#fff" stroke="none" />
    <circle cx="29" cy="26" r="1.1" fill="#fff" stroke="none" />
  </Base3D>
);

export const SmartphoneIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="phone" grad={["#10B981", "#065F46"]}>
    <rect x="17" y="10" width="14" height="28" rx="3" strokeWidth="1.8" />
    <path d="M22 34h4" strokeWidth="1.8" />
    <path d="M18 14h12" strokeWidth="1.2" opacity="0.6" />
  </Base3D>
);

export const CreditCardIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="cc" grad={["#6366F1", "#312E81"]}>
    <rect x="10" y="14" width="28" height="20" rx="3" strokeWidth="1.8" />
    <path d="M10 21h28" strokeWidth="2" />
    <path d="M14 29h6" strokeWidth="1.6" />
    <rect x="28" y="27" width="7" height="4" rx="1" strokeWidth="1.4" />
  </Base3D>
);

export const TruckIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="truck" grad={["#F59E0B", "#B45309"]}>
    <rect x="8" y="16" width="18" height="14" rx="2" strokeWidth="1.8" />
    <path d="M26 20h7l4 5v5h-11z" strokeWidth="1.8" />
    <circle cx="16" cy="34" r="2.4" strokeWidth="1.6" />
    <circle cx="32" cy="34" r="2.4" strokeWidth="1.6" />
  </Base3D>
);

export const PackageIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="pkg" grad={["#8B5CF6", "#4C1D95"]}>
    <path d="M24 12l12 6v12l-12 6-12-6V18l12-6z" strokeWidth="1.8" />
    <path d="M12 18l12 6 12-6M24 24v12" strokeWidth="1.6" />
    <path d="M18 15l12 6" strokeWidth="1.4" opacity="0.7" />
  </Base3D>
);

export const ZapIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="zap" grad={["#FACC15", "#B45309"]}>
    <path d="M26 8l-12 18h8l-2 14 12-18h-8l2-14z" strokeWidth="1.6" fill="#fff" />
  </Base3D>
);

export const SearchIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="srch" grad={["#0EA5E9", "#0C4A6E"]}>
    <circle cx="22" cy="22" r="8" strokeWidth="2" />
    <path d="M28 28l7 7" strokeWidth="2.4" />
  </Base3D>
);

export const ShieldIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="shd" grad={["#06B6D4", "#164E63"]}>
    <path d="M24 10l11 4v9c0 7-5 12-11 14-6-2-11-7-11-14v-9l11-4z" strokeWidth="1.8" />
    <path d="M19 24l4 4 6-7" strokeWidth="2.2" />
  </Base3D>
);

// ---------- DIFFS (diferenciais) ----------

export const RocketIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="rkt" grad={["#EF4444", "#7F1D1D"]}>
    <path d="M24 8c6 3 9 9 9 16l-3 3h-12l-3-3c0-7 3-13 9-16z" strokeWidth="1.6" />
    <circle cx="24" cy="20" r="2.4" fill="#fff" stroke="none" />
    <path d="M19 30l-3 6 5-2M29 30l3 6-5-2" strokeWidth="1.6" />
  </Base3D>
);

export const StoreIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="str" grad={["#F97316", "#9A3412"]}>
    <path d="M11 18l3-7h20l3 7v3a4 4 0 01-8 0 4 4 0 01-8 0 4 4 0 01-8 0v-3z" strokeWidth="1.6" />
    <path d="M13 24v14h22V24" strokeWidth="1.6" />
    <path d="M21 38v-8h6v8" strokeWidth="1.6" />
  </Base3D>
);

export const TrendingIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="trd" grad={["#14B8A6", "#0F5F58"]}>
    <path d="M11 32l8-8 5 5 10-11" strokeWidth="2.2" />
    <path d="M28 18h7v7" strokeWidth="2.2" />
  </Base3D>
);

export const HeadphonesIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="hp" grad={["#A855F7", "#581C87"]}>
    <path d="M12 27v-2a12 12 0 0124 0v2" strokeWidth="1.8" />
    <rect x="10" y="26" width="6" height="10" rx="2" strokeWidth="1.6" fill="#fff" />
    <rect x="32" y="26" width="6" height="10" rx="2" strokeWidth="1.6" fill="#fff" />
  </Base3D>
);

// ---------- Result stats ----------

export const ChartIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="chart" grad={["#3B82F6", "#1E3A8A"]}>
    <path d="M12 36h24" strokeWidth="2" />
    <rect x="14" y="24" width="4" height="10" rx="1" strokeWidth="1.4" fill="#fff" />
    <rect x="22" y="18" width="4" height="16" rx="1" strokeWidth="1.4" fill="#fff" />
    <rect x="30" y="12" width="4" height="22" rx="1" strokeWidth="1.4" fill="#fff" />
  </Base3D>
);

export const UsersIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="usr" grad={["#F472B6", "#9D174D"]}>
    <circle cx="20" cy="20" r="4" strokeWidth="1.8" />
    <circle cx="31" cy="22" r="3.2" strokeWidth="1.6" />
    <path d="M12 34c1-4 4-6 8-6s7 2 8 6" strokeWidth="1.8" />
    <path d="M28 33c1-3 3-4 6-4 3 0 5 1 5 4" strokeWidth="1.6" />
  </Base3D>
);

export const GlobeIcon3D: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="glb" grad={["#0EA5E9", "#1E3A8A"]}>
    <circle cx="24" cy="24" r="12" strokeWidth="1.8" />
    <path d="M12 24h24" strokeWidth="1.6" />
    <path d="M24 12c4 4 4 20 0 24M24 12c-4 4-4 20 0 24" strokeWidth="1.6" />
  </Base3D>
);
