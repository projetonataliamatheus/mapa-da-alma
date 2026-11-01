// @ts-nocheck
"use client";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";

interface Props {
  sectionKey: string;
}

export default function SectionSubtitle2({ sectionKey }: Props) {
  const c = usePublicConfig();
  const text = c.sectionSubtitle2?.[sectionKey];
  if (!text) return null;

  return (
    <p
      className="whitespace-pre-line"
      style={{
        marginTop: `${c.subtitleGap || 8}px`,
        fontSize: `${c.subtitleFontSize || 14}px`,
        color: c.subtitleColor || "var(--sp-muted)",
      }}
    >
      {text}
    </p>
  );
}
