// @ts-nocheck
"use client";
/**
 * ReportDateFilter — Lets the client pick a date range.
 * Always shows basic options. Shows advanced options only when snapshot data exists.
 */
import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { type ReportTheme } from "@/lv/lib/reportThemes";

export interface DateFilterOption {
  id: string;
  label: string;
  days: number; // 0 = "all"
}

const ALL_OPTIONS: DateFilterOption[] = [
  { id: "today", label: "Hoje", days: 1 },
  { id: "yesterday", label: "Ontem", days: 2 },
  { id: "7d", label: "Últimos 7 Dias", days: 7 },
  { id: "14d", label: "Últimos 14 Dias", days: 14 },
  { id: "month", label: "Este Mês", days: 30 },
  { id: "lastMonth", label: "Mês Passado", days: 31 },
  { id: "3m", label: "Últimos 3 Meses", days: 90 },
  { id: "6m", label: "Últimos 6 Meses", days: 180 },
  { id: "1y", label: "Último Ano", days: 365 },
];

interface Props {
  snapshots: any[];
  theme: ReportTheme;
  selected: string;
  onSelect: (id: string) => void;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Given snapshots, compute the total date span and return only the
 * filter options that fit within the available data.
 */
export function getAvailableOptions(snapshots: any[], periodStart?: string, periodEnd?: string): DateFilterOption[] {
  if (!snapshots || snapshots.length === 0) {
    return [];
  }

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const allDates = new Set<string>();
  const dailyDates = new Set<string>();
  for (const s of snapshots) {
    const ps = (s.period_start as string)?.trim();
    const pe = (s.period_end as string)?.trim();
    if (ps) allDates.add(ps);
    if (pe) allDates.add(pe);
    if (ps && pe && ps === pe) dailyDates.add(ps);
  }

  if (periodStart) allDates.add(periodStart.trim());
  if (periodEnd) allDates.add(periodEnd.trim());

  const sortedDates = [...allDates].sort();
  if (sortedDates.length === 0) return [];
  const sortedDailyDates = [...dailyDates].sort();
  const hasDailyRows = sortedDailyDates.length > 0;

  // Review: Always use the absolute max date available as anchor
  const maxDateStr = sortedDates[sortedDates.length - 1];
  const parseLocal = (s: string) => { 
    const [y, m, d] = s.split('-').map(Number); 
    return new Date(y, m - 1, d); 
  };
  
  const anchorDateStr = maxDateStr;
  const anchorDate = parseLocal(anchorDateStr);
  
  const yesterdayDate = new Date(anchorDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toYMD(yesterdayDate);

  const minDateStr = sortedDates[0];
  const spanDays = Math.ceil((anchorDate.getTime() - parseLocal(minDateStr).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return ALL_OPTIONS.filter(opt => {
    // Review: If we have daily data, check if the specific day exists. 
    // If we only have summary data, we might show the option if the period allows, 
    // but the actual filter logic (filterMetricsByPeriod) is strict about daily rows for today/yesterday.
    if (opt.id === "today") return hasDailyRows && dailyDates.has(anchorDateStr);
    if (opt.id === "yesterday") return hasDailyRows && dailyDates.has(yesterdayStr);
    
    if (opt.id === "lastMonth") {
      if (!hasDailyRows) return false;
      const prevMonthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1);
      const prevMonthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 0);
      const pmStartStr = toYMD(prevMonthStart);
      const pmEndStr = toYMD(prevMonthEnd);
      return sortedDailyDates.some(date => date >= pmStartStr && date <= pmEndStr);
    }
    
    // For range filters, show if the span of data is large enough
    return opt.days <= spanDays;
  });
}

export function getDateRangeForFilter(snapshots: any[], selectedId: string): { startStr: string; endStr: string } | null {
  if (!selectedId || selectedId === "all" || !snapshots || snapshots.length === 0) return null;

  const opt = ALL_OPTIONS.find(o => o.id === selectedId);
  if (!opt) return null;

  const allDates = new Set<string>();
  for (const s of snapshots) {
    const ps = (s.period_start as string)?.trim();
    const pe = (s.period_end as string)?.trim();
    if (ps) allDates.add(ps);
    if (pe) allDates.add(pe);
  }
  const sortedDates = [...allDates].sort();
  const maxDateStr = sortedDates[sortedDates.length - 1];
  if (!maxDateStr) return null;

  const parseLocal = (str: string) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); };
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const anchorDate = parseLocal(maxDateStr);

