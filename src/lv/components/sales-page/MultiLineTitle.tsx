// @ts-nocheck
"use client";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";

export interface TitleLine {
  text: string;
  color: string; // "" = auto (line 0 → white, line 1+ → accent)
  text2?: string;
  color2?: string; // "" = auto (line 0 → accent, line 1+ → accent)
}

interface MultiLineTitleProps {
  sectionKey: string;
  fallbackText?: string;
  fallbackTitle1?: string;
  fallbackTitle2?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MultiLineTitle({
  sectionKey,
  fallbackText,
  fallbackTitle1,
  fallbackTitle2,
  className = "",
  style,
}: MultiLineTitleProps) {
  const c = usePublicConfig();
  const lines: TitleLine[] = c.sectionTitleLines?.[sectionKey];
  const accentColor = c.titleColorOverrides?.[sectionKey] || c.accentColor || "var(--sp-accent)";

  if (lines && lines.length > 0 && lines.some((l) => l.text.trim() || l.text2?.trim())) {
    return (
      <span className={className} style={style}>
        {lines.map((line, i) => {
          const hasText1 = line.text.trim();
          const hasText2 = line.text2?.trim();
          if (!hasText1 && !hasText2) return null;

          // Auto colors: segment1 = white for L1, accent for L2+; segment2 = always accent
          const autoColor1 = i === 0 ? "var(--sp-text)" : accentColor;
          const autoColor2 = accentColor;
          const c1 = line.color && line.color !== "" ? line.color : autoColor1;
          const c2 = line.color2 && line.color2 !== "" ? line.color2 : autoColor2;

          return (
            <span key={i}>
              {i > 0 && <br />}
              {hasText1 && <span style={{ color: c1 }}>{line.text}</span>}
              {hasText1 && hasText2 && <br />}
              {hasText2 && <span style={{ color: c2 }}>{line.text2}</span>}
            </span>
          );
        })}
      </span>
    );
  }

  // Fallback: old Title1/Title2
  if (fallbackTitle1 || fallbackTitle2) {
    return (
      <span className={className} style={style}>
        {fallbackTitle1 && <span style={{ color: "var(--sp-text)" }}>{fallbackTitle1}</span>}
        {fallbackTitle1 && fallbackTitle2 && <br />}
        {fallbackTitle2 && <span style={{ color: accentColor }}>{fallbackTitle2}</span>}
      </span>
    );
  }

  // Fallback: SplitTitle
  if (fallbackText) {
    const words = fallbackText.split(/\s+/).filter(Boolean);
    const mid = Math.ceil(words.length / 2);
    const firstHalf = words.slice(0, mid).join(" ");
    const secondHalf = words.slice(mid).join(" ");
    const shouldBreak = words.length >= 5;
    return (
      <span className={className} style={style}>
        <span style={{ color: "var(--sp-text)" }}>{firstHalf}</span>
        {secondHalf && (
          <>
            {shouldBreak ? <br /> : " "}
            <span style={{ color: accentColor }}>{secondHalf}</span>
          </>
        )}
      </span>
    );
  }

  return null;
}
