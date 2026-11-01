// @ts-nocheck
"use client";
/**
 * Modern, sophisticated icon set used across quote pages.
 * Replaces generic emojis (📍 🤝 💰) with refined SVG components.
 */
import React from "react";
const handshake3dImg = "/images/handshake-3d.png";

interface IconProps {
  size?: number;
  className?: string;
}

/** Modern GPS pin — glass marker with radar rings, avoiding the old emoji look.
 *  Used for "Tráfego Local Cirúrgico" / location-based features. */
export function GpsPinIcon({ size = 48, className }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`gp-${id}`} x1="16" y1="6" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.52" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <radialGradient id={`gpg-${id}`} cx="40%" cy="24%" r="65%">
          <stop stopColor="#FFFFFF" stopOpacity="0.62" />
          <stop offset="0.68" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={`gps-${id}`} x="-25%" y="-18%" width="150%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.38" />
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38BDF8" floodOpacity="0.38" />
        </filter>
        <filter id={`gpsGlow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="32" cy="58" rx="13" ry="3" fill="#020617" opacity="0.22" />
      <g filter={`url(#gpsGlow-${id})`} opacity="0.72">
        <circle cx="32" cy="25" r="20" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="32" cy="25" r="13" stroke="#A7F3D0" strokeWidth="1" strokeDasharray="2 5" opacity="0.7" />
      </g>
      <g filter={`url(#gps-${id})`}>
        <path
          d="M32 5.5c-10.15 0-18.38 8.03-18.38 17.94 0 13.05 16.38 30.6 17.25 31.54.62.67 1.64.67 2.26 0 .87-.94 17.25-18.49 17.25-31.54C50.38 13.53 42.15 5.5 32 5.5Z"
          fill={`url(#gp-${id})`}
          stroke="#BAE6FD"
          strokeOpacity="0.75"
          strokeWidth="1.4"
        />
        <path
          d="M32 5.5c-10.15 0-18.38 8.03-18.38 17.94 0 13.05 16.38 30.6 17.25 31.54.62.67 1.64.67 2.26 0 .87-.94 17.25-18.49 17.25-31.54C50.38 13.53 42.15 5.5 32 5.5Z"
          fill={`url(#gpg-${id})`}
        />
      </g>
      <circle cx="32" cy="23.5" r="9.2" fill="#F8FAFC" opacity="0.96" />
      <circle cx="32" cy="23.5" r="5.2" fill="#0EA5E9" />
      <circle cx="29.5" cy="21" r="1.8" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

/** Modern 3D handshake icon — uses a polished 3D rendered illustration
 *  for a friendly, sophisticated "partnership / deal closed" symbol. */
export function HandshakeIcon({ size = 80, className }: IconProps) {
  return (
    <img
      src={handshake3dImg}
      alt="Aperto de mãos — parceria"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: "auto",
        objectFit: "contain",
      }}
      draggable={false}
    />
  );
}


/** Floating money icon — green gradient with motion lines & sparkle.
 *  Used for "Expectativa Realista" / earnings projections. */
