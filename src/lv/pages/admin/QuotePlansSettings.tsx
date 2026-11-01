// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lv/hooks/useAuth";
import { supabase } from "@/lv/integrations/supabase/client";
import { useToast } from "@/lv/hooks/use-toast";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Card, CardContent } from "@/lv/components/ui/card";
import { 
  DollarSign, Phone, Plus, Trash2, ChevronUp, ChevronDown, 
  Copy, BarChart3, Save, Sparkles, Check, X, Rocket, Layers,
} from "lucide-react";
import { Switch } from "@/lv/components/ui/switch";
import MaskedInput from "@/lv/components/admin/MaskedInput";

import { Slider } from "@/lv/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { DEFAULT_BEST_PLAN_STYLE, type BestPlanStyleConfig } from "@/lv/components/quote/BestPlanBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/lv/components/ui/dialog";
import { getDefaultPlansForService, extractServicePlansMap, type ServicePlansKey } from "@/lv/lib/quotePlans";
import { SERVICE_TYPES } from "@/lv/lib/serviceTypes";

interface PlanMetric {
  label: string;
  value: string;
}

interface PlanConfig {
  name: string;
  total: string;
  labor: string;
  ads: string;
  dailyAds: string;
  metrics: PlanMetric[];
}

interface PlansSettings {
  whatsappNumber: string;
  plans: PlanConfig[]; // legacy — mirrored from plansByService.trafego_pago
  plansByService: Record<ServicePlansKey, PlanConfig[]>;
  bestPlanStyle?: BestPlanStyleConfig;
}


const defaultPlan: PlanConfig = {
  name: "Nova Opção",
  total: "R$ 2.000",
  labor: "R$ 1.100,00",
  ads: "R$ 900,00 (R$ 30/dia)",
  dailyAds: "R$ 30/dia",
  metrics: [
    { label: "Custo por Conversa (WhatsApp)", value: "R$ 3,00 a R$ 8,00" },
    { label: "Volume de Contatos/Dia", value: "4 a 8 pessoas" },
    { label: "Taxa de Conversão", value: "20% com atendimento ágil" },
    { label: "Resultados/Dia", value: "1 a 2 novos clientes" },
    { label: "Resultados/Mês", value: "10 a 30 novos clientes" },
  ],
};

function planFromDefault(cfg: any): PlanConfig {
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  const metrics = Array.isArray(cfg.metrics?.rows) ? cfg.metrics.rows.map((r: any) => ({ label: r[0] || "", value: r[1] || "" })) : [];
  return {
    name: cfg.title || cfg.name || "Opção",
    total: cfg.total || "",
    labor: cfg.labor || "",
    ads: cfg.ads || "",
    dailyAds: cfg.metrics?.trafficDailyLabel || cfg.dailyAds || "",
    metrics: metrics.length ? metrics : (items.length ? items.map((i: string) => ({ label: "Incluso", value: i })) : defaultPlan.metrics),
  };
}

function buildDefaultsFor(svc: ServicePlansKey): PlanConfig[] {
  return getDefaultPlansForService(svc).map(planFromDefault);
}

const defaultSettings: PlansSettings = {
  whatsappNumber: "",
  bestPlanStyle: { ...DEFAULT_BEST_PLAN_STYLE },
  plans: [
    { ...defaultPlan, name: "Opção 1" },
    {
      ...defaultPlan,
      name: "Opção 2",
      total: "R$ 3.000",
      labor: "R$ 1.500,00",
      ads: "R$ 1.500,00 (R$ 50/dia)",
      dailyAds: "R$ 50/dia",
      metrics: [
        { label: "Custo por Conversa (WhatsApp)", value: "R$ 3,00 a R$ 8,00" },
        { label: "Volume de Contatos/Dia", value: "7 a 14 pessoas" },
        { label: "Taxa de Conversão", value: "20% com atendimento ágil" },
        { label: "Resultados/Dia", value: "2 a 3 novos clientes" },
        { label: "Resultados/Mês", value: "20 a 50 novos clientes" },
      ],
    },
  ],
  plansByService: {
    trafego_pago: [],
    sites_paginas: buildDefaultsFor("sites_paginas"),
    loja_virtual: buildDefaultsFor("loja_virtual"),
    sistemas_app: buildDefaultsFor("sistemas_app"),
  },
};

interface CalculationPreview {
  planIndex: number;
  results: {
    label: string;
    before: string;
    after: string;
  }[];
}

