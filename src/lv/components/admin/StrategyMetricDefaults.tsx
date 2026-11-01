// @ts-nocheck
"use client";
/**
 * Admin component to configure which metrics are visible per strategy type.
 * Stored in sales_page_config with id = 'strategy_metric_defaults'.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { getAllKnownMetrics } from "@/lv/lib/metaAdsParser";
import { STRATEGY_CONTEXTS } from "@/lv/lib/strategyContext";
import { Switch } from "@/lv/components/ui/switch";
import { Button } from "@/lv/components/ui/button";
import { Badge } from "@/lv/components/ui/badge";
import { useToast } from "@/lv/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lv/components/ui/tabs";
import { Check, RotateCcw, Settings2, Eye, EyeOff } from "lucide-react";

const CONFIG_ID = "strategy_metric_defaults";

const CATEGORY_LABELS: Record<string, string> = {
  custo: "Custos",
  alcance: "Alcance",
  engajamento: "Engajamento",
  conversão: "Conversões",
  outros: "Outros",
};

const CATEGORY_COLORS: Record<string, string> = {
  custo: "bg-red-500/10 text-red-600 border-red-200",
  alcance: "bg-blue-500/10 text-blue-600 border-blue-200",
  engajamento: "bg-amber-500/10 text-amber-600 border-amber-200",
  conversão: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  outros: "bg-gray-500/10 text-gray-600 border-gray-200",
};

export type StrategyMetricConfig = Record<string, string[]>; // strategy key -> array of visible metric keys

export default function StrategyMetricDefaults() {
  const { toast } = useToast();
  const allMetrics = useMemo(() => getAllKnownMetrics(), []);
  const strategies = Object.entries(STRATEGY_CONTEXTS);
  const [config, setConfig] = useState<StrategyMetricConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState(strategies[0]?.[0] || "mensagens");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sales_page_config")
        .select("config")
        .eq("id", CONFIG_ID)
        .maybeSingle();
      if (data?.config) {
        setConfig(data.config as any);
      }
      setLoading(false);
    })();
  }, []);

  const getVisibleKeys = (strategyKey: string): Set<string> => {
    if (config[strategyKey]) return new Set(config[strategyKey]);
    // Default: all metrics visible
    return new Set(allMetrics.map(m => m.key));
  };

  const toggleMetric = (strategyKey: string, metricKey: string) => {
    const current = getVisibleKeys(strategyKey);
    if (current.has(metricKey)) {
      current.delete(metricKey);
    } else {
      current.add(metricKey);
    }
    setConfig(prev => ({ ...prev, [strategyKey]: Array.from(current) }));
  };

  const enableAll = (strategyKey: string) => {
    setConfig(prev => ({ ...prev, [strategyKey]: allMetrics.map(m => m.key) }));
  };

  const disableAll = (strategyKey: string) => {
    setConfig(prev => ({ ...prev, [strategyKey]: [] }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("sales_page_config")
      .upsert({ id: CONFIG_ID, config, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração salva!", description: "Métricas por estratégia atualizadas." });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Carregando configurações...</div>;
  }

  const grouped = (strategyKey: string) => {
    const visible = getVisibleKeys(strategyKey);
    const cats = ["custo", "alcance", "engajamento", "conversão", "outros"];
    return cats.map(cat => ({
      category: cat,
      items: allMetrics.filter(m => m.category === cat),
    })).filter(g => g.items.length > 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-bold">Métricas por Estratégia</h3>
          <p className="text-xs text-muted-foreground">Defina quais métricas aparecem para cada tipo de estratégia</p>
        </div>
      </div>

      <Tabs value={activeStrategy} onValueChange={setActiveStrategy}>
        <TabsList className="flex-wrap h-auto gap-1">
          {strategies.map(([key, ctx]) => (
            <TabsTrigger key={key} value={key} className="gap-1 text-xs">
              {ctx.emoji} {ctx.title.replace("Campanha de ", "")}
            </TabsTrigger>
          ))}
        </TabsList>

        {strategies.map(([strategyKey, ctx]) => {
          const visibleKeys = getVisibleKeys(strategyKey);
          const visibleCount = visibleKeys.size;
          return (
            <TabsContent key={strategyKey} value={strategyKey} className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" /> {visibleCount}/{allMetrics.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{ctx.description.slice(0, 80)}...</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => enableAll(strategyKey)} className="gap-1 h-8 text-xs">
                    <Eye className="h-3 w-3" /> Todas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => disableAll(strategyKey)} className="gap-1 h-8 text-xs">
                    <EyeOff className="h-3 w-3" /> Nenhuma
                  </Button>
                </div>
              </div>

              {grouped(strategyKey).map(({ category, items }) => (
                <div key={category}>
                  <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  <div className="grid gap-1.5 md:grid-cols-2">
                    {items.map(m => {
                      const isVisible = visibleKeys.has(m.key);
                      return (
                        <div
                          key={m.key}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isVisible ? "bg-background hover:bg-accent/30" : "bg-muted/40 opacity-60 hover:opacity-80"
                          }`}
                          onClick={() => toggleMetric(strategyKey, m.key)}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${!isVisible ? "line-through" : ""}`}>{m.label}</p>
                            <span className="text-[9px] text-muted-foreground font-mono">{m.key}</span>
                          </div>
                          <Switch
                            checked={isVisible}
                            onCheckedChange={() => toggleMetric(strategyKey, m.key)}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={() => setConfig({})} className="gap-1">
          <RotateCcw className="h-4 w-4" /> Restaurar Padrão
        </Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Check className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </div>
    </div>
  );
}

/** Fetch strategy metric config */
export async function fetchStrategyMetricConfig(): Promise<StrategyMetricConfig> {
  const { data } = await supabase
    .from("sales_page_config")
    .select("config")
    .eq("id", "strategy_metric_defaults")
    .maybeSingle();
  if (data?.config) return data.config as any;
  return {};
}
