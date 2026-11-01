// @ts-nocheck
"use client";
/**
 * Connector effects between cards — CSS-based animations for reliability.
 * 15 unique effects with gradient flow, all controlled via admin config.
 */
import React, { useMemo } from "react";

export interface ConnectorEffectConfig {
  effect: string;
  color: string;
  thickness: number;
  dashLength: number;
  dashGap: number;
  speed: number;
}

// Lighten a hex color
function lighten(hex: string, pct: number): string {
  const c = hex.replace("#", "");
  const r = Math.min(255, parseInt(c.substring(0, 2), 16) + Math.round(255 * pct));
  const g = Math.min(255, parseInt(c.substring(2, 4), 16) + Math.round(255 * pct));
  const b = Math.min(255, parseInt(c.substring(4, 6), 16) + Math.round(255 * pct));
  return `rgb(${r},${g},${b})`;
}

function darken(hex: string, pct: number): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - Math.round(255 * pct));
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - Math.round(255 * pct));
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - Math.round(255 * pct));
  return `rgb(${r},${g},${b})`;
}

/** Horizontal connector line */
export function ConnectorEffectLine({
  effect, color, thickness, dashLength, dashGap, speed, width = "100%", height = 24,
}: ConnectorEffectConfig & { width?: string | number; height?: number }) {
  const c = color || "#3b82f6";
  const uid = React.useId().replace(/:/g, "");
  const animName = `conn-${uid}`;
  const dur = `${speed}s`;
  const light = lighten(c, 0.3);
  const dark = darken(c, 0.2);

  const styles = useMemo(() => getEffectCSS(effect, animName, c, light, dark, thickness, dashLength, dashGap, speed, "horizontal"), 
    [effect, animName, c, light, dark, thickness, dashLength, dashGap, speed]);

  return (
    <div className="relative" style={{ width, height, overflow: "hidden" }}>
      <style>{styles}</style>
      {/* Base dashed line (faint) */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: thickness,
        marginTop: -thickness / 2,
        borderTop: `${thickness}px dashed ${c}22`,
      }} />
      {/* Animated effect layer */}
      <div className={animName} style={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: thickness,
        marginTop: -thickness / 2,
      }} />
    </div>
  );
}

/** Vertical connector line (mobile) */
export function ConnectorEffectLineVertical({
  effect, color, thickness, dashLength, dashGap, speed, height = 32,
}: ConnectorEffectConfig & { height?: number }) {
  const c = color || "#3b82f6";
  const uid = React.useId().replace(/:/g, "");
  const animName = `conn-v-${uid}`;
  const light = lighten(c, 0.3);
  const dark = darken(c, 0.2);
  const w = thickness + 12;

  const styles = useMemo(() => getEffectCSS(effect, animName, c, light, dark, thickness, dashLength, dashGap, speed, "vertical"),
    [effect, animName, c, light, dark, thickness, dashLength, dashGap, speed]);

  return (
    <div className="relative flex flex-col items-center" style={{ width: w, height: height + 16 }}>
      <style>{styles}</style>
      {/* Base dashed line */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: 0,
        bottom: 16,
        width: thickness,
        marginLeft: -thickness / 2,
        borderLeft: `${thickness}px dashed ${c}22`,
      }} />
      {/* Animated effect */}
      <div className={animName} style={{
        position: "absolute",
        left: "50%",
        top: 0,
        bottom: 16,
        width: thickness,
        marginLeft: -thickness / 2,
      }} />
    </div>
  );
}

