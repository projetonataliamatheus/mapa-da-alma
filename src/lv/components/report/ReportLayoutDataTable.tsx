// @ts-nocheck
"use client";
/**
 * Layout "DataTable" — Table-heavy layout with detailed campaign data
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { BarChart2, Trophy, Eye, MousePointer, Target, TrendingDown, DollarSign, TrendingUp, Users, Globe } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import ReportAdvancedTable from "./ReportAdvancedTable";
import ReportTooltipWrapper from "./ReportTooltipWrapper";

const ICON_MAP: Record<string, any> = { Eye, MousePointer, MessageCircle: WhatsAppIcon, Target, TrendingDown, DollarSign, TrendingUp, BarChart2, Users, Globe };

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutDataTable({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  // Show ALL metrics as top summary cards
  const summaryMetrics = metrics;

  const barData = metrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") && !m.metric_key.includes("frequency") && !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !["reach", "impressions"].includes(m.metric_key))
    .slice(0, 10).map((m, i) => ({
      name: m.metric_label.length > 20 ? m.metric_label.slice(0, 18) + "…" : m.metric_label,
      value: m.metric_value, fill: getMetricChartColor(m.metric_key, theme.chartColors[i % theme.chartColors.length]),
    }));

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {summaryMetrics.length > 0 && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {summaryMetrics.map((m: any) => (
              <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
              <div key={m.metric_key} className="rounded-xl p-4 h-full" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                {getMetricDescription(m.metric_key) && <p className="text-[10px] mt-1" style={{ color: theme.textMuted }}>{getMetricDescription(m.metric_key)}</p>}
              </div>
              </ReportTooltipWrapper>
            ))}
          </div>
        )}

        <ReportAdvancedTable metrics={metrics} theme={theme} goalReference={report.goal_reference} />

        {barData.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Comparativo de Métricas</h3>
            <div style={{ height: Math.max(200, barData.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 5 }}>
                  <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 10 }} tickFormatter={v => formatNumber(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: theme.text, fontSize: 10 }} width={130} />
                  <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                  <Bar name="Valor" dataKey="value" radius={[0, 4, 4, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>Simulações</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                    <th className="text-left py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Cenário</th>
                    <th className="text-right py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Investimento</th>
                    <th className="text-right py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Alcance</th>
                    <th className="text-right py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Cliques</th>
                    <th className="text-right py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Mensagens</th>
                    <th className="text-right py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((sim: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${theme.bgSecondary}` }}>
                      <td className="py-2.5 font-medium" style={{ color: theme.text }}>{i === 0 ? "Atual" : i === 1 ? "Crescimento" : "Escala Máxima"}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: theme.text }}>{formatCurrency(sim.simulated_investment)}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: theme.text }}>{formatNumber(sim.projected_reach)}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: theme.text }}>{formatNumber(sim.projected_clicks)}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: theme.text }}>{formatNumber(sim.projected_messages)}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: theme.text }}>{formatNumber(sim.projected_leads)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report.investment_tip && (
          <div className="rounded-xl p-6 text-center" style={{ background: theme.bgSecondary, border: `1px solid ${theme.accent}44` }}>
            <Trophy className="h-7 w-7 mx-auto mb-2" style={{ color: theme.accent }} />
            <h3 className="font-bold mb-2" style={{ color: theme.text }}>Recomendação</h3>
            <p className="text-sm whitespace-pre-wrap max-w-lg mx-auto" style={{ color: theme.textMuted }}>{report.investment_tip}</p>
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