  switch (selectedId) {
    case "today":
      return { startStr: maxDateStr, endStr: maxDateStr };
    case "yesterday": {
      const y = new Date(anchorDate);
      y.setDate(y.getDate() - 1);
      const day = toYMD(y);
      return { startStr: day, endStr: day };
    }
    case "lastMonth": {
      const lmStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1);
      const lmEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 0);
      return { startStr: toYMD(lmStart), endStr: toYMD(lmEnd) };
    }
    case "month": {
      const mStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      return { startStr: toYMD(mStart), endStr: maxDateStr };
    }
    default: {
      const s = new Date(anchorDate);
      s.setDate(s.getDate() - (opt.days - 1));
      return { startStr: toYMD(s), endStr: maxDateStr };
    }
  }
}

export function filterSnapshotsByPeriod(snapshots: any[], selectedId: string): any[] {
  if (!selectedId || selectedId === "all" || !snapshots || snapshots.length === 0) return snapshots || [];

  const range = getDateRangeForFilter(snapshots, selectedId);
  if (!range) return [];

  const { startStr, endStr } = range;
  const dailySnapshots = snapshots.filter(s => {
    const ps = (s.period_start as string)?.trim();
    const pe = (s.period_end as string)?.trim();
    return ps && pe && ps === pe;
  });

  const source = dailySnapshots.length > 0 ? dailySnapshots : snapshots;

  return source.filter(s => {
    const ps = (s.period_start as string)?.trim();
    const pe = (s.period_end as string)?.trim();
    if (!ps || !pe) return false;
    if (dailySnapshots.length > 0) return ps >= startStr && ps <= endStr;
    return ps >= startStr && pe <= endStr;
  });
}

/**
 * Filter snapshot metrics to only include data within the selected period.
 */
