// @ts-nocheck
"use client";
/**
 * ReportAdvancedTable — Sortable, filterable metrics table with search,
 * category filter, and visual indicators (progress bars, trend arrows)
 */
import { useState, useMemo } from "react";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatMetricValue, getMetricDescription } from "@/lv/lib/metaAdsParser";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Table2 } from "lucide-react";
import { getReportIcon } from "./reportIconMap";

interface Props {
  metrics: any[];
  theme: ReportTheme;
  goalReference?: number;
}

type SortField = "label" | "value" | "category";
type SortDir = "asc" | "desc";

const CATEGORY_LABELS: Record<string, string> = {
  custo: "💰 Custos",
  alcance: "📡 Alcance",
  engajamento: "🎯 Engajamento",
  conversão: "🏆 Conversões",
  outros: "📊 Outros",
};

export default function ReportAdvancedTable({ metrics, theme, goalReference }: Props) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("category");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(metrics.map(m => m.metric_category || "outros"));
    return Array.from(cats);
  }, [metrics]);

  const maxValue = useMemo(() => Math.max(...metrics.map(m => m.metric_value), 1), [metrics]);

  const filtered = useMemo(() => {
    if (metrics.length === 0) return [];
    let list = [...metrics];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.metric_label.toLowerCase().includes(q) || m.metric_key.toLowerCase().includes(q));
    }

    if (filterCategory !== "all") {
      list = list.filter(m => (m.metric_category || "outros") === filterCategory);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "label") cmp = a.metric_label.localeCompare(b.metric_label);
      else if (sortField === "value") cmp = a.metric_value - b.metric_value;
      else {
        const catOrder = ["custo", "alcance", "engajamento", "conversão", "outros"];
        cmp = catOrder.indexOf(a.metric_category || "outros") - catOrder.indexOf(b.metric_category || "outros");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [metrics, search, filterCategory, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "value" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <section className="rounded-xl overflow-hidden border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
      <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" style={{ color: theme.accent }} />
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Tabela Detalhada de Métricas</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: theme.accent + "20", color: theme.accent }}>
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: theme.textMuted }} />
            <input
              type="text"
              placeholder="Buscar métrica..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-44 pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none"
              style={{ background: theme.bg, borderColor: theme.cardBorder, color: theme.text }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border outline-none"
            style={{ background: theme.bg, borderColor: theme.cardBorder, color: theme.text }}
          >
            <option value="all">Todas</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <th className="text-left px-4 py-2.5 cursor-pointer select-none" style={{ color: theme.textMuted }}
                onClick={() => toggleSort("label")}>
                <span className="flex items-center gap-1">Métrica <SortIcon field="label" /></span>
              </th>
              <th className="text-right px-4 py-2.5 cursor-pointer select-none" style={{ color: theme.textMuted }}
                onClick={() => toggleSort("value")}>
                <span className="flex items-center gap-1 justify-end">Valor <SortIcon field="value" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => (
                <tr key={m.metric_key} className="transition-colors"
                  style={{ borderBottom: `1px solid ${theme.cardBorder}22`, background: idx % 2 === 0 ? "transparent" : theme.bg + "40" }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.accent + "08")}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : theme.bg + "40")}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComp = getReportIcon(m.metric_key, m.metric_icon || "BarChart2");
                        return <IconComp className="h-4 w-4 flex-shrink-0" style={{ color: m.metric_color || theme.chartColors[idx % theme.chartColors.length] }} />;
                      })()}
                      <div>
                        <span className="font-medium" style={{ color: theme.text }}>{m.metric_label}</span>
                        {getMetricDescription(m.metric_key) && (
                          <p className="text-[9px] leading-tight mt-0.5" style={{ color: theme.textMuted }}>{getMetricDescription(m.metric_key)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: theme.text }}>
                    {formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: theme.textMuted }}>Nenhuma métrica encontrada.</p>
        </div>
      )}
    </section>
  );
}