/** Generate CSS keyframes + class for each effect */
function getEffectCSS(
  effect: string, className: string, c: string, light: string, dark: string,
  thickness: number, dashLen: number, dashGap: number, speed: number,
  dir: "horizontal" | "vertical"
): string {
  const isH = dir === "horizontal";
  const dur = `${speed}s`;
  const totalDash = dashLen + dashGap;

  // Base properties that differ by direction
  const borderProp = isH ? "border-top" : "border-left";
  const gradDir = isH ? "to right" : "to bottom";
  const bgSizeProp = isH ? "200% 100%" : "100% 200%";
  const bgPosProp = isH ? "background-position-x" : "background-position-y";

  switch (effect) {
    case "pulse": // Refined: silky multi-stop gradient with breathing glow
      return `
        .${className} {
          background: linear-gradient(${gradDir},
            transparent 0%,
            ${c}15 15%,
            ${light} 40%,
            ${c} 50%,
            ${dark} 60%,
            ${c}15 85%,
            transparent 100%);
          background-size: ${isH ? "250% 100%" : "100% 250%"};
          animation: ${className}-flow ${dur} cubic-bezier(0.45,0,0.55,1) infinite, ${className}-breathe ${parseFloat(dur) * 1.5}s ease-in-out infinite;
          border-radius: ${thickness * 2}px;
          filter: drop-shadow(0 0 ${thickness * 2}px ${c}88);
        }
        @keyframes ${className}-flow { 0% { ${bgPosProp}: 100%; } 100% { ${bgPosProp}: -100%; } }
        @keyframes ${className}-breathe { 0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 ${thickness}px ${c}66) brightness(0.9); } 50% { opacity: 1; filter: drop-shadow(0 0 ${thickness * 4}px ${c}) brightness(1.2); } }
      `;

    case "slide": // Refined: comet orb with luminous tail
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}11, ${c}1f, ${c}11);
          border-radius: ${thickness * 2}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before {
          content: '';
          position: absolute;
          ${isH ? `top: 50%; height: ${thickness * 2}px; width: ${thickness * 14}px; margin-top: -${thickness}px;` : `left: 50%; width: ${thickness * 2}px; height: ${thickness * 14}px; margin-left: -${thickness}px;`}
          background: linear-gradient(${gradDir}, transparent, ${c}66, ${light});
          border-radius: ${thickness * 2}px;
          filter: blur(${thickness}px);
          animation: ${className}-tail ${dur} cubic-bezier(0.4,0,0.2,1) infinite;
        }
        .${className}::after {
          content: '';
          position: absolute;
          ${isH ? `width: ${thickness * 3}px; height: ${thickness * 3}px; top: 50%; margin-top: -${thickness * 1.5}px;` : `width: ${thickness * 3}px; height: ${thickness * 3}px; left: 50%; margin-left: -${thickness * 1.5}px;`}
          background: radial-gradient(circle, #fff 0%, ${light} 30%, ${c} 70%, transparent 100%);
          border-radius: 50%;
          box-shadow: 0 0 ${thickness * 3}px ${light}, 0 0 ${thickness * 6}px ${c}, 0 0 ${thickness * 12}px ${c}88;
          animation: ${className}-orb ${dur} cubic-bezier(0.4,0,0.2,1) infinite;
        }
        @keyframes ${className}-orb {
          0% { ${isH ? "left: -3%" : "top: -3%"}; opacity: 0; }
          12% { opacity: 1; } 88% { opacity: 1; }
          100% { ${isH ? "left: 100%" : "top: 100%"}; opacity: 0; }
        }
        @keyframes ${className}-tail {
          0% { ${isH ? "left: -15%" : "top: -15%"}; opacity: 0; }
          15% { opacity: 0.85; } 85% { opacity: 0.85; }
          100% { ${isH ? "left: 90%" : "top: 90%"}; opacity: 0; }
        }
      `;

    case "glow": // Refined: layered halo
      return `
        .${className} {
          background: linear-gradient(${gradDir}, transparent, ${c}66 20%, ${c} 50%, ${c}66 80%, transparent);
          border-radius: ${thickness * 2}px;
          animation: ${className}-glow ${dur} ease-in-out infinite;
        }
        @keyframes ${className}-glow {
          0%, 100% { opacity: 0.55; box-shadow: 0 0 ${thickness * 2}px ${c}88, 0 0 ${thickness * 5}px ${c}44; filter: brightness(0.85); }
          50% { opacity: 1; box-shadow: 0 0 ${thickness * 5}px ${c}, 0 0 ${thickness * 12}px ${c}cc, 0 0 ${thickness * 20}px ${c}66; filter: brightness(1.3); }
        }
      `;

    case "bounce": // Refined: silky data stream — flowing gradient bands
      return `
        .${className} {
          background: repeating-linear-gradient(
            ${gradDir},
            transparent 0px,
            ${c}22 ${dashLen * 0.3}px,
            ${c} ${dashLen}px,
            ${light} ${dashLen + 1}px,
            ${c} ${dashLen + 2}px,
            ${c}22 ${dashLen + dashLen * 0.7}px,
            transparent ${totalDash}px
          );
          background-size: ${isH ? `${totalDash * 2}px 100%` : `100% ${totalDash * 2}px`};
          animation: ${className}-scroll ${dur} linear infinite;
          border-radius: ${thickness}px;
          filter: drop-shadow(0 0 ${thickness * 1.5}px ${c}aa);
        }
        @keyframes ${className}-scroll {
          0% { background-position: ${isH ? `${totalDash * 2}px 0` : `0 ${totalDash * 2}px`}; }
          100% { background-position: 0 0; }
        }
      `;

    case "rotate": // Refined: undulating gradient wave
      return `
        .${className} {
          background: linear-gradient(${gradDir}, transparent 0%, ${c}33 10%, ${light} 35%, ${c} 50%, ${dark} 65%, ${c}33 90%, transparent 100%);
          background-size: ${isH ? "350% 100%" : "100% 350%"};
          animation: ${className}-wave ${dur} cubic-bezier(0.65,0,0.35,1) infinite;
          border-radius: ${thickness * 2}px;
          filter: drop-shadow(0 0 ${thickness * 2}px ${c}99);
        }
        @keyframes ${className}-wave {
          0% { ${bgPosProp}: 0%; }
          100% { ${bgPosProp}: 350%; }
        }
      `;

    case "zigzag": // Refined: dual particle constellation
      return `
        .${className} {
          position: relative;
          background: linear-gradient(${gradDir}, ${c}11, ${c}1f, ${c}11);
          border-radius: ${thickness}px;
        }
        .${className}::before, .${className}::after {
          content: '';
          position: absolute;
          ${isH ? `width: ${thickness * 2.5}px; height: ${thickness * 2.5}px; top: 50%; margin-top: -${thickness * 1.25}px;` : `width: ${thickness * 2.5}px; height: ${thickness * 2.5}px; left: 50%; margin-left: -${thickness * 1.25}px;`}
          background: radial-gradient(circle, #fff 0%, ${light} 25%, ${c} 60%, transparent 100%);
          border-radius: 50%;
          box-shadow: 0 0 ${thickness * 3}px ${c}, 0 0 ${thickness * 6}px ${c}88;
          animation: ${className}-p1 ${dur} cubic-bezier(0.4,0,0.2,1) infinite;
        }
        .${className}::after { animation-delay: -${speed / 3}s; opacity: 0.7; }
        @keyframes ${className}-p1 {
          0% { ${isH ? "left: -2%" : "top: -2%"}; opacity: 0; transform: scale(0.5); }
          15% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { ${isH ? "left: 100%" : "top: 100%"}; opacity: 0; transform: scale(0.5); }
        }
      `;

    case "wave": // Refined: deep neon halo
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}66, ${c}, ${c}66);
          border-radius: ${thickness * 2}px;
          animation: ${className}-neon ${dur} ease-in-out infinite;
          box-shadow:
            0 0 ${thickness * 2}px #fff,
            0 0 ${thickness * 4}px ${light},
            0 0 ${thickness * 8}px ${c},
            0 0 ${thickness * 16}px ${c}aa,
            0 0 ${thickness * 24}px ${c}44;
        }
        @keyframes ${className}-neon {
          0%, 100% { opacity: 0.6; filter: brightness(0.85) saturate(1); }
          50% { opacity: 1; filter: brightness(1.4) saturate(1.3); }
        }
      `;

    case "spiral": // Refined: digital cascade — luminous bars sliding
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}08, ${c}1a, ${c}08);
          border-radius: ${thickness}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: repeating-linear-gradient(
            ${isH ? "90deg" : "0deg"},
            transparent 0,
            transparent 8px,
            ${c}cc 8px,
            ${c}cc 9px,
            transparent 9px,
            transparent 16px,
            ${light}aa 16px,
            ${light}aa 17px,
            transparent 17px,
            transparent 24px,
            ${dark}99 24px,
            ${dark}99 25px
          );
          ${isH ? "background-size: 32px 100%;" : "background-size: 100% 32px;"}
          animation: ${className}-matrix ${dur} linear infinite;
          filter: drop-shadow(0 0 ${thickness * 2}px ${c}) drop-shadow(0 0 ${thickness * 4}px ${c}66);
          mask-image: linear-gradient(${gradDir}, transparent, #000 20%, #000 80%, transparent);
          -webkit-mask-image: linear-gradient(${gradDir}, transparent, #000 20%, #000 80%, transparent);
        }
        @keyframes ${className}-matrix {
          0% { ${isH ? "background-position-x: 0" : "background-position-y: 0"}; }
          100% { ${isH ? "background-position-x: 32px" : "background-position-y: 32px"}; }
        }
      `;

    case "flash": // Refined: precision laser scanner with chromatic core
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}0f, ${c}1f, ${c}0f);
          border-radius: ${thickness}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::after {
          content: '';
          position: absolute;
          ${isH ? `height: 100%; top: 0; width: 25%;` : `width: 100%; left: 0; height: 25%;`}
          background: linear-gradient(${gradDir},
            transparent 0%,
            ${c}22 20%,
            ${light} 45%,
            #fff 50%,
            ${light} 55%,
            ${c}22 80%,
            transparent 100%);
          border-radius: ${thickness * 2}px;
          animation: ${className}-laser ${dur} cubic-bezier(0.7,0,0.3,1) infinite;
          filter: blur(0.5px) drop-shadow(0 0 ${thickness * 3}px ${c}) drop-shadow(0 0 ${thickness * 6}px ${c}88);
        }
        @keyframes ${className}-laser {
          0% { ${isH ? "left: -25%" : "top: -25%"}; }
          100% { ${isH ? "left: 100%" : "top: 100%"}; }
        }
      `;

    case "morph": // Refined: quantum sphere with ripple
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}11, ${c}22, ${c}11);
          border-radius: ${thickness * 2}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(${gradDir}, transparent, ${c}33, transparent);
          animation: ${className}-ripple ${dur} ease-in-out infinite;
        }
        .${className}::after {
          content: '';
          position: absolute;
          ${isH
            ? `height: ${thickness * 6}px; top: 50%; margin-top: -${thickness * 3}px; width: ${thickness * 6}px;`
            : `width: ${thickness * 6}px; left: 50%; margin-left: -${thickness * 3}px; height: ${thickness * 6}px;`}
          background: radial-gradient(circle, #fff 0%, ${light} 20%, ${c} 50%, ${dark} 80%, transparent 100%);
          border-radius: 50%;
          animation: ${className}-quantum ${dur} cubic-bezier(0.45,0,0.55,1) infinite;
          filter: blur(${Math.max(0.5, thickness * 0.5)}px);
          box-shadow: 0 0 ${thickness * 8}px ${c};
        }
        @keyframes ${className}-quantum {
          0% { ${isH ? "left: -10%" : "top: -10%"}; opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.4); }
          100% { ${isH ? "left: 100%" : "top: 100%"}; opacity: 0; transform: scale(0.3); }
        }
        @keyframes ${className}-ripple {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `;

    case "radar": // Refined: dual plasma arcs converging
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}11, ${c}22, ${c}11);
          border-radius: ${thickness * 2}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before, .${className}::after {
          content: '';
          position: absolute;
          ${isH ? `top: 50%; height: ${thickness * 3}px; width: 35%; margin-top: -${thickness * 1.5}px;` : `left: 50%; width: ${thickness * 3}px; height: 35%; margin-left: -${thickness * 1.5}px;`}
          background: radial-gradient(ellipse, ${light} 0%, ${c} 40%, transparent 80%);
          border-radius: 50%;
          filter: blur(${Math.max(0.5, thickness * 0.5)}px);
          animation: ${className}-arc ${dur} ease-in-out infinite;
        }
        .${className}::before { ${isH ? "left: -10%;" : "top: -10%;"} }
        .${className}::after {
          ${isH ? "left: 75%;" : "top: 75%;"}
          animation-delay: -${speed / 2}s;
          background: radial-gradient(ellipse, ${light} 0%, ${dark} 40%, transparent 80%);
        }
        @keyframes ${className}-arc {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.15); filter: blur(${Math.max(0.3, thickness * 0.3)}px) brightness(1.3); }
        }
      `;

    case "orbit": // Refined: cyber dash with afterglow
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}11, ${c}22, ${c}11);
          border-radius: ${thickness}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before {
          content: '';
          position: absolute;
          ${isH ? `height: 100%; top: 0; width: 30%;` : `width: 100%; left: 0; height: 30%;`}
          background: linear-gradient(${gradDir}, transparent, ${c}44 30%, ${light} 70%, transparent);
          filter: blur(${thickness * 1.5}px);
          animation: ${className}-cyber ${dur} cubic-bezier(0.5,0,0.5,1) infinite;
        }
        .${className}::after {
          content: '';
          position: absolute;
          ${isH ? `height: ${thickness * 1.5}px; top: 50%; margin-top: -${thickness * 0.75}px; width: 18%;` : `width: ${thickness * 1.5}px; left: 50%; margin-left: -${thickness * 0.75}px; height: 18%;`}
          background: linear-gradient(${gradDir}, transparent, ${light}, #fff, ${light}, transparent);
          border-radius: ${thickness}px;
          animation: ${className}-cyber ${dur} cubic-bezier(0.5,0,0.5,1) infinite;
          box-shadow: 0 0 ${thickness * 4}px ${c}, 0 0 ${thickness * 8}px ${c}88;
        }
        @keyframes ${className}-cyber {
          0% { ${isH ? "left: -30%" : "top: -30%"}; }
          100% { ${isH ? "left: 100%" : "top: 100%"}; }
        }
      `;

    case "dna": // Refined: holographic chromatic shift
      return `
        .${className} {
          background: linear-gradient(${gradDir},
            ${c} 0%,
            ${light} 25%,
            #fff 50%,
            ${dark} 75%,
            ${c} 100%);
          background-size: ${isH ? "300% 100%" : "100% 300%"};
          border-radius: ${thickness * 2}px;
          animation: ${className}-holo ${speed * 1.5}s linear infinite, ${className}-shift ${speed * 2}s ease-in-out infinite;
        }
        @keyframes ${className}-holo {
          0% { ${bgPosProp}: 0%; }
          100% { ${bgPosProp}: 300%; }
        }
        @keyframes ${className}-shift {
          0%, 100% { filter: drop-shadow(0 0 ${thickness * 3}px ${c}aa) hue-rotate(0deg); }
          50% { filter: drop-shadow(0 0 ${thickness * 5}px ${c}) hue-rotate(20deg); }
        }
      `;

    case "lightning": // Refined: plasma discharge — twin energy nodes
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}11, ${c}22, ${c}11);
          border-radius: ${thickness * 2}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before, .${className}::after {
          content: '';
          position: absolute;
          ${isH
            ? `top: 50%; height: ${thickness * 5}px; width: ${thickness * 5}px; margin-top: -${thickness * 2.5}px;`
            : `left: 50%; width: ${thickness * 5}px; height: ${thickness * 5}px; margin-left: -${thickness * 2.5}px;`}
          background: radial-gradient(circle, #fff 0%, ${light} 20%, ${c} 50%, transparent 80%);
          border-radius: 50%;
          filter: blur(${Math.max(0.5, thickness * 0.5)}px);
          box-shadow:
            0 0 ${thickness * 3}px ${light},
            0 0 ${thickness * 6}px ${c},
            0 0 ${thickness * 12}px ${c}88;
          animation: ${className}-spark ${speed * 0.7}s cubic-bezier(0.7,0,0.3,1) infinite;
          opacity: 0;
        }
        .${className}::before { ${isH ? "left: 22%;" : "top: 22%;"} }
        .${className}::after { ${isH ? "left: 68%;" : "top: 68%;"} animation-delay: -${speed * 0.35}s; }
        @keyframes ${className}-spark {
          0%, 100% { opacity: 0; transform: scale(0.3); }
          10% { opacity: 1; transform: scale(1.4); }
          25% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 0.95; transform: scale(1.2); }
          55% { opacity: 0.2; transform: scale(0.7); }
          70% { opacity: 0; transform: scale(0.4); }
        }
      `;

    case "matrix": // Refined: warp drive — high-velocity light streaks
      return `
        .${className} {
          background: linear-gradient(${gradDir}, ${c}11, ${c}22, ${c}11);
          border-radius: ${thickness}px;
          position: relative;
          overflow: hidden;
        }
        .${className}::before {
          content: '';
          position: absolute;
          ${isH ? `height: ${thickness * 3}px; top: 30%; width: 40%;` : `width: ${thickness * 3}px; left: 30%; height: 40%;`}
          background: linear-gradient(${gradDir}, transparent, ${light}88, ${c}, ${light}88, transparent);
          filter: blur(${Math.max(1, thickness)}px);
          animation: ${className}-warp ${speed * 0.5}s linear infinite;
          border-radius: ${thickness * 2}px;
        }
        .${className}::after {
          content: '';
          position: absolute;
          ${isH ? `height: ${thickness * 1.5}px; top: 50%; margin-top: -${thickness * 0.75}px; width: 50%;` : `width: ${thickness * 1.5}px; left: 50%; margin-left: -${thickness * 0.75}px; height: 50%;`}
          background: linear-gradient(${gradDir}, transparent, #fff, ${light}, transparent);
          filter: blur(${Math.max(0.5, thickness * 0.5)}px);
          animation: ${className}-warp ${speed * 0.4}s linear infinite;
          animation-delay: -${speed * 0.2}s;
          border-radius: ${thickness}px;
        }
        @keyframes ${className}-warp {
          0% { ${isH ? "left: -50%" : "top: -50%"}; opacity: 0; }
          20% { opacity: 1; } 80% { opacity: 1; }
          100% { ${isH ? "left: 100%" : "top: 100%"}; opacity: 0; }
        }
      `;

    default: // Fallback: simple gradient flow
      return `
        .${className} {
          background: linear-gradient(${gradDir}, transparent, ${light}, ${c}, ${dark}, transparent);
          background-size: ${bgSizeProp};
          animation: ${className}-default ${dur} linear infinite;
          border-radius: ${thickness}px;
        }
        @keyframes ${className}-default { 0% { ${bgPosProp}: -100%; } 100% { ${bgPosProp}: 100%; } }
      `;
  }
}
