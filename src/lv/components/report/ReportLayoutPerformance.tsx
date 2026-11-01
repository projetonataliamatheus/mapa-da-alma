// @ts-nocheck
"use client";
/**
 * Layout "Performance" — stacked metric cards, progress bars, conversion flow
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { BarChart2, Trophy, Eye, MousePointer, Target, TrendingDown, DollarSign, TrendingUp, Users, Globe, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import ReportTooltipWrapper from "./ReportTooltipWrapper";

const ICON_MAP: Record<string, any> = { Eye, MousePointer, MessageCircle: WhatsAppIcon, Target, TrendingDown, DollarSign, TrendingUp, BarChart2, Users, Globe };

const BENCHMARKS: Record<string, { good: number; direction: "lower" | "higher" }> = {
  cpm: { good: 15, direction: "lower" }, cpc: { good: 2, direction: "lower" }, cpc_all: { good: 2, direction: "lower" },
  ctr: { good: 1.5, direction: "higher" }, ctr_all: { good: 1.5, direction: "higher" },
  cost_per_result: { good: 5, direction: "lower" }, cost_per_message: { good: 5, direction: "lower" },
  cost_per_lead: { good: 10, direction: "lower" }, frequency: { good: 3, direction: "lower" },
};

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutPerformance({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  // Show ALL metrics as hero cards
  const heroMetrics = metrics;
  const cascadeKeys = ["impressions", "reach", "link_clicks", "clicks_all", "landing_page_views", "results", "messages_started", "leads", "purchases"];
  const cascadeMetrics = cascadeKeys.map(k => metrics.find(m => m.metric_key === k)).filter(Boolean);
  const costMetrics = metrics.filter(m => m.metric_category === "custo" || m.metric_key.includes("cost") || m.metric_key.includes("cpm") || m.metric_key.includes("cpc"));
  const engagementMetrics = metrics.filter(m => m.metric_category === "engajamento");
  const chartMetrics = metrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") && !m.metric_key.includes("frequency") && !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !["reach", "impressions"].includes(m.metric_key)).slice(0, 6);
  const barData = chartMetrics.map((m, i) => ({ name: m.metric_label.slice(0, 14), value: m.metric_value, fill: getMetricChartColor(m.metric_key, theme.chartColors[i % theme.chartColors.length]) }));

  const getPerformanceColor = (key: string, value: number): string => {
    const b = BENCHMARKS[key]; if (!b) return theme.textMuted;
    if (b.direction === "lower") return value <= b.good ? "#22c55e" : value <= b.good * 2 ? "#f59e0b" : "#ef4444";
    return value >= b.good ? "#22c55e" : value >= b.good * 0.5 ? "#f59e0b" : "#ef4444";
  };
  const getPerformanceIcon = (key: string, value: number) => {
    const color = getPerformanceColor(key, value);
    return color === "#22c55e" ? <ArrowUpRight className="h-3 w-3" style={{ color }} /> : <ArrowDownRight className="h-3 w-3" style={{ color }} />;
  };

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {heroMetrics.length > 0 && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {heroMetrics.map((m: any) => {
              const perfColor = getPerformanceColor(m.metric_key, m.metric_value);
              return (
                <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
                <div key={m.metric_key} className="rounded-xl p-5 h-full" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                    {BENCHMARKS[m.metric_key] && getPerformanceIcon(m.metric_key, m.metric_value)}
                  </div>
                  <p className="text-3xl font-bold mb-2" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                  <div className="w-full h-1.5 rounded-full" style={{ background: theme.bgSecondary }}>
                    <div className="h-full rounded-full transition-all" style={{ width: "65%", background: perfColor }} />
                  </div>
                  {getMetricDescription(m.metric_key) && (
                    <p className="text-[10px] mt-2" style={{ color: theme.textMuted }}>{getMetricDescription(m.metric_key)}</p>
                  )}
                </div>
                </ReportTooltipWrapper>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-5">
            {cascadeMetrics.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Funil de Resultados</h3>
                <div className="space-y-2">
                  {cascadeMetrics.map((m: any, i: number) => {
                    const maxVal = cascadeMetrics[0]?.metric_value || 1;
                    const pct = Math.max(5, (m.metric_value / maxVal) * 100);
                    return (
                      <div key={m.metric_key} className="relative" style={{ paddingLeft: `${i * 8}px` }}>
                        <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: theme.bgSecondary, borderLeft: `3px solid ${theme.chartColors[i % theme.chartColors.length]}` }}>
                          <div>
                            <p className="text-[10px]" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                            <p className="text-lg font-bold" style={{ color: theme.text }}>{formatNumber(m.metric_value)}</p>
                          </div>
                          <p className="text-[10px]" style={{ color: theme.textMuted }}>{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {costMetrics.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Custos e Eficiência</h3>
                <div className="grid gap-2 grid-cols-2">
                  {costMetrics.map((m: any) => {
                    const perfColor = getPerformanceColor(m.metric_key, m.metric_value);
                    return (
                      <div key={m.metric_key} className="rounded-lg p-3" style={{ background: theme.bgSecondary }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] truncate" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                          <div className="w-2 h-2 rounded-full" style={{ background: perfColor }} />
                        </div>
                        <p className="text-base font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-5">
            {barData.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Resultados por Métrica</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: theme.textMuted, fontSize: 10 }} />
                      <YAxis tick={{ fill: theme.textMuted, fontSize: 10 }} tickFormatter={v => formatNumber(v)} />
                      <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                      <Bar name="Valor" dataKey="value" radius={[6, 6, 0, 0]}>
                        {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {engagementMetrics.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Engajamento</h3>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                  {engagementMetrics.map((m: any) => (
                    <div key={m.metric_key} className="rounded-lg p-3 text-center" style={{ background: theme.bgSecondary }}>
                      <p className="text-xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                      <p className="text-[10px] mt-1" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>Projeções de Crescimento</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => (
                <div key={i} className="rounded-lg p-4 text-center" style={{ background: theme.bgSecondary, border: i === 2 ? "1px solid #22c55e44" : `1px solid ${theme.cardBorder}` }}>
                  <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Crescimento" : "Escala Máxima"}</p>
                  <p className="text-2xl font-bold mb-3" style={{ color: i === 0 ? theme.textMuted : i === 1 ? "#3b82f6" : "#22c55e" }}>{formatCurrency(sim.simulated_investment)}</p>
                  <div className="space-y-1.5 text-left text-xs">
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Alcance</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_reach)}</span></div>
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Cliques</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_clicks)}</span></div>
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Mensagens</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_messages)}</span></div>
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Leads</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_leads)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.investment_tip && (
          <div className="rounded-xl p-6 text-center" style={{ background: theme.gradient, border: `1px solid ${theme.accent}44` }}>
            <Trophy className="h-7 w-7 mx-auto mb-2" style={{ color: theme.accentFg }} />
            <h3 className="font-bold mb-2" style={{ color: theme.accentFg }}>Dica do Especialista</h3>
            <p className="text-sm whitespace-pre-wrap max-w-lg mx-auto" style={{ color: theme.accentFg + "cc" }}>{report.investment_tip}</p>
            {report.contact_whatsapp && (
              <a href={`https://wa.me/${report.contact_whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg font-semibold text-sm transition hover:scale-105" style={{ background: "#25d366", color: "#fff" }}>
                <WhatsAppIcon className="h-4 w-4" /> Falar com a agência
              </a>
            )}
          </div>
        )}

        <footer className="text-center py-6 border-t" style={{ borderColor: theme.cardBorder }}>
          <p className="text-xs" style={{ color: theme.textMuted }}>Relatório gerado em {new Date(report.created_at).toLocaleDateString("pt-BR")}</p>
          {clientName && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Confidencial — {clientName}</p>}
        </footer>
      </main>
    </div>
  );
}
