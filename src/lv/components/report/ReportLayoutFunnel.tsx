// @ts-nocheck
"use client";
/**
 * Layout "Funil de Conversão" — funnel visualization, horizontal bars, donut chart
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { BarChart2, Trophy, Eye, MousePointer, Target, TrendingDown, DollarSign, TrendingUp, Users, Globe } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";

const ICON_MAP: Record<string, any> = { Eye, MousePointer, MessageCircle: WhatsAppIcon, Target, TrendingDown, DollarSign, TrendingUp, BarChart2, Users, Globe };

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutFunnel({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  // Show ALL metrics as KPI cards
  const kpiMetrics = metrics;
  const kpiGroup1 = metrics.filter(m => ["impressions", "ctr", "ctr_all", "link_clicks", "clicks_all", "unique_outbound_clicks", "outbound_ctr_unique", "creative_quality_ctr"].includes(m.metric_key));
  const kpiGroup2 = metrics.filter(m => ["spend", "cpc", "cpc_all", "cpm", "cost_per_result", "cost_per_message", "conversation_rate"].includes(m.metric_key));
  const kpiGroup3 = metrics.filter(m => !kpiGroup1.find(x => x.metric_key === m.metric_key) && !kpiGroup2.find(x => x.metric_key === m.metric_key));

  const funnelKeys = ["unique_outbound_clicks", "link_clicks", "clicks_all", "results", "messages_started", "leads", "purchases"];
  const funnelMetrics = funnelKeys.map(k => metrics.find(m => m.metric_key === k)).filter(Boolean);
  const maxFunnelVal = Math.max(...funnelMetrics.map((m: any) => m.metric_value), 1);

  const engagementKeys = ["post_saves", "post_shares", "post_comments", "post_reactions", "post_engagement"];
  const engagementMetrics = engagementKeys.map(k => metrics.find(m => m.metric_key === k)).filter(Boolean);
  const engagementColors = ["#06d6a0", "#118ab2", "#ef476f", "#ffd166", "#8338ec"];

  const barMetrics = metrics.filter(m =>
    m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") &&
    !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !m.metric_key.includes("frequency") &&
    !m.metric_key.includes("creative") && !m.metric_key.includes("rate") && !["reach", "impressions"].includes(m.metric_key)
  ).slice(0, 8);
  const barData = barMetrics.map((m, i) => ({
    name: m.metric_label.length > 25 ? m.metric_label.slice(0, 23) + "…" : m.metric_label,
    value: m.metric_value, fill: getMetricChartColor(m.metric_key, theme.chartColors[i % theme.chartColors.length]),
  }));

  const tableMetrics = metrics.filter(m => !kpiGroup1.find(x => x.metric_key === m.metric_key) && !kpiGroup2.find(x => x.metric_key === m.metric_key) && !engagementKeys.includes(m.metric_key));

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {(kpiGroup1.length > 0 || kpiGroup2.length > 0 || kpiGroup3.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpiGroup1.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: theme.textMuted }}>Taxa de Cliques e Impressões</p>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(kpiGroup1.length, 3)}, 1fr)` }}>
                  {kpiGroup1.map((m: any) => (
                    <div key={m.metric_key} className="text-center">
                      <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                      <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {kpiGroup2.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: theme.textMuted }}>Investimentos</p>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(kpiGroup2.length, 3)}, 1fr)` }}>
                  {kpiGroup2.map((m: any) => (
                    <div key={m.metric_key} className="text-center">
                      <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                      <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {kpiGroup3.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: theme.textMuted }}>Resultados e Engajamento</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                  {kpiGroup3.map((m: any) => (
                    <div key={m.metric_key} className="text-center">
                      <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                      <p className="text-2xl font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {funnelMetrics.length > 1 && (
            <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Funil de Conversão</h3>
              <div className="flex flex-col items-center gap-1">
                {funnelMetrics.map((m: any, i: number) => {
                  const widthPct = Math.max(20, (m.metric_value / maxFunnelVal) * 100);
                  const color = ["#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#22c55e"][i % 8];
                  return (
                    <div key={m.metric_key} className="relative flex items-center justify-center py-3 rounded-lg transition-all"
                      style={{ width: `${widthPct}%`, background: color, minHeight: 48, clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)" }}>
                      <div className="text-center z-10">
                        <p className="text-[10px] text-white/80 font-medium">{m.metric_label}</p>
                        <p className="text-lg font-bold text-white">{formatNumber(m.metric_value)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {barData.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Métricas por Volume</h3>
              <div style={{ height: Math.max(200, barData.length * 42) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} horizontal={false} />
                    <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 10 }} tickFormatter={v => formatNumber(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: theme.text, fontSize: 10 }} width={130} />
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                    <Bar name="Valor" dataKey="value" radius={[0, 6, 6, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {engagementMetrics.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Funil de Engajamento</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={engagementMetrics.map((m: any, i) => ({ name: m.metric_label, value: m.metric_value, fill: engagementColors[i % engagementColors.length] }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      label={({ name, value }) => `${name}: ${formatNumber(value)}`}>
                      {engagementMetrics.map((_: any, i: number) => <Cell key={i} fill={engagementColors[i % engagementColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="rounded-xl p-5 overflow-auto" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, maxHeight: 400 }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Visão Geral por Métrica</h3>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: theme.cardBg }}>
                <tr className="border-b" style={{ borderColor: theme.cardBorder }}>
                  <th className="text-left py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Métrica</th>
                  <th className="text-right py-2 font-medium text-xs" style={{ color: theme.textMuted }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {tableMetrics.map((m) => (
                  <tr key={m.metric_key} className="border-b transition" style={{ borderColor: theme.bgSecondary }}>
                    <td className="py-2 text-xs flex items-center gap-2" style={{ color: theme.text }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.metric_color || theme.textMuted }} />
                      {m.metric_label}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-xs" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>📈 Se Você Investir Mais</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => {
                const colors = ["#64748b", "#06b6d4", "#22c55e"];
                return (
                  <div key={i} className="rounded-lg p-4 text-center" style={{ border: `1px solid ${colors[i]}44`, background: i === 2 ? `${colors[i]}11` : "transparent" }}>
                    <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Crescimento" : "Escala Máxima"}</p>
                    <p className="text-2xl font-bold mb-3" style={{ color: colors[i] }}>{formatCurrency(sim.simulated_investment)}</p>
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
          {clientName && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{`Confidencial — ${clientName}`}</p>}
          <p className="text-[10px] mt-1" style={{ color: theme.textMuted }}>Dados provenientes do Gerenciador de Anúncios do Meta Ads</p>
        </footer>
      </main>
    </div>
  );
}