export function filterMetricsByPeriod(
  snapshots: any[],
  allMetrics: any[],
  selectedId: string
): any[] {
  if (!selectedId || selectedId === "all") {
    return allMetrics;
  }

  if (!snapshots || snapshots.length === 0) {
    return allMetrics.map(m => ({ ...m, metric_value: 0 }));
  }

  const range = getDateRangeForFilter(snapshots, selectedId);
  if (!range) return allMetrics.map(m => ({ ...m, metric_value: 0 }));

  // CRITICAL: For "today" and "yesterday", ONLY accept exact daily rows (start === end === target date).
  // NEVER fall back to summary/aggregate rows — they cover the entire period and would show "all time" data.
  const isExactDayFilter = selectedId === "today" || selectedId === "yesterday";

  const dailySnapshots = snapshots.filter(s => {
    const ps = (s.period_start as string)?.trim();
    const pe = (s.period_end as string)?.trim();
    // Review: Always filter strictly by exact daily rows (start === end) for range checks
    if (ps !== pe) return false;
    return ps >= range.startStr && ps <= range.endStr;
  });

  // For exact-day filters, NEVER fall back to range-overlap — return empty if no daily match
  let matchingSnapshots: any[];
  if (isExactDayFilter) {
    matchingSnapshots = dailySnapshots;
  } else {
    matchingSnapshots = dailySnapshots.length > 0
      ? dailySnapshots
      : snapshots.filter(s => {
          const ps = (s.period_start as string)?.trim();
          const pe = (s.period_end as string)?.trim();
          // Still exclude summary rows in fallback
          if (ps !== pe) return false;
          return pe >= range.startStr && ps <= range.endStr;
        });
  }

  if (matchingSnapshots.length === 0) {
    return allMetrics.map(m => ({ ...m, metric_value: 0 }));
  }

  const metricMap: Record<string, { sum: number; count: number; meta: any }> = {};

  for (const snap of matchingSnapshots) {
    const snapMetrics = Array.isArray(snap.metrics) ? snap.metrics : [];
    for (const m of snapMetrics) {
      if (!m.metric_key) continue;
      if (!metricMap[m.metric_key]) {
        metricMap[m.metric_key] = { sum: 0, count: 0, meta: m };
      }
      metricMap[m.metric_key].sum += (m.metric_value || 0);
      metricMap[m.metric_key].count += 1;
    }
  }

  const AVG_KEYS = new Set([
    "cpm", "cpc", "cpc_all", "ctr", "ctr_all", "ctr_unique", "ctr_unique_all",
    "frequency", "cost_per_result", "cost_per_message", "cost_per_lead",
    "cost_per_purchase", "cost_per_landing_page_view", "cost_per_thruplay",
    "cost_per_content_view", "cost_per_app_install", "cost_per_outbound_click",
    "cost_per_new_message_contact", "cost_per_unique_link_click", "cost_per_unique_click_all",
    "cost_per_checkout", "cost_per_registration", "cost_per_add_to_cart",
    "cost_per_1k_accounts_reached", "avg_purchase_value", "roas", "result_roas",
    "result_rate", "outbound_ctr", "outbound_ctr_unique",
    "conversation_rate", "creative_quality_ctr", "instagram_profile_quality", "creative_pct",
  ]);

  const result = Object.entries(metricMap).map(([key, { sum, count, meta }]) => ({
    ...meta,
    metric_key: key,
    metric_value: Math.round((AVG_KEYS.has(key) ? (count > 0 ? sum / count : 0) : sum) * 100) / 100,
  }));

  const resultKeys = new Set(result.map(r => r.metric_key));
  for (const m of allMetrics) {
    if (!resultKeys.has(m.metric_key)) {
      result.push({ ...m, metric_value: 0 });
    }
  }

  return result;
}

export default function ReportDateFilter({ snapshots, theme, selected, onSelect, periodStart, periodEnd }: Props) {
  const [open, setOpen] = useState(false);
  const availableOptions = useMemo(
    () => getAvailableOptions(snapshots, periodStart, periodEnd),
    [snapshots, periodStart, periodEnd]
  );

  useEffect(() => {
    if (selected !== "all" && !availableOptions.some((opt) => opt.id === selected)) {
      onSelect("all");
    }
  }, [availableOptions, onSelect, selected]);

  // Don't render if no snapshots exist (no data to filter)
  if (!snapshots || snapshots.length === 0) {
    return null;
  }

  const currentLabel = selected === "all"
    ? "Todo o Período"
    : availableOptions.find(o => o.id === selected)?.label || "Todo o Período";

  return (
    <div className="relative inline-block print:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          color: theme.text,
        }}
      >
        <Calendar className="w-4 h-4" style={{ color: theme.accent }} />
        {currentLabel}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: theme.textMuted }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-xl border overflow-hidden min-w-[200px]"
            style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
          >
            <button
              onClick={() => { onSelect("all"); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:brightness-125"
              style={{
                color: selected === "all" ? theme.accent : theme.text,
                background: selected === "all" ? theme.accent + "15" : "transparent",
                fontWeight: selected === "all" ? 600 : 400,
              }}
            >
              📅 Todo o Período
            </button>
            {availableOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onSelect(opt.id); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:brightness-125"
                style={{
                  color: selected === opt.id ? theme.accent : theme.text,
                  background: selected === opt.id ? theme.accent + "15" : "transparent",
                  fontWeight: selected === opt.id ? 600 : 400,
                  borderTop: `1px solid ${theme.cardBorder}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
