// @ts-nocheck
"use client";
/**
 * Toggle Dark/Light mode na view do cliente.
 * Salva preferência em sessionStorage.
 */
import { Moon, Sun } from "lucide-react";

interface Props {
  isDark: boolean;
  onToggle: () => void;
}

export default function ReportDarkLightToggle({ isDark, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl transition-all hover:scale-110 shadow-lg"
      style={{
        background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
      }}
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" style={{ color: "#fbbf24" }} />
      ) : (
        <Moon className="h-4 w-4" style={{ color: "#475569" }} />
      )}
    </button>
  );
}
