// @ts-nocheck
"use client";
/**
 * Budget Pro — visual budget distribution based on spend + metrics
 * Base metric: unique_outbound_clicks (not reach)
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatCurrency, formatNumber, getMetricChartColor } from "@/lv/lib/metaAdsParser";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet } from "lucide-react";
import { WhatsAppGradientIcon } from "./ReportMetricIcons";
import { InstagramFollowersIcon } from "./ReportMetricIcons";

interface Props {
  report: any;
  metrics: any[];
  simulations: any[];
  theme: ReportTheme;
  snapshots?: any[];
}

export default function ReportBudgetPro({ report, metrics, simulations, theme, snapshots }: Props) {
  const spend = metrics.find(m => m.metric_key === "spend")?.metric_value || 0;
  if (spend <= 0) return null;

  const cpc = metrics.find(m => m.metric_key === "cpc" || m.metric_key === "cost_per_link_click")?.metric_value || 0;
  const cpr = metrics.find(m => m.metric_key === "cost_per_result")?.metric_value || 0;
  const uniqueOutboundClicks = metrics.find(m => m.metric_key === "unique_outbound_clicks")?.metric_value || 0;
  const clicks = metrics.find(m => m.metric_key === "link_clicks" || m.metric_key === "clicks_all")?.metric_value || 0;
  const results = metrics.find(m => m.metric_key === "results")?.metric_value || 0;
  const messagesStarted = metrics.find(m => m.metric_key === "messages_started")?.metric_value || 0;
  const igProfileVisits = metrics.find(m => m.metric_key === "instagram_profile_visits")?.metric_value || 0;

  // Build distribution segments — base is unique_outbound_clicks, not reach
  const segments: { label: string; value: number; color: string }[] = [];

  // Count active days from snapshots (days with spend > 0)
  let activeDays = 0;
  if (snapshots && snapshots.length > 0) {
    activeDays = snapshots.filter(s => {
      const sm = Array.isArray(s.metrics) ? s.metrics : [];
      return sm.some((mx: any) => mx.metric_key === "spend" && mx.metric_value > 0);
    }).length;
  }
  // Fallback: calculate from period range
  if (activeDays === 0 && report.period_start && report.period_end) {
    const d = (new Date(report.period_end).getTime() - new Date(report.period_start).getTime()) / (1000 * 60 * 60 * 24);
    if (d > 0) activeDays = Math.round(d) + 1;
  }
  if (activeDays === 0) activeDays = 30;
  const dailySpend = spend / activeDays;

  // Efficiency metrics
  const efficiency: { label: string; value: string; sub: string }[] = [
    { label: "Investimento Total", value: formatCurrency(spend), sub: `${formatCurrency(dailySpend)}/dia` },
  ];

  const baseClicks = uniqueOutboundClicks || clicks;
  if (baseClicks > 0) {
    efficiency.push({
      label: "Custo por Clique",
      value: cpc > 0 ? formatCurrency(cpc) : formatCurrency(spend / baseClicks),
      sub: `${formatNumber(baseClicks)} cliques de saída`,
    });
    segments.push({
      label: "Cliques de Saída",
      value: baseClicks,
      color: getMetricChartColor("unique_outbound_clicks", "#60a5fa"),
    });
  }
  if (results > 0) {
    efficiency.push({
      label: "Custo por Resultado",
      value: cpr > 0 ? formatCurrency(cpr) : formatCurrency(spend / results),
      sub: `${formatNumber(results)} resultados`,
    });
    segments.push({
      label: "Resultados",
      value: results,
      color: getMetricChartColor("results", "#22c55e"),
    });
  }
  if (messagesStarted > 0) {
    segments.push({
      label: "Conversas",
      value: messagesStarted,
      color: getMetricChartColor("messages_started", "#4ade80"),
    });
  }
  if (igProfileVisits > 0) {
    segments.push({
      label: "Visitas ao Perfil",
      value: igProfileVisits,
      color: getMetricChartColor("instagram_profile_visits", "#e040a0"),
    });
  }

  // ROI simulation comparison
  const bestSim = simulations.length > 0 ? simulations[simulations.length - 1] : null;
  const igFollowers = metrics.find(m => m.metric_key === "instagram_followers")?.metric_value || 0;

  return (
    <section className="rounded-xl p-5 md:p-6 border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
      <div className="flex items-center gap-2 mb-5">
        <Wallet className="h-5 w-5" style={{ color: theme.accent }} />
        <h2 className="text-lg font-bold" style={{ color: theme.text }}>Orçamento — Distribuição de Investimento</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Efficiency cards */}
        <div className="space-y-3">
          {efficiency.map((e, i) => (
            <div key={i} className="rounded-lg p-4 border" style={{ borderColor: theme.cardBorder, background: i === 0 ? theme.accent + "10" : "transparent" }}>
              <p className="text-xs font-medium mb-1" style={{ color: theme.textMuted }}>{e.label}</p>
              <p className="text-xl font-bold" style={{ color: i === 0 ? theme.accent : theme.text }}>{e.value}</p>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{e.sub}</p>
            </div>
          ))}
        </div>

        {/* Distribution chart */}
        {segments.length > 0 && (
          <div className="flex flex-col items-center justify-center">
            <div className="h-52 w-full max-w-xs mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segments} name="Valor" dataKey="value" nameKey="label" cx="50%" cy="45%" innerRadius={35} outerRadius={60}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}>
                    {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatNumber(v)}
                    contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }}
                    labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom legend below chart — prevents overlapping */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: theme.textMuted }}>{s.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-center mt-2" style={{ color: theme.textMuted }}>Distribuição proporcional dos resultados</p>
          </div>
        )}
      </div>

      {/* Results summary with platform icons */}
      {(() => {
        const showResults = results > 0 || messagesStarted > 0 || igFollowers > 0;
        if (!showResults) return null;
        return (
          <div className="mt-5 p-4 rounded-lg border-2" style={{ borderColor: "#22c55e40", background: "#22c55e08" }}>
            <p className="text-sm font-bold mb-3" style={{ color: "#22c55e" }}>📊 Resultados Alcançados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {results > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold" style={{ color: theme.accent }}>{formatNumber(results)}</span>
                  <span className="text-xs" style={{ color: theme.textMuted }}>Resultados</span>
                </div>
              )}
              {messagesStarted > 0 && (
                <div className="flex items-center gap-3">
                  <WhatsAppGradientIcon size={36} />
                  <div>
                    <span className="text-2xl font-bold" style={{ color: theme.accent }}>{formatNumber(messagesStarted)}</span>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Conversas no WhatsApp</p>
                  </div>
                </div>
              )}
              {igFollowers > 0 && (
                <div className="flex items-center gap-3">
                  <InstagramFollowersIcon size={36} />
                  <div>
                    <span className="text-2xl font-bold" style={{ color: theme.accent }}>{formatNumber(igFollowers)}</span>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Seguidores no Instagram</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Scale comparison */}
      {bestSim && bestSim.simulated_investment > spend && (
        <div className="mt-5 p-4 rounded-lg border-2 border-dashed" style={{ borderColor: theme.accent + "40" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
            💡 Se investir {formatCurrency(bestSim.simulated_investment)}, poderá alcançar:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Cliques", cur: baseClicks, proj: bestSim.projected_clicks },
              { label: "Mensagens", cur: messagesStarted, proj: bestSim.projected_messages },
              { label: "Leads", cur: metrics.find(m => m.metric_key === "leads")?.metric_value || 0, proj: bestSim.projected_leads },
              { label: "Alcance", cur: metrics.find(m => m.metric_key === "reach")?.metric_value || 0, proj: bestSim.projected_reach },
            ].filter(s => s.proj > 0).map((s, i) => {
              const growth = s.cur > 0 ? ((s.proj - s.cur) / s.cur * 100).toFixed(0) : "—";
              return (
                <div key={i} className="text-center">
                  <p className="text-xs" style={{ color: theme.textMuted }}>{s.label}</p>
                  <p className="text-lg font-bold" style={{ color: theme.accent }}>{formatNumber(s.proj)}</p>
                  {s.cur > 0 && <p className="text-[10px] font-semibold text-emerald-400">+{growth}%</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
