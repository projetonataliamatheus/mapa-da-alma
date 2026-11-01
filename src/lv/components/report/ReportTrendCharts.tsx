// @ts-nocheck
"use client";
/**
 * Trend charts component that shows historical metric data from snapshots.
 * Displays weekly/period comparisons with automatic performance messages.
 */
import { useMemo } from "react";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber, formatCurrency, formatPercent, formatMetricValue } from "@/lv/lib/metaAdsParser";
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Minus, Shield } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Snapshot {
  id: string;
  period_start: string;
  period_end: string;
  upload_label: string;
  metrics: any[];
  created_at: string;
}

interface Props {
  snapshots: Snapshot[];
  theme: ReportTheme;
  currentMetrics: any[];
}

// Performance messages based on trend
function getPerformanceMessage(trend: "up" | "down" | "stable", metricKey: string): string {
  if (trend === "up") {
    const msgs = [
      "📈 Os resultados estão em crescimento! A estratégia está funcionando.",
      "🚀 Excelente desempenho! Os números mostram evolução consistente.",
      "✅ Tendência positiva confirmada. Continue investindo nessa direção!",
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (trend === "down") {
    const msgs = [
      "⚡ O Facebook pode ter passado por atualizações em seus algoritmos recentemente, o que impacta temporariamente o desempenho de todos os anunciantes. Isso é normal e tende a se estabilizar.",
      "🔄 Oscilações são naturais nas plataformas de anúncios. Estamos ajustando a estratégia para otimizar os resultados.",
      "📊 Período de ajuste nos algoritmos da plataforma. Estamos monitorando e fazendo otimizações contínuas para melhorar o desempenho.",
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  return "📊 Resultados estáveis. Mantendo a consistência da campanha.";
}

// Key metrics to track trends for
const TREND_METRICS = [
  { key: "spend", label: "Investimento Total", priority: 1 },
  { key: "reach", label: "Alcance", priority: 2 },
  { key: "unique_outbound_clicks", label: "Cliques de Saída Únicos", priority: 3 },
  { key: "unique_link_clicks", label: "Cliques de Saída Únicos", priority: 3 },
  { key: "messages_started", label: "Conversas no WhatsApp", priority: 4 },
  { key: "instagram_profile_visits", label: "Visitas ao Perfil no Instagram", priority: 5 },
  { key: "instagram_followers", label: "Novos Seguidores no Instagram", priority: 6 },
];

// Map metric keys to Portuguese labels for tooltips
const METRIC_KEY_PT: Record<string, string> = {
  reach: "Alcance",
  unique_outbound_clicks: "Cliques de Saída Únicos",
  unique_link_clicks: "Cliques de Saída Únicos",
  messages_started: "Conversas no WhatsApp",
  instagram_followers: "Novos Seguidores no Instagram",
  instagram_profile_visits: "Visitas ao Perfil no Instagram",
  spend: "Investimento Total",
  spend_daily_avg: "Investimento por Dia",
  results: "Resultados",
  impressions: "Impressões",
  frequency: "Frequência",
  cpm: "CPM (Custo por Mil)",
  cpc: "CPC (Custo por Clique)",
  ctr_unique: "CTR Único",
  cost_per_result: "Custo por Resultado",
  cost_per_message: "Custo por Mensagem",
  saw_ad_whatsapp: "Viu Anúncio e Chamou no WhatsApp",
  creative_pct: "Qualidade do Criativo",
  cost_per_unique_link_click: "Custo por Clique Único",
};

// Get "today" in America/Sao_Paulo as YYYY-MM-DD
function getTodayInSaoPaulo(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

export default function ReportTrendCharts({ snapshots, theme, currentMetrics }: Props) {
  // Sort snapshots by period start date
  const allSorted = useMemo(() => 
    [...snapshots].sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime()),
    [snapshots]
  );

  // Exclude the most recent snapshot if its period_end is today or in the future (São Paulo TZ).
  // Reason: data freshly uploaded in the morning is partial and would falsely show a "drop".
  // The chart represents complete days only (up to yesterday). The headline numbers still use
  // currentMetrics (real totals including today).
  const { sortedSnapshots, excludedToday } = useMemo(() => {
    if (allSorted.length === 0) return { sortedSnapshots: allSorted, excludedToday: false };
    const today = getTodayInSaoPaulo();
    const filtered = allSorted.filter(s => {
      // period_end format expected: YYYY-MM-DD
      const endStr = (s.period_end || "").slice(0, 10);
      return endStr < today; // strictly before today => fully closed day
    });
    // If filtering removed everything, fall back to original (better than empty chart)
    if (filtered.length === 0) return { sortedSnapshots: allSorted, excludedToday: false };
    return { sortedSnapshots: filtered, excludedToday: filtered.length < allSorted.length };
  }, [allSorted]);

  // Build chart data from snapshots
  const chartData = useMemo(() => {
    // Count total days with data for daily average
    const totalDaysWithData = sortedSnapshots.filter(s => {
      const metrics = Array.isArray(s.metrics) ? s.metrics : [];
      return metrics.some(m => m.metric_key === "spend" && m.metric_value > 0);
    }).length || 1;

    return sortedSnapshots.map((snap, i) => {
      const metricsMap: Record<string, number> = {};
      const metrics = Array.isArray(snap.metrics) ? snap.metrics : [];
      for (const m of metrics) {
        metricsMap[m.metric_key] = m.metric_value;
      }
      // Compute running daily average for spend
      const spendSoFar = sortedSnapshots.slice(0, i + 1).reduce((sum, s) => {
        const sm = Array.isArray(s.metrics) ? s.metrics : [];
        const spendM = sm.find((m: any) => m.metric_key === "spend");
        return sum + (spendM?.metric_value || 0);
      }, 0);
      metricsMap["spend_daily_avg"] = Math.round((spendSoFar / (i + 1)) * 100) / 100;

      const startDate = new Date(snap.period_start);
      const endDate = new Date(snap.period_end);
      return {
        name: snap.upload_label || `${startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - ${endDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`,
        ...metricsMap,
        _index: i,
      };
    });
  }, [sortedSnapshots]);

  // Find metrics that exist in snapshots
  const availableTrendMetrics = useMemo(() => {
    return TREND_METRICS.filter(tm => {
      if ((tm as any).computed) {
        // Computed metrics: available if base metric (spend) exists
        return chartData.some(d => d["spend"] !== undefined && d["spend"] > 0);
      }
      return chartData.some(d => d[tm.key] !== undefined && d[tm.key] > 0);
    }).slice(0, 6);
  }, [chartData]);

  // Calculate overall trend for each metric
  const trends = useMemo(() => {
    const result: Record<string, { trend: "up" | "down" | "stable"; change: number; message: string }> = {};
    for (const tm of availableTrendMetrics) {
      const values = chartData.map(d => d[tm.key]).filter(v => v !== undefined && v > 0);
      if (values.length < 2) {
        result[tm.key] = { trend: "stable", change: 0, message: getPerformanceMessage("stable", tm.key) };
        continue;
      }
      const first = values[0];
      const last = values[values.length - 1];
      const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;
      
      // For cost metrics, down is good
      const isInverse = (tm as any).inverse;
      let trend: "up" | "down" | "stable";
      if (Math.abs(changePercent) < 5) trend = "stable";
      else if (changePercent > 0) trend = isInverse ? "down" : "up";
      else trend = isInverse ? "up" : "down";
      
      result[tm.key] = { trend, change: changePercent, message: getPerformanceMessage(trend, tm.key) };
    }
    return result;
  }, [availableTrendMetrics, chartData]);

  if (sortedSnapshots.length === 0 || availableTrendMetrics.length === 0) return null;

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <ArrowUpRight className="h-4 w-4" style={{ color: "#22c55e" }} />;
    if (trend === "down") return <ArrowDownRight className="h-4 w-4" style={{ color: "#f59e0b" }} />;
    return <Minus className="h-4 w-4" style={{ color: theme.textMuted }} />;
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme.accent + "22" }}>
          <TrendingUp className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>Evolução dos Resultados</h2>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            {sortedSnapshots.length} período{sortedSnapshots.length > 1 ? "s" : ""} analisado{sortedSnapshots.length > 1 ? "s" : ""}
            {excludedToday && " • até o dia anterior (dados consolidados)"}
          </p>
        </div>
      </div>

      {/* Trend Cards with Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {availableTrendMetrics.map(tm => {
          const trendInfo = trends[tm.key];
          if (!trendInfo) return null;
          const values = chartData.filter(d => d[tm.key] !== undefined);
          let lastValue = currentMetrics.find(m => m.metric_key === tm.key);
          // For computed metrics, get value from last chart data point
          if (!lastValue && (tm as any).computed && values.length > 0) {
            const lastPoint = values[values.length - 1];
            lastValue = { metric_key: tm.key, metric_label: tm.label, metric_value: lastPoint[tm.key] };
          }

          return (
            <div key={tm.key} className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{tm.label}</p>
                  {lastValue && (
                    <p className="text-xl font-bold mt-1" style={{ color: theme.text }}>
                      {formatMetricValue(lastValue.metric_key, lastValue.metric_label, lastValue.metric_value)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    background: trendInfo.trend === "up" ? "#22c55e22" : trendInfo.trend === "down" ? "#f59e0b22" : theme.bgSecondary,
                    color: trendInfo.trend === "up" ? "#22c55e" : trendInfo.trend === "down" ? "#f59e0b" : theme.textMuted
                  }}>
                  <TrendIcon trend={trendInfo.trend} />
                  {Math.abs(trendInfo.change).toFixed(1)}%
                </div>
              </div>

              {/* Mini Chart */}
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={values}>
                    <defs>
                      <linearGradient id={`gradient-${tm.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.accent} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, color: theme.text, fontSize: 12 }}
                      formatter={(v: any, name: string) => [formatMetricValue(tm.key, tm.label, v), METRIC_KEY_PT[name] || tm.label]}
                    />
                    <Area type="monotone" dataKey={tm.key} stroke={theme.accent} fill={`url(#gradient-${tm.key})`} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Message */}
      {(() => {
        const mainMetric = availableTrendMetrics[0];
        const trendInfo = mainMetric ? trends[mainMetric.key] : null;
        if (!trendInfo) return null;
        return (
          <div className="rounded-xl p-4 text-center" style={{ background: theme.bgSecondary, border: `1px solid ${theme.accent}33` }}>
            <p className="text-sm" style={{ color: theme.text }}>{trendInfo.message}</p>
          </div>
        );
      })()}

    </div>
  );
}

/** Standalone Period Timeline component — rendered separately in ReportPage */
export function ReportPeriodTimeline({ snapshots, theme }: { snapshots: Snapshot[]; theme: ReportTheme }) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime()),
    [snapshots]
  );

  if (sorted.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="rounded-xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" style={{ color: theme.accent }} />
          <p className="text-sm font-semibold" style={{ color: theme.text }}>Histórico de Períodos</p>
        </div>
        {/* Scrollable container — max 3 rows visible */}
        <div className="space-y-2 max-h-[144px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: `${theme.accent}44 transparent` }}>
          {sorted.map((snap, i) => {
            const start = new Date(snap.period_start);
            const end = new Date(snap.period_end);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return (
              <div key={snap.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: i === sorted.length - 1 ? theme.accent + "11" : "transparent" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: i === sorted.length - 1 ? theme.accent : theme.textMuted }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: theme.text }}>
                    {snap.upload_label || `Período ${i + 1}`}
                  </p>
                  <p className="text-[10px]" style={{ color: theme.textMuted }}>
                    {start.toLocaleDateString("pt-BR")} até {end.toLocaleDateString("pt-BR")} • {days} dias
                  </p>
                </div>
                {i === sorted.length - 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: theme.accent + "22", color: theme.accent }}>
                    Atual
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
