// @ts-nocheck
"use client";
/**
 * FloatingHeroIcons — Instagram-Live-style rising icons for the quote hero.
 * Spawns WhatsApp / Instagram / Money icons that float upward and fade,
 * plus an optional rocket that climbs continuously to symbolize growth.
 * Fully configured via the admin panel (sales_page_config: quote_floating_icons).
 */
import React, { useEffect, useRef, useState } from "react";
import { DollarSign, Flame, Star, TrendingUp } from "lucide-react";

import { GpsPinIcon } from "@/lv/components/icons/SophisticatedIcons";
import { RocketRealistic, InstagramRealistic, HeartRealistic, WhatsAppRealistic, MoneyRealistic } from "@/lv/components/checkout/RealisticIcons";
import {
  useFloatingIconsConfig,
  type FloatingIconType,
  type FloatingIconsConfig,
} from "@/lv/hooks/useFloatingIconsConfig";

interface FloatingItem {
  id: number;
  type: FloatingIconType;
  xOffset: number;     // initial lateral offset (px from center)
  drift: number;       // additional lateral drift during travel
  scale: number;
  delay: number;       // ms
  rotate: number;      // deg
  hue: number;         // 0-1 to vary slightly
  badge: number;       // 1..100 for WhatsApp notification badge
}

const ICON_TYPES: FloatingIconType[] = ["whatsapp", "instagram", "money", "heart", "fire", "star", "trending", "pin"];

function renderIcon(type: FloatingIconType, size: number, color: string, badge: number) {
  const common = { size, style: { width: size, height: size, color } as React.CSSProperties };
  switch (type) {
    case "whatsapp": {
      // WhatsApp aparece um pouco maior que os demais
      const waSize = size * 1.25;
      const badgeSize = waSize * 0.5;
      const label = badge.toString();
      return (
        <div className="relative" style={{ width: waSize, height: waSize }}>
          <WhatsAppRealistic size={waSize} />
          {/* Notification Badge — número dinâmico 1..100 */}
          <div
            className="absolute -top-[12%] -right-[12%] bg-red-600 text-white font-bold flex items-center justify-center rounded-full border-2 border-white shadow-md"
            style={{
              minWidth: badgeSize,
              height: badgeSize,
              padding: label.length > 1 ? `0 ${badgeSize * 0.2}px` : 0,
              fontSize: label.length >= 3 ? waSize * 0.22 : waSize * 0.28,
              lineHeight: 1,
            }}
          >
            {label}
          </div>
        </div>
      );
    }
    case "instagram":
      return <InstagramRealistic size={size} />;
    case "money":
      return <MoneyRealistic size={size} />;

    case "heart":
      return <HeartRealistic size={size} />;
    case "rocket":
      return <RocketRealistic size={size * 1.4} spin spinDuration={2.4} />;
    case "fire":
      return <Flame {...common} fill={color} strokeWidth={2} />;
    case "star":
      return <Star {...common} fill={color} strokeWidth={2} />;
    case "trending":
      return <TrendingUp {...common} strokeWidth={2.5} />;
    case "pin":
      return <GpsPinIcon size={size} />;
    default:
      return <HeartRealistic size={size} />;
  }
}

function colorFor(type: FloatingIconType, c: FloatingIconsConfig): string {
  switch (type) {
    case "whatsapp": return c.colorWhatsapp;
    case "instagram": return c.colorInstagram;
    case "money": return c.colorMoney;
    case "pin": return c.colorPin;
    default: return c.colorWhatsapp;
  }
}

export interface FloatingHeroIconsProps {
  /** Optional config override (used by admin preview) */
  configOverride?: FloatingIconsConfig;
  /** Optional className for outer wrapper */
  className?: string;
  /** Height of the area. Default 320 */
  height?: number | string;
}

