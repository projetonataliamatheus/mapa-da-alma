// @ts-nocheck
"use client";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { getSecondaryMetrics } from "@/lv/lib/secondaryMetrics";
import { BarChart2, Calendar, Trophy } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportMetricsSidebar from "./ReportMetricsSidebar";
import ReportCostSummary from "./ReportCostSummary";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportAdvancedTable from "./ReportAdvancedTable";
import ReportComparisonBadge from "./ReportComparisonBadge";
import { getReportIcon } from "./reportIconMap";
import ReportTooltipWrapper from "./ReportTooltipWrapper";

interface Props {
  report: any;
  metrics: any[];
  simulations: any[];
  creatives?: any[];
  clientName: string;
  theme: ReportTheme;
  snapshots?: any[];
  allMetrics?: any[];
}

export default function ReportLayoutDefault({ report, metrics, simulations, creatives, clientName, theme, snapshots, allMetrics }: Props) {
  const categoryOrder = ["custo", "alcance", "engajamento", "conversão", "outros"];
  const sortedMetrics = [...metrics].sort((a, b) => {
    const catA = categoryOrder.indexOf(a.metric_category || "outros");
    const catB = categoryOrder.indexOf(b.metric_category || "outros");
    return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
  });

  // Show ALL metrics as hero cards - prioritize important ones first
  const priorityKeys = ["spend", "reach", "unique_outbound_clicks", "cpm", "results", "messages_started", "cost_per_message", "conversation_rate", "creative_quality_ctr", "cost_per_result", "ctr", "outbound_ctr_unique", "link_clicks", "clicks_all", "leads", "purchases", "instagram_followers", "instagram_profile_visits", "post_comments", "frequency"];
  // Suppress CPC from hero cards (still shown in table)
  const suppressedFromCards = new Set(["cpc"]);
  const heroMetrics = [
    ...priorityKeys.map(k => sortedMetrics.find(m => m.metric_key === k)).filter(Boolean),
    ...sortedMetrics.filter(m => !priorityKeys.includes(m.metric_key)),
  ].filter((m, i, arr) => arr.findIndex(x => x.metric_key === m.metric_key) === i)
   .filter((m: any) => !suppressedFromCards.has(m.metric_key));
  const remainingMetrics: any[] = [];

  const chartMetrics = metrics.filter(m =>
    (["link_clicks", "clicks_all", "unique_outbound_clicks", "results", "messages_started", "leads", "purchases"].includes(m.metric_key) ||
    (!m.metric_key.includes("cost") && !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !m.metric_key.includes("ctr") && !m.metric_key.includes("frequency") && !["reach", "impressions"].includes(m.metric_key) && m.metric_value > 10))
  );

  const chartData = chartMetrics.slice(0, 6).map((m, i) => ({
    name: m.metric_label,
    value: m.metric_value,
    fill: getMetricChartColor(m.metric_key, theme.chartColors[i % theme.chartColors.length]),
  })).filter(d => d.value > 0);

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      {/* Header removed — handled by ReportProfessionalHeader */}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 space-y-10 min-w-0">
            {/* Hero metric cards with secondary metrics */}
            {heroMetrics.length > 0 && (
              <section>
                <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {heroMetrics.map((m: any, idx: number) => {
                    const IconComp = getReportIcon(m.metric_key, m.metric_icon);
                    const color = m.metric_color || theme.chartColors[idx % theme.chartColors.length];
                    const secondaries = getSecondaryMetrics(m.metric_key, metrics, report, snapshots, allMetrics);
                    return (
                      <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
                      <div key={m.metric_key} className="rounded-xl p-5 border transition-all animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col"
                        style={{ background: theme.cardBg, borderColor: theme.cardBorder, animationDelay: `${idx * 80}ms`, animationFillMode: "both" }}>
                        <div className="flex items-center justify-between mb-3">
                          <IconComp className="h-8 w-8" style={{ color }} />
                          {report.goal_reference > 0 && m.metric_key === "results" && (
                            <ReportComparisonBadge currentValue={m.metric_value} referenceValue={report.goal_reference} theme={theme} />
                          )}
                        </div>
                        <p className="text-2xl md:text-3xl font-bold" style={{ color: theme.text }}>
                          {formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}
                        </p>
                        <p className="text-sm font-medium mt-1" style={{ color: theme.text }}>{m.metric_label}</p>
                        {getMetricDescription(m.metric_key) && (
                          <p className="text-xs mt-1 leading-relaxed flex-1" style={{ color: theme.textMuted }}>{getMetricDescription(m.metric_key)}</p>
                        )}
                        {/* Secondary metrics */}
                        {secondaries.length > 0 && (
                          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: `1px solid ${theme.cardBorder}` }}>
                            {secondaries.map((s, si) => (
                              <div key={si} className="flex items-center justify-between text-[10px]">
                                <span style={{ color: theme.textMuted }}>{s.label}</span>
                                <span className="font-mono font-semibold" style={{ color: theme.text }}>{s.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      </ReportTooltipWrapper>
                    );
                  })}
                </div>
              </section>
            )}

            {chartData.length > 0 && (
              <section className="rounded-xl p-4 md:p-6 border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: theme.text }}>📊 Desempenho Geral</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-52 md:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} />
                        <XAxis dataKey="name" tick={{ fill: theme.textMuted, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: theme.textMuted, fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                        <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                        {report.goal_target > 0 && (
                          <ReferenceLine y={report.goal_target} stroke={theme.accent} strokeDasharray="6 3" strokeWidth={2}
                            label={{ value: `Meta: ${formatNumber(report.goal_target)}`, fill: theme.accent, fontSize: 11, position: "insideTopRight" }} />
                        )}
                        {report.goal_reference > 0 && (
                          <ReferenceLine y={report.goal_reference} stroke={theme.textMuted} strokeDasharray="3 3" strokeWidth={1}
                            label={{ value: `Ref: ${formatNumber(report.goal_reference)}`, fill: theme.textMuted, fontSize: 10, position: "insideBottomRight" }} />
                        )}
                        <Bar name="Valor" dataKey="value" radius={[6, 6, 0, 0]}>
                          {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col h-52 md:h-64 overflow-hidden">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} name="Valor" dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={{ strokeWidth: 1 }}>
                            {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom legend below — inside the card */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2 pb-1 flex-shrink-0">
                      {chartData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                          <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: theme.textMuted }}>{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Cost Summary */}
            <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />

            {/* Strategy section with auto-context */}
            <ReportStrategySection report={report} metrics={metrics} theme={theme} />

            {/* Creatives */}
            {creatives && creatives.length > 0 && (
              <ReportCreativesSection creatives={creatives} theme={theme} />
            )}

            {/* Budget Pro */}
            <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

            {/* Advanced metrics table */}
            <ReportAdvancedTable metrics={metrics} theme={theme} goalReference={report.goal_reference} />

            {simulations.length > 0 && (
              <section className="rounded-xl p-6 border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
                <h2 className="text-lg font-bold mb-1" style={{ color: theme.text }}>E se você investir mais? 📈</h2>
                <p className="text-xs mb-4" style={{ color: theme.textMuted }}>Simulações baseadas no desempenho atual.</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {simulations.map((sim: any, i: number) => (
                    <div key={i} className="rounded-xl p-5 border text-center" style={{ borderColor: theme.accent + "60", background: i === 2 ? theme.accent + "15" : "transparent" }}>
                      <p className="text-xs font-medium mb-2" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Intermediário" : "Ideal"}</p>
                      <p className="text-2xl font-bold mb-3" style={{ color: theme.accent }}>{formatCurrency(sim.simulated_investment)}</p>
                      <div className="space-y-2 text-left">
                        <div className="flex justify-between text-sm"><span style={{ color: theme.textMuted }}>Alcance</span><span className="font-semibold">{formatNumber(sim.projected_reach)}</span></div>
                        <div className="flex justify-between text-sm"><span style={{ color: theme.textMuted }}>Cliques</span><span className="font-semibold">{formatNumber(sim.projected_clicks)}</span></div>
                        <div className="flex justify-between text-sm"><span style={{ color: theme.textMuted }}>Mensagens</span><span className="font-semibold">{formatNumber(sim.projected_messages)}</span></div>
                        <div className="flex justify-between text-sm"><span style={{ color: theme.textMuted }}>Leads</span><span className="font-semibold">{formatNumber(sim.projected_leads)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {report.investment_tip && (
              <section className="rounded-xl p-6 text-center" style={{ background: theme.gradient }}>
                <Trophy className="h-8 w-8 mx-auto mb-3" style={{ color: theme.accentFg }} />
                <h2 className="text-lg font-bold mb-2" style={{ color: theme.accentFg }}>Dica do Especialista</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap max-w-lg mx-auto" style={{ color: theme.accentFg + "dd" }}>{report.investment_tip}</p>
                {report.contact_whatsapp && (
                  <a href={`https://wa.me/${report.contact_whatsapp}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105"
                    style={{ background: "#25d366", color: "#ffffff" }}>
                    <WhatsAppIcon className="h-4 w-4" /> Falar com a agência
                  </a>
                )}
              </section>
            )}

            <footer className="text-center py-8 border-t" style={{ borderColor: theme.cardBorder }}>
              <p className="text-xs" style={{ color: theme.textMuted }}>Relatório gerado em {new Date(report.created_at).toLocaleDateString("pt-BR")}</p>
              {clientName && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Este relatório é confidencial e exclusivo para {clientName}</p>}
            </footer>
          </div>

          {/* Sidebar - hidden on mobile */}
          {remainingMetrics.length > 0 && (
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 self-start">
              <ReportMetricsSidebar metrics={remainingMetrics} theme={theme} />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
