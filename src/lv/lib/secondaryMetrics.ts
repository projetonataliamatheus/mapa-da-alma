// @ts-nocheck
/**
 * Helper to compute secondary/sub-metrics for cards.
 * Calculates min, max, projected monthly values, etc.
 */

import { formatCurrency, formatNumber } from "@/lv/lib/metaAdsParser";

export interface SecondaryMetric {
  label: string;
  value: string;
  icon?: string;
}

/**
 * Given the metric key and all metrics, compute secondary indicators
 * that appear below the main card value.
 */
export function getSecondaryMetrics(metricKey: string, metrics: any[], report: any, snapshots?: any[], allMetrics?: any[]): SecondaryMetric[] {
  const secondaries: SecondaryMetric[] = [];
  const m = metrics.find(x => x.metric_key === metricKey);
  if (!m) return secondaries;

  // For daily averages, ALWAYS use the TOTAL (unfiltered) values divided by total active days
  // regardless of any date filter applied. Use allMetrics if provided, otherwise fall back to metrics.
  const totalMetrics = allMetrics && allMetrics.length > 0 ? allMetrics : metrics;
  const totalM = totalMetrics.find((x: any) => x.metric_key === metricKey) || m;

  // Calculate days in period for monthly projection
  let daysInPeriod = 30;
  if (report?.period_start && report?.period_end) {
    const start = new Date(report.period_start);
    const end = new Date(report.period_end);
    daysInPeriod = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  // Count active ad days from snapshots (days with spend > 0)
  let activeDays = 0;
  if (snapshots && snapshots.length > 0) {
    activeDays = snapshots.filter(s => {
      const sm = Array.isArray(s.metrics) ? s.metrics : [];
      return sm.some((mx: any) => mx.metric_key === "spend" && mx.metric_value > 0);
    }).length;
  }
  if (activeDays === 0) activeDays = daysInPeriod;

  // Daily averages always use TOTAL values / active days (never changes with filters)
  const dailyRate = totalM.metric_value / activeDays;
  const dailyRateSpend = totalM.metric_value / activeDays;
  const monthlyProjection = dailyRateSpend * 30;

  // CPM calculation: Total Spend / Reach * 1000 (always use total values)
  const totalSpend = totalMetrics.find((x: any) => x.metric_key === "spend");
  const totalReach = totalMetrics.find((x: any) => x.metric_key === "reach");
  const calculatedCPM = (totalSpend?.metric_value && totalReach?.metric_value && totalReach.metric_value > 0)
    ? (totalSpend.metric_value / totalReach.metric_value) * 1000
    : null;

  switch (metricKey) {
    case "spend": {
      const impressions = metrics.find(x => x.metric_key === "impressions");
      if (impressions) secondaries.push({ label: "Impressões", value: formatNumber(impressions.metric_value) });
      // Projeção mensal: total spend / active days * 30
      const totalSpendVal = totalM.metric_value;
      const projectionDaily = totalSpendVal / activeDays;
      secondaries.push({ label: "Projeção mensal", value: formatCurrency(projectionDaily * 30) });
      break;
    }
    case "results": {
      const goalTarget = report?.goal_target;
      const goalRef = report?.goal_reference;
      if (goalRef > 0) secondaries.push({ label: "Referência", value: formatNumber(goalRef) });
      if (goalTarget > 0) secondaries.push({ label: "Meta", value: formatNumber(goalTarget) });
      break;
    }
    case "cost_per_result": {
      const costMetrics = metrics.filter(x =>
        x.metric_key.includes("cost") && x.metric_value > 0 && x.metric_key !== "spend"
      );
      if (costMetrics.length > 1) {
        const values = costMetrics.map(x => x.metric_value);
        secondaries.push({ label: "Mínimo", value: formatCurrency(Math.min(...values)) });
        secondaries.push({ label: "Máximo", value: formatCurrency(Math.max(...values)) });
      }
      break;
    }
    case "reach": {
      const freq = metrics.find(x => x.metric_key === "frequency");
      if (freq) secondaries.push({ label: "Frequência", value: freq.metric_value.toFixed(2) });
      // Alcance/dia: total reach / active days (always uses total, never changes with filters)
      const reachDailyRate = totalM.metric_value / activeDays;
      secondaries.push({ label: "Alcance/dia", value: formatNumber(Math.round(reachDailyRate)) });
      break;
    }
    case "cpm": {
      // CPM is always manually calculated (spend/reach*1000), no secondary needed
      break;
    }
    case "unique_outbound_clicks": {
      const clicksDailyRate2 = totalM.metric_value / activeDays;
      secondaries.push({ label: "Cliques/dia", value: formatNumber(Math.round(clicksDailyRate2)) });
      break;
    }
    case "link_clicks":
    case "clicks_all": {
      const cpc = metrics.find(x => x.metric_key === "cpc" || x.metric_key === "cpc_all");
      if (cpc) secondaries.push({ label: "CPC", value: formatCurrency(cpc.metric_value) });
      const clicksDailyRate = totalM.metric_value / activeDays;
      secondaries.push({ label: "Cliques/dia", value: formatNumber(Math.round(clicksDailyRate)) });
      break;
    }
    case "messages_started": {
      const costMsg = metrics.find(x => x.metric_key === "cost_per_message");
      if (costMsg) secondaries.push({ label: "C/Mensagem", value: formatCurrency(costMsg.metric_value) });
      // Msgs/dia: total messages / active days (always uses total, never changes with filters)
      const msgsDailyRate = totalM.metric_value / activeDays;
      secondaries.push({ label: "Msgs/dia", value: formatNumber(Math.round(msgsDailyRate)) });
      break;
    }
    default:
      break;
  }

  return secondaries.slice(0, 3); // max 3 secondary items
}
