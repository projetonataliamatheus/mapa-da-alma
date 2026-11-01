// @ts-nocheck
"use client";
/**
 * ReportComparisonBadge — Shows growth/decline vs goal_reference on metric cards
 */
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  currentValue: number;
  referenceValue: number;
  theme: ReportTheme;
  invertColors?: boolean; // for cost metrics where lower is better
}

export default function ReportComparisonBadge({ currentValue, referenceValue, theme, invertColors = false }: Props) {
  if (!referenceValue || referenceValue <= 0) return null;

  const change = ((currentValue - referenceValue) / referenceValue) * 100;
  const absChange = Math.abs(change);

  if (absChange < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ background: theme.textMuted + "20", color: theme.textMuted }}>
        <Minus className="h-2.5 w-2.5" /> 0%
      </span>
    );
  }

  const isPositive = change > 0;
  const isGood = invertColors ? !isPositive : isPositive;

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ 
        background: isGood ? "#22c55e20" : "#ef444420",
        color: isGood ? "#22c55e" : "#ef4444"
      }}>
      {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {absChange.toFixed(0)}%
    </span>
  );
}
