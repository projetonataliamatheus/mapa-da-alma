// @ts-nocheck
"use client";
import React from "react";

/**
 * Premium Apple-style 3D icons for the Sites/Páginas quote layout.
 * Every icon is a self-contained SVG with gradients, inner highlights and
 * soft shadows to feel tactile and modern. Google and WhatsApp use the
 * official brand marks.
 */

interface IconProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

const base = "block";

/* ---------- Official brand marks ---------- */

export const GoogleBrandIcon: React.FC<IconProps> = ({ className = "h-7 w-7", size, style }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={`${base} ${className}`} style={style} aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

export const WhatsAppBrandIcon: React.FC<IconProps> = ({ className = "h-7 w-7", size, style }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={`${base} ${className}`} style={style} aria-hidden>
    <defs>
      <linearGradient id="waGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#61FD7D"/>
        <stop offset="1" stopColor="#25CF43"/>
      </linearGradient>
    </defs>
    <path fill="url(#waGrad)" d="M24 4C13.5 4 5 12.5 5 23c0 3.6 1 7 2.8 10L5 44l11.3-2.7C19.2 42.6 21.6 43 24 43c10.5 0 19-8.5 19-19S34.5 4 24 4z"/>
    <path fill="#FFF" d="M34.4 29.6c-.5-.3-3.1-1.5-3.6-1.7-.5-.2-.8-.3-1.2.3-.4.5-1.3 1.7-1.6 2-.3.3-.6.4-1.1.1-.5-.3-2.2-.8-4.1-2.5-1.5-1.4-2.6-3-2.9-3.5-.3-.5 0-.8.2-1.1.2-.3.5-.6.7-.9.2-.3.3-.5.5-.9.2-.3.1-.6 0-.9-.1-.3-1.2-2.9-1.6-4-.4-1-.9-.9-1.2-.9h-1c-.3 0-.9.1-1.4.6s-1.7 1.7-1.7 4.1c0 2.4 1.7 4.7 2 5 .2.3 3.4 5.2 8.2 7.3 4.8 2.1 4.8 1.4 5.7 1.3 1-.1 3.1-1.3 3.5-2.5.4-1.2.4-2.3.3-2.5-.2-.2-.5-.3-1-.6z"/>
  </svg>
);

/* ---------- Premium custom 3D icons ---------- */

const Base3D: React.FC<
  IconProps & { grad: [string, string]; children: React.ReactNode; id: string }
> = ({ className = "h-7 w-7", size, style, grad, children, id }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={`${base} ${className}`} style={style} aria-hidden>
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={grad[0]}/>
        <stop offset="1" stopColor={grad[1]}/>
      </linearGradient>
      <linearGradient id={`gloss-${id}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55"/>
        <stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
      <filter id={`shad-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodOpacity="0.35"/>
      </filter>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="12" fill={`url(#bg-${id})`}/>
    <rect x="4" y="4" width="40" height="18" rx="12" fill={`url(#gloss-${id})`}/>
    <g filter={`url(#shad-${id})`} fill="#fff" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  </svg>
);

export const DesignIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="design" grad={["#8B5CF6", "#3730A3"]}>
    <path d="M14 32l6-2 12-12-4-4-12 12-2 6z" strokeWidth="1.2" fill="#fff"/>
    <circle cx="32" cy="16" r="2.2" fill="#fff"/>
  </Base3D>
);

export const ResponsiveIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="resp" grad={["#10B981", "#065F46"]}>
    <rect x="10" y="12" width="20" height="14" rx="2" fill="none" strokeWidth="1.8"/>
    <rect x="28" y="18" width="10" height="16" rx="2" fill="none" strokeWidth="1.8"/>
    <circle cx="33" cy="31.5" r="0.9" fill="#fff" stroke="none"/>
  </Base3D>
);

export const SpeedIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="speed" grad={["#F59E0B", "#B45309"]}>
    <path d="M24 12a12 12 0 00-10.4 18h20.8A12 12 0 0024 12z" fill="none" strokeWidth="1.8"/>
    <path d="M24 24l6-4" strokeWidth="2.2"/>
    <circle cx="24" cy="24" r="1.6" fill="#fff" stroke="none"/>
  </Base3D>
);

