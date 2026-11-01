// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { db } from "@/lv/lib/supabaseClient";
import type { ReportTheme } from "@/lv/lib/reportThemes";
import { Star, Lock } from "lucide-react";
import { starAnimations } from "@/lv/components/quote/ProfessionalFooter";

interface SiteSettings {
  professional_name: string;
  professional_photo_url: string;
  rating: number;
  star_color: string;
  services: string[];
  star_animation: string;
  cnpj: string;
  copyright_text: string;
  website_url: string;
  website_label: string;
  website_visible: boolean;
  website_position: number;
}

interface Props {
  theme: ReportTheme;
  clientName: string;
  clientCompanyName?: string;
  clientContactName?: string;
  clientLogoUrl?: string;
}

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

export default function ReportProfessionalFooter({ theme, clientName, clientCompanyName, clientContactName, clientLogoUrl }: Props) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    (supabase
      .from("site_settings") as any)
      .select("*")
      .eq("id", "main")
      .single()
      .then(({ data }: any) => {
        if (data) {
          setSettings({
            professional_name: data.professional_name,
            professional_photo_url: data.professional_photo_url,
            rating: data.rating,
            star_color: data.star_color,
            services: Array.isArray(data.services) ? data.services : [],
            star_animation: data.star_animation || "none",
            cnpj: data.cnpj || "",
            copyright_text: data.copyright_text || "",
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
  const displayClientName = clientContactName || clientName;
  const displayCompany = clientCompanyName;
  const brasiliaYear = new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());
  const pos = settings.website_position ?? 3;

  const photoBlock = settings.professional_photo_url ? (
    <div key="photo" className="flex justify-center mb-4">
      <div className="w-20 h-20 rounded-full overflow-hidden border-4" style={{ borderColor: theme.accent }}>
        <img src={settings.professional_photo_url} alt={settings.professional_name} className="w-full h-full object-cover" />
      </div>
    </div>
  ) : null;

  const nameBlock = (
    <h3 key="name" className="text-xl font-bold mb-2" style={{ color: theme.text }}>{settings.professional_name}</h3>
  );

  const ratingBlock = (
    <div key="rating" className="flex items-center justify-center gap-1 mb-4">
      <span className="text-sm font-semibold mr-1" style={{ color: theme.textMuted }}>{rating}/5</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-5 h-5 ${animClass}`} style={{ animationDelay: `${i * 0.15}s` }}
          fill={i < rating ? settings.star_color : "transparent"} stroke={settings.star_color} strokeWidth={1.5} />
      ))}
    </div>
  );

  const servicesBlock = settings.services.length > 0 ? (
    <div key="services" className="flex flex-wrap justify-center gap-2 mb-4">
      {settings.services.map((service, i) => (
        <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium border"
          style={{ borderColor: theme.accent + "55", color: theme.text, background: theme.accent + "11" }}>{service}</span>
      ))}
    </div>
  ) : null;

  const websiteBlock = <WebsiteLinkBlock key="website" settings={settings} accentColor={theme.accent} />;

  const baseElements = [photoBlock, nameBlock, ratingBlock, servicesBlock];
  const elements = [...baseElements];
  elements.splice(Math.min(pos, elements.length), 0, websiteBlock);

  return (
    <section className="py-12 px-6 print:py-6" style={{ background: theme.bgSecondary }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Confidentiality notice */}
        {displayClientName && (
          <div className="rounded-2xl border p-6 text-center" style={{ background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
            <div className="flex items-center justify-center gap-3 mb-3">
              {clientLogoUrl && (
                <div className="w-12 h-12 rounded-xl overflow-hidden border flex-shrink-0"
                  style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
                  <img src={clientLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-left">
                {displayCompany && <p className="text-sm font-bold" style={{ color: theme.text }}>{displayCompany}</p>}
                {displayClientName && <p className="text-xs" style={{ color: theme.textMuted }}>{displayClientName}</p>}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>Dados confidenciais e exclusivos</p>
            </div>
            <p className="text-[11px]" style={{ color: theme.textMuted }}>
              As métricas, dados e análises contidos neste relatório são de uso exclusivo de{" "}
              <strong>{displayCompany || displayClientName}</strong> e não devem ser compartilhados com terceiros.
            </p>
          </div>
        )}

        {/* Professional card */}
        <div className="rounded-2xl border p-8 text-center"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 8px 30px ${theme.accent}15` }}>
          {elements}
          {settings.cnpj && <p className="text-xs mt-2" style={{ color: theme.textMuted }}>CNPJ: {settings.cnpj}</p>}
        </div>

        <div className="text-center space-y-1">
          {settings.copyright_text && <p className="text-xs" style={{ color: theme.textMuted }}>{settings.copyright_text}</p>}
          <p className="text-xs" style={{ color: theme.textMuted }}>
            © {brasiliaYear} {settings.professional_name} — Relatório exclusivo para {displayCompany || displayClientName || "cliente"}
          </p>
          <p className="text-[10px]" style={{ color: theme.textMuted + "80" }}>
            Relatório gerado em {new Date().toLocaleDateString("pt-BR")}
          </p>
          <p className="text-[10px] mt-2" style={{ color: theme.textMuted + "90" }}>
            Sistema de Relatórios Desenvolvido por{" "}
            <a href="https://www.matheusrangel.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline underline-offset-2" style={{ color: theme.accent }}>
              Matheus Rangel
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
