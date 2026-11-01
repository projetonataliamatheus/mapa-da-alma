// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { db } from "@/lv/lib/supabaseClient";
import type { ColorTheme } from "@/lv/lib/colorThemes";
import { Star } from "lucide-react";

interface SiteSettings {
  professional_name: string;
  professional_photo_url: string;
  rating: number;
  star_color: string;
  services: string[];
  star_animation: string;
  website_url: string;
  website_label: string;
  website_visible: boolean;
  website_position: number;
}

interface ProfessionalFooterProps {
  theme: ColorTheme;
  clientName: string;
  city: string;
}

export const starAnimations: Record<string, { name: string; css: string }> = {
  none: { name: "Sem efeito", css: "" },
  pulse: { name: "Pulsar", css: "animate-star-pulse" },
  fade: { name: "Esmaecer", css: "animate-star-fade" },
  blink: { name: "Piscar", css: "animate-star-blink" },
  bounce: { name: "Quicar", css: "animate-star-bounce" },
  spin: { name: "Girar", css: "animate-star-spin" },
  swing: { name: "Balançar", css: "animate-star-swing" },
  rubberBand: { name: "Elástico", css: "animate-star-rubber" },
  tada: { name: "Tada", css: "animate-star-tada" },
  jello: { name: "Gelatina", css: "animate-star-jello" },
  heartbeat: { name: "Batida", css: "animate-star-heartbeat" },
  flash: { name: "Flash", css: "animate-star-flash" },
  wobble: { name: "Oscilar", css: "animate-star-wobble" },
  flipX: { name: "Virar X", css: "animate-star-flipx" },
  glow: { name: "Brilhar", css: "animate-star-glow" },
  shake: { name: "Tremer", css: "animate-star-shake" },
};

function WebsiteLinkBlock({ settings, accentColor }: { settings: SiteSettings; accentColor: string }) {
  if (!settings.website_url || !settings.website_visible) return null;
  const displayDomain = settings.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <a href={settings.website_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group my-2">
      <div className="flex items-center gap-2">
        <span className="inline-block animate-spin text-xl" style={{ animationDuration: "3s", color: "#3b82f6" }}>🌐</span>
        <span className="text-sm font-medium group-hover:underline underline-offset-2" style={{ color: accentColor }}>{displayDomain}</span>
      </div>
      <span className="text-[11px]" style={{ color: accentColor + "99" }}>{settings.website_label || "Visite o meu site"}</span>
    </a>
  );
}

export default function ProfessionalFooter({ theme, clientName, city }: ProfessionalFooterProps) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    (supabase
      .from("site_settings") as any)
      .select("*")
      .eq("id", "main")
      .single()
      .then(({ data, error }: any) => {
        if (error) { console.error("Footer fetch error:", error); return; }
        if (data) {
          setSettings({
            professional_name: data.professional_name,
            professional_photo_url: data.professional_photo_url,
            rating: data.rating,
            star_color: data.star_color,
            services: Array.isArray(data.services) ? data.services : [],
            star_animation: data.star_animation || "none",
            website_url: data.website_url || "",
            website_label: data.website_label || "Visite o meu site",
            website_visible: data.website_visible !== false,
            website_position: data.website_position ?? 3,
          });
        }
      });
  }, []);

  if (!settings) return null;

  const rating = Math.min(5, Math.max(0, settings.rating));
  const animClass = starAnimations[settings.star_animation]?.css || "";
  const pos = settings.website_position ?? 3;

  const isPurpleTheme = theme.id.startsWith("purple");
  const isFeminineTheme = /purple|rose|pink|yellow|blush|lavender/i.test(theme.id);
  const widgetAccent = isFeminineTheme ? "#1a1a1a" : theme.accent;
  const ftText = isPurpleTheme ? "#1a1a2e" : theme.text;
  const ftMuted = isPurpleTheme ? "#4b5563" : theme.textMuted;

  const photoBlock = settings.professional_photo_url ? (
    <div key="photo" className="flex justify-center mb-4">
      <div className="w-24 h-24 rounded-full overflow-hidden border-4" style={{ borderColor: widgetAccent }}>
        <img src={settings.professional_photo_url} alt={settings.professional_name} className="w-full h-full object-cover" />
      </div>
    </div>
  ) : null;



  const nameBlock = (
    <h3 key="name" className="text-xl font-bold mb-2" style={{ color: ftText }}>{settings.professional_name}</h3>
  );

  const ratingBlock = (
    <div key="rating" className="flex items-center justify-center gap-1 mb-4">
      <span className="text-sm font-semibold mr-1" style={{ color: ftMuted }}>{rating}/5</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-5 h-5 ${animClass}`} style={{ animationDelay: `${i * 0.15}s` }}
          fill={i < rating ? settings.star_color : "transparent"} stroke={settings.star_color} strokeWidth={1.5} />
      ))}
    </div>
  );

  const servicesBlock = settings.services.length > 0 ? (
    <div key="services" className="flex flex-wrap justify-center gap-2">
      {settings.services.map((service, i) => (
        <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium border"
          style={{ borderColor: widgetAccent + "55", color: ftText, background: widgetAccent + "11" }}>{service}</span>
      ))}
    </div>
  ) : null;

  const websiteBlock = <WebsiteLinkBlock key="website" settings={settings} accentColor={widgetAccent} />;


  // Order: photo, name, rating, services — website inserted at position
  const baseElements = [photoBlock, nameBlock, ratingBlock, servicesBlock];
  const elements = [...baseElements];
  elements.splice(Math.min(pos, elements.length), 0, websiteBlock);

  const footerText = ftText;
  const footerMuted = ftMuted;
  const footerBg = isPurpleTheme ? "#ffffff" : theme.bgSecondary;
  const footerCard = isPurpleTheme ? "#f9fafb" : theme.card;

  return (
    <section className="py-16 px-6" style={{ background: footerBg }}>
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border p-8 text-center"
          style={{ background: footerCard, borderColor: isFeminineTheme ? widgetAccent + "33" : theme.cardBorder, boxShadow: `0 8px 30px ${widgetAccent}15` }}>

          {elements}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: footerMuted }}>
          © {new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date())} — Proposta exclusiva para {clientName} • {city}
        </p>

        <p className="text-center text-xs mt-3" style={{ color: footerMuted }}>
          Sistema de Orçamento Desenvolvido por{" "}
          <a href="https://www.matheusrangel.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline underline-offset-2" style={{ color: widgetAccent }}>
            Matheus Rangel
          </a>
        </p>
      </div>
    </section>
  );
}
