// @ts-nocheck
"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lv/components/ui/tabs";
import { FileText, LayoutTemplate, UserCircle, HelpCircle, DollarSign, Zap, Sparkles } from "lucide-react";
import Quotes from "./Quotes";
import QuoteTemplateEditor from "./QuoteTemplateEditor";
import FaqSettings from "./FaqSettings";
import FooterSettings from "./FooterSettings";
import QuotePlansSettings from "./QuotePlansSettings";
import QuoteConnectorsSettings from "./QuoteConnectorsSettings";
import QuoteFloatingIconsSettings from "./QuoteFloatingIconsSettings";
import { SortableList, SortableItem, useSortedOrder } from "@/lv/components/admin/SortableList";
import { PageHeader } from "@/lv/components/admin/PageHeader";
import { topTabsListClass, topTabsTriggerClass, topTabsIconTone } from "@/lv/components/admin/topTabsStyles";
import { cn } from "@/lv/lib/utils";


const DEFAULT_TABS = [
  { id: "orcamentos",         label: "Orçamentos",          icon: FileText,       tone: "rose" as const },
  { id: "planos",             label: "Planos",              icon: DollarSign,     tone: "emerald" as const },
  { id: "conectores",         label: "Conectores",          icon: Zap,            tone: "amber" as const },
  { id: "icones-flutuantes",  label: "Ícones Flutuantes",   icon: Sparkles,       tone: "fuchsia" as const },
  { id: "modelos",            label: "Editor de Modelos",   icon: LayoutTemplate, tone: "sky" as const },
  { id: "faq",                label: "FAQ",                 icon: HelpCircle,     tone: "violet" as const },
  { id: "rodape",             label: "Rodapé",              icon: UserCircle,     tone: "cyan" as const },
];


export default function QuoteHub() {
  const [tab, setTab] = useState("orcamentos");
  const [orderedTabs, setOrderedTabs] = useSortedOrder("admin_quotehub_tab_order", DEFAULT_TABS);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        {/* Sub-abas padrão (topo, dark, centralizadas) — drag to reorder */}
        <div className="flex justify-center">
          <TabsList asChild className={topTabsListClass}>
            <SortableList
              items={orderedTabs}
              onReorder={setOrderedTabs}
              className="flex flex-wrap gap-1"
              renderItem={(t) => {
                const Icon = t.icon;
                return (
                  <SortableItem key={t.id} id={t.id}>
                    <TabsTrigger value={t.id} className={topTabsTriggerClass}>
                      <Icon className={cn("h-4 w-4", topTabsIconTone(t.tone))} strokeWidth={2.25} />
                      <span>{t.label}</span>
                    </TabsTrigger>
                  </SortableItem>
                );
              }}
            />
          </TabsList>
        </div>

        <PageHeader
          icon={FileText}
          title="Orçamentos"
          subtitle="Gerencie orçamentos, planos, modelos e todo o conteúdo apresentado ao cliente."
          gradient="from-amber-500 to-orange-600"
          shadowColor="shadow-amber-500/25"
        />




        <TabsContent value="orcamentos" className="mt-0 focus-visible:outline-none">
          <Quotes />
        </TabsContent>

        <TabsContent value="planos" className="mt-0 focus-visible:outline-none">
          <QuotePlansSettings />
        </TabsContent>

        <TabsContent value="conectores" className="mt-0 focus-visible:outline-none">
          <QuoteConnectorsSettings />
        </TabsContent>

        <TabsContent value="icones-flutuantes" className="mt-0 focus-visible:outline-none">
          <QuoteFloatingIconsSettings />
        </TabsContent>

        <TabsContent value="modelos" className="mt-0 focus-visible:outline-none">
          <QuoteTemplateEditor />
        </TabsContent>

        <TabsContent value="faq" className="mt-0 focus-visible:outline-none">
          <FaqSettings />
        </TabsContent>

        <TabsContent value="rodape" className="mt-0 focus-visible:outline-none">
          <FooterSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
