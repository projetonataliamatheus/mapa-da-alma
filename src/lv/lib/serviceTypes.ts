// @ts-nocheck
/**
 * Service types for quotes. Each type has its own default template content,
 * default plans, hero copy and public-page defaults.
 */
import { Megaphone, Globe, ShoppingBag, Code2, type LucideIcon } from "lucide-react";

export type ServiceTypeKey =
  | "trafego_pago"
  | "sites_paginas"
  | "loja_virtual"
  | "sistemas_app";

export interface ServiceTypeMeta {
  key: ServiceTypeKey;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind color token (text) */
  color: string;
  /** Tailwind bg gradient wrapper */
  gradient: string;
  /** Ring color */
  ring: string;
  /** Badge classes */
  badge: string;
}

export const SERVICE_TYPES: ServiceTypeMeta[] = [
  {
    key: "trafego_pago",
    label: "Tráfego Pago",
    short: "Tráfego",
    description: "Anúncios no Meta e Google para atrair clientes todos os dias.",
    icon: Megaphone,
    color: "text-amber-600",
    gradient: "from-amber-500/15 to-amber-500/5",
    ring: "ring-amber-500/20",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  },
  {
    key: "sites_paginas",
    label: "Sites e Páginas",
    short: "Sites",
    description: "Desenvolvimento de sites institucionais e páginas de vendas.",
    icon: Globe,
    color: "text-sky-600",
    gradient: "from-sky-500/15 to-sky-500/5",
    ring: "ring-sky-500/20",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25",
  },
  {
    key: "loja_virtual",
    label: "Loja Virtual",
    short: "E-commerce",
    description: "Loja online completa com pagamento, catálogo e frete.",
    icon: ShoppingBag,
    color: "text-emerald-600",
    gradient: "from-emerald-500/15 to-emerald-500/5",
    ring: "ring-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
  {
    key: "sistemas_app",
    label: "Sistemas e App",
    short: "Sistemas",
    description: "Sistemas web personalizados e aplicativos mobile.",
    icon: Code2,
    color: "text-violet-600",
    gradient: "from-violet-500/15 to-violet-500/5",
    ring: "ring-violet-500/20",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
  },
];

export function getServiceTypeMeta(key?: string | null): ServiceTypeMeta {
  return SERVICE_TYPES.find((s) => s.key === key) || SERVICE_TYPES[0];
}