export default function FloatingHeroIcons({ configOverride, className, height = 320 }: FloatingHeroIconsProps) {
  const { config: liveConfig } = useFloatingIconsConfig();
  const config = configOverride || liveConfig;
  const [items, setItems] = useState<FloatingItem[]>([]);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config.enabled) { setItems([]); return; }
    const enabled = config.enabledIcons.length ? config.enabledIcons : ICON_TYPES;

    const spawn = () => {
      setItems(prev => {
        // cap to avoid runaway DOM
        const capped = prev.slice(-40);
        const burst: FloatingItem[] = [];
        for (let i = 0; i < Math.max(1, config.iconsPerBurst); i++) {
          const type = enabled[Math.floor(Math.random() * enabled.length)];
          burst.push({
            id: ++idRef.current,
            type,
            xOffset: (Math.random() - 0.5) * config.spreadWidth,
            drift: (Math.random() - 0.5) * 80,
            scale: 0.85 + Math.random() * 0.5,
            delay: i * 90,
            rotate: config.rotation ? (Math.random() - 0.5) * 40 : 0,
            hue: Math.random(),
            badge: 1 + Math.floor(Math.random() * 100),
          });
        }
        return [...capped, ...burst];
      });
    };

    spawn();
    const interval = setInterval(spawn, Math.max(250, config.emitInterval));
    return () => clearInterval(interval);
  }, [
    config.enabled, config.enabledIcons.join(","), config.emitInterval,
    config.iconsPerBurst, config.spreadWidth, config.rotation,
  ]);

  // Cleanup completed items based on speed
  useEffect(() => {
    const ttl = (config.speed + 1) * 1000;
    const timer = setInterval(() => {
      const cutoff = idRef.current - 60;
      setItems(prev => prev.filter(it => it.id > cutoff));
    }, ttl);
    return () => clearInterval(timer);
  }, [config.speed]);

  if (!config.enabled) return null;

  const dirVar = (() => {
    switch (config.direction) {
      case "up": return { ty: -config.travelDistance, tx: 0 };
      case "down": return { ty: config.travelDistance, tx: 0 };
      case "diagonal-left": return { ty: -config.travelDistance, tx: -120 };
      case "diagonal-right": return { ty: -config.travelDistance, tx: 120 };
      case "wave": return { ty: -config.travelDistance, tx: 0, wave: true };
      default: return { ty: -config.travelDistance, tx: 0 };
    }
  })();

  const animName = `fhi-rise-${config.direction}`;

  return (
    <div
      ref={containerRef}
      className={`relative pointer-events-none select-none ${className || ""}`}
      style={{ width: "100%", height, overflow: "visible" }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes fhi-rise-up {
          0%   { transform: translate(var(--tx0), 0) scale(var(--s0)) rotate(var(--r0)); opacity: 0; }
          12%  { opacity: var(--op); }
          80%  { opacity: var(--op); }
          100% { transform: translate(calc(var(--tx0) + var(--dx)), var(--ty)) scale(calc(var(--s0) * 1.15)) rotate(calc(var(--r0) + 25deg)); opacity: 0; }
        }
        @keyframes fhi-rise-down {
          0%   { transform: translate(var(--tx0), 0) scale(var(--s0)) rotate(var(--r0)); opacity: 0; }
          12%  { opacity: var(--op); }
          80%  { opacity: var(--op); }
          100% { transform: translate(calc(var(--tx0) + var(--dx)), var(--ty)) scale(calc(var(--s0) * 1.15)) rotate(calc(var(--r0) + 25deg)); opacity: 0; }
        }
        @keyframes fhi-rise-diagonal-left {
          0%   { transform: translate(var(--tx0), 0) scale(var(--s0)) rotate(var(--r0)); opacity: 0; }
          12%  { opacity: var(--op); }
          80%  { opacity: var(--op); }
          100% { transform: translate(calc(var(--tx0) + var(--dx) - 120px), var(--ty)) scale(calc(var(--s0) * 1.15)) rotate(calc(var(--r0) - 30deg)); opacity: 0; }
        }
        @keyframes fhi-rise-diagonal-right {
          0%   { transform: translate(var(--tx0), 0) scale(var(--s0)) rotate(var(--r0)); opacity: 0; }
          12%  { opacity: var(--op); }
          80%  { opacity: var(--op); }
          100% { transform: translate(calc(var(--tx0) + var(--dx) + 120px), var(--ty)) scale(calc(var(--s0) * 1.15)) rotate(calc(var(--r0) + 30deg)); opacity: 0; }
        }
        @keyframes fhi-rise-wave {
          0%   { transform: translate(var(--tx0), 0) scale(var(--s0)) rotate(var(--r0)); opacity: 0; }
          15%  { transform: translate(calc(var(--tx0) + 30px), calc(var(--ty) * 0.25)) scale(var(--s0)) rotate(calc(var(--r0) + 10deg)); opacity: var(--op); }
          50%  { transform: translate(calc(var(--tx0) - 30px), calc(var(--ty) * 0.55)) scale(calc(var(--s0) * 1.1)) rotate(calc(var(--r0) - 10deg)); opacity: var(--op); }
          85%  { transform: translate(calc(var(--tx0) + 20px), calc(var(--ty) * 0.85)) scale(calc(var(--s0) * 1.15)) rotate(calc(var(--r0) + 15deg)); opacity: calc(var(--op) * 0.6); }
          100% { transform: translate(var(--tx0), var(--ty)) scale(calc(var(--s0) * 1.2)) rotate(calc(var(--r0) + 20deg)); opacity: 0; }
        }
        @keyframes fhi-rocket {
          0%   { transform: translate(-50%, 0) scale(0.75); opacity: 0; }
          8%   { opacity: 1; }
          35%  { transform: translate(-50%, calc(var(--ty) * 0.5)) scale(0.65); opacity: 1; }
          55%  { transform: translate(-50%, var(--ty)) scale(0.45); opacity: 0; }
          100% { transform: translate(-50%, var(--ty)) scale(0.45); opacity: 0; }
        }
        @keyframes fhi-rocket-trail {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scaleY(0.7); }
          50%      { opacity: 0.9; transform: translateX(-50%) scaleY(1.2); }
        }

      `}</style>

      {/* Bottom anchor: icons spawn from bottom-center */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2" style={{ width: 1, height: 1 }}>
        {items.map(it => {
          const color = colorFor(it.type, config);
          const filter = config.glow
            ? `drop-shadow(0 0 6px ${color}aa) drop-shadow(0 0 14px ${color}55)`
            : "none";
          return (
            <div
              key={it.id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                ["--tx0" as any]: `${it.xOffset}px`,
                ["--ty" as any]: `${dirVar.ty}px`,
                ["--dx" as any]: `${it.drift}px`,
                ["--s0" as any]: it.scale,
                ["--r0" as any]: `${it.rotate}deg`,
                ["--op" as any]: config.fadeOpacity,
                animation: `${animName} ${config.speed}s cubic-bezier(0.22, 1, 0.36, 1) ${it.delay}ms forwards`,
                filter,
                willChange: "transform, opacity",
              }}
            >
              {renderIcon(it.type, config.iconSize, color, it.badge)}
            </div>
          );
        })}
      </div>

      {/* Continuous rocket — symbol of growth */}
      {config.rocketEnabled && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            ["--ty" as any]: `${-config.travelDistance * 0.95}px`,
            animation: `fhi-rocket ${config.rocketSpeed}s cubic-bezier(0.5, 0, 0.5, 1) infinite`,
            filter: config.glow
              ? `drop-shadow(0 0 12px ${config.colorRocket}aa) drop-shadow(0 0 28px #f9731666)`
              : "none",
            willChange: "transform, opacity",
          }}
        >
          <RocketRealistic size={config.rocketSize} />
        </div>
      )}
    </div>
  );
}
