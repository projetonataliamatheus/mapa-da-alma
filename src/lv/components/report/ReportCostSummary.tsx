// @ts-nocheck
"use client";
/**
 * Compact "Custos Médios" summary strip for all report layouts.
 * Shows total invested + key cost/rate metrics with full labels (no abbreviations).
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatCurrency, formatPercent, getMetricSimpleTooltip } from "@/lv/lib/metaAdsParser";
import ReportTooltipWrapper from "./ReportTooltipWrapper";

const FULL_LABELS: Record<string, string> = {
  spend: "Valor Total Investido",
  cpm: "Custo por 1.000 Impressões",
  cost_per_result: "Custo por Resultado",
  cpc: "CPC - Custo Por Clique",
  cpc_all: "Custo por Clique (Todos)",
  cost_per_message: "Custo por Mensagem",
  cost_per_lead: "Custo por Lead",
  cost_per_purchase: "Custo por Compra",
  ctr: "Taxa de Cliques no Link",
  ctr_all: "Taxa de Cliques (Todos)",
  frequency: "Frequência Média",
  conversation_rate: "Aproveitamento de Conversas",
  creative_quality_ctr: "Qualidade do Criativo",
};

// Priority order for display
const COST_KEYS_ORDER = [
  "spend", "cpm", "cpc", "cpc_all",
  "cost_per_message", "cost_per_lead", "cost_per_purchase",
];

const DECIMAL_PERCENT_KEYS = new Set(["conversation_rate", "creative_quality_ctr", "instagram_profile_quality"]);

interface Props {
  metrics: any[];
  theme: ReportTheme;
  periodDays?: number;
  periodStart?: string;
  periodEnd?: string;
  snapshots?: any[];
}

export default function ReportCostSummary({ metrics: rawMetrics, theme, periodDays, periodStart, periodEnd, snapshots }: Props) {
  // Override CPM with manual calculation: Total Spend / Reach * 1000
  const spendForCPM = rawMetrics.find(m => m.metric_key === "spend")?.metric_value || 0;
  const reachForCPM = rawMetrics.find(m => m.metric_key === "reach")?.metric_value || 0;
  const manualCPM = (spendForCPM > 0 && reachForCPM > 0) ? (spendForCPM / reachForCPM) * 1000 : null;
  const metrics = rawMetrics.map(m => m.metric_key === "cpm" && manualCPM !== null ? { ...m, metric_value: manualCPM } : m);

  const costItems = COST_KEYS_ORDER
    .map(k => metrics.find(m => m.metric_key === k))
    .filter(Boolean);

  if (costItems.length === 0) return null;

  // Count days with active ads from snapshots (spend > 0)
  let activeDays = 0;
  if (snapshots && snapshots.length > 0) {
    activeDays = snapshots.filter(s => {
      const sm = Array.isArray(s.metrics) ? s.metrics : [];
      return sm.some((m: any) => m.metric_key === "spend" && m.metric_value > 0);
    }).length;
  }

  // Fallback: calculate from period range if no snapshots
  if (activeDays === 0 && periodStart && periodEnd) {
    const [sy, sm, sd] = periodStart.split('-').map(Number);
    const [ey, em, ed] = periodEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) activeDays = diff;
  }

  if (activeDays === 0 && periodDays && periodDays > 0) activeDays = periodDays;

  const spendMetric = metrics.find(m => m.metric_key === "spend");
  const totalSpend = spendMetric?.metric_value || 0;
  const dailyAvg = activeDays > 0 ? totalSpend / activeDays : null;

  return (
    <section
      className="rounded-xl p-4 sm:p-5 border-2"
      style={{ background: theme.cardBg, borderColor: "#22c55e" }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: "#22c55e" }}
      >
        💰 Custos Médios
      </h3>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {costItems.map((m: any, idx: number) => {
          const label = FULL_LABELS[m.metric_key] || m.metric_label;
          let displayValue: string;
          if (DECIMAL_PERCENT_KEYS.has(m.metric_key)) {
            displayValue = formatPercent(m.metric_value * 100);
          } else if (m.metric_key === "frequency") {
            displayValue = m.metric_value.toFixed(2);
          } else {
            displayValue = formatCurrency(m.metric_value);
          }

          const costCard = (
            <ReportTooltipWrapper key={m.metric_key} tooltip={getMetricSimpleTooltip(m.metric_key)} position="top">
            <div className="text-center">
              <p className="text-lg md:text-xl font-bold" style={{ color: "#22c55e" }}>
                {displayValue}
              </p>
              <p className="text-[11px] mt-1 leading-tight" style={{ color: theme.textMuted }}>
                {label}
              </p>
            </div>
            </ReportTooltipWrapper>
          );

          // Insert dailyAvg right after the spend card
          if (m.metric_key === "spend" && dailyAvg !== null) {
            return [
              costCard,
              <ReportTooltipWrapper key="daily-avg" tooltip={`Valor total investido dividido pelos ${activeDays} dias com anúncios ativos`} position="top">
              <div className="text-center">
                <p className="text-lg md:text-xl font-bold" style={{ color: "#22c55e" }}>
                  {formatCurrency(dailyAvg)}
                </p>
                <p className="text-[11px] mt-1 leading-tight" style={{ color: theme.textMuted }}>
                  Valor Médio Investimento Diário
                </p>
              </div>
              </ReportTooltipWrapper>
            ];
          }

          return costCard;
        })}
      </div>
    </section>
  );
}
