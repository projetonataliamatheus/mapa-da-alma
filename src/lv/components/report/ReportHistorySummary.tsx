// @ts-nocheck
"use client";
/**
 * ReportHistorySummary — Card com resumo histórico por período.
 * Mostra linhas: Hoje, 7 dias, 14 dias, Este Mês, Mês Passado, meses anteriores.
 * Colunas: Valor Investido, Cliques de Saída, Conversas WhatsApp, Visitas Perfil Instagram, Seguidores Instagram.
 */
import { useMemo } from "react";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { Calendar, TrendingUp } from "lucide-react";

interface Snapshot {
  id: string;
  period_start: string;
  period_end: string;
  upload_label: string;
  metrics: any[];
  created_at: string;
}

interface MetricRow {
  metric_key: string;
  metric_value: number;
  [key: string]: any;
}

interface Props {
  snapshots: Snapshot[];
  theme: ReportTheme;
  metrics?: MetricRow[];
}

const COLUMNS = [
  { key: "spend", aliases: ["amount_spent"], label: "Valor Investido", format: "currency" },
  { key: "unique_outbound_clicks", aliases: ["outbound_clicks", "unique_link_clicks", "link_clicks"], label: "Cliques de Saída", format: "number" },
  { key: "messages_started", aliases: ["messaging_conversations_started"], label: "Conversas WhatsApp", format: "number" },
  { key: "instagram_profile_visits", aliases: ["profile_visits"], label: "Visitas Perfil", format: "number" },
  { key: "instagram_followers", aliases: ["instagram_follows"], label: "Seguidores", format: "number" },
];

const AVG_KEYS = new Set(["cpm", "cpc", "ctr", "frequency", "cost_per_result", "cost_per_message"]);

function parseLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function aggregateSnapshots(snapshots: Snapshot[], startDate: Date, endDate: Date) {
  const dailySnapshots = snapshots.filter(s => s.period_start === s.period_end);
  const sourceSnapshots = dailySnapshots.length > 0 ? dailySnapshots : snapshots;

  const matching = sourceSnapshots.filter(s => {
    const sStart = parseLocal(s.period_start);
    const sEnd = parseLocal(s.period_end);
    return sEnd >= startDate && sStart <= endDate;
  });

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const snap of matching) {
    const ms = Array.isArray(snap.metrics) ? snap.metrics : [];
    for (const m of ms) {
      const key = m.metric_key || m.key;
      if (!key) continue;
      const val = m.metric_value ?? m.value ?? 0;
      sums[key] = (sums[key] || 0) + Number(val);
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const result: Record<string, number> = {};
  for (const col of COLUMNS) {
    const allKeys = [col.key, ...(col.aliases || [])];
    let val = 0;
    for (const k of allKeys) {
      if (sums[k] !== undefined) {
        val += AVG_KEYS.has(k) ? Math.round((sums[k] / counts[k]) * 100) / 100 : Math.round(sums[k] * 100) / 100;
      }
    }
    result[col.key] = val;
  }
  return { data: result, hasData: matching.length > 0 };
}

function formatValue(val: number, format: string) {
  if (format === "currency") {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return val.toLocaleString("pt-BR");
}

function buildFallbackFromMetrics(metrics: MetricRow[]) {
  const result: Record<string, number> = {};
  for (const col of COLUMNS) {
    const allKeys = [col.key, ...(col.aliases || [])];
    let val = 0;
    for (const k of allKeys) {
      const found = metrics.find(m => m.metric_key === k);
      if (found) val += Math.round(Number(found.metric_value) * 100) / 100;
    }
    result[col.key] = val;
  }
  return result;
}

export default function ReportHistorySummary({ snapshots, theme, metrics }: Props) {
  const periods = useMemo(() => {
    if (snapshots && snapshots.length > 0) {
      // Use max date from snapshots as anchor (not system date)
      const allDates = snapshots.flatMap(s => [parseLocal(s.period_start), parseLocal(s.period_end)]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      const today = maxDate; // anchor = latest date in data

      // Count total unique days with data (daily snapshots where start === end)
      const uniqueDays = new Set<string>();
      for (const s of snapshots) {
        const ps = (s.period_start as string)?.trim();
        const pe = (s.period_end as string)?.trim();
        if (ps === pe) uniqueDays.add(ps);
      }
      const totalDaysWithData = uniqueDays.size || 1;

      const rows: { label: string; data: Record<string, number>; hasData: boolean }[] = [];

      // Hoje - only if we have data for the anchor date
      const todayAgg = aggregateSnapshots(snapshots, today, today);
      if (todayAgg.hasData) rows.push({ label: "Hoje", ...todayAgg });

      // Ontem
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (yesterday >= minDate) {
        const yesterdayAgg = aggregateSnapshots(snapshots, yesterday, yesterday);
        if (yesterdayAgg.hasData) rows.push({ label: "Ontem", ...yesterdayAgg });
      }

      // Últimos 7 dias - only show if we have at least 3 days of data
      if (totalDaysWithData >= 3) {
        const d7 = new Date(today);
        d7.setDate(d7.getDate() - 6);
        const agg7 = aggregateSnapshots(snapshots, d7, today);
        if (agg7.hasData) rows.push({ label: "Últimos 7 Dias", ...agg7 });
      }

      // Últimos 14 dias - only show if we have at least 14 days span
      if (totalDaysWithData >= 14) {
        const d14 = new Date(today);
        d14.setDate(d14.getDate() - 13);
        const agg14 = aggregateSnapshots(snapshots, d14, today);
        if (agg14.hasData) rows.push({ label: "Últimos 14 Dias", ...agg14 });
      }

      // Este Mês - only if span covers more than current week
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      if (totalDaysWithData >= 7 && monthStart >= minDate) {
        const aggMonth = aggregateSnapshots(snapshots, monthStart, today);
        if (aggMonth.hasData) rows.push({ label: "Este Mês", ...aggMonth });
      }

      // Mês passado e anteriores - only if we have data in previous months
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      let checkMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      let isFirst = true;

      while (checkMonth >= new Date(minDate.getFullYear(), minDate.getMonth(), 1)) {
        const mStart = new Date(checkMonth.getFullYear(), checkMonth.getMonth(), 1);
        const mEnd = new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 0);
        const agg = aggregateSnapshots(snapshots, mStart, mEnd);
        if (agg.hasData) {
          const label = isFirst
            ? "Mês Passado"
            : `${monthNames[checkMonth.getMonth()]} ${checkMonth.getFullYear()}`;
          rows.push({ label, ...agg });
        }
        isFirst = false;
        checkMonth = new Date(checkMonth.getFullYear(), checkMonth.getMonth() - 1, 1);
      }

      return rows;
    }

    if (metrics && metrics.length > 0) {
      const data = buildFallbackFromMetrics(metrics);
      const hasAnyValue = Object.values(data).some(v => v > 0);
      if (hasAnyValue) {
        return [{ label: "Total do Período", data, hasData: true }];
      }
    }

    return [];
  }, [snapshots, metrics]);

  if (periods.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: theme.cardBorder }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.accent + "22" }}>
            <Calendar className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: theme.text }}>Resumo Histórico</h3>
            <p className="text-xs" style={{ color: theme.textMuted }}>Visão geral dos resultados por período</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
                  Período
                </th>
                {COLUMNS.map(col => (
                  <th key={col.key} className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap" style={{ color: theme.textMuted }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < periods.length - 1 ? `1px solid ${theme.cardBorder}` : undefined,
                    background: i % 2 === 0 ? "transparent" : theme.accent + "06",
                  }}
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: theme.text }}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                      {period.label}
                    </div>
                  </td>
                  {COLUMNS.map(col => (
                    <td key={col.key} className="text-right px-4 py-3 font-semibold tabular-nums whitespace-nowrap" style={{ color: period.data[col.key] > 0 ? theme.text : theme.textMuted }}>
                      {formatValue(period.data[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
