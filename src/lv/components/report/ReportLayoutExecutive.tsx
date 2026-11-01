// @ts-nocheck
"use client";
/**
 * Layout "Executive Summary" — gradient KPI cards, horizontal bars, donut
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatMetricValue, getMetricDescription, getMetricChartColor, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import { BarChart2, Trophy } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ReportStrategySection from "./ReportStrategySection";
import ReportCreativesSection from "./ReportCreativesSection";
import ReportBudgetPro from "./ReportBudgetPro";
import ReportCostSummary from "./ReportCostSummary";
import { getReportIcon } from "./reportIconMap";
import ReportTooltipWrapper from "./ReportTooltipWrapper";
const GRADIENT_CARDS = [
  { bg: "linear-gradient(135deg, #6366f1, #818cf8)", border: "#6366f1" },
  { bg: "linear-gradient(135deg, #22c55e, #4ade80)", border: "#22c55e" },
  { bg: "linear-gradient(135deg, #f59e0b, #fbbf24)", border: "#f59e0b" },
  { bg: "linear-gradient(135deg, #ec4899, #f472b6)", border: "#ec4899" },
  { bg: "linear-gradient(135deg, #06b6d4, #22d3ee)", border: "#06b6d4" },
  { bg: "linear-gradient(135deg, #8b5cf6, #a78bfa)", border: "#8b5cf6" },
];

interface Props { report: any; metrics: any[]; simulations: any[]; creatives?: any[]; clientName: string; theme: ReportTheme; snapshots?: any[]; }

export default function ReportLayoutExecutive({ report, metrics, simulations, creatives, clientName, theme, snapshots }: Props) {
  // Show ALL metrics as top cards
  const topMetrics = metrics;
  const allNonCostMetrics = metrics.filter(m => m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr") && !m.metric_key.includes("cpm") && !m.metric_key.includes("cpc") && !m.metric_key.includes("frequency") && !m.metric_key.includes("rate") && !m.metric_key.includes("creative") && !["reach", "impressions"].includes(m.metric_key)).slice(0, 8);
  const barData = allNonCostMetrics.map((m, i) => ({ name: m.metric_label, value: m.metric_value, fill: getMetricChartColor(m.metric_key, GRADIENT_CARDS[i % GRADIENT_CARDS.length].border) }));
  const categoryData = ["alcance", "engajamento", "conversão", "custo"].map((cat, i) => {
    const catMetrics = metrics.filter(m => m.metric_category === cat && m.metric_value > 0 && !m.metric_key.includes("cost") && !m.metric_key.includes("ctr"));
    const total = catMetrics.reduce((acc, m) => acc + m.metric_value, 0);
    return { name: { alcance: "Alcance", engajamento: "Engajamento", conversão: "Conversão", custo: "Investimento" }[cat] || cat, value: total, fill: ["#6366f1", "#22c55e", "#f59e0b", "#ec4899"][i] };
  }).filter(d => d.value > 0);
  const costMetrics = metrics.filter(m => m.metric_category === "custo" || m.metric_key.includes("cost") || m.metric_key.includes("cpm") || m.metric_key.includes("cpc"));

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {topMetrics.length > 0 && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {topMetrics.map((m: any, idx) => {
              const style = GRADIENT_CARDS[idx % GRADIENT_CARDS.length];
              const IconComp = getReportIcon(m.metric_key, m.metric_icon);
              return (
                <ReportTooltipWrapper tooltip={getMetricSimpleTooltip(m.metric_key)} position="bottom">
                <div key={m.metric_key} className="rounded-xl p-5 text-white shadow-xl h-full" style={{ background: style.bg }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center"><IconComp className="h-5 w-5" /></div>
                  </div>
                  <p className="text-3xl font-bold">{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                  <p className="text-sm font-medium opacity-90 mt-1">{m.metric_label}</p>
                  {getMetricDescription(m.metric_key) && <p className="text-[10px] opacity-70 mt-1">{getMetricDescription(m.metric_key)}</p>}
                </div>
                </ReportTooltipWrapper>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {barData.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Volume por Métrica</h3>
              <div style={{ height: Math.max(200, barData.length * 42) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} horizontal={false} />
                    <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 10 }} tickFormatter={v => formatNumber(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: theme.text, fontSize: 10 }} width={120} />
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                    <Bar name="Valor" dataKey="value" radius={[0, 8, 8, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {categoryData.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Distribuição por Categoria</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} name="Valor" dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={45} outerRadius={80} strokeWidth={0}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text }} labelStyle={{ color: theme.text }} itemStyle={{ color: theme.text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {categoryData.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: theme.textMuted }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {costMetrics.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Custos Médios</h3>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {costMetrics.map(m => (
                <div key={m.metric_key} className="rounded-lg p-3 text-center" style={{ background: theme.bgSecondary }}>
                  <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}</p>
                  <p className="text-[10px] mt-1" style={{ color: theme.textMuted }}>{m.metric_label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReportCostSummary metrics={metrics} theme={theme} periodStart={report.period_start} periodEnd={report.period_end} snapshots={snapshots} />
        <ReportStrategySection report={report} metrics={metrics} theme={theme} />
        {creatives && creatives.length > 0 && <ReportCreativesSection creatives={creatives} theme={theme} />}
        <ReportBudgetPro report={report} metrics={metrics} simulations={simulations} theme={theme} snapshots={snapshots} />

        {simulations.length > 0 && (
          <div className="rounded-xl p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.text }}>Cenários de Investimento</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {simulations.map((sim: any, i: number) => (
                <div key={i} className="rounded-xl p-5 text-center" style={{ background: i === 2 ? theme.accent + "15" : theme.bgSecondary, border: `1px solid ${i === 2 ? theme.accent + "66" : theme.cardBorder}` }}>
                  <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{i === 0 ? "Atual" : i === 1 ? "Intermediário" : "Ideal"}</p>
                  <p className="text-2xl font-bold mb-3" style={{ color: GRADIENT_CARDS[i].border }}>{formatCurrency(sim.simulated_investment)}</p>
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
          {clientName && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Confidencial — {clientName}</p>}
        </footer>
      </main>
    </div>
  );
}
