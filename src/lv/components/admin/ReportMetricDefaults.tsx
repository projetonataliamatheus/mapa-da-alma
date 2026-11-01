// @ts-nocheck
"use client";
/**
 * Admin panel to configure which metrics are visible by default in traffic reports.
 * Stored in sales_page_config with id = 'report_metric_defaults'.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { getAllKnownMetrics } from "@/lv/lib/metaAdsParser";
import { Switch } from "@/lv/components/ui/switch";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Badge } from "@/lv/components/ui/badge";
import { useToast } from "@/lv/hooks/use-toast";
import { Search, Eye, EyeOff, Settings2, Check, RotateCcw } from "lucide-react";

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

const CONFIG_ID = "report_metric_defaults";

export default function ReportMetricDefaults() {
  const { toast } = useToast();
  const allMetrics = useMemo(() => getAllKnownMetrics(), []);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sales_page_config")
        .select("config")
        .eq("id", CONFIG_ID)
        .maybeSingle();
      if (data?.config) {
        const cfg = data.config as any;
        if (Array.isArray(cfg.hiddenKeys)) {
          setHiddenKeys(new Set(cfg.hiddenKeys));
        }
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(allMetrics.map(m => m.category));
    return Array.from(cats);
  }, [allMetrics]);

  const filtered = useMemo(() => {
    let list = [...allMetrics];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") {
      list = list.filter(m => m.category === filterCategory);
    }
    // Group by category
    list.sort((a, b) => {
      const order = ["custo", "alcance", "engajamento", "conversão", "outros"];
      return order.indexOf(a.category) - order.indexOf(b.category);
    });
    return list;
  }, [allMetrics, search, filterCategory]);

  const toggleMetric = (key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const enableAll = () => setHiddenKeys(new Set());
  const disableAll = () => setHiddenKeys(new Set(allMetrics.map(m => m.key)));

  const save = async () => {
    setSaving(true);
    const config = { hiddenKeys: Array.from(hiddenKeys) };
    const { error } = await supabase
      .from("sales_page_config")
      .upsert({ id: CONFIG_ID, config, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração salva!", description: `${allMetrics.length - hiddenKeys.size} métricas ativas.` });
    }
  };

  const visibleCount = allMetrics.length - hiddenKeys.size;

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-bold">Métricas Padrão dos Relatórios</h3>
            <p className="text-xs text-muted-foreground">Defina quais métricas aparecem nos relatórios de tráfego</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" /> {visibleCount}/{allMetrics.length}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar métrica..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="h-9 px-3 text-sm rounded-md border bg-background"
        >
          <option value="all">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={enableAll} className="gap-1 h-9">
          <Eye className="h-3.5 w-3.5" /> Ativar todas
        </Button>
        <Button variant="outline" size="sm" onClick={disableAll} className="gap-1 h-9">
          <EyeOff className="h-3.5 w-3.5" /> Desativar todas
        </Button>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-2 md:grid-cols-2">
        {filtered.map(m => {
          const isVisible = !hiddenKeys.has(m.key);
          return (
            <div
              key={m.key}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                isVisible ? "bg-background hover:bg-accent/30" : "bg-muted/40 opacity-60 hover:opacity-80"
              }`}
              onClick={() => toggleMetric(m.key)}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${!isVisible ? "line-through" : ""}`}>{m.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono">{m.key}</span>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${CATEGORY_COLORS[m.category] || ""}`}>
                    {CATEGORY_LABELS[m.category] || m.category}
                  </Badge>
                </div>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={() => toggleMetric(m.key)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma métrica encontrada.</div>
      )}

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={enableAll} className="gap-1">
          <RotateCcw className="h-4 w-4" /> Restaurar Padrão
        </Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Check className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </div>
    </div>
  );
}

/** Fetch hidden metric keys from config */
export async function fetchHiddenMetricKeys(): Promise<Set<string>> {
  const { data } = await supabase
    .from("sales_page_config")
    .select("config")
    .eq("id", CONFIG_ID)
    .maybeSingle();
  if (data?.config) {
    const cfg = data.config as any;
    if (Array.isArray(cfg.hiddenKeys)) return new Set(cfg.hiddenKeys);
  }
  return new Set();
}
