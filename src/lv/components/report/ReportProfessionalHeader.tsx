// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import type { ReportTheme } from "@/lv/lib/reportThemes";
import { ShieldCheck, Zap } from "lucide-react";
import ReportHeaderMatrixRain from "./ReportHeaderMatrixRain";

interface SiteSettings {
  professional_name: string;
  professional_photo_url: string;
  rating: number;
  star_color: string;
  star_animation: string;
}

interface Props {
  theme: ReportTheme;
  clientName: string;
  reportTitle: string;
  periodStart?: string;
  periodEnd?: string;
  clientCompanyName?: string;
  clientContactName?: string;
  clientLogoUrl?: string;
  headerPadding?: number;
  headerBgType?: string;
  headerBgColor?: string;
  headerBgGradient?: string;
  headerBgImageUrl?: string;
  headerMatrixEnabled?: boolean;
  headerMatrixColor?: string;
  headerMatrixText?: string;
  headerMatrixSpeed?: number;
}

export default function ReportProfessionalHeader({
  theme, clientName, reportTitle, periodStart, periodEnd,
  clientCompanyName, clientContactName, clientLogoUrl, headerPadding = 40,
  headerBgType = "theme",
  headerBgColor = "#6366f1",
  headerBgGradient = "",
  headerBgImageUrl = "",
  headerMatrixEnabled = false,
  headerMatrixColor = "#00ff41",
  headerMatrixText = "",
  headerMatrixSpeed = 30,
}: Props) {
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
            star_animation: data.star_animation || "none",
          });
        }
      });
  }, []);

  if (!settings) return null;

  const displayClientName = clientContactName || clientName;
  const displayCompany = clientCompanyName;

  const formatPeriod = () => {
    if (!periodStart || !periodEnd) return null;
    
    // Using explicit Date.UTC or replacing '-' with '/' to avoid timezone shifts 
    // leading to "day before" display issues.
    const parseSafe = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseSafe(periodStart).toLocaleDateString("pt-BR");
    const end = parseSafe(periodEnd).toLocaleDateString("pt-BR");
    return `${start} — ${end}`;
  };

  // Determine background style
  const getBgStyle = (): React.CSSProperties => {
    switch (headerBgType) {
      case "color":
        return { background: headerBgColor };
      case "gradient":
        return { background: headerBgGradient || theme.gradient };
      case "image":
        return {
          background: `url(${headerBgImageUrl}) center/cover no-repeat`,
        };
      case "theme":
      default:
        return { background: theme.gradient };
    }
  };

  const needsOverlay = headerBgType === "image" || headerMatrixEnabled;

  return (
    <>
      <style>{`
        @keyframes headerShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes headerGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes headerFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(255,255,255,0.15); }
          50% { border-color: rgba(255,255,255,0.35); }
        }
      `}</style>
      <div className="relative overflow-hidden" style={getBgStyle()}>
        {/* Dark overlay for image/matrix readability */}
        {needsOverlay && (
          <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }} />
        )}

        {/* Matrix Rain Loop */}
        {headerMatrixEnabled && (
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            <ReportHeaderMatrixRain
              color={headerMatrixColor}
              text={headerMatrixText}
              speed={headerMatrixSpeed}
            />
          </div>
        )}

        {/* Futuristic grid pattern */}
        {!headerMatrixEnabled && (
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            {/* Radial gradient glow */}
            <div className="absolute inset-0" style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)",
            }} />
            {/* Subtle grid lines */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }} />
            {/* Animated glow orbs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full"
              style={{
                background: "radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)",
                animation: "headerGlow 4s ease-in-out infinite",
              }}
            />
          </div>
        )}

        <div
          className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{ paddingTop: `${Math.max(headerPadding, 32)}px`, paddingBottom: `${Math.max(headerPadding, 32)}px`, zIndex: 10 }}
        >
          {/* Top bar — period + branding chip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 sm:mb-8">
            {/* Branding chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider uppercase"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: theme.accentFg,
                backdropFilter: "blur(8px)",
              }}
            >
              <Zap className="w-3 h-3" />
              Relatório de Performance
            </div>

            {/* Period */}
            {formatPeriod() && (
              <div className="text-center sm:text-right">
                <p className="text-[10px] uppercase tracking-wider opacity-50" style={{ color: theme.accentFg }}>
                  Período
                </p>
                <p className="text-xs font-medium" style={{ color: theme.accentFg }}>
                  {formatPeriod()}
                </p>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="text-center space-y-4 sm:space-y-5">
            {/* Client Logo */}
            {clientLogoUrl && (
              <div className="flex justify-center">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2"
                  style={{
                    borderColor: "rgba(255,255,255,0.2)",
                    boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 60px rgba(255,255,255,0.05)`,
                    animation: "borderPulse 3s ease-in-out infinite",
                  }}
                >
                  <img src={clientLogoUrl} alt={displayCompany || "Logo"} className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Company name */}
            {displayCompany && (
              <p
                className="text-sm sm:text-base font-bold tracking-[0.15em] uppercase"
                style={{
                  color: theme.accentFg,
                  textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                }}
              >
                {displayCompany}
              </p>
            )}

            {/* Separator line */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 sm:w-20" style={{ background: `linear-gradient(to right, transparent, ${theme.accentFg}44)` }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accentFg, opacity: 0.5 }} />
              <div className="h-px w-12 sm:w-20" style={{ background: `linear-gradient(to left, transparent, ${theme.accentFg}44)` }} />
            </div>

            {/* Title block */}
            <div className="space-y-1">
              <p
                className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase"
                style={{
                  color: theme.accentFg,
                  opacity: 0.7,
                  background: `linear-gradient(90deg, transparent, ${theme.accentFg}, transparent)`,
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "headerShimmer 6s linear infinite",
                }}
              >
                Relatório de Métricas de Tráfego Pago
              </p>
              <p className="text-[10px] sm:text-xs font-medium opacity-50" style={{ color: theme.accentFg }}>
                Gestor de Tráfego Matheus Rangel
              </p>
            </div>

            {/* Client name */}
            {displayClientName && (
              <div className="space-y-2 sm:space-y-3">
                <p
                  className="text-[10px] uppercase tracking-[0.25em] font-semibold"
                  style={{ color: theme.accentFg, opacity: 0.4 }}
                >
                  Cliente:
                </p>
                <h1
                  className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight px-2"
                  style={{
                    color: theme.accentFg,
                    textShadow: "0 4px 30px rgba(0,0,0,0.3)",
                    wordBreak: "break-word",
                  }}
                >
                  {displayClientName}
                </h1>
                {displayCompany && displayClientName !== displayCompany && (
                  <p className="text-xs sm:text-sm font-medium opacity-60" style={{ color: theme.accentFg }}>
                    {displayCompany}
                  </p>
                )}
              </div>
            )}

            {/* Exclusive badge */}
            {displayClientName && (
              <div className="flex justify-center pt-1">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: theme.accentFg,
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                    animation: "headerFloat 3s ease-in-out infinite",
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs whitespace-nowrap">
                    Relatório exclusivo para {displayClientName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8" style={{
          background: `linear-gradient(to bottom, transparent, ${theme.bg})`,
          zIndex: 10,
        }} />
      </div>
    </>
  );
}
