// @ts-nocheck
"use client";
/**
 * Custom composite SVG icons for report metric cards
 * with floating animation support
 */
import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

/* ── Floating wrapper ── */
const floatKeyframes = `
@keyframes report-icon-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}`;
let stylesInjected = false;
function injectFloat() {
  if (stylesInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = floatKeyframes;
  document.head.appendChild(s);
  stylesInjected = true;
}

function FloatWrap({ children, className, style, size }: IconProps & { children: React.ReactNode }) {
  injectFloat();
  const s = size || 32;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s,
        height: s,
        animation: "report-icon-float 2.5s ease-in-out infinite",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ── Resultados: Target with arrow (red/white rings + arrow) ── */
export const TargetArrowIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
      {/* Outer ring - red */}
      <circle cx="16" cy="16" r="14" stroke="#ef4444" strokeWidth="2.5" fill="none" />
      {/* Middle ring - white */}
      <circle cx="16" cy="16" r="10" stroke="#ffffff" strokeWidth="2.5" fill="none" />
      {/* Inner ring - red */}
      <circle cx="16" cy="16" r="6" stroke="#ef4444" strokeWidth="2.5" fill="none" />
      {/* Bullseye - red */}
      <circle cx="16" cy="16" r="2" fill="#ef4444" />
      {/* Arrow shaft */}
      <line x1="24" y1="8" x2="17" y2="15" stroke="#8B7355" strokeWidth="1.8" strokeLinecap="round" />
      {/* Arrow head */}
      <polygon points="26,5 28,10 23,8" fill="#6B7280" />
      {/* Arrow feathers */}
      <line x1="25" y1="6" x2="27" y2="4" stroke="#DC2626" strokeWidth="1" />
      <line x1="25.5" y1="7" x2="28" y2="5.5" stroke="#DC2626" strokeWidth="1" />
    </svg>
  </FloatWrap>
);

/* ── Custo por Resultado: Target + $ ── */
export const TargetDollarIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 36 32" width="100%" height="100%" fill="none">
      {/* Target (smaller, left) */}
      <circle cx="14" cy="16" r="10" stroke="#ef4444" strokeWidth="2" fill="none" />
      <circle cx="14" cy="16" r="6" stroke="#ffffff" strokeWidth="2" fill="none" />
      <circle cx="14" cy="16" r="2.5" fill="#ef4444" />
      {/* Arrow */}
      <line x1="20" y1="10" x2="15.5" y2="14.5" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="22,7 23,11 19,9" fill="#6B7280" />
      {/* Dollar sign (right) */}
      <circle cx="28" cy="16" r="7" fill="#10b981" opacity="0.15" />
      <text x="28" y="20.5" textAnchor="middle" fill="#10b981" fontSize="13" fontWeight="bold" fontFamily="Arial">$</text>
    </svg>
  </FloatWrap>
);

/* ── Instagram Followers: Instagram (primary, large) + Users (secondary, small) ── */
export const InstagramFollowersIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props} size={props.size || 40}>
    <svg viewBox="0 0 40 32" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="ig-grad-followers" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      {/* Instagram icon (primary, large, left) */}
      <rect x="2" y="2" width="22" height="22" rx="6" stroke="url(#ig-grad-followers)" strokeWidth="2.5" fill="none" />
      <circle cx="13" cy="13" r="5.5" stroke="url(#ig-grad-followers)" strokeWidth="2.2" fill="none" />
      <circle cx="19.5" cy="6.5" r="1.8" fill="url(#ig-grad-followers)" />
      {/* Users icon (secondary, small, bottom-right) */}
      <circle cx="31" cy="16" r="3.5" stroke="#e11d48" strokeWidth="1.5" fill="none" />
      <path d="M25.5 28c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6" stroke="#e11d48" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  </FloatWrap>
);

/* ── Visitas ao Perfil do Instagram: Instagram (primary, large) + Eye (secondary, small) ── */
export const InstagramVisitsIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props} size={props.size || 40}>
    <svg viewBox="0 0 40 32" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="ig-grad-visits" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      {/* Instagram icon (primary, large, left) */}
      <rect x="2" y="2" width="22" height="22" rx="6" stroke="url(#ig-grad-visits)" strokeWidth="2.5" fill="none" />
      <circle cx="13" cy="13" r="5.5" stroke="url(#ig-grad-visits)" strokeWidth="2.2" fill="none" />
      <circle cx="19.5" cy="6.5" r="1.8" fill="url(#ig-grad-visits)" />
      {/* Eye icon (secondary, small, bottom-right) */}
      <path d="M26 20s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="#e11d48" strokeWidth="1.3" fill="none" />
      <circle cx="33" cy="20" r="2" stroke="#e11d48" strokeWidth="1.3" fill="none" />
      <circle cx="33" cy="20" r="0.8" fill="#e11d48" />
    </svg>
  </FloatWrap>
);

