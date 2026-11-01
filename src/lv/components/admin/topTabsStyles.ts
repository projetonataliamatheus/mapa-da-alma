// @ts-nocheck
/**
 * Padrão único para "Sub-Abas" (guias) no topo das páginas admin.
 * Fundo cinza escuro (mesmo tom do menu lateral), texto branco,
 * ícones coloridos, centralizado, sticky no topo.
 *
 * Uso:
 *   <TabsList className={topTabsListClass}>
 *     <TabsTrigger value="x" className={topTabsTriggerClass}>
 *       <Icon className={cn("h-4 w-4", topTabsIconTone("emerald"))} /> Rótulo
 *     </TabsTrigger>
 *   </TabsList>
 */

export const topTabsListClass = "lv-toptabs";

export const topTabsTriggerClass = "lv-toptab";

export type TopTabsIconTone =
  | "sky" | "emerald" | "amber" | "violet" | "rose" | "cyan"
  | "indigo" | "orange" | "fuchsia" | "teal" | "yellow" | "blue" | "pink" | "slate";

const TONE_MAP: Record<TopTabsIconTone, string> = {
  sky: "text-sky-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  violet: "text-violet-500",
  rose: "text-rose-500",
  cyan: "text-cyan-500",
  indigo: "text-indigo-500",
  orange: "text-orange-500",
  fuchsia: "text-fuchsia-500",
  teal: "text-teal-500",
  yellow: "text-yellow-500",
  blue: "text-blue-500",
  pink: "text-pink-500",
  slate: "text-slate-300",
};

export function topTabsIconTone(tone: TopTabsIconTone) {
  return TONE_MAP[tone];
}
