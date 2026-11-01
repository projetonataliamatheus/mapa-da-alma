// @ts-nocheck
export interface ColorTheme {
  id: string;
  name: string;
  bg: string;
  bgSecondary: string;
  accent: string;
  accentFg: string;
  text: string;
  textMuted: string;
  card: string;
  cardBorder: string;
}

export const colorThemes: ColorTheme[] = [
  {
    id: "gold-dark",
    name: "Dourado & Escuro",
    bg: "#1a1a2e",
    bgSecondary: "#16213e",
    accent: "#c9a84c",
    accentFg: "#1a1a2e",
    text: "#ffffff",
    textMuted: "#a0a0b0",
    card: "#1e2a45",
    cardBorder: "#c9a84c33",
  },
  {
    id: "blue-white",
    name: "Azul & Branco",
    bg: "#f0f4f8",
    bgSecondary: "#ffffff",
    accent: "#2563eb",
    accentFg: "#ffffff",
    text: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
    cardBorder: "#2563eb33",
  },
  {
    id: "black-green",
    name: "Preto & Verde",
    bg: "#0f0f0f",
    bgSecondary: "#1a1a1a",
    accent: "#22c55e",
    accentFg: "#0f0f0f",
    text: "#ffffff",
    textMuted: "#9ca3af",
    card: "#1f1f1f",
    cardBorder: "#22c55e33",
  },
  {
    id: "purple-dark",
    name: "Roxo & Escuro",
    bg: "#1a1025",
    bgSecondary: "#251535",
    accent: "#a855f7",
    accentFg: "#ffffff",
    text: "#ffffff",
    textMuted: "#a0a0b0",
    card: "#2a1a3e",
    cardBorder: "#a855f733",
  },
  {
    id: "purple-white",
    name: "Roxo & Branco",
    bg: "#f5f0ff",
    bgSecondary: "#ffffff",
    accent: "#7c3aed",
    accentFg: "#ffffff",
    text: "#1e1b4b",
    textMuted: "#6b7280",
    card: "#ffffff",
    cardBorder: "#7c3aed33",
  },
  {
    id: "red-dark",
    name: "Vermelho & Escuro",
    bg: "#1a0a0a",
    bgSecondary: "#251010",
    accent: "#ef4444",
    accentFg: "#ffffff",
    text: "#ffffff",
    textMuted: "#a0a0b0",
    card: "#2a1515",
    cardBorder: "#ef444433",
  },
  {
    id: "teal-white",
    name: "Teal & Branco",
    bg: "#f0fdfa",
    bgSecondary: "#ffffff",
    accent: "#14b8a6",
    accentFg: "#ffffff",
    text: "#134e4a",
    textMuted: "#5eead4",
    card: "#ffffff",
    cardBorder: "#14b8a633",
  },
];

export const getTheme = (id: string): ColorTheme =>
  colorThemes.find((t) => t.id === id) ?? colorThemes[0];
