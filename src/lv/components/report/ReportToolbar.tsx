// @ts-nocheck
"use client";
/**
 * Toolbar global do relatório — barra fixa no topo com indicador de meta,
 * badge de estratégia e período. Inspirado no GT Dash Pro.
 */
import { Calendar, Target, TrendingUp, Users, ShoppingCart, Megaphone, Download } from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { formatNumber } from "@/lv/lib/metaAdsParser";

const STRATEGY_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  "mensagens": { icon: WhatsAppIcon, label: "Geração de Mensagens", color: "#25d366" },
  "leads": { icon: Users, label: "Captação de Leads", color: "#3b82f6" },
  "vendas": { icon: ShoppingCart, label: "Vendas Diretas", color: "#f59e0b" },
  "conteudo": { icon: Megaphone, label: "Distribuição de Conteúdo", color: "#8b5cf6" },
};

interface Props {
  report: any;
  metrics: any[];
  clientName: string;
  theme: ReportTheme;
  isDark: boolean;
}

export default function ReportToolbar({ report, metrics, clientName, theme, isDark }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const bgColor = isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div
      className="sticky top-0 z-40 backdrop-blur-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-end gap-2"
      style={{ background: bgColor, borderBottom: `1px solid ${borderColor}` }}
    >
      {/* Print button */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
        style={{ background: theme.accent + "15", color: theme.accent, border: `1px solid ${theme.accent}30` }}
        title="Imprimir"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Imprimir</span>
      </button>

      {/* PDF button */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
        style={{ background: theme.accent, color: theme.accentFg }}
        title="Baixar PDF"
      >
        <Download className="h-3.5 w-3.5" />
        <span>PDF</span>
      </button>
    </div>
  );
}
