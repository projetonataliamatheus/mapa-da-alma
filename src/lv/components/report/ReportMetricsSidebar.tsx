// @ts-nocheck
"use client";
/**
 * Painel lateral de métricas detalhadas — cards compactos empilhados
 * com valores em destaque e tipografia monospace.
 * Inspirado no GT Dash Pro.
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatMetricValue } from "@/lv/lib/metaAdsParser";
import { getReportIcon } from "./reportIconMap";

// Preferred order for sidebar display
const SIDEBAR_ORDER = [
  "impressions", "ctr", "ctr_all", "cpc", "cpc_all",
  "link_clicks", "clicks_all", "landing_page_views", "cost_per_landing_page_view",
  "messages_started", "cost_per_message",
  "leads", "cost_per_lead",
  "checkouts_initiated", "cost_per_checkout",
  "purchases", "cost_per_purchase",
  "results", "cost_per_result",
  "reach", "frequency", "cpm", "spend",
];

interface Props {
  metrics: any[];
  theme: ReportTheme;
  isDark?: boolean;
  maxItems?: number;
}

export default function ReportMetricsSidebar({ metrics, theme, isDark = true, maxItems = 14 }: Props) {
  // Sort metrics by preferred order, then alphabetically
  const sorted = [...metrics].sort((a, b) => {
    const idxA = SIDEBAR_ORDER.indexOf(a.metric_key);
    const idxB = SIDEBAR_ORDER.indexOf(b.metric_key);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.metric_label.localeCompare(b.metric_label);
  }).slice(0, maxItems);

  const bgCard = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  const mutedColor = isDark ? "#64748b" : "#94a3b8";

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: mutedColor }}>
        Métricas Detalhadas
      </p>
      {sorted.map((m) => {
        const IconComp = getReportIcon(m.metric_key, m.metric_icon);
        const color = m.metric_color || theme.accent;
        return (
          <div
            key={m.metric_key}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:brightness-110"
            style={{ background: bgCard }}
          >
            <IconComp className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] truncate" style={{ color: mutedColor }}>
                {m.metric_label}
              </p>
            </div>
            <p className="text-sm font-bold font-mono tabular-nums flex-shrink-0" style={{ color: textColor }}>
              {formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
