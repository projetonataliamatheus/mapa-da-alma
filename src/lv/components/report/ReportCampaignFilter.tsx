// @ts-nocheck
"use client";
import { Button } from "@/lv/components/ui/button";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { LayoutGrid, Target } from "lucide-react";

interface ReportCampaignFilterProps {
  campaigns: string[];
  selected: string;
  onSelect: (campaign: string) => void;
  theme: ReportTheme;
}

export default function ReportCampaignFilter({ campaigns, selected, onSelect, theme }: ReportCampaignFilterProps) {
  if (campaigns.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-2 px-1">
        <Target className="w-4 h-4" style={{ color: theme.accent }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
          Filtrar por Campanha
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect("all")}
          className="rounded-full h-8 px-4 text-xs font-medium transition-all"
          style={{
            backgroundColor: selected === "all" ? theme.accent : "transparent",
            color: selected === "all" ? theme.accentFg : theme.text,
            borderColor: selected === "all" ? theme.accent : theme.cardBorder,
          }}
        >
          <LayoutGrid className="w-3 h-3 mr-1.5" />
          Geral
        </Button>

        {campaigns.map((camp) => (
          <Button
            key={camp}
            variant="outline"
            size="sm"
            onClick={() => onSelect(camp)}
            className="rounded-full h-8 px-4 text-xs font-medium transition-all"
            style={{
              backgroundColor: selected === camp ? theme.accent : "transparent",
              color: selected === camp ? theme.accentFg : theme.text,
              borderColor: selected === camp ? theme.accent : theme.cardBorder,
            }}
          >
            {camp}
          </Button>
        ))}
      </div>
    </div>
  );
}