export function MoneyFloatIcon({ size = 48, className }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`mf-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="55%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id={`mfb-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <filter id={`mfs-${id}`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
          <feOffset dx="0" dy="2" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <style>{`
          @keyframes mf-float-${id} { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
          @keyframes mf-spark-${id} { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
          .mf-bill-${id} { animation: mf-float-${id} 3s ease-in-out infinite; transform-origin: center; }
          .mf-bill2-${id} { animation: mf-float-${id} 3s ease-in-out infinite; animation-delay: -1.5s; transform-origin: center; }
          .mf-spark-${id} { animation: mf-spark-${id} 2s ease-in-out infinite; }
        `}</style>
      </defs>
      {/* upward motion arrows */}
      <g opacity="0.7" className={`mf-spark-${id}`}>
        <path d="M14 42l3-4 3 4h-2v5h-2v-5z" fill="#16A34A" />
        <path d="M48 38l3-4 3 4h-2v5h-2v-5z" fill="#16A34A" opacity="0.7" />
      </g>
      {/* sparkles */}
      <g className={`mf-spark-${id}`}>
        <circle cx="10" cy="20" r="1.5" fill="#FCD34D" />
        <circle cx="54" cy="22" r="1.8" fill="#FCD34D" />
        <circle cx="50" cy="10" r="1.2" fill="#A7F3D0" />
      </g>
      {/* back bill */}
      <g filter={`url(#mfs-${id})`} className={`mf-bill2-${id}`}>
        <rect x="14" y="14" width="34" height="22" rx="3" transform="rotate(-12 31 25)" fill={`url(#mfb-${id})`} stroke="#14532D" strokeWidth="1" />
      </g>
      {/* front bill */}
      <g filter={`url(#mfs-${id})`} className={`mf-bill-${id}`}>
        <rect x="16" y="22" width="36" height="24" rx="3.5" fill={`url(#mf-${id})`} stroke="#14532D" strokeWidth="1.2" />
        <circle cx="34" cy="34" r="6.5" fill="none" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.85" />
        <text x="34" y="38" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFFFF" fontFamily="system-ui, sans-serif">$</text>
        {/* corners */}
        <circle cx="20" cy="26" r="1.3" fill="#FFFFFF" opacity="0.6" />
        <circle cx="48" cy="42" r="1.3" fill="#FFFFFF" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Modern calendar icon — glass schedule card for timeline sections. */
export function CalendarModernIcon({ size = 48, className }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`cal-${id}`} x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" /><stop offset="0.5" stopColor="#DBEAFE" /><stop offset="1" stopColor="#93C5FD" />
        </linearGradient>
        <filter id={`calShadow-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter={`url(#calShadow-${id})`}>
        <rect x="10" y="12" width="44" height="42" rx="8" fill={`url(#cal-${id})`} stroke="#60A5FA" strokeWidth="1.4" />
        <path d="M10 23h44" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />
        <rect x="18" y="7" width="5" height="12" rx="2.5" fill="#0F172A" />
        <rect x="41" y="7" width="5" height="12" rx="2.5" fill="#0F172A" />
        <circle cx="23" cy="34" r="3" fill="#2563EB" />
        <circle cx="32" cy="34" r="3" fill="#22C55E" />
        <circle cx="41" cy="34" r="3" fill="#2563EB" opacity="0.55" />
        <path d="M21 44h22" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
      </g>
    </svg>
  );
}

/** Animated growth rocket — rising and softly rotating like propulsion. */
export function RocketGrowthIcon({ size = 48, className }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`rkBody-${id}`} x1="22" y1="7" x2="44" y2="46" gradientUnits="userSpaceOnUse"><stop stopColor="#F8FAFC" /><stop offset="1" stopColor="#60A5FA" /></linearGradient>
        <linearGradient id={`rkFire-${id}`} x1="32" y1="40" x2="32" y2="61" gradientUnits="userSpaceOnUse"><stop stopColor="#FDE047" /><stop offset="0.55" stopColor="#F97316" /><stop offset="1" stopColor="#EF4444" /></linearGradient>
        <style>{`
          @keyframes rk-rise-${id}{0%,100%{transform:translateY(1px) rotate(-7deg)}50%{transform:translateY(-4px) rotate(7deg)}}
          @keyframes rk-fire-${id}{0%,100%{transform:scaleY(.82);opacity:.75}50%{transform:scaleY(1.18);opacity:1}}
          .rk-${id}{animation:rk-rise-${id} 2.7s ease-in-out infinite;transform-origin:32px 34px}.rkf-${id}{animation:rk-fire-${id} .55s ease-in-out infinite;transform-origin:32px 44px}
        `}</style>
      </defs>
      <g className={`rk-${id}`}>
        <path className={`rkf-${id}`} d="M28 43c-1 5 1.2 9.8 4 14 2.8-4.2 5-9 4-14l-4 2.2L28 43Z" fill={`url(#rkFire-${id})`} />
        <path d="M23 37l-8 6 9 2 4-7-5-1ZM41 37l8 6-9 2-4-7 5-1Z" fill="#2563EB" />
        <path d="M32 6c8 6 12 17 9 31-2.2 3-5.2 5-9 5s-6.8-2-9-5C20 23 24 12 32 6Z" fill={`url(#rkBody-${id})`} stroke="#0F172A" strokeWidth="1.2" />
        <circle cx="32" cy="24" r="5.2" fill="#0EA5E9" stroke="#F8FAFC" strokeWidth="2" />
      </g>
    </svg>
  );
}

/** Map of sophisticated icon keys → component. Used by quote layouts. */
export const SOPHISTICATED_ICONS: Record<string, React.ComponentType<IconProps>> = {
  "gps-pin": GpsPinIcon,
  "📍": GpsPinIcon,
  "📌": GpsPinIcon,
  "pin": GpsPinIcon,
  "handshake": HandshakeIcon,
  "money-float": MoneyFloatIcon,
  "calendar-modern": CalendarModernIcon,
  "rocket-growth": RocketGrowthIcon,
};
