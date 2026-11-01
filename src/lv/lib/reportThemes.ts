// @ts-nocheck
export interface ReportTheme {
  id: number;
  name: string;
  description: string;
  bg: string;
  bgSecondary: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  accentFg: string;
  gradient: string;
  chartColors: string[];
}

export const reportThemes: ReportTheme[] = [
  {
    id: 1, name: "Executivo Dark", description: "Sofisticado e moderno",
    bg: "#0f172a", bgSecondary: "#1e293b", cardBg: "#1e293b", cardBorder: "#334155",
    text: "#f8fafc", textMuted: "#94a3b8", accent: "#6366f1", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    chartColors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8"],
  },
  {
    id: 2, name: "Dark Spotify", description: "Verde vibrante e moderno",
    bg: "#121212", bgSecondary: "#1a1a1a", cardBg: "#1a1a1a", cardBorder: "#282828",
    text: "#f0f0f0", textMuted: "#a0a0a0", accent: "#1DB954", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #1DB954, #1ed760)",
    chartColors: ["#1DB954", "#1ed760", "#2ee86b", "#57e98a", "#82edaa"],
  },
  {
    id: 3, name: "Dark Meta", description: "Azul do Meta Ads",
    bg: "#0c1524", bgSecondary: "#13202f", cardBg: "#13202f", cardBorder: "#1c3a5c",
    text: "#f0f6ff", textMuted: "#8badc9", accent: "#1877F2", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #1877F2, #42a0ff)",
    chartColors: ["#1877F2", "#42a0ff", "#6bb8ff", "#93cfff", "#bce0ff"],
  },
  {
    id: 4, name: "Dark Vermelho", description: "Impacto e energia",
    bg: "#120a0a", bgSecondary: "#1a1010", cardBg: "#1a1010", cardBorder: "#3a1a1a",
    text: "#fff0f0", textMuted: "#c49a9a", accent: "#ef4444", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #ef4444, #f87171)",
    chartColors: ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#dc2626"],
  },
  {
    id: 5, name: "Light Meta Ads", description: "Branco com azul corporativo",
    bg: "#ffffff", bgSecondary: "#f0f2f5", cardBg: "#ffffff", cardBorder: "#dddfe2",
    text: "#1c1e21", textMuted: "#65676b", accent: "#1877F2", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #1877F2, #42a0ff)",
    chartColors: ["#1877F2", "#42a0ff", "#36a420", "#f7b928", "#e74c6f"],
  },
  {
    id: 6, name: "Rosa Light", description: "Elegante e feminino",
    bg: "#ffffff", bgSecondary: "#fdf2f8", cardBg: "#ffffff", cardBorder: "#fce7f3",
    text: "#1f1f1f", textMuted: "#9d7a8e", accent: "#ec4899", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
    chartColors: ["#ec4899", "#f472b6", "#f9a8d4", "#db2777", "#be185d"],
  },
  {
    id: 7, name: "Rosa Dark", description: "Moderno e feminino",
    bg: "#1a0a14", bgSecondary: "#24101c", cardBg: "#24101c", cardBorder: "#3d1a2e",
    text: "#fdf2f8", textMuted: "#d4a0bf", accent: "#f472b6", accentFg: "#ffffff",
    gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
    chartColors: ["#f472b6", "#ec4899", "#f9a8d4", "#db2777", "#fbcfe8"],
  },
];

export function getReportTheme(id: number): ReportTheme {
  return reportThemes.find(t => t.id === id) || reportThemes[0];
}

/**
 * Returns a light or dark variant of a theme.
 * If isDark=true, returns the original theme.
 * If isDark=false, generates a light-mode version preserving accent/chart colors.
 */
export function getReportThemeVariant(id: number, isDark: boolean): ReportTheme {
  const base = getReportTheme(id);
  if (isDark) return base;

  // Check if theme is already light (bg starts with #f or #e or #ffffff)
  const bgHex = base.bg.toLowerCase();
  const isAlreadyLight = bgHex === "#ffffff" || bgHex === "#fafafa" || bgHex.startsWith("#f") || bgHex.startsWith("#e");
  if (isAlreadyLight) {
    // Invert to dark
    return {
      ...base,
      bg: "#0f172a",
      bgSecondary: "#1e293b",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      text: "#f8fafc",
      textMuted: "#94a3b8",
      accentFg: "#ffffff",
    };
  }

  // Dark theme → generate light variant
  return {
    ...base,
    bg: "#ffffff",
    bgSecondary: "#f8fafc",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    text: "#1e293b",
    textMuted: "#64748b",
    accentFg: isLightColor(base.accent) ? "#000000" : "#ffffff",
  };
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
