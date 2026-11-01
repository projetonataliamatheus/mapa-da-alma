// @ts-nocheck
"use client";
/**
 * Seção de estratégia — green growth theme with floating icons and effects.
 */
import { Lightbulb, MessageCircle, Users, ShoppingCart, Megaphone, TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { getStrategyContext } from "@/lv/lib/strategyContext";
import { formatMetricValue } from "@/lv/lib/metaAdsParser";

const STRATEGY_ICONS: Record<string, any> = {
  mensagens: MessageCircle,
  leads: Users,
  vendas: ShoppingCart,
  engajamento: Megaphone,
  conteudo: Megaphone,
};

interface Props {
  report: any;
  metrics: any[];
  theme: ReportTheme;
  isDark?: boolean;
  previousMetrics?: any[];
}

// Floating icon wrapper
function FloatingIcon({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span
      className="inline-block"
      style={{
        animation: `floatY 3s ease-in-out ${delay}s infinite`,
      }}
    >
      {children}
    </span>
  );
}

// Modern gradient Instagram icon
function InstagramGradientIcon({ size = 14 }: { size?: number }) {
  const id = `ig-grad-strategy-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke={`url(#${id})`} strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="5" stroke={`url(#${id})`} strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.5" fill={`url(#${id})`} />
    </svg>
  );
}

function getTrendArrow(currentValue: number, metricKey: string, previousMetrics?: any[]) {
  if (!previousMetrics || previousMetrics.length === 0) return null;
  const prev = previousMetrics.find((m: any) => m.metric_key === metricKey);
  if (!prev || prev.metric_value <= 0) return null;
  
  const isCostMetric = metricKey.includes("cost");
  const change = currentValue - prev.metric_value;
  
  if (Math.abs(change) < 0.01) return null;
  
  if (isCostMetric) {
    // For cost metrics: down is good (green), up is bad (red)
    return change < 0 
      ? <ArrowDownRight className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
      : <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />;
  }
  
  // For volume metrics: up is good
  return change > 0 
    ? <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
    : <ArrowDownRight className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />;
}

export default function ReportStrategySection({ report, metrics, theme, isDark = true, previousMetrics }: Props) {
  const ctx = getStrategyContext(report.strategy_type);
  const hasCustomNotes = !!report.strategy_notes;

  if (!ctx && !hasCustomNotes) return null;

  const greenAccent = "#22c55e";
  const greenGlow = "#4ade80";
  const greenBg = isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)";
  const greenBorder = isDark ? "rgba(34,197,94,0.35)" : "rgba(34,197,94,0.25)";
  const textColor = isDark ? "#f1f5f9" : "#1e293b";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";

  const StrategyIcon = ctx ? (STRATEGY_ICONS[report.strategy_type?.toLowerCase()] || Lightbulb) : Lightbulb;

  const kpiMetrics = ctx
    ? ctx.kpiKeys.map(k => metrics.find(m => m.metric_key === k)).filter(Boolean)
    : [];

  return (
    <>
      {/* Keyframes for floating animation */}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 20px rgba(34,197,94,0.5); }
        }
      `}</style>
      <section
        className="rounded-xl p-6 border relative overflow-hidden"
        style={{
          background: greenBg,
          borderColor: greenBorder,
          boxShadow: `0 0 20px rgba(34,197,94,0.08)`,
        }}
      >
        {/* Decorative floating icons */}
        <div className="absolute top-3 right-4 opacity-15 pointer-events-none flex gap-3">
          <FloatingIcon delay={0}>
            <TrendingUp className="h-8 w-8" style={{ color: greenAccent }} />
          </FloatingIcon>
          <FloatingIcon delay={0.5}>
            <ArrowUpRight className="h-6 w-6" style={{ color: greenGlow }} />
          </FloatingIcon>
          <FloatingIcon delay={1}>
            <CheckCircle2 className="h-7 w-7" style={{ color: greenAccent }} />
          </FloatingIcon>
          <FloatingIcon delay={1.5}>
            <Sparkles className="h-5 w-5" style={{ color: greenGlow }} />
          </FloatingIcon>
        </div>

        <div className="flex flex-col items-center text-center mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${greenAccent}33, ${greenGlow}22)`,
                animation: "pulseGlow 3s ease-in-out infinite",
              }}
            >
              <StrategyIcon className="h-5 w-5" style={{ color: greenAccent }} />
            </div>
            <div>
              {ctx && (
                <p
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{ background: `${greenAccent}22`, color: greenAccent }}
                >
                  <TrendingUp className="h-3 w-3" />
                  {ctx.emoji} {ctx.title}
                </p>
              )}
            </div>
          </div>
          <h2 className="text-base font-bold flex items-center justify-center gap-2" style={{ color: textColor }}>
            O que estamos fazendo pela sua empresa
            <FloatingIcon delay={0.3}>
              <CheckCircle2 className="h-4 w-4" style={{ color: greenAccent }} />
            </FloatingIcon>
          </h2>
          {ctx && (
            <p className="text-sm mt-1 flex items-center gap-2 font-medium" style={{ color: greenAccent }}>
              <WhatsAppIcon className="h-4 w-4" />
              Estratégia em Execução: {ctx.title === "Campanha de Mensagens Ativas" ? "Mensagens Direto Para WhatsApp" : ctx.title}
            </p>
          )}
        </div>

        {/* Auto context description */}
        {ctx && (
          <div
            className="rounded-lg p-4 mb-4 border"
            style={{
              background: isDark ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.03)",
              borderColor: `${greenAccent}15`,
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: mutedColor }}>
              {ctx.description}
            </p>
          </div>
        )}

        {/* Relevant KPIs — ALL numbers in green */}
        {kpiMetrics.length > 0 && (
          <div className="flex gap-3 mb-4 flex-wrap">
            {kpiMetrics.map((m: any, i: number) => {
              const isInstagram = m.metric_key.includes("instagram");
              const trendArrow = getTrendArrow(m.metric_value, m.metric_key, previousMetrics);
              
              return (
                <div
                  key={m.metric_key}
                  className="rounded-lg px-4 py-2.5 text-center border"
                  style={{
                    background: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)",
                    borderColor: `${greenAccent}30`,
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <FloatingIcon delay={i * 0.3}>
                      {isInstagram ? (
                        <InstagramGradientIcon size={14} />
                      ) : (
                        <TrendingUp className="h-3 w-3" style={{ color: greenAccent }} />
                      )}
                    </FloatingIcon>
                    {trendArrow && (
                      <FloatingIcon delay={i * 0.3 + 0.15}>
                        {trendArrow}
                      </FloatingIcon>
                    )}
                    {!trendArrow && (isInstagram || m.metric_key === "messages_started") && (
                      <FloatingIcon delay={i * 0.3 + 0.15}>
                        <ArrowUpRight className="h-3.5 w-3.5" style={{ color: greenAccent }} />
                      </FloatingIcon>
                    )}
                    <p className="text-lg font-bold" style={{ color: greenAccent }}>
                      {formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}
                    </p>
                  </div>
                  <p className="text-[10px]" style={{ color: mutedColor }}>{m.metric_label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom admin notes */}
        {hasCustomNotes && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: textColor }}>
            {report.strategy_notes}
          </p>
        )}
      </section>
    </>
  );
}
