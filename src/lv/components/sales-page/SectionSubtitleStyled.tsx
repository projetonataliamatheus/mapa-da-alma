// @ts-nocheck
"use client";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Wraps a subtitle paragraph with global subtitle styling from config */
export default function SectionSubtitleStyled({ children, className = "", style }: Props) {
  const c = usePublicConfig();
  if (!children) return null;

  return (
    <p
      className={`whitespace-pre-line ${className}`}
      style={{
        fontSize: `${c.subtitleFontSize || 14}px`,
        color: c.subtitleColor || "var(--sp-muted)",
        marginTop: `${c.subtitleGap || 8}px`,
        ...style,
      }}
    >
      {children}
    </p>
  );
}
