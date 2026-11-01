// @ts-nocheck
"use client";
/**
 * Layout "Analytics Dark" — inspired by dark Meta Ads dashboards
 * Full-width horizontal bars, funnel visualization, data table
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { BarChart2, Calendar, Lightbulb, Trophy, Eye, MousePointer, Target, TrendingDown, DollarSign, TrendingUp, Users, Globe } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import ReportTooltipWrapper from "./ReportTooltipWrapper";

const ICON_MAP: Record<string, any> = { Eye, MousePointer, MessageCircle: WhatsAppIcon, Target, TrendingDown, DollarSign, TrendingUp, BarChart2, Users, Globe };

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutAnalytics({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  // Show ALL metrics as hero cards
  const heroMetrics = metrics;
  const detailMetrics: any[] = [];

  const chartMetrics = metrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") && !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !m.metric_key.includes("frequency") && !["reach", "impressions"].includes(m.metric_key));
  const barData = chartMetrics.slice(0, 8).map((m, i) => ({
    name: m.metric_label.length > 20 ? m.metric_label.slice(0, 18) + "…" : m.metric_label,
    value: m.metric_value,
    fill: getMetricChartColor(m.metric_key, theme.chartColors[i % theme.chartColors.length]),
  }));

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {heroMetrics.length > 0 && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {heroMetrics.map((m) => (
              <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
              <div key={m.metric_key} className="rounded-lg p-4 border text-center h-full" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
                <p className="text-xs mb-1 truncate" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                {getMetricDescription(m.metric_key) && (
                  <p className="text-[10px] mt-1 leading-tight" style={{ color: theme.textMuted }}>{getMetricDescription(m.metric_key)}</p>
                )}
              </div>
              </ReportTooltipWrapper>
            ))}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {barData.length > 0 && (
            <div className="rounded-xl p-5 border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Métricas Principais</h3>
              <div style={{ height: Math.max(200, barData.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} horizontal={false} />
                    <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: theme.text, fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                    <Bar name="Valor" dataKey="value" radius={[0, 6, 6, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {detailMetrics.length > 0 && (
            <div className="rounded-xl p-5 border overflow-auto" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Todas as Métricas</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: theme.cardBorder }}>
                    <th className="text-left py-2 font-medium" style={{ color: theme.textMuted }}>Métrica</th>
                    <th className="text-right py-2 font-medium" style={{ color: theme.textMuted }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {detailMetrics.map((m) => (
                    <tr key={m.metric_key} className="border-b" style={{ borderColor: theme.bgSecondary }}>
                      <td className="py-2" style={{ color: theme.text }}>{m.metric_label}</td>
                      <td className="py-2 text-right font-mono font-semibold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6 border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>Simulações de Crescimento</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => (
                <div key={i} className="rounded-lg p-4 text-center" style={{ background: i === 2 ? theme.accent + "15" : theme.bgSecondary, border: `1px solid ${theme.cardBorder}` }}>
                  <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Intermediário" : "Ideal"}</p>
                  <p className="text-xl font-bold mb-3" style={{ color: theme.accent }}>{formatCurrency(sim.simulated_investment)}</p>
                  <div className="space-y-1 text-left text-xs">
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
          <div className="rounded-xl p-6 text-center" style={{ background: theme.gradient }}>
            <Trophy className="h-7 w-7 mx-auto mb-2" style={{ color: theme.accentFg }} />
            <h3 className="font-bold mb-2" style={{ color: theme.accentFg }}>Dica do Especialista</h3>
            <p className="text-sm whitespace-pre-wrap max-w-lg mx-auto" style={{ color: theme.accentFg + "dd" }}>{report.investment_tip}</p>
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
        </footer>
      </main>
    </div>
  );
}
