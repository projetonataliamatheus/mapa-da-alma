// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lv/integrations/supabase/client";

export type FloatingIconType = "whatsapp" | "instagram" | "money" | "rocket" | "heart" | "fire" | "star" | "trending" | "pin";
export type FloatingDirection = "up" | "down" | "diagonal-left" | "diagonal-right" | "wave";

export interface FloatingIconsConfig {
  enabled: boolean;
  enabledIcons: FloatingIconType[];
  iconSize: number;          // px
  emitInterval: number;      // ms between bursts
  iconsPerBurst: number;     // how many spawn per burst
  speed: number;             // seconds animation duration
  direction: FloatingDirection;
  spreadWidth: number;       // px lateral spread
  travelDistance: number;    // px vertical travel
  rocketEnabled: boolean;
  rocketSize: number;
  rocketSpeed: number;       // seconds per cycle
  fadeOpacity: number;       // 0-1 max opacity
  rotation: boolean;
  glow: boolean;
  colorWhatsapp: string;
  colorInstagram: string;
  colorMoney: string;
  colorRocket: string;
  colorPin: string;
}

export const DEFAULT_FLOATING_ICONS_CONFIG: FloatingIconsConfig = {
  enabled: true,
  enabledIcons: ["whatsapp", "instagram", "money"],
  iconSize: 32,
  emitInterval: 900,
  iconsPerBurst: 1,
  speed: 4,
  direction: "up",
  spreadWidth: 220,
  travelDistance: 320,
  rocketEnabled: true,
  rocketSize: 44,
  rocketSpeed: 5,
  fadeOpacity: 0.95,
  rotation: true,
  glow: true,
  colorWhatsapp: "#25D366",
  colorInstagram: "#E1306C",
  colorMoney: "#22C55E",
  colorRocket: "#3B82F6",
  colorPin: "#38BDF8",
};

export function useFloatingIconsConfig() {
  const [config, setConfig] = useState<FloatingIconsConfig>(DEFAULT_FLOATING_ICONS_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("sales_page_config")
      .select("config")
      .eq("id", "quote_floating_icons" as any)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.config) {
          setConfig({ ...DEFAULT_FLOATING_ICONS_CONFIG, ...(data.config as any) });
        }
        setLoaded(true);
      });
  }, []);

  return { config, loaded };
}
