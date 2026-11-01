// @ts-nocheck
"use client";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lv/lib/utils";

export interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Tailwind gradient classes, e.g. "from-emerald-500 to-emerald-700" */
  gradient?: string;
  /** Tailwind shadow color class, e.g. "shadow-emerald-500/25" */
  shadowColor?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Padrão único de cabeçalho para todas as páginas do painel admin.
 * Ícone colorido flutuante + título/subtítulo em fonte consistente.
 * Baseado no cabeçalho da Calculadora Fiscal.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  gradient = "from-primary to-primary/70",
  shadowColor = "shadow-primary/25",
  badge,
  actions,
  className,
}: PageHeaderProps) {
  // visual do nosso painel: ícone em cápsula + título e subtítulo (igual ao cabeçalho das outras telas)
  return (
    <header className={cn("lv-ph", className)}>
      <div className="lv-ph-t">
        <span className="ib lg float t-acc">
          <Icon className="i" strokeWidth={2} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h1>
            {title}
            {badge != null && <span className="lv-ph-badge">{badge}</span>}
          </h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="lv-ph-a">{actions}</div>}
    </header>
  );
}