/* ── Comentários no Post: Instagram + Facebook side by side ── */
export const PostCommentsIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props} size={props.size || 40}>
    <svg viewBox="0 0 40 28" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="ig-grad-comments" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      {/* Instagram icon (left) */}
      <rect x="1" y="1" width="18" height="18" rx="5" stroke="url(#ig-grad-comments)" strokeWidth="2.2" fill="none" />
      <circle cx="10" cy="10" r="4.5" stroke="url(#ig-grad-comments)" strokeWidth="2" fill="none" />
      <circle cx="15.5" cy="4.5" r="1.5" fill="url(#ig-grad-comments)" />
      {/* Facebook icon (right) */}
      <circle cx="30" cy="10" r="8" fill="#1877F2" />
      <text x="30" y="14" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">f</text>
    </svg>
  </FloatWrap>
);

/* ── Qualidade do Perfil Instagram: Instagram (primary, large) + Gold seal (secondary, small) ── */
export const InstagramQualityIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props} size={props.size || 40}>
    <svg viewBox="0 0 40 32" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="ig-grad-quality" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
        <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FF8C00" />
        </linearGradient>
      </defs>
      {/* Instagram icon (primary, large, left) */}
      <rect x="2" y="2" width="22" height="22" rx="6" stroke="url(#ig-grad-quality)" strokeWidth="2.5" fill="none" />
      <circle cx="13" cy="13" r="5.5" stroke="url(#ig-grad-quality)" strokeWidth="2.2" fill="none" />
      <circle cx="19.5" cy="6.5" r="1.8" fill="url(#ig-grad-quality)" />
      {/* Gold seal (secondary, small, bottom-right) */}
      <polygon
        points="32,14 33.2,17.5 37,17.5 34,20 35,23.5 32,21 29,23.5 30,20 27,17.5 30.8,17.5"
        fill="url(#gold-grad)"
        stroke="#B8860B"
        strokeWidth="0.5"
      />
      <polyline points="30,19 31.5,21.5 34,17.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </FloatWrap>
);

/* ── WhatsApp with gradient ── */
export const WhatsAppGradientIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="wa-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#128C7E" />
        </linearGradient>
      </defs>
      <g transform="translate(4,4) scale(1)">
        <path fill="url(#wa-gradient)" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </g>
    </svg>
  </FloatWrap>
);

/* ── Custo por Mensagem WhatsApp: WhatsApp (primary, large) + $ (secondary, small) ── */
export const WhatsAppDollarIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 36 32" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="wa-gradient-dollar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#128C7E" />
        </linearGradient>
      </defs>
      {/* WhatsApp icon (primary, large, left) */}
      <g transform="translate(1,2) scale(1)">
        <path fill="url(#wa-gradient-dollar)" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </g>
      {/* Dollar sign (secondary, small, bottom-right) */}
      <circle cx="29" cy="22" r="5.5" fill="#10b981" opacity="0.2" />
      <text x="29" y="25.5" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="Arial">$</text>
    </svg>
  </FloatWrap>
);

/* ── Conversas por Mensagem (WhatsApp gradient) ── */
export const WhatsAppMessageIcon: React.FC<IconProps> = (props) => (
  <FloatWrap {...props}>
    <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
      <defs>
        <linearGradient id="wa-gradient-msg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#128C7E" />
        </linearGradient>
      </defs>
      <g transform="translate(4,4) scale(1)">
        <path fill="url(#wa-gradient-msg)" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </g>
    </svg>
  </FloatWrap>
);

/* ── Aproveitamento de Conversas WhatsApp ── */
export { WhatsAppGradientIcon as ConversationRateIcon };

/* ── Standard floating Lucide wrapper ── */
export function FloatingLucideIcon({ Icon, ...props }: IconProps & { Icon: React.ComponentType<any> }) {
  return (
    <FloatWrap {...props}>
      <Icon style={{ width: "75%", height: "75%", ...props.style }} />
    </FloatWrap>
  );
}

/* ── Golden Quality Seal for creative_quality_ctr ── */
export function GoldenQualitySealIcon(props: IconProps) {
  return (
    <FloatWrap {...props}>
      <svg viewBox="0 0 48 48" fill="none" style={{ width: "80%", height: "80%" }}>
        {/* Shield / seal shape */}
        <path d="M24 4L30 10H38L40 18L46 24L40 30L38 38H30L24 44L18 38H10L8 30L2 24L8 18L10 10H18L24 4Z" fill="url(#gold-seal-grad)" stroke="#b8860b" strokeWidth="1.5"/>
        {/* Star in center */}
        <path d="M24 14L26.5 20.5H33L27.75 24.5L29.5 31L24 27L18.5 31L20.25 24.5L15 20.5H21.5L24 14Z" fill="#fff" fillOpacity="0.95"/>
        <defs>
          <linearGradient id="gold-seal-grad" x1="2" y1="4" x2="46" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffd700"/>
            <stop offset="0.5" stopColor="#f0c040"/>
            <stop offset="1" stopColor="#daa520"/>
          </linearGradient>
        </defs>
      </svg>
    </FloatWrap>
  );
}
