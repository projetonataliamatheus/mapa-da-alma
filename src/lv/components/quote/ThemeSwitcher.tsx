// @ts-nocheck
"use client";
import { colorThemes, type ColorTheme } from "@/lv/lib/colorThemes";

interface ThemeSwitcherProps {
  currentTheme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
  availableThemeIds?: string[];
}

export default function ThemeSwitcher({ currentTheme, onThemeChange, availableThemeIds }: ThemeSwitcherProps) {
  const themes = availableThemeIds && availableThemeIds.length > 0
    ? colorThemes.filter((t) => availableThemeIds.includes(t.id))
    : colorThemes;

  if (themes.length <= 1) return null;

  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 p-2 rounded-full border shadow-xl backdrop-blur-md"
      style={{ background: currentTheme.card + "cc", borderColor: currentTheme.cardBorder }}
    >
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => onThemeChange(t)}
          className="w-7 h-7 rounded-full transition-all duration-200 hover:scale-125 flex-shrink-0"
          style={{
            background: t.accent,
            boxShadow: currentTheme.id === t.id ? `0 0 0 3px ${t.accent}66, 0 0 12px ${t.accent}44` : "0 1px 3px rgba(0,0,0,0.3)",
            transform: currentTheme.id === t.id ? "scale(1.15)" : undefined,
          }}
          title={t.name}
        />
      ))}
    </div>
  );
}
