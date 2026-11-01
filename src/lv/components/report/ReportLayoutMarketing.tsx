// @ts-nocheck
"use client";
/**
 * Layout "Marketing Dashboard" — colored KPI cards, charts
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { BarChart2, Trophy } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import { getReportIcon } from "./reportIconMap";
import ReportTooltipWrapper from "./ReportTooltipWrapper";
const CARD_COLORS = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutMarketing({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  // Show ALL metrics as hero cards
  const heroMetrics = metrics;
  const otherMetrics: any[] = [];

  const chartMetrics = metrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") && !m.metric_key.includes("frequency") && !["reach", "impressions"].includes(m.metric_key)).slice(0, 6);
  const barData = chartMetrics.map((m, i) => ({ name: m.metric_label.length > 15 ? m.metric_label.slice(0, 13) + "…" : m.metric_label, value: m.metric_value, fill: getMetricChartColor(m.metric_key, CARD_COLORS[i % CARD_COLORS.length]) }));
  const pieData = metrics.filter(m => ["link_clicks", "clicks_all", "unique_outbound_clicks", "results", "messages_started", "leads"].includes(m.metric_key) && m.metric_value > 0)
    .slice(0, 5).map((m, i) => ({ name: m.metric_label, value: m.metric_value, fill: getMetricChartColor(m.metric_key, CARD_COLORS[i % CARD_COLORS.length]) }));

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {heroMetrics.length > 0 && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {heroMetrics.map((m, idx) => {
              const IconComp = getReportIcon(m.metric_key, m.metric_icon);
              const bgColor = CARD_COLORS[idx % CARD_COLORS.length];
              return (
                <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
                <div key={m.metric_key} className="rounded-xl p-5 text-white shadow-lg h-full" style={{ background: bgColor }}>
                  <div className="flex items-center gap-2 mb-3">
                    <IconComp className="h-5 w-5 opacity-80" />
                    <p className="text-xs font-medium opacity-80 truncate">{m.metric_label}</p>
                  </div>
                  <p className="text-3xl font-bold">{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                  {getMetricDescription(m.metric_key) && <p className="text-[10px] opacity-70 mt-2 leading-tight">{getMetricDescription(m.metric_key)}</p>}
                </div>
                </ReportTooltipWrapper>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {barData.length > 0 && (
            <div className="rounded-xl p-5 border shadow-sm" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Visão Geral de Métricas</h3>
              <div style={{ height: Math.max(200, barData.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: theme.text, fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                    <Bar name="Valor" dataKey="value" radius={[0, 8, 8, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {pieData.length > 0 && (
            <div className="rounded-xl p-5 border shadow-sm" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Distribuição</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} name="Valor" dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={45} outerRadius={80}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: theme.textMuted }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {otherMetrics.length > 0 && (
          <div className="rounded-xl p-5 border shadow-sm" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Detalhamento Completo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: theme.cardBorder }}>
                    <th className="text-left py-2.5 font-medium" style={{ color: theme.textMuted }}>Métrica</th>
                    <th className="text-left py-2.5 font-medium" style={{ color: theme.textMuted }}>Categoria</th>
                    <th className="text-right py-2.5 font-medium" style={{ color: theme.textMuted }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {otherMetrics.map((m) => (
                    <tr key={m.metric_key} className="border-b transition" style={{ borderColor: theme.bgSecondary }}>
                      <td className="py-2.5 flex items-center gap-2" style={{ color: theme.text }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: m.metric_color || theme.textMuted }} />
                        {m.metric_label}
                      </td>
                      <td className="py-2.5 capitalize" style={{ color: theme.textMuted }}>{m.metric_category || "outros"}</td>
                      <td className="py-2.5 text-right font-mono font-semibold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6 border shadow-sm" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>Cenários de Investimento</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => (
                <div key={i} className="rounded-xl p-5 border text-center" style={{ borderColor: i === 2 ? "#7c3aed" : theme.cardBorder, background: i === 2 ? theme.accent + "10" : theme.cardBg }}>
                  <p className="text-xs font-medium mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Intermediário" : "Ideal"}</p>
                  <p className="text-2xl font-bold mb-3" style={{ color: CARD_COLORS[i % CARD_COLORS.length] }}>{formatCurrency(sim.simulated_investment)}</p>
                  <div className="space-y-1.5 text-left text-sm">
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
