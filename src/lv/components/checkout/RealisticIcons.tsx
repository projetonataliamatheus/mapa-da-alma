// @ts-nocheck
"use client";
/**
 * Ícones "3D" realistas em SVG puro para o checkout.
 * - RocketRealistic: foguete com casco metálico, janela azul, aletas vermelhas e chama animada.
 * - InstagramRealistic: logo oficial com gradiente laranja→rosa→roxo.
 * - HeartRealistic: coração 3D com brilho especular e sombra profunda.
 */
import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/* ============================================================
 * ROCKET — Design 3D estilo emoji Apple (limpo, legível, cute)
 * Corpo branco com sombra 3D, cone vermelho, 3 aletas visíveis
 * em perspectiva, janela azul brilhante, chama tricolor e leve
 * balanço lateral (sway) — sempre legível de qualquer ângulo.
 * ============================================================ */
export const RocketRealistic: React.FC<IconProps & { spin?: boolean; spinDuration?: number }> = ({
  size = 64,
  className,
  style,
  spin = true,
  spinDuration = 2.4,
}) => {
  const uid = React.useId().replace(/[:]/g, "");
  return (
    <div
      style={{
        display: "inline-block",
        animation: spin ? `rk-sway-${uid} ${spinDuration}s ease-in-out infinite` : undefined,
        transformOrigin: "50% 70%",
        ...style,
      }}
      className={className}
    >
      <svg viewBox="0 0 140 200" width={size} height={(size * 200) / 140} aria-hidden="true">
        <defs>
          {/* Corpo — branco perolado com sombra lateral (cilindro) */}
          <linearGradient id={`rk-body-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#94a3b8" />
            <stop offset="0.18" stopColor="#e2e8f0" />
            <stop offset="0.45" stopColor="#ffffff" />
            <stop offset="0.75" stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#64748b" />
          </linearGradient>

          {/* Nose cone — vermelho tomate 3D */}
          <linearGradient id={`rk-cone-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#991b1b" />
            <stop offset="0.35" stopColor="#ef4444" />
            <stop offset="0.55" stopColor="#fca5a5" />
            <stop offset="0.75" stopColor="#dc2626" />
            <stop offset="1" stopColor="#7f1d1d" />
          </linearGradient>

          {/* Colar entre cone e corpo */}
          <linearGradient id={`rk-collar-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#450a0a" />
            <stop offset="0.5" stopColor="#dc2626" />
            <stop offset="1" stopColor="#7f1d1d" />
          </linearGradient>

          {/* Aletas laterais (grandes) */}
          <linearGradient id={`rk-fin-side-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7f1d1d" />
            <stop offset="0.5" stopColor="#ef4444" />
            <stop offset="1" stopColor="#450a0a" />
          </linearGradient>

          {/* Aleta frontal (vista de frente — mais escura, no meio da base) */}
          <linearGradient id={`rk-fin-front-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dc2626" />
            <stop offset="1" stopColor="#450a0a" />
          </linearGradient>

          {/* Janela — azul brilhante 3D */}
          <radialGradient id={`rk-window-${uid}`} cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#dbeafe" />
            <stop offset="0.4" stopColor="#38bdf8" />
            <stop offset="0.8" stopColor="#0369a1" />
            <stop offset="1" stopColor="#082f49" />
          </radialGradient>

          {/* Bocal escuro */}
          <linearGradient id={`rk-nozzle-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000000" />
            <stop offset="0.5" stopColor="#334155" />
            <stop offset="1" stopColor="#000000" />
          </linearGradient>

          {/* Chama */}
          <radialGradient id={`rk-flame-${uid}`} cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.25" stopColor="#fef08a" />
            <stop offset="0.55" stopColor="#f97316" />
            <stop offset="0.85" stopColor="#dc2626" />
            <stop offset="1" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`rk-flame2-${uid}`} cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#93c5fd" />
            <stop offset="0.8" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="1" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>

          {/* Sombra sob o foguete */}
          <radialGradient id={`rk-shadow-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#000000" stopOpacity="0.35" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ============ CHAMA (base) ============ */}
        <g
          style={{
            transformOrigin: "70px 155px",
            animation: `rk-flame-${uid} 0.18s ease-in-out infinite alternate`,
          }}
        >
          <ellipse cx="70" cy="180" rx="22" ry="34" fill={`url(#rk-flame-${uid})`} opacity="0.95" />
          <ellipse cx="70" cy="172" rx="12" ry="22" fill={`url(#rk-flame2-${uid})`} opacity="0.9" />
          <ellipse cx="70" cy="168" rx="6" ry="11" fill="#ffffff" opacity="0.95" />
        </g>

        {/* ============ ALETAS (atrás e frente do corpo) ============ */}
        {/* Aleta traseira — pequena, atrás */}
        <path d="M67 122 L67 148 L73 148 L73 122 Z" fill="#450a0a" opacity="0.85" />

        {/* Aleta ESQUERDA — grande em perspectiva */}
        <path
          d="M42 118 L18 152 L26 156 L42 145 Z"
          fill={`url(#rk-fin-side-${uid})`}
          stroke="#3b0a0f"
          strokeWidth="0.8"
        />
        {/* Aleta DIREITA — grande em perspectiva */}
        <path
          d="M98 118 L122 152 L114 156 L98 145 Z"
          fill={`url(#rk-fin-side-${uid})`}
          stroke="#3b0a0f"
          strokeWidth="0.8"
        />

        {/* ============ CORPO CILÍNDRICO ============ */}
        <path
          d="M42 55 L98 55 L98 142 L42 142 Z"
          fill={`url(#rk-body-${uid})`}
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Colar vermelho abaixo do cone */}
        <rect x="42" y="55" width="56" height="8" fill={`url(#rk-collar-${uid})`} />
        <ellipse cx="70" cy="55" rx="28" ry="4" fill={`url(#rk-collar-${uid})`} />

        {/* ============ CONE (nariz) — mais curto e afilado ============ */}
        <path
          d="M46 55 Q52 38 70 30 Q88 38 94 55 Z"
          fill={`url(#rk-cone-${uid})`}
          stroke="#5f0a1a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Reflexo do cone */}
        <path
          d="M58 42 Q56 50 62 54"
          stroke="#ffffff"
          strokeWidth="2.2"
          opacity="0.55"
          strokeLinecap="round"
          fill="none"
        />

        {/* Ponta metálica no topo */}
        <circle cx="70" cy="30" r="2" fill="#fca5a5" />


        {/* ============ JANELA ============ */}
        <circle cx="70" cy="85" r="15" fill={`url(#rk-window-${uid})`} stroke="#0f172a" strokeWidth="2" />
        <circle cx="70" cy="85" r="15" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.6" />
        <ellipse cx="65" cy="80" rx="5" ry="3" fill="#ffffff" opacity="0.85" />
        <circle cx="75" cy="90" r="1.8" fill="#ffffff" opacity="0.7" />

        {/* Anéis do corpo */}
        <line x1="42" y1="115" x2="98" y2="115" stroke="#94a3b8" strokeWidth="1" opacity="0.7" />
        <line x1="42" y1="120" x2="98" y2="120" stroke="#475569" strokeWidth="0.8" opacity="0.5" />

        {/* Rebites laterais */}
        {[75, 105, 130].map((y) => (
          <g key={y}>
            <circle cx="47" cy={y} r="1" fill="#64748b" />
            <circle cx="93" cy={y} r="1" fill="#64748b" />
          </g>
        ))}

        {/* Reflexo vertical no corpo (highlight) */}
        <rect x="52" y="63" width="4" height="76" fill="#ffffff" opacity="0.6" rx="2" />

        {/* Base escura */}
        <rect x="42" y="140" width="56" height="6" fill="#1e293b" />

        {/* Aleta FRONTAL — triângulo no centro à frente */}
        <path
          d="M64 142 L70 158 L76 142 Z"
          fill={`url(#rk-fin-front-${uid})`}
          stroke="#3b0a0f"
          strokeWidth="0.6"
        />

        {/* Bocal */}
        <path
          d="M52 146 L88 146 L82 160 L58 160 Z"
          fill={`url(#rk-nozzle-${uid})`}
          stroke="#000"
          strokeWidth="0.8"
        />
        <ellipse cx="70" cy="160" rx="12" ry="2.5" fill="#000" />

        <style>{`
          @keyframes rk-flame-${uid} {
            from { transform: scaleY(0.85) scaleX(0.95); opacity: 0.85; }
            to   { transform: scaleY(1.2) scaleX(1.1); opacity: 1; }
          }
          @keyframes rk-sway-${uid} {
            0%, 100% { transform: rotate(-4deg) translateY(0px); }
            50%      { transform: rotate(4deg) translateY(-3px); }
          }
        `}</style>
      </svg>
    </div>
  );
};

/* ============================================================
 * INSTAGRAM — logo oficial com gradiente
 * ============================================================ */
export const InstagramRealistic: React.FC<IconProps> = ({ size = 48, className, style }) => {
  const uid = React.useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={`ig-${uid}`} cx="0.3" cy="1.05" r="1.3">
          <stop offset="0" stopColor="#FFDD55" />
          <stop offset="0.1" stopColor="#FFDD55" />
          <stop offset="0.5" stopColor="#FF543E" />
          <stop offset="1" stopColor="#C837AB" />
        </radialGradient>
        <radialGradient id={`ig2-${uid}`} cx="0.85" cy="-0.1" r="1">
          <stop offset="0" stopColor="#3771C8" />
          <stop offset="0.5" stopColor="#3771C8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#6600FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#ig-${uid})`} />
      <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#ig2-${uid})`} />
      {/* Camera outline */}
      <rect x="14" y="14" width="36" height="36" rx="10" fill="none" stroke="#ffffff" strokeWidth="3" />
      <circle cx="32" cy="32" r="9" fill="none" stroke="#ffffff" strokeWidth="3" />
      <circle cx="43" cy="21" r="2.6" fill="#ffffff" />
    </svg>
  );
};

/* ============================================================
 * HEART — 3D glossy
 * ============================================================ */
export const HeartRealistic: React.FC<IconProps> = ({ size = 48, className, style }) => {
  const uid = React.useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 64 60" width={size} height={(size * 60) / 64} className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={`ht-${uid}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffb1c1" />
          <stop offset="0.35" stopColor="#ff4d6d" />
          <stop offset="0.75" stopColor="#c1121f" />
          <stop offset="1" stopColor="#6a040f" />
        </radialGradient>
        <linearGradient id={`ht-shadow-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        d="M32 56 C 8 40 2 24 12 12 C 20 3 30 6 32 16 C 34 6 44 3 52 12 C 62 24 56 40 32 56 Z"
        fill={`url(#ht-${uid})`}
        stroke="#7f1d1d"
        strokeWidth="0.6"
      />
      <path
        d="M32 56 C 8 40 2 24 12 12 C 20 3 30 6 32 16 C 34 6 44 3 52 12 C 62 24 56 40 32 56 Z"
        fill={`url(#ht-shadow-${uid})`}
      />
      {/* Gloss highlight */}
      <ellipse cx="22" cy="18" rx="8" ry="5" fill="#ffffff" opacity="0.55" transform="rotate(-30 22 18)" />
      <ellipse cx="27" cy="24" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.7" />
    </svg>
  );
};

/* ============================================================
 * WHATSAPP — 3D realista com gradiente verde oficial + gloss
 * ============================================================ */
export const WhatsAppRealistic: React.FC<IconProps> = ({ size = 48, className, style }) => {
  const uid = React.useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={`wa-${uid}`} cx="0.3" cy="0.25" r="0.95">
          <stop offset="0" stopColor="#7BEE9C" />
          <stop offset="0.45" stopColor="#25D366" />
          <stop offset="1" stopColor="#0B6B33" />
        </radialGradient>
        <linearGradient id={`wa-shadow-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Círculo principal */}
      <circle cx="32" cy="32" r="28" fill={`url(#wa-${uid})`} stroke="#0b3d1e" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="28" fill={`url(#wa-shadow-${uid})`} />
      {/* Gloss superior */}
      <ellipse cx="24" cy="17" rx="14" ry="6" fill="#ffffff" opacity="0.35" />
      {/* Ícone do fone WhatsApp oficial */}
      <path
        fill="#ffffff"
        d="M45.4 18.6C41.9 15 37.1 13 32.1 13c-10.4 0-18.8 8.4-18.8 18.8 0 3.3.9 6.5 2.5 9.4L13 51l10.1-2.6c2.8 1.5 5.9 2.3 9.1 2.3h.01c10.4 0 18.8-8.4 18.8-18.8 0-5-2-9.7-5.6-13.3zM32.1 47.6c-2.9 0-5.7-.8-8.2-2.3l-.6-.4-6 1.6 1.6-5.9-.4-.6c-1.6-2.6-2.5-5.6-2.5-8.7 0-8.9 7.2-16.1 16.1-16.1 4.3 0 8.3 1.7 11.4 4.7 3 3 4.7 7.1 4.7 11.4 0 8.9-7.2 16.3-16.1 16.3zm8.8-12.1c-.5-.2-2.9-1.4-3.3-1.6-.4-.2-.8-.2-1.1.2-.3.5-1.3 1.6-1.6 1.9-.3.3-.6.4-1.1.1-.5-.2-2-.7-3.9-2.4-1.4-1.3-2.4-2.8-2.7-3.3-.3-.5 0-.7.2-1 .2-.2.5-.6.7-.9.2-.3.3-.5.5-.8.2-.3.1-.6 0-.9-.1-.2-1.1-2.7-1.5-3.7-.4-1-.8-.8-1.1-.8h-.9c-.3 0-.9.1-1.3.6-.5.5-1.7 1.7-1.7 4.2 0 2.5 1.8 4.9 2 5.2.2.3 3.6 5.5 8.7 7.7 1.2.5 2.2.8 2.9 1.1 1.2.4 2.3.3 3.2.2 1-.1 2.9-1.2 3.3-2.4.4-1.2.4-2.2.3-2.4-.1-.2-.4-.3-.9-.5z"
      />
    </svg>
  );
};

/* ============================================================
 * MONEY — Moeda dourada 3D com "$" em relevo (estilo emoji Apple)
 * ============================================================ */
export const MoneyRealistic: React.FC<IconProps> = ({ size = 48, className, style }) => {
  const uid = React.useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`mn-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="0.5" stopColor="#16A34A" />
          <stop offset="1" stopColor="#065F26" />
        </linearGradient>
        <linearGradient id={`mn-shine-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Cifrão sólido em verde, com leve gloss */}
      <text
        x="32"
        y="52"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="60"
        fill={`url(#mn-fill-${uid})`}
        stroke="#064E24"
        strokeWidth="1.2"
        paintOrder="stroke"
      >$</text>
      {/* Reflexo especular no topo do cifrão */}
      <text
        x="32"
        y="52"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="60"
        fill={`url(#mn-shine-${uid})`}
      >$</text>
    </svg>
  );
};


