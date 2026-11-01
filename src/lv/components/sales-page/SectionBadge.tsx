// @ts-nocheck
"use client";
import { LucideIcon } from "lucide-react";

interface SectionBadgeProps {
  icon?: LucideIcon;
  text: string;
}

export default function SectionBadge({ icon: Icon, text }: SectionBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--sp-accent)]/30 bg-[var(--sp-accent)]/5 text-[var(--sp-accent)] text-xs font-mono uppercase tracking-widest">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {text}
    </div>
  );
}
