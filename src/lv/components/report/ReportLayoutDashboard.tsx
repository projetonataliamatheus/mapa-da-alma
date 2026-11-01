// @ts-nocheck
"use client";
/**
 * Layout "Full Dashboard" — Multi-section grid with indicators, funnel, charts
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { getSecondaryMetrics } from "@/lv/lib/secondaryMetrics";
import { BarChart2, Trophy, Eye, MousePointer, Target, TrendingDown, DollarSign, TrendingUp, Users, Globe } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import ReportTooltipWrapper from "./ReportTooltipWrapper";

const ICON_MAP: Record<string, any> = { Eye, MousePointer, MessageCircle: WhatsAppIcon, Target, TrendingDown, DollarSign, TrendingUp, BarChart2, Users, Globe };
const BENCHMARKS: Record<string, { good: number; direction: "lower" | "higher" }> = {
  cpm: { good: 15, direction: "lower" }, cpc: { good: 2, direction: "lower" }, cpc_all: { good: 2, direction: "lower" },
  ctr: { good: 1.5, direction: "higher" }, cost_per_result: { good: 5, direction: "lower" }, cost_per_message: { good: 5, direction: "lower" },
};

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutDashboard({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  const getColor = (key: string, value: number): string => {
    const b = BENCHMARKS[key]; if (!b) return theme.textMuted;
    return (b.direction === "lower" ? value <= b.good : value >= b.good) ? "#22c55e" : "#ef4444";
  };

  // Show ALL metrics as main KPIs
  const mainKPIs = metrics;
  const funnelKeys = ["unique_outbound_clicks", "link_clicks", "clicks_all", "results", "messages_started", "leads", "purchases"];
  const funnelMetrics = funnelKeys.map(k => metrics.find(m => m.metric_key === k)).filter(Boolean);
  const engagementMetrics = metrics.filter(m => m.metric_category === "engajamento").slice(0, 8);
  const costMetrics = metrics.filter(m => (m.metric_category === "custo" || m.metric_key.includes("cost")) && m.metric_key !== "spend").slice(0, 6);
  const conversionMetrics = metrics.filter(m => m.metric_category === "conversão");

  const pieData = conversionMetrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost")).slice(0, 5).map((m, i) => ({
    name: m.metric_label, value: m.metric_value, fill: ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"][i % 5],
  }));
  const barData = engagementMetrics.filter(m => m.metric_value > 0).slice(0, 6).map((m, i) => ({
    name: m.metric_label.length > 12 ? m.metric_label.slice(0, 10) + "…" : m.metric_label,
    value: m.metric_value, fill: getMetricChartColor(m.metric_key, theme.chartColors[i % theme.chartColors.length]),
  }));

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {mainKPIs.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>Principais Indicadores</h3>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {mainKPIs.map((m: any) => {
                const perfColor = getColor(m.metric_key, m.metric_value);
                return (
                  <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
                  <div key={m.metric_key}>
                    <p className="text-[10px] mb-0.5" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                    <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                    <div className="w-full h-1 rounded-full mt-1.5" style={{ background: theme.bgSecondary }}>
                      <div className="h-full rounded-full" style={{ width: "60%", background: perfColor }} />
                    </div>
                  </div>
                  </ReportTooltipWrapper>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {funnelMetrics.length > 1 && (
            <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>Funil de Resultados</h3>
              <div className="space-y-1.5">
                {funnelMetrics.map((m: any, i: number) => {
                  const maxVal = funnelMetrics[0]?.metric_value || 1;
                  const pct = (m.metric_value / maxVal) * 100;
                  return (
                    <div key={m.metric_key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[10px]" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                        <p className="text-xs font-bold" style={{ color: theme.text }}>{formatNumber(m.metric_value)}</p>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: theme.bgSecondary }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, pct)}%`, background: theme.chartColors[i % theme.chartColors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {barData.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>Engajamento</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} />
                    <XAxis dataKey="name" tick={{ fill: theme.textMuted, fontSize: 9 }} />
                    <YAxis tick={{ fill: theme.textMuted, fontSize: 9 }} tickFormatter={v => formatNumber(v)} />
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                    {report.goal_target > 0 && <ReferenceLine y={report.goal_target} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${formatNumber(report.goal_target)}`, fill: "#22c55e", fontSize: 10, position: "insideTopRight" }} />}
                    <Bar name="Valor" dataKey="value" radius={[4, 4, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>Conversões</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} name="Valor" dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={35} outerRadius={65} strokeWidth={0} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {pieData.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-[10px]" style={{ color: theme.textMuted }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {costMetrics.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>Custos Médios</h3>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {costMetrics.map(m => {
                const color = getColor(m.metric_key, m.metric_value);
                return (
                  <div key={m.metric_key} className="rounded-lg p-3 text-center" style={{ background: theme.bgSecondary }}>
                    <p className="text-base font-bold" style={{ color }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Projeções</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => (
                <div key={i} className="rounded-lg p-4 text-center" style={{ background: theme.bgSecondary }}>
                  <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Crescimento" : "Escala Máxima"}</p>
                  <p className="text-xl font-bold mb-2" style={{ color: [theme.textMuted, "#3b82f6", "#22c55e"][i] }}>{formatCurrency(sim.simulated_investment)}</p>
                  <div className="space-y-1 text-left text-xs">
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Alcance</span><span style={{ color: theme.text }}>{formatNumber(sim.projected_reach)}</span></div>
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Cliques</span><span style={{ color: theme.text }}>{formatNumber(sim.projected_clicks)}</span></div>
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Mensagens</span><span style={{ color: theme.text }}>{formatNumber(sim.projected_messages)}</span></div>
                    <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Leads</span><span style={{ color: theme.text }}>{formatNumber(sim.projected_leads)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.investment_tip && (
          <div className="rounded-xl p-5 text-center" style={{ background: theme.bgSecondary, border: `1px solid ${theme.accent}44` }}>
            <Trophy className="h-6 w-6 mx-auto mb-2" style={{ color: theme.accent }} />
            <h3 className="font-bold mb-2 text-sm" style={{ color: theme.text }}>Recomendação do Especialista</h3>
            <p className="text-sm whitespace-pre-wrap max-w-lg mx-auto" style={{ color: theme.textMuted }}>{report.investment_tip}</p>
            {report.contact_whatsapp && (
              <a href={`https://wa.me/${report.contact_whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-lg font-semibold text-sm transition hover:scale-105" style={{ background: "#25d366", color: "#fff" }}>
                <WhatsAppIcon className="h-4 w-4" /> Falar com a agência
              </a>
            )}
          </div>
        )}

        <footer className="text-center py-5 border-t" style={{ borderColor: theme.cardBorder }}>
          <p className="text-[10px]" style={{ color: theme.textMuted }}>Relatório gerado em {new Date(report.created_at).toLocaleDateString("pt-BR")} • Dados do Gerenciador de Anúncios do Meta Ads</p>
          {clientName && <p className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>Confidencial — {clientName}</p>}
        </footer>
      </main>
    </div>
  );
}
