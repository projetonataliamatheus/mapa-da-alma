// @ts-nocheck
"use client";
/**
 * Layout "Modern CRM" — glassmorphism, gradient cards, donut + bar charts
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor } from "@/lv/lib/metaAdsParser";
import { BarChart2, Trophy } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import { getReportIcon } from "./reportIconMap";
import ReportTooltipWrapper from "./ReportTooltipWrapper";
import { getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
const NEON = ["#06d6a0", "#118ab2", "#ef476f", "#ffd166", "#8338ec", "#ff6b6b"];

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutModern({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  const categoryOrder = ["custo", "alcance", "engajamento", "conversão", "outros"];
  const grouped = categoryOrder.map(cat => ({
    category: cat,
    items: metrics.filter(m => (m.metric_category || "outros") === cat),
  })).filter(g => g.items.length > 0);

  const chartMetrics = metrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") && !m.metric_key.includes("frequency") && !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !["reach", "impressions"].includes(m.metric_key)).slice(0, 6);
  const barData = chartMetrics.map((m, i) => ({ name: m.metric_label.slice(0, 15), value: m.metric_value, fill: getMetricChartColor(m.metric_key, NEON[i % NEON.length]) }));
  const pieData = chartMetrics.slice(0, 5).map((m, i) => ({ name: m.metric_label, value: m.metric_value, fill: getMetricChartColor(m.metric_key, NEON[i % NEON.length]) }));

  const categoryLabels: Record<string, string> = { custo: "💰 Investimento", alcance: "📡 Alcance", engajamento: "🎯 Engajamento", conversão: "🏆 Conversão", outros: "📊 Outros" };

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {grouped.map(({ category, items }) => (
          <section key={category}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: theme.textMuted }}>{categoryLabels[category] || category}</h2>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((m, idx) => {
                const IconComp = getReportIcon(m.metric_key, m.metric_icon);
                const color = NEON[idx % NEON.length];
                return (
                  <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
                  <div key={m.metric_key} className="rounded-xl p-4 backdrop-blur-md h-full" style={{ background: theme.cardBg + "cc", border: `1px solid ${color}33` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <IconComp className="h-4 w-4" style={{ color }} />
                      <p className="text-xs truncate" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                    </div>
                    <p className="text-xl font-bold" style={{ color: "#22c55e" }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                    {getMetricDescription(m.metric_key) && (
                      <p className="text-[10px] mt-1 leading-tight" style={{ color: theme.textMuted }}>{getMetricDescription(m.metric_key)}</p>
                    )}
                  </div>
                  </ReportTooltipWrapper>
                );
              })}
            </div>
          </section>
        ))}

        <div className="grid gap-6 md:grid-cols-2">
          {barData.length > 0 && (
            <div className="rounded-xl p-5 backdrop-blur-md" style={{ background: theme.cardBg + "cc", border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Comparativo</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} />
                    <XAxis dataKey="name" tick={{ fill: theme.textMuted, fontSize: 10 }} />
                    <YAxis tick={{ fill: theme.textMuted, fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                    <Bar name="Valor" dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="rounded-xl p-5 backdrop-blur-md" style={{ background: theme.cardBg + "cc", border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Distribuição</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} name="Valor" dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={75} strokeWidth={0}
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

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6 backdrop-blur-md" style={{ background: theme.cardBg + "cc", border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>Simulações</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => {
                const c = NEON[i];
                return (
                  <div key={i} className="rounded-xl p-5 text-center" style={{ background: `${c}11`, border: `1px solid ${c}44` }}>
                    <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Intermediário" : "Ideal"}</p>
                    <p className="text-2xl font-bold mb-3" style={{ color: c }}>{formatCurrency(sim.simulated_investment)}</p>
                    <div className="space-y-1.5 text-left text-xs">
                      <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Alcance</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_reach)}</span></div>
                      <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Cliques</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_clicks)}</span></div>
                      <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Mensagens</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_messages)}</span></div>
                      <div className="flex justify-between"><span style={{ color: theme.textMuted }}>Leads</span><span className="font-semibold" style={{ color: theme.text }}>{formatNumber(sim.projected_leads)}</span></div>
                    </div>
                  </div>
                );
              })}
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
