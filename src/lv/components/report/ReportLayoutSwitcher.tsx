// @ts-nocheck
"use client";
import { useState } from "react";
import { LayoutGrid, X, Moon, Sun } from "lucide-react";

export const REPORT_LAYOUTS = [
  { id: "default", name: "Padrão", description: "Cards + gráficos clássicos", color: "#6366f1" },
  { id: "analytics", name: "Analytics Dark", description: "Tabelas + barras horizontais", color: "#3b82f6" },
  { id: "marketing", name: "Marketing", description: "Cards coloridos + donut", color: "#ec4899" },
  { id: "corporate", name: "Corporativo", description: "Funil + dados detalhados", color: "#06b6d4" },
  { id: "modern", name: "Moderno", description: "Glassmorphism + neon", color: "#8338ec" },
  { id: "funnel", name: "Funil", description: "Funil de conversão visual", color: "#14b8a6" },
  { id: "performance", name: "Performance", description: "GT Dash Pro style", color: "#f59e0b" },
  { id: "datatable", name: "Tabelas", description: "Dados detalhados por categoria", color: "#ef4444" },
  { id: "executive", name: "Executivo", description: "KPIs gradiente + gráficos", color: "#a855f7" },
  { id: "dashboard", name: "Dashboard", description: "Dashboard completo multi-seção", color: "#22c55e" },
] as const;

export type ReportLayoutId = typeof REPORT_LAYOUTS[number]["id"];

interface Props {
  currentLayout: ReportLayoutId;
  onLayoutChange: (id: ReportLayoutId) => void;
  allowedLayouts?: string[];
  isDark?: boolean;
  onToggleDark?: () => void;
}

export default function ReportLayoutSwitcher({ currentLayout, onLayoutChange, allowedLayouts, isDark, onToggleDark }: Props) {
  const [open, setOpen] = useState(false);

  const visibleLayouts = allowedLayouts && allowedLayouts.length > 0
    ? REPORT_LAYOUTS.filter(l => allowedLayouts.includes(l.id))
    : REPORT_LAYOUTS;

  if (visibleLayouts.length <= 1 && !onToggleDark) return null;

  const currentColor = REPORT_LAYOUTS.find(l => l.id === currentLayout)?.color || "#6366f1";

  return (
    <>
      {/* Neon pulsing FAB button */}
      <style>{`
        @keyframes neon-pulse-switcher {
          0%, 100% { box-shadow: 0 0 8px ${currentColor}66, 0 0 20px ${currentColor}33; }
          50% { box-shadow: 0 0 16px ${currentColor}aa, 0 0 40px ${currentColor}55, 0 0 60px ${currentColor}22; }
        }
      `}</style>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl transition-all hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${currentColor}, ${currentColor}cc)`,
          border: `2px solid ${currentColor}`,
          animation: "neon-pulse-switcher 2s ease-in-out infinite",
          color: "#fff",
        }}
        title="Layouts & Tema"
      >
        {open ? <X className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
      </button>

      {/* Expanded panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-20 left-6 z-50 flex flex-col items-stretch gap-1.5 p-3 rounded-2xl shadow-2xl backdrop-blur-xl w-52 max-h-[70vh] overflow-y-auto"
            style={{ background: "rgba(15,23,42,0.95)", border: `1px solid ${currentColor}44` }}
          >
            {/* Dark/Light toggle */}
            {onToggleDark && (
              <button
                onClick={onToggleDark}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] mb-1"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {isDark ? <Sun className="w-4 h-4" style={{ color: "#fbbf24" }} /> : <Moon className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>
              </button>
            )}

            <div className="p-1 flex items-center gap-2 px-2">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Layouts</span>
            </div>
            {visibleLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => { onLayoutChange(layout.id); setOpen(false); }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02] text-left"
                style={{
                  background: currentLayout === layout.id ? layout.color : "rgba(255,255,255,0.08)",
                  color: currentLayout === layout.id ? "#fff" : "#94a3b8",
                  boxShadow: currentLayout === layout.id ? `0 0 12px ${layout.color}66` : "none",
                  border: `1px solid ${currentLayout === layout.id ? layout.color : "transparent"}`,
                }}
                title={layout.description}
              >
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: currentLayout === layout.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)" }}>
                  {layout.name.charAt(0)}
                </span>
                <span className="truncate">{layout.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