export default function QuotePlansSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlansSettings>(defaultSettings);
  const [activeService, setActiveService] = useState<ServicePlansKey>("trafego_pago");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<CalculationPreview | null>(null);
  const [calculating, setCalculating] = useState(false);

  const getActivePlans = (): PlanConfig[] => {
    if (activeService === "trafego_pago") return settings.plans || [];
    return settings.plansByService?.[activeService] || [];
  };
  const setActivePlans = (updater: (arr: PlanConfig[]) => PlanConfig[]) => {
    setSettings((prev) => {
      if (activeService === "trafego_pago") {
        const next = updater(prev.plans || []);
        return { ...prev, plans: next, plansByService: { ...prev.plansByService, trafego_pago: next } };
      }
      const bucket = prev.plansByService?.[activeService] || [];
      return { ...prev, plansByService: { ...prev.plansByService, [activeService]: updater(bucket) } };
    });
  };

  const parseCurrency = (text: string): number => {
    // Try to find daily value in format "(R$ 10/dia)"
    const dailyMatch = text.match(/\(R\$\s*([\d.,]+)\/dia\)/i);
    if (dailyMatch) {
      return parseFloat(dailyMatch[1].replace(/\./g, '').replace(',', '.'));
    }
    
    // Fallback to first currency value found
    const matches = text.match(/[\d.,]+/g);
    if (!matches) return 0;
    return parseFloat(matches[0].replace(/\./g, '').replace(',', '.'));
  };

  const parseMinRange = (text: string): number => {
    const matches = text.match(/[\d.,]+/g);
    if (!matches) return 0;
    const values = matches.map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')));
    return Math.min(...values);
  };

  const parsePercentage = (text: string): number => {
    const match = text.match(/(\d+)%/);
    if (!match) return 0;
    return parseInt(match[1]) / 100;
  };

  const handleGenerateEstimates = (planIndex: number) => {
    setCalculating(true);
    const activePlans = getActivePlans();
    const plan = activePlans[planIndex];
    
    // Find required metrics
    const costMetric = plan.metrics.find(m => m.label.toLowerCase().includes("custo por conversa"));
    const convMetric = plan.metrics.find(m => m.label.toLowerCase().includes("taxa de conversão"));
    
    if (!costMetric || !convMetric || !plan.ads) {
      toast({
        title: "Dados insuficientes",
        description: "Preencha o Tráfego Pago, Custo por Conversa e Taxa de Conversão para calcular.",
        variant: "destructive"
      });
      setCalculating(false);
      return;
    }

    const dailyAdsValue = parseCurrency(plan.ads);
    const costPerConversation = parseMinRange(costMetric.value);
    const conversionRate = parsePercentage(convMetric.value);

    if (dailyAdsValue === 0 || costPerConversation === 0) {
      toast({
        title: "Erro nos valores",
        description: "Os valores de tráfego e custo por conversa não podem ser zero.",
        variant: "destructive"
      });
      setCalculating(false);
      return;
    }

    // Calculations
    const contactsPerDay = Math.round(dailyAdsValue / costPerConversation);
    const resultsPerDayRaw = contactsPerDay * conversionRate;
    const resultsPerDay = Math.max(1, Math.round(resultsPerDayRaw));
    const resultsPerMonth = resultsPerDay * 30;

    // Build preview
    const previewData: CalculationPreview = {
      planIndex,
      results: [
        {
          label: "Volume de Contatos/Dia",
          before: plan.metrics.find(m => m.label.includes("Volume de Contatos"))?.value || "N/A",
          after: `${contactsPerDay} ${contactsPerDay === 1 ? 'pessoa' : 'pessoas'}`
        },
        {
          label: "Resultados/Dia",
          before: plan.metrics.find(m => m.label.includes("Resultados/Dia"))?.value || "N/A",
          after: `${resultsPerDay} ${resultsPerDay === 1 ? 'novo cliente' : 'novos clientes'}`
        },
        {
          label: "Resultados/Mês",
          before: plan.metrics.find(m => m.label.includes("Resultados/Mês"))?.value || "N/A",
          after: `${resultsPerMonth} ${resultsPerMonth === 1 ? 'novo cliente' : 'novos clientes'}`
        }
      ]
    };

    setTimeout(() => {
      setPreview(previewData);
      setCalculating(false);
      toast({ title: "Estimativas geradas com sucesso" });
    }, 600);
  };

  const applyEstimates = () => {
    if (!preview) return;
    setActivePlans((arr) => {
      const plans = [...arr];
      const plan = { ...plans[preview.planIndex] };
      const metrics = [...plan.metrics];
      preview.results.forEach(res => {
        const idx = metrics.findIndex(m => m.label.includes(res.label));
        if (idx !== -1) metrics[idx] = { ...metrics[idx], value: res.after };
        else metrics.push({ label: res.label, value: res.after });
      });
      plan.metrics = metrics;
      plans[preview.planIndex] = plan;
      return plans;
    });
    setPreview(null);
    toast({ title: "Estimativas aplicadas com sucesso" });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("sales_page_config").select("config").eq("id", "quote_plans_defaults").maybeSingle();
    if (data?.config) {
      const cfg: any = data.config;
      const map = extractServicePlansMap(cfg);
      // Convert quotePlans-shape to admin PlanConfig shape if needed
      const asPlanConfig = (arr: any[]): PlanConfig[] => arr.map((p: any) =>
        p && p.metrics && Array.isArray(p.metrics) ? p as PlanConfig : planFromDefault(p)
      );
      const trafego = asPlanConfig(map.trafego_pago?.length ? map.trafego_pago : (cfg.plans || []));
      setSettings({
        ...defaultSettings,
        ...cfg,
        plans: trafego,
        plansByService: {
          trafego_pago: trafego,
          sites_paginas: asPlanConfig(map.sites_paginas?.length ? map.sites_paginas : buildDefaultsFor("sites_paginas")),
          loja_virtual: asPlanConfig(map.loja_virtual?.length ? map.loja_virtual : buildDefaultsFor("loja_virtual")),
          sistemas_app: asPlanConfig(map.sistemas_app?.length ? map.sistemas_app : buildDefaultsFor("sistemas_app")),
        },
      });
    }
    setLoaded(true);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    // Ensure trafego mirror
    const payload = {
      ...settings,
      plans: settings.plansByService?.trafego_pago || settings.plans,
      plansByService: {
        trafego_pago: settings.plansByService?.trafego_pago || settings.plans,
        sites_paginas: settings.plansByService?.sites_paginas || [],
        loja_virtual: settings.plansByService?.loja_virtual || [],
        sistemas_app: settings.plansByService?.sistemas_app || [],
      },
    };
    const { error } = await supabase.from("sales_page_config").upsert({
      id: "quote_plans_defaults",
      config: payload as any,
      updated_at: new Date().toISOString(),
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Configurações salvas!" });
      try { window.dispatchEvent(new CustomEvent("quote-plans-updated")); } catch {}
    }
    setSaving(false);
  };

  const updatePlan = (index: number, field: keyof PlanConfig, value: any) => {
    setActivePlans((arr) => { const plans = [...arr]; plans[index] = { ...plans[index], [field]: value }; return plans; });
  };

  const addPlan = () => {
    setActivePlans((arr) => [...arr, { ...defaultPlan, name: `Opção ${arr.length + 1}` }]);
  };

  const removePlan = (index: number) => {
    setActivePlans((arr) => arr.filter((_, i) => i !== index));
  };

  const duplicatePlan = (index: number) => {
    setActivePlans((arr) => { const plans = [...arr]; plans.splice(index + 1, 0, { ...plans[index], name: plans[index].name + " (cópia)" }); return plans; });
  };

  const movePlan = (index: number, dir: -1 | 1) => {
    setActivePlans((arr) => {
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      const plans = [...arr];
      [plans[index], plans[newIndex]] = [plans[newIndex], plans[index]];
      return plans;
    });
  };

  const updateMetric = (planIndex: number, metricIndex: number, field: keyof PlanMetric, value: string) => {
    setActivePlans((arr) => {
      const plans = [...arr];
      const metrics = [...plans[planIndex].metrics];
      metrics[metricIndex] = { ...metrics[metricIndex], [field]: value };
      plans[planIndex] = { ...plans[planIndex], metrics };
      return plans;
    });
  };

  const addMetric = (planIndex: number) => {
    setActivePlans((arr) => {
      const plans = [...arr];
      plans[planIndex] = { ...plans[planIndex], metrics: [...plans[planIndex].metrics, { label: "Nova Métrica", value: "Valor" }] };
      return plans;
    });
  };

  const removeMetric = (planIndex: number, metricIndex: number) => {
    setActivePlans((arr) => {
      const plans = [...arr];
      plans[planIndex] = { ...plans[planIndex], metrics: plans[planIndex].metrics.filter((_, i) => i !== metricIndex) };
      return plans;
    });
  };

  const moveMetric = (planIndex: number, metricIndex: number, dir: -1 | 1) => {
    setActivePlans((arr) => {
      const newIndex = metricIndex + dir;
      const plans = [...arr];
      const metrics = [...plans[planIndex].metrics];
      if (newIndex < 0 || newIndex >= metrics.length) return arr;
      [metrics[metricIndex], metrics[newIndex]] = [metrics[newIndex], metrics[metricIndex]];
      plans[planIndex] = { ...plans[planIndex], metrics };
      return plans;
    });
  };

  if (!loaded) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Section header — Apple premium */}
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-50/70 via-white to-white dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-slate-900/10 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
            <Layers className="h-6 w-6 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-white">Planos do Orçamento</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">Configure os planos padrão que aparecem em novos orçamentos, o selo "Melhor Plano" e o número de WhatsApp dos CTAs.</p>
          </div>
        </div>
      </div>

      {/* WhatsApp Number */}
      <Card className="rounded-2xl border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Phone className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px] leading-tight">WhatsApp dos CTAs do Orçamento</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Este número será usado em todos os botões de WhatsApp dos orçamentos.</p>
            </div>
          </div>
          <MaskedInput
            mask="phone"
            value={settings.whatsappNumber}
            onValueChange={(v) => setSettings({ ...settings, whatsappNumber: v })}
            placeholder="(11) 99999-9999"
            className="max-w-sm h-11"
          />
        </CardContent>
      </Card>


      {/* Best Plan Defaults */}
      {(() => {
        const bp = { ...DEFAULT_BEST_PLAN_STYLE, ...(settings.bestPlanStyle || {}) };
        const updateBp = (patch: Partial<BestPlanStyleConfig>) =>
          setSettings({ ...settings, bestPlanStyle: { ...bp, ...patch } });
        return (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold">Selo "Melhor Plano" (Plano Destaque)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Padrões do selo. A escolha de qual plano recebe o selo é feita em cada orçamento.
              </p>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm font-medium">Habilitar selo</Label>
                  <p className="text-xs text-muted-foreground">Mostra o selo animado acima do plano destaque.</p>
                </div>
                <Switch checked={bp.enabled} onCheckedChange={(v) => updateBp({ enabled: v })} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Texto padrão do selo</Label>
                  <Input value={bp.label} onChange={(e) => updateBp({ label: e.target.value })} placeholder="🚀 Melhor Plano para Você" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cor do selo</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bp.color} onChange={(e) => updateBp({ color: e.target.value })} className="h-9 w-12 rounded border cursor-pointer" />
                    <Input value={bp.color} onChange={(e) => updateBp({ color: e.target.value })} className="flex-1" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Velocidade da animação ({bp.pulseSpeed.toFixed(1)}s)</Label>
                  <Slider min={0.5} max={4} step={0.1} value={[bp.pulseSpeed]} onValueChange={([v]) => updateBp({ pulseSpeed: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Intensidade do brilho ({bp.glowIntensity}%)</Label>
                  <Slider min={0} max={100} step={5} value={[bp.glowIntensity]} onValueChange={([v]) => updateBp({ glowIntensity: v })} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo de animação</Label>
                  <Select value={bp.animation} onValueChange={(v: any) => updateBp({ animation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulse">Pulsar</SelectItem>
                      <SelectItem value="glow">Brilhar</SelectItem>
                      <SelectItem value="bounce">Quicar</SelectItem>
                      <SelectItem value="rocket-shake">Tremer (foguete)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm font-medium">Mostrar foguete 🚀</Label>
                    <p className="text-xs text-muted-foreground">Foguete animado com chama.</p>
                  </div>
                  <Switch checked={bp.rocketEnabled} onCheckedChange={(v) => updateBp({ rocketEnabled: v })} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm font-medium">Sincronizar tabela de expectativas</Label>
                  <p className="text-xs text-muted-foreground">Pulsa a tabela "Expectativa Realista" do plano destaque.</p>
                </div>
                <Switch checked={bp.syncMetricsTable} onCheckedChange={(v) => updateBp({ syncMetricsTable: v })} />
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Service Tabs */}
      <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-background/80 backdrop-blur-sm rounded-2xl border border-border/60 flex flex-wrap gap-2 justify-center">
        {SERVICE_TYPES.map((s) => {
          const Icon = s.icon;
          const active = activeService === s.key;
          const count = (activeService === s.key ? getActivePlans() : (settings.plansByService?.[s.key] || (s.key === "trafego_pago" ? settings.plans : []))).length;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveService(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted"}`}
            >
              <Icon className={`h-4 w-4 ${active ? "" : s.color}`} />
              {s.label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Editando planos de <strong>{SERVICE_TYPES.find(s => s.key === activeService)?.label}</strong>. Cada serviço tem seus próprios planos, independentes.
      </div>

      {/* Plans */}
      {getActivePlans().map((plan, planIdx) => (
        <Card key={planIdx}>
          <CardContent className="pt-6 space-y-5">
            {/* Plan Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={plan.name}
                  onChange={(e) => updatePlan(planIdx, "name", e.target.value)}
                  className="h-8 w-40 font-semibold text-sm"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePlan(planIdx, -1)} disabled={planIdx === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePlan(planIdx, 1)} disabled={planIdx === getActivePlans().length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicatePlan(planIdx)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removePlan(planIdx)} disabled={getActivePlans().length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Values */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Total/mês</Label>
                <Input value={plan.total} onChange={(e) => updatePlan(planIdx, "total", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mão de Obra</Label>
                <Input value={plan.labor} onChange={(e) => updatePlan(planIdx, "labor", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tráfego Pago</Label>
                <Input value={plan.ads} onChange={(e) => updatePlan(planIdx, "ads", e.target.value)} />
              </div>
            </div>

            {/* Metrics */}
            <Card className="border-border/60">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Estimativa de Resultados</h4>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                    onClick={() => handleGenerateEstimates(planIdx)}
                    disabled={calculating}
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${calculating ? 'animate-pulse' : ''}`} />
                    {calculating ? "Calculando..." : "Gerar Estimativas"}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor de Tráfego/Dia (aparece no título da seção)</Label>
                  <Input
                    value={plan.dailyAds}
                    onChange={(e) => updatePlan(planIdx, "dailyAds", e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <p className="text-xs text-primary">
                  Título: 🎯 Expectativa Realista com {plan.dailyAds}*
                </p>
                <Label className="text-xs text-muted-foreground">Métricas</Label>
                <div className="space-y-2">
                  {plan.metrics.map((metric, mIdx) => (
                    <div key={mIdx} className="flex gap-2 group">
                      <Input
                        value={metric.label}
                        onChange={(e) => updateMetric(planIdx, mIdx, "label", e.target.value)}
                        className="flex-1 text-sm"
                        placeholder="Nome da métrica"
                      />
                      <Input
                        value={metric.value}
                        onChange={(e) => updateMetric(planIdx, mIdx, "value", e.target.value)}
                        className="flex-1 text-sm"
                        placeholder="Valor"
                      />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon"
                          className="h-10 w-8"
                          onClick={() => moveMetric(planIdx, mIdx, -1)}
                          disabled={mIdx === 0}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-10 w-8"
                          onClick={() => moveMetric(planIdx, mIdx, 1)}
                          disabled={mIdx === plan.metrics.length - 1}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-10 w-8 text-destructive"
                          onClick={() => removeMetric(planIdx, mIdx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addMetric(planIdx)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Métrica
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      ))}

      {/* Add plan */}
      <Button variant="outline" className="w-full border-dashed h-11 rounded-xl" onClick={addPlan}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar Novo Plano
      </Button>

      {/* Save — sticky footer bar */}
      <div className="sticky bottom-0 -mx-2 md:-mx-4 mt-6 z-10">
        <div className="rounded-2xl border border-border/60 bg-background/85 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Alterações são aplicadas em <strong>novos orçamentos</strong>. Orçamentos existentes podem ser atualizados individualmente.
          </p>
          <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 ml-auto" onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>


      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Confirmar Estimativas
            </DialogTitle>
            <DialogDescription>
              Confira os valores calculados automaticamente para o plano <strong>{preview?.planIndex !== undefined && getActivePlans()[preview.planIndex]?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-muted-foreground mb-1 px-2">
              <span>MÉTRICA</span>
              <div className="grid grid-cols-2 gap-2">
                <span>ATUAL</span>
                <span>NOVO</span>
              </div>
            </div>
            
            {preview?.results.map((res, i) => (
              <div key={i} className="bg-muted/50 p-3 rounded-lg border border-border/50 space-y-1">
                <div className="text-sm font-semibold text-foreground">{res.label}</div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="text-xs text-muted-foreground line-through truncate">{res.before}</div>
                  <div className="text-sm font-bold text-primary flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {res.after}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="ghost" onClick={() => setPreview(null)} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={applyEstimates} className="gap-2">
              <Check className="h-4 w-4" />
              Aplicar Estimativas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