export const SeoIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="seo" grad={["#EC4899", "#9D174D"]}>
    <circle cx="22" cy="22" r="7" fill="none" strokeWidth="2"/>
    <path d="M27.5 27.5l6 6" strokeWidth="2.2"/>
    <path d="M19 22h6M22 19v6" strokeWidth="1.4"/>
  </Base3D>
);

export const WhatsAppFeatureIcon: React.FC<IconProps> = ({ className = "h-7 w-7", size, style }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={`${base} ${className}`} style={style} aria-hidden>
    <defs>
      <linearGradient id="wa-bg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#25D366"/>
        <stop offset="1" stopColor="#128C3C"/>
      </linearGradient>
      <linearGradient id="wa-gloss" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55"/>
        <stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#wa-bg)"/>
    <rect x="4" y="4" width="40" height="18" rx="12" fill="url(#wa-gloss)"/>
    <path fill="#fff" d="M34.4 29.6c-.5-.3-3.1-1.5-3.6-1.7-.5-.2-.8-.3-1.2.3-.4.5-1.3 1.7-1.6 2-.3.3-.6.4-1.1.1-.5-.3-2.2-.8-4.1-2.5-1.5-1.4-2.6-3-2.9-3.5-.3-.5 0-.8.2-1.1.2-.3.5-.6.7-.9.2-.3.3-.5.5-.9.2-.3.1-.6 0-.9-.1-.3-1.2-2.9-1.6-4-.4-1-.9-.9-1.2-.9h-1c-.3 0-.9.1-1.4.6s-1.7 1.7-1.7 4.1c0 2.4 1.7 4.7 2 5 .2.3 3.4 5.2 8.2 7.3 4.8 2.1 4.8 1.4 5.7 1.3 1-.1 3.1-1.3 3.5-2.5.4-1.2.4-2.3.3-2.5-.2-.2-.5-.3-1-.6z"/>
  </svg>
);

export const SecurityIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="sec" grad={["#06B6D4", "#0E4C8B"]}>
    <path d="M24 12l10 4v8c0 6-4.5 10-10 12-5.5-2-10-6-10-12v-8l10-4z" fill="none" strokeWidth="1.8"/>
    <path d="M19 24l4 4 6-7" strokeWidth="2.2"/>
  </Base3D>
);

/* Diferenciais icons */

export const HandshakeIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="hand" grad={["#F97316", "#9A3412"]}>
    <path d="M12 26l6-6 3 3 3-3 3 3 3-3 6 6-6 6-3-3-3 3-3-3-3 3-6-6z" fill="none" strokeWidth="1.6"/>
  </Base3D>
);

export const TargetIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="tgt" grad={["#EF4444", "#7F1D1D"]}>
    <circle cx="24" cy="24" r="10" fill="none" strokeWidth="1.6"/>
    <circle cx="24" cy="24" r="5" fill="none" strokeWidth="1.6"/>
    <circle cx="24" cy="24" r="1.6" fill="#fff" stroke="none"/>
  </Base3D>
);

export const RocketIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="rck" grad={["#6366F1", "#312E81"]}>
    <path d="M24 10c6 3 9 8 9 15l-4 3h-10l-4-3c0-7 3-12 9-15z" fill="none" strokeWidth="1.6"/>
    <circle cx="24" cy="20" r="2.4" fill="#fff" stroke="none"/>
    <path d="M20 32l-2 6 6-3 6 3-2-6" strokeWidth="1.6" fill="none"/>
  </Base3D>
);

export const TrendingIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="trd" grad={["#14B8A6", "#0F5F58"]}>
    <path d="M12 30l7-7 4 4 9-9" strokeWidth="2.2" fill="none"/>
    <path d="M27 18h6v6" strokeWidth="2.2" fill="none"/>
  </Base3D>
);

export const SupportIcon: React.FC<IconProps> = (p) => (
  <Base3D {...p} id="sup" grad={["#0EA5E9", "#0C4A6E"]}>
    <path d="M14 34l3-6c-2-2-3-4-3-8 0-6 4-10 10-10s10 4 10 10-4 10-10 10c-2 0-4-.4-5.5-1.2L14 34z" fill="none" strokeWidth="1.8"/>
    <circle cx="20" cy="20" r="1.4" fill="#fff" stroke="none"/>
    <circle cx="24" cy="20" r="1.4" fill="#fff" stroke="none"/>
    <circle cx="28" cy="20" r="1.4" fill="#fff" stroke="none"/>
  </Base3D>
);
