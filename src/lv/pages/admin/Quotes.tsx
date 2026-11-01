// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { getQuoteUrl } from "@/lv/lib/domainUtils";
import { buildLegacyPlanFields, DEFAULT_PLAN_ITEMS, normalizePlanDefaults } from "@/lv/lib/quotePlans";
import { useAuth } from "@/lv/hooks/useAuth";
import { supabase } from "@/lv/integrations/supabase/client";
import { db } from "@/lv/lib/supabaseClient";
import MatrixEffectSettings, { type MatrixConfig, defaultMatrixConfig, parseMatrixConfig } from "@/lv/components/admin/MatrixEffectSettings";
import WhatsAppWidgetSettings, { type WhatsAppWidgetConfig, defaultWhatsAppWidgetConfig, parseWhatsAppWidgetConfig } from "@/lv/components/admin/WhatsAppWidgetSettings";
import ConfigActionBar, { loadDefaultConfig } from "@/lv/components/admin/ConfigImportActions";
import { useSearchParams } from "@/lv/shims/router";
import { Button } from "@/lv/components/ui/button";
import { Switch } from "@/lv/components/ui/switch";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Textarea } from "@/lv/components/ui/textarea";
import { Card, CardContent } from "@/lv/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/lv/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lv/components/ui/tabs";
import { useToast } from "@/lv/hooks/use-toast";
import { colorThemes } from "@/lv/lib/colorThemes";
import { Plus, Trash2, Eye, Copy, Pencil, Monitor, Smartphone, Tablet, Printer, X, Lock, FileText, Link2, Shield, Palette, DollarSign, LayoutTemplate, Users, Search, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Clock, UserPlus, Sparkles, RotateCcw, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { SERVICE_TYPES, getServiceTypeMeta, type ServiceTypeKey } from "@/lv/lib/serviceTypes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/lv/components/ui/table";
import { InternalViewIcon, ExternalViewIcon, ViewCountBadge, RowActionsMenu } from "@/lv/components/admin/PremiumViewIcons";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/lv/components/ui/confirm-delete-dialog";
import MaskedInput from "@/lv/components/admin/MaskedInput";
import { maskPhoneBR, maskCurrency } from "@/lv/lib/masks";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/lv/components/ui/popover";



interface PlanConfigItem {
  name: string;
  total: string;
  labor: string;
  ads: string;
  dailyAds: string;
  metrics: { label: string; value: string }[];
  items: string[];
  visible: boolean;
  is_popular: boolean;
  cta_text: string;
  hidden: boolean;
  highlighted: boolean;
  badge: string;
  ctaLabel: string;
  bestPlan: boolean;
  bestPlanLabel: string;
}

interface QuoteForm {
  clientName: string; businessType: string; city: string; subtitle: string;
  colorTheme: string; whatsappNumber: string; password: string; slug: string;
  plansConfig: PlanConfigItem[];
  availableColors: string[];
  layoutType: string;
  selectedClientId: string;
  matrixEnabled: boolean;
  matrixEffect: string;
  matrixDuration: number;
  matrixColor: string;
  matrixText: string;
  gender: "masculino" | "feminino";
  ticketMedio: string;
  serviceType: ServiceTypeKey;
}

const defaultPlanItems = [...DEFAULT_PLAN_ITEMS];

const defaultPlan: PlanConfigItem = {
  name: "Plano Essencial",
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
  items: [...defaultPlanItems],
  visible: true,
  is_popular: false,
  cta_text: "Quero Este Plano",
  hidden: false,
  highlighted: false,
  badge: "",
  ctaLabel: "",
  bestPlan: false,
  bestPlanLabel: "",
};

const emptyForm: QuoteForm = {
  clientName: "", businessType: "", city: "", subtitle: "", colorTheme: "blue-white", whatsappNumber: "", password: "", slug: "",
  plansConfig: [
    { ...defaultPlan, name: "Plano Essencial" },
    { ...defaultPlan, name: "Plano Completo", total: "R$ 3.000", labor: "R$ 1.500,00", ads: "R$ 1.500,00 (R$ 50/dia)", is_popular: true, highlighted: true, badge: "⭐ Mais Popular" },
  ],
  availableColors: [],
  layoutType: "simple",
  selectedClientId: "",
  matrixEnabled: false, matrixEffect: "converge", matrixDuration: 2000, matrixColor: "#00ff41", matrixText: "",
  gender: "masculino", ticketMedio: "",
  serviceType: "trafego_pago",
};

type DeviceType = "desktop" | "tablet" | "mobile";
const deviceSizes: Record<DeviceType, { width: number; height: number; label: string; icon: typeof Monitor }> = {
  desktop: { width: 1280, height: 800, label: "Desktop", icon: Monitor },
  tablet: { width: 768, height: 1024, label: "Tablet", icon: Tablet },
  mobile: { width: 375, height: 812, label: "Mobile", icon: Smartphone },
};

export default function Quotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QuoteForm>({ ...emptyForm });
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<DeviceType>("desktop");
  const [formTab, setFormTab] = useState("info");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [prefillHandled, setPrefillHandled] = useState(false);
  const [matrixConfig, setMatrixConfig] = useState<MatrixConfig>({ ...defaultMatrixConfig });
  const [whatsappWidgetConfig, setWhatsappWidgetConfig] = useState<WhatsAppWidgetConfig>({ ...defaultWhatsAppWidgetConfig });
  const [showTrash, setShowTrash] = useState(false);
  const [trashRetentionDays, setTrashRetentionDays] = useState(30);
  const [showServicePicker, setShowServicePicker] = useState(false);

  useEffect(() => { fetchQuotes(); fetchClients(); }, []);

  // Handle prefillClient from URL params (coming from Clients page)
  useEffect(() => {
    if (prefillHandled || clients.length === 0) return;
    const prefillClientId = searchParams.get("prefillClient");
    if (prefillClientId) {
      const cl = clients.find(c => c.id === prefillClientId);
      if (cl) {
        setForm({
          ...emptyForm,
          clientName: cl.name,
          businessType: cl.business_type || "",
          city: cl.city || "",
          whatsappNumber: cl.whatsapp || "",
          selectedClientId: cl.id,
        });
        setEditingId(null);
        setFormTab("info");
        setShowForm(true);
        toast({ title: "Dados preenchidos!", description: `Criando orçamento para "${cl.name}".` });
      }
      setSearchParams({}, { replace: true });
      setPrefillHandled(true);
    }
  }, [clients, prefillHandled, searchParams]);

  const fetchQuotes = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (data) setQuotes(data);
  };

  const activeQuotes = quotes.filter((q: any) => !q.deleted_at);
  const deletedQuotes = quotes.filter((q: any) => !!q.deleted_at);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setClients(data);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

  const loadAdminPlansForForm = async () => {
    const { data } = await supabase.from("sales_page_config").select("config").eq("id", "quote_plans_defaults").maybeSingle();
    const defaults = normalizePlanDefaults(data?.config || {});
    return defaults.map((p, i) => ({
      ...defaultPlan,
      name: p.title || `Opção ${i + 1}`,
      total: p.total || defaultPlan.total,
      labor: p.labor || defaultPlan.labor,
      ads: p.ads || defaultPlan.ads,
      dailyAds: p.metrics?.trafficDailyLabel || defaultPlan.dailyAds,
      metrics: (p.metrics?.rows || defaultPlan.metrics.map(m => [m.label, m.value])).map((r: any) => ({ label: String(r[0] || ""), value: String(r[1] || "") })),
      items: p.items?.length ? p.items : [...defaultPlanItems],
      hidden: !!p.hidden,
      visible: !p.hidden,
      highlighted: !!p.highlighted,
      is_popular: !!p.highlighted,
      badge: p.badge || "",
      ctaLabel: p.ctaLabel || "",
      cta_text: p.ctaLabel || "Quero Este Plano",
    }));
  };

  const openCreate = () => {
    // First open service-type picker; actual form opens after choice.
    setShowServicePicker(true);
  };

  const startCreateWithService = async (serviceType: ServiceTypeKey) => {
    setShowServicePicker(false);
    setEditingId(null); setFormTab("info");
    const [matrixDef, whatsappDef, adminPlans] = await Promise.all([
      loadDefaultConfig("quote", "matrix"),
      loadDefaultConfig("quote", "whatsapp"),
      loadAdminPlansForForm(),
    ]);
    setMatrixConfig(matrixDef ? { ...defaultMatrixConfig, ...matrixDef } : { ...defaultMatrixConfig });
    setWhatsappWidgetConfig(whatsappDef ? { ...defaultWhatsAppWidgetConfig, ...whatsappDef } : { ...defaultWhatsAppWidgetConfig });

    const newForm = { ...emptyForm, serviceType };
    if (adminPlans.length > 0) newForm.plansConfig = adminPlans;
    setForm(newForm);
    setShowForm(true);
  };

  const openEdit = async (q: any) => {
    setEditingId(q.id);
    // Build plansConfig from plans_config or fallback to plan1/plan2
    let plansConfig: PlanConfigItem[] = [];
    const pc = q.plans_config as any;
    if (Array.isArray(pc) && pc.length > 0) {
      plansConfig = pc.map((p: any, i: number) => ({
        ...defaultPlan,
        name: p.name || p.title || "Plano",
        total: p.total || "",
        labor: p.labor || "",
        ads: p.ads || "",
        dailyAds: p.metrics?.trafficDailyLabel || p.dailyAds || "",
        metrics: (p.metrics?.rows || p.metrics || []).map((r: any) => Array.isArray(r) ? { label: String(r[0] || ""), value: String(r[1] || "") } : { label: String(r.label || ""), value: String(r.value || "") }),
        items: Array.isArray(p.items) ? p.items as string[] : [],
        visible: p.visible !== false,
        is_popular: !!p.is_popular,
        cta_text: p.cta_text || p.ctaLabel || "Quero Este Plano",
        hidden: !!p.hidden,
        highlighted: !!p.highlighted || !!p.is_popular,
        badge: p.badge || "",
        ctaLabel: p.ctaLabel || p.cta_text || "",
        bestPlan: false,
        bestPlanLabel: "",
      }));
    } else {
      plansConfig = [
        { ...defaultPlan, name: "Plano Essencial", total: q.plan1_total, labor: q.plan1_labor, ads: q.plan1_ads, items: Array.isArray(q.plan1_items) ? q.plan1_items as string[] : [] },
        { ...defaultPlan, name: "Plano Completo", total: q.plan2_total, labor: q.plan2_labor, ads: q.plan2_ads, items: Array.isArray(q.plan2_items) ? q.plan2_items as string[] : [], is_popular: true, highlighted: true, badge: "⭐ Mais Popular" },
      ];
      const { data: plansDef } = await supabase.from("sales_page_config").select("config").eq("id", "quote_plans_defaults").maybeSingle();
      const adminCfg = plansDef?.config as any;
      if (adminCfg?.plans?.length > 2) {
        for (let i = 2; i < adminCfg.plans.length; i++) {
          const ap = adminCfg.plans[i];
          plansConfig.push({
            ...defaultPlan,
            name: ap.name || `Opção ${i + 1}`,
            total: ap.total || defaultPlan.total,
            labor: ap.labor || defaultPlan.labor,
            ads: ap.ads || defaultPlan.ads,
            dailyAds: ap.dailyAds || defaultPlan.dailyAds,
            metrics: Array.isArray(ap.metrics) ? ap.metrics : defaultPlan.metrics,
          });
        }
      }
    }
    // Apply best_plan_config from saved quote
    const bpc = (q as any).best_plan_config && typeof (q as any).best_plan_config === "object" ? (q as any).best_plan_config : null;
    if (bpc && bpc.enabled !== false && Number.isFinite(Number(bpc.planIndex))) {
      const idx = Number(bpc.planIndex);
      if (plansConfig[idx]) {
        plansConfig[idx].bestPlan = true;
        plansConfig[idx].bestPlanLabel = bpc.label || "";
      }
    }
    setForm({
      clientName: q.client_name, businessType: q.client_business_type, city: q.city,
      subtitle: q.subtitle, colorTheme: q.color_theme, whatsappNumber: q.whatsapp_number || "",
      password: q.password || "", slug: q.slug || "",
      plansConfig,
      availableColors: Array.isArray(q.available_colors) ? q.available_colors as string[] : [],
      layoutType: q.layout_type || "simple",
      selectedClientId: "",
      matrixEnabled: q.matrix_enabled ?? false,
      matrixEffect: q.matrix_effect || "converge",
      matrixDuration: q.matrix_duration || 2000,
      matrixColor: q.matrix_color || "#00ff41",
      matrixText: q.matrix_text || "",
      gender: (q.gender as any) || "masculino",
      ticketMedio: q.ticket_medio || "",
      serviceType: ((q as any).service_type as ServiceTypeKey) || "trafego_pago",
    });
    setMatrixConfig(parseMatrixConfig({ matrix_enabled: q.matrix_enabled, matrix_effect: q.matrix_effect, matrix_duration: q.matrix_duration, matrix_color: q.matrix_color, matrix_text: q.matrix_text }));
    setWhatsappWidgetConfig(parseWhatsAppWidgetConfig(q.whatsapp_widget_config || {}));
    setFormTab("info");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const plansConfigPayload = form.plansConfig.map(p => ({
      title: p.name,
      total: p.total,
      labor: p.labor,
      ads: p.ads,
      items: p.items,
      metrics: {
        trafficDailyLabel: p.dailyAds,
        rows: p.metrics.map((m) => [m.label, m.value]),
      },
      hidden: p.hidden,
      highlighted: p.highlighted,
      badge: p.badge || undefined,
      ctaLabel: p.ctaLabel || undefined,
    }));
    const legacyFields = buildLegacyPlanFields(plansConfigPayload as any);
    const bestIdx = form.plansConfig.findIndex(p => p.bestPlan);
    const bestPlanConfigPayload = bestIdx >= 0
      ? { enabled: true, planIndex: bestIdx, label: form.plansConfig[bestIdx].bestPlanLabel || "" }
      : { enabled: false };
    const payload = {
      client_name: form.clientName, client_business_type: form.businessType, city: form.city,
      subtitle: form.subtitle, color_theme: form.colorTheme, whatsapp_number: form.whatsappNumber,
      password: form.password || null,
      ...legacyFields,
      plans_config: plansConfigPayload,
      best_plan_config: bestPlanConfigPayload,
      available_colors: form.availableColors,
      layout_type: form.layoutType,
      matrix_enabled: matrixConfig.enabled,
      matrix_effect: matrixConfig.effect,
      matrix_duration: matrixConfig.duration,
      matrix_color: matrixConfig.color,
      matrix_text: matrixConfig.text,
      whatsapp_widget_config: whatsappWidgetConfig,
      gender: form.gender,
      ticket_medio: form.ticketMedio || null,
      service_type: form.serviceType,
    } as any;
    const saveQuotePayload = async (quotePayload: any) => {
      if (editingId) {
        return await db.from("quotes").update({ ...quotePayload, slug: form.slug || undefined }).eq("id", editingId);
      }
      const slug = form.slug || generateSlug(form.clientName);
      return await db.from("quotes").insert({ ...quotePayload, user_id: user.id, slug }).select("id").maybeSingle();
    };

    let error: any;
    let newQuoteId: string | null = null;
    const result = await saveQuotePayload(payload);
    error = result.error;

    if (error?.message?.includes("schema cache")) {
      const retry = await saveQuotePayload(payload);
      error = retry.error;
      if (!editingId) newQuoteId = retry.data?.id || null;
    } else if (!editingId) {
      newQuoteId = result.data?.id || null;
    }
    if (editingId) {
      newQuoteId = editingId;
    }

    // Auto-link quote to selected client
    if (!error && newQuoteId && form.selectedClientId) {
      await supabase.from("clients").update({ quote_id: newQuoteId }).eq("id", form.selectedClientId);
    }

    if (error) { 
      console.error("Erro ao salvar orçamento:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" }); 
    }
    else { toast({ title: editingId ? "Orçamento atualizado!" : "Orçamento criado!" }); setShowForm(false); fetchQuotes(); fetchClients(); }
    setSubmitting(false);
  };

  // Convert quote to client
  const convertToClient = async (q: any) => {
    if (!user) return;
    // Check if already linked
    const existing = clients.find(c => c.quote_id === q.id);
    if (existing) {
      toast({ title: "Já vinculado", description: `Este orçamento já está vinculado ao cliente "${existing.name}".` });
      return;
    }
    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      name: q.client_name,
      company_name: q.client_name.includes(" ") && q.client_name.toUpperCase() === q.client_name ? q.client_name : "",
      business_type: q.client_business_type || "",
      city: q.city || "",
      whatsapp: q.whatsapp_number || "",
      status: "orcamento" as any,
      monthly_value: 0,
      due_day: 10,
      quote_id: q.id,
      notes: `Convertido de orçamento: ${q.slug}`
    });

    if (error) {
      console.error("Erro ao converter orçamento em cliente:", error);
      toast({ 
        title: "Erro ao converter", 
        description: `Ocorreu um problema ao salvar os dados: ${error.message}`, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Cliente criado com sucesso!", 
        description: `"${q.client_name}" foi adicionado à lista de clientes e o orçamento foi vinculado.` 
      });
      // Importante: recarregar as listas para atualizar a interface imediatamente
      await Promise.all([fetchClients(), fetchQuotes()]);
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      // 1. Delete associated views
      const { error: viewsError } = await supabase.from("quote_views").delete().eq("quote_id", id);
      if (viewsError) throw viewsError;

      // 2. Delete the quote itself
      const { error: quoteError } = await supabase.from("quotes").delete().eq("id", id);
      if (quoteError) throw quoteError;

      setQuotes(prev => prev.filter(q => q.id !== id));
      toast({ title: "Orçamento excluído com sucesso" });
    } catch (error: any) {
      console.error("Error deleting quote:", error);
      toast({ 
        title: "Erro ao excluir orçamento", 
        description: error.message || "Ocorreu um erro inesperado", 
        variant: "destructive" 
      });
    }
  };

  const restoreQuote = async (id: string) => {
    const { data, error } = await supabase.from("quotes").update({ deleted_at: null } as any).eq("id", id).select("id").maybeSingle();
    if (error || !data) toast({ title: "Erro ao restaurar", description: error?.message || "Nenhum orçamento foi restaurado.", variant: "destructive" });
    else { setQuotes(prev => prev.map(q => q.id === id ? { ...q, deleted_at: null } : q)); toast({ title: "Orçamento restaurado!" }); }
  };

  const permanentDeleteQuote = async (id: string) => {
    try {
      // 1. Delete associated views
      const { error: viewsError } = await supabase.from("quote_views").delete().eq("quote_id", id);
      if (viewsError) throw viewsError;

      // 2. Delete the quote itself
      const { error: quoteError } = await supabase.from("quotes").delete().eq("id", id);
      if (quoteError) throw quoteError;

      fetchQuotes();
      toast({ title: "Orçamento excluído permanentemente" });
    } catch (error: any) {
      console.error("Error permanent deleting quote:", error);
      toast({ 
        title: "Erro ao excluir permanentemente", 
        description: error.message || "Ocorreu um erro inesperado", 
        variant: "destructive" 
      });
    }
  };

  const { deleteTarget: permDeleteQuoteTarget, requestDelete: requestPermDeleteQuote, confirmDelete: confirmPermDeleteQuote, cancelDelete: cancelPermDeleteQuote } = useConfirmDelete(permanentDeleteQuote);

  const { deleteTarget: deleteQuoteTarget, requestDelete: requestDeleteQuote, confirmDelete: confirmDeleteQuote, cancelDelete: cancelDeleteQuote } = useConfirmDelete(deleteQuote);
  const copyLink = (slug: string) => { navigator.clipboard.writeText(getQuoteUrl(slug)); toast({ title: "Link copiado!" }); };
  const handlePrint = (slug: string) => {
    const w = window.open(getQuoteUrl(slug), "_blank");
    if (w) w.addEventListener("load", () => setTimeout(() => w.print(), 1500));
  };

  const updateField = (field: keyof QuoteForm, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const updatePlanConfig = (planIndex: number, field: keyof PlanConfigItem, value: any) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      plans[planIndex] = { ...plans[planIndex], [field]: value };
      return { ...f, plansConfig: plans };
    });
  };

  const toggleBestPlan = (planIndex: number, value: boolean) => {
    setForm(f => {
      const plans = f.plansConfig.map((p, i) => ({
        ...p,
        bestPlan: i === planIndex ? value : (value ? false : p.bestPlan),
      }));
      return { ...f, plansConfig: plans };
    });
  };

  const updatePlanItem = (planIndex: number, itemIndex: number, val: string) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      const items = [...plans[planIndex].items];
      items[itemIndex] = val;
      plans[planIndex] = { ...plans[planIndex], items };
      return { ...f, plansConfig: plans };
    });
  };

  const removePlanItem = (planIndex: number, itemIndex: number) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      plans[planIndex] = { ...plans[planIndex], items: plans[planIndex].items.filter((_, idx) => idx !== itemIndex) };
      return { ...f, plansConfig: plans };
    });
  };

  const addPlanItem = (planIndex: number) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      plans[planIndex] = { ...plans[planIndex], items: [...plans[planIndex].items, ""] };
      return { ...f, plansConfig: plans };
    });
  };

  const updatePlanMetric = (planIndex: number, metricIndex: number, field: "label" | "value", value: string) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      const metrics = [...(plans[planIndex].metrics || [])];
      metrics[metricIndex] = { ...metrics[metricIndex], [field]: value };
      plans[planIndex] = { ...plans[planIndex], metrics };
      return { ...f, plansConfig: plans };
    });
  };

  const addPlanMetric = (planIndex: number) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      plans[planIndex] = { ...plans[planIndex], metrics: [...(plans[planIndex].metrics || []), { label: "Nova Métrica", value: "Valor" }] };
      return { ...f, plansConfig: plans };
    });
  };

  const removePlanMetric = (planIndex: number, metricIndex: number) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      plans[planIndex] = { ...plans[planIndex], metrics: plans[planIndex].metrics.filter((_, idx) => idx !== metricIndex) };
      return { ...f, plansConfig: plans };
    });
  };

  const addNewPlan = () => {
    setForm(f => ({
      ...f,
      plansConfig: [...f.plansConfig, { ...defaultPlan, name: `Opção ${f.plansConfig.length + 1}` }],
    }));
  };

  const duplicatePlan = (planIndex: number) => {
    setForm(f => {
      const plans = [...f.plansConfig];
      const clone = { ...plans[planIndex], items: [...plans[planIndex].items], metrics: [...plans[planIndex].metrics], name: plans[planIndex].name + " (cópia)" };
      plans.splice(planIndex + 1, 0, clone);
      return { ...f, plansConfig: plans };
    });
  };

  const refreshPlansFromAdmin = async () => {
    const adminPlans = await loadAdminPlansForForm();
    if (adminPlans.length === 0) return;
    setForm(f => {
      // Preserva o estado de visibilidade (ativado/desativado) escolhido pelo admin
      // para este orçamento, aplicando apenas os dados/valores atualizados.
      const prevByName = new Map(
        f.plansConfig.map(p => [String(p.name || "").trim().toLowerCase(), p])
      );
      const merged = adminPlans.map(np => {
        const prev = prevByName.get(String(np.name || "").trim().toLowerCase());
        if (!prev) return np;
        return {
          ...np,
          hidden: prev.hidden,
          highlighted: prev.highlighted,
          bestPlan: prev.bestPlan,
          bestPlanLabel: prev.bestPlanLabel,
        };
      });
      return { ...f, plansConfig: merged };
    });
    setFormTab("plan0");
    toast({ title: "Valores dos planos atualizados", description: "Planos ativos/desativados mantidos como você configurou. Salve para publicar." });
  };

  const removePlan = (planIndex: number) => {
    if (form.plansConfig.length <= 1) return;
    setForm(f => ({ ...f, plansConfig: f.plansConfig.filter((_, i) => i !== planIndex) }));
    setFormTab("info");
  };

  const movePlan = (planIndex: number, direction: "up" | "down") => {
    setForm(f => {
      const plans = [...f.plansConfig];
      const targetIndex = direction === "up" ? planIndex - 1 : planIndex + 1;
      if (targetIndex < 0 || targetIndex >= plans.length) return f;
      [plans[planIndex], plans[targetIndex]] = [plans[targetIndex], plans[planIndex]];
      return { ...f, plansConfig: plans };
    });
    setFormTab(`plan${direction === "up" ? planIndex - 1 : planIndex + 1}`);
  };

  const currentDevice = deviceSizes[previewDevice];

  const renderPlanFields = (planIndex: number) => {
    const plan = form.plansConfig[planIndex];
    if (!plan) return null;

    return (
      <div className="space-y-5">
        {/* Plan actions bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              value={plan.name}
              onChange={(e) => updatePlanConfig(planIndex, "name", e.target.value)}
              className="h-8 w-48 font-semibold text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePlan(planIndex, "up")} disabled={planIndex === 0} title="Mover para cima">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePlan(planIndex, "down")} disabled={planIndex === form.plansConfig.length - 1} title="Mover para baixo">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicatePlan(planIndex)} title="Duplicar plano">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePlan(planIndex)} disabled={form.plansConfig.length <= 1} title="Excluir plano">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Switches: hidden, highlighted */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={!plan.hidden} onCheckedChange={(v) => updatePlanConfig(planIndex, "hidden", !v)} />
            <Label className="text-xs text-muted-foreground">Visível na página</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={plan.highlighted} onCheckedChange={(v) => updatePlanConfig(planIndex, "highlighted", v)} />
            <Label className="text-xs text-muted-foreground">Destacado (pulse-glow)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={plan.bestPlan} onCheckedChange={(v) => toggleBestPlan(planIndex, v)} />
            <Label className="text-xs text-muted-foreground">🚀 Plano Destaque (Melhor Plano)</Label>
          </div>
        </div>

        {plan.bestPlan && (
          <div className="space-y-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
            <Label className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Texto do selo (deixe vazio para usar o padrão do admin)</Label>
            <Input value={plan.bestPlanLabel} onChange={(e) => updatePlanConfig(planIndex, "bestPlanLabel", e.target.value)} placeholder="🚀 Melhor Plano para Você" className="h-10" />
          </div>
        )}

        {/* Badge & CTA Label */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Badge (ex: ⭐ Mais Popular)</Label>
            <Input value={plan.badge} onChange={(e) => updatePlanConfig(planIndex, "badge", e.target.value)} placeholder="⭐ Mais Popular" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Texto do Botão CTA</Label>
            <Input value={plan.ctaLabel} onChange={(e) => updatePlanConfig(planIndex, "ctaLabel", e.target.value)} placeholder="Quero Este Plano" className="h-10" />
          </div>
        </div>

        {/* Values */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Total/mês</Label>
            <Input value={plan.total} onChange={(e) => updatePlanConfig(planIndex, "total", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mão de Obra</Label>
            <Input value={plan.labor} onChange={(e) => updatePlanConfig(planIndex, "labor", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tráfego Pago</Label>
            <Input value={plan.ads} onChange={(e) => updatePlanConfig(planIndex, "ads", e.target.value)} className="h-10" />
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valor de Tráfego/Dia (título da seção de expectativas)</Label>
            <Input value={plan.dailyAds} onChange={(e) => updatePlanConfig(planIndex, "dailyAds", e.target.value)} className="h-10 max-w-sm" />
          </div>
          <Label className="text-xs text-muted-foreground">Métricas da Expectativa de Resultados</Label>
          <div className="space-y-2">
            {plan.metrics.map((metric, metricIndex) => (
              <div key={metricIndex} className="flex gap-2 group">
                <Input value={metric.label} onChange={(e) => updatePlanMetric(planIndex, metricIndex, "label", e.target.value)} className="text-sm h-10 flex-1" />
                <Input value={metric.value} onChange={(e) => updatePlanMetric(planIndex, metricIndex, "value", e.target.value)} className="text-sm h-10 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => removePlanMetric(planIndex, metricIndex)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => addPlanMetric(planIndex)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Métrica
          </Button>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Itens Inclusos</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {plan.items.map((item, i) => (
              <div key={i} className="flex gap-2 group">
                <div className="flex items-center justify-center w-6 h-10 text-xs text-muted-foreground/50 font-mono">{i + 1}</div>
                <Input value={item} onChange={(e) => updatePlanItem(planIndex, i, e.target.value)} className="text-sm h-10 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => removePlanItem(planIndex, i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => addPlanItem(planIndex)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Item
          </Button>
        </div>
      </div>
    );
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "created_at" ? "desc" : "asc"); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const QUOTE_STATUS_OPTIONS = [
    { value: "pendente", label: "Pendente", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    { value: "convertido", label: "Convertido", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    { value: "recusado", label: "Recusado", color: "bg-red-500/10 text-red-600 border-red-500/30" },
    { value: "expirado", label: "Expirado", color: "bg-gray-500/10 text-gray-500 border-gray-500/30" },
  ];

  const getQuoteStatus = (q: any) => {
    const linked = clients.find(c => c.quote_id === q.id);
    if (linked) return "convertido";
    return "pendente";
  };

  const getLinkedClient = (q: any) => clients.find(c => c.quote_id === q.id);

  const updateQuoteSlug = async (id: string, newSlug: string) => {
    const { error } = await supabase.from("quotes").update({ slug: newSlug }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Slug atualizado!" }); fetchQuotes(); }
  };

  const listedQuotes = showTrash ? deletedQuotes : activeQuotes;
  const filteredQuotes = listedQuotes
    .filter(q => !search || q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      q.client_business_type.toLowerCase().includes(search.toLowerCase()) ||
      q.city.toLowerCase().includes(search.toLowerCase()) ||
      q.slug.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case "client_name": valA = a.client_name.toLowerCase(); valB = b.client_name.toLowerCase(); break;
        case "city": valA = a.city.toLowerCase(); valB = b.city.toLowerCase(); break;
        case "service_type": valA = (a.service_type || ""); valB = (b.service_type || ""); break;
        case "view_count": valA = a.view_count || 0; valB = b.view_count || 0; break;
        case "internal_view_count": valA = (a as any).internal_view_count || 0; valB = (b as any).internal_view_count || 0; break;
        case "external_view_count": valA = (a as any).external_view_count || 0; valB = (b as any).external_view_count || 0; break;
        case "last_viewed_at": valA = (a as any).last_viewed_at || ""; valB = (b as any).last_viewed_at || ""; break;
        case "status": valA = clients.find(c => c.quote_id === a.id) ? 1 : 0; valB = clients.find(c => c.quote_id === b.id) ? 1 : 0; break;
        default: valA = a.created_at; valB = b.created_at;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalViews = activeQuotes.reduce((sum: number, q: any) => sum + (q.view_count || 0), 0);
  const viewedCount = activeQuotes.filter((q: any) => (q.view_count || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* KPI cards + actions — Apple premium */}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-stretch">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/10 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <FileText className="h-3.5 w-3.5" /> Total de Orçamentos
          </div>
          <div className="mt-2 text-[26px] leading-none font-semibold tabular-nums tracking-tight">{activeQuotes.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900/10 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Visualizados
          </div>
          <div className="mt-2 text-[26px] leading-none font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">{viewedCount}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">de {activeQuotes.length} enviados</div>
        </div>
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-white dark:from-primary/10 dark:to-slate-900/10 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary font-semibold">
            <Eye className="h-3.5 w-3.5" /> Total de Views
          </div>
          <div className="mt-2 text-[26px] leading-none font-semibold tabular-nums tracking-tight text-primary">{totalViews.toLocaleString("pt-BR")}</div>
        </div>
        <div className="flex flex-col justify-center gap-2 md:min-w-[180px]">
          <Button onClick={openCreate} size="sm" className="h-10 gap-2 rounded-xl shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" /> Novo Orçamento
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl" onClick={() => { fetchQuotes(); fetchClients(); toast({ title: "Dados atualizados!" }); }} title="Atualizar dados">
            <RotateCcw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, negócio, cidade ou slug..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl bg-muted/40 border-border/60 focus-visible:bg-background transition-colors" />
      </div>


      {/* Table */}
      {quotes.length === 0 ? (
        <Card className="border-dashed border-2 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 ring-1 ring-border/60">
              <FileText className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium">Nenhum orçamento gerado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro orçamento e ele aparecerá aqui.</p>
            <Button variant="outline" size="sm" className="mt-5 rounded-full gap-2" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Criar primeiro orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/70 backdrop-blur-sm overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
          <Table className="min-w-0">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 hover:from-muted/60 hover:via-muted/40 hover:to-muted/60 border-border/60">
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("client_name")}>
                  <span className="flex items-center">Cliente <SortIcon field="client_name" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("service_type")}>
                  <span className="flex items-center">Serviço <SortIcon field="service_type" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center">Criado <SortIcon field="created_at" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center text-[11px] uppercase tracking-wider font-semibold h-12" onClick={() => toggleSort("internal_view_count")}>
                  <span className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400" title="Visualizações da equipe/admin (dispositivos logados)">
                    <InternalViewIcon size={16} /> Interno <SortIcon field="internal_view_count" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center text-[11px] uppercase tracking-wider font-semibold h-12" onClick={() => toggleSort("external_view_count")}>
                  <span className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400" title="Visualizações de clientes/dispositivos externos">
                    <ExternalViewIcon size={16} /> Externo <SortIcon field="external_view_count" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("status")}>
                  <span className="flex items-center">Status <SortIcon field="status" /></span>
                </TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12 pr-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.map((q) => {
                const linkedClient = getLinkedClient(q);
                const lastInt = (q as any).last_internal_viewed_at;
                const lastExt = (q as any).last_external_viewed_at;
                return (
                  <TableRow key={q.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.client_name}</span>
                        {q.password && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.client_business_type}{q.city ? ` • ${q.city}` : ""}</p>
                      {linkedClient && (
                        <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Vinculado: {linkedClient.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const meta = getServiceTypeMeta((q as any).service_type);
                        const Icon = meta.icon;
                        return (
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium ${meta.badge}`}>
                            <Icon className={`h-3 w-3 ${meta.color}`} /> {meta.label}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm tabular-nums">{format(new Date(q.created_at), "dd/MM/yy", { locale: ptBR })}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{format(new Date(q.created_at), "HH:mm")}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ViewCountBadge
                        variant="internal"
                        count={(q as any).internal_view_count || 0}
                        lastAt={lastInt ? format(new Date(lastInt), "dd/MM HH:mm", { locale: ptBR }) : null}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <ViewCountBadge
                        variant="external"
                        count={(q as any).external_view_count || 0}
                        lastAt={lastExt ? format(new Date(lastExt), "dd/MM HH:mm", { locale: ptBR }) : null}
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getQuoteStatus(q);
                        const stOpt = QUOTE_STATUS_OPTIONS.find(o => o.value === status);
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border cursor-default ${stOpt?.color || ""}`}>
                            {stOpt?.label || status}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end">
                        {showTrash ? (
                          <RowActionsMenu items={[
                            { label: "Restaurar", icon: RotateCcw, onClick: () => restoreQuote(q.id), tone: "success" },
                            { label: "Excluir Permanentemente", icon: Trash2, onClick: () => requestPermDeleteQuote(q.id), tone: "danger" },
                          ]} />
                        ) : (
                          <RowActionsMenu items={[
                            { label: "Visualizar", icon: Eye, onClick: () => window.open(getQuoteUrl(q.slug), "_blank") },
                            { label: "Preview", icon: Monitor, onClick: () => setPreviewSlug(q.slug) },
                            { label: "Editar", icon: Pencil, onClick: () => openEdit(q) },
                            { label: "Copiar Link", icon: Copy, onClick: () => copyLink(q.slug) },
                            { label: "Imprimir", icon: Printer, onClick: () => handlePrint(q.slug) },
                            { label: "Converter em Cliente", icon: UserPlus, onClick: () => convertToClient(q), tone: "success", hidden: !!linkedClient },
                            { label: "Excluir", icon: Trash2, onClick: () => requestDeleteQuote(q.id), tone: "danger" },
                          ]} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Trash Section */}
      {false && deletedQuotes.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTrash ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <Trash2 className="h-4 w-4" />
            Orçamentos Excluídos ({deletedQuotes.length})
          </button>
          {showTrash && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                <p className="text-xs text-muted-foreground flex-1">
                  Itens na lixeira são excluídos permanentemente após {trashRetentionDays} dias.
                </p>
                <Select value={String(trashRetentionDays)} onValueChange={(v) => setTrashRetentionDays(Number(v))}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-dashed border-destructive/30">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Excluído em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedQuotes.map((q: any) => {
                      const deletedDate = new Date(q.deleted_at);
                      const expiresDate = new Date(deletedDate.getTime() + trashRetentionDays * 24 * 60 * 60 * 1000);
                      const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                      return (
                        <TableRow key={q.id} className="opacity-60 hover:opacity-100">
                          <TableCell>
                            <span className="font-medium">{q.client_name}</span>
                            <p className="text-xs text-muted-foreground">{q.client_business_type}</p>
                          </TableCell>
                          <TableCell className="text-sm">{q.city}</TableCell>
                          <TableCell className="text-sm">{format(deletedDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${daysLeft <= 7 ? "text-destructive" : "text-muted-foreground"}`}>
                              {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => restoreQuote(q.id)} title="Restaurar">
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => requestPermDeleteQuote(q.id)} title="Excluir Permanentemente">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!previewSlug} onOpenChange={(open) => !open && setPreviewSlug(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 overflow-hidden">
          <div className="flex flex-col h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-1">
                {(Object.entries(deviceSizes) as [DeviceType, typeof deviceSizes.desktop][]).map(([key, dev]) => (
                  <Button key={key} variant={previewDevice === key ? "default" : "ghost"} size="sm" onClick={() => setPreviewDevice(key)} className="gap-1.5 h-8">
                    <dev.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{dev.label}</span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{currentDevice.width}×{currentDevice.height}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(previewSlug!)}><Printer className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewSlug(null)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="flex-1 flex items-start justify-center overflow-auto bg-muted/20 p-4">
              <div className="bg-background rounded-xl shadow-2xl border overflow-hidden transition-all duration-300"
                style={{ width: Math.min(currentDevice.width, window.innerWidth - 80), height: currentDevice.height }}>
                <iframe src={getQuoteUrl(previewSlug!)} className="w-full h-full border-0"
                  style={{ width: currentDevice.width, height: currentDevice.height,
                    transform: currentDevice.width > window.innerWidth - 80 ? `scale(${(window.innerWidth - 80) / currentDevice.width})` : "none",
                    transformOrigin: "top left" }} title="Preview do Orçamento" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog - Modernized with Tabs */}
      {/* Service Type Picker Dialog */}
      <Dialog open={showServicePicker} onOpenChange={setShowServicePicker}>
        <DialogContent className="max-w-2xl p-0 gap-0 rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
          <DialogHeader className="px-8 pt-7 pb-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
            <DialogTitle className="text-[22px] font-semibold tracking-tight">Escolha o Tipo de Serviço</DialogTitle>
            <p className="text-[13px] text-muted-foreground">Selecione o tipo de prestação de serviço para este orçamento. Cada tipo tem seu próprio modelo e valores padrão.</p>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6">
            {SERVICE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => startCreateWithService(t.key)}
                  className={`group text-left rounded-2xl border border-border/70 bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center ring-1 ${t.ring} mb-3 group-hover:scale-105 transition-transform`}>
                    <Icon className={`h-6 w-6 ${t.color}`} />
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight mb-1">{t.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border border-border/60 shadow-2xl">
          <DialogHeader className="px-8 pt-7 pb-5 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <DialogTitle className="text-[22px] font-semibold tracking-tight">{editingId ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
                <p className="text-[13px] text-muted-foreground">Configure os dados, layout, tema e planos do orçamento.</p>
              </div>
              {editingId && (
                <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={refreshPlansFromAdmin}>
                  <RotateCcw className="h-3.5 w-3.5" /> Atualizar Valores
                </Button>
              )}
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <Tabs value={formTab} onValueChange={setFormTab} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4 pb-1">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger value="info" className="text-xs gap-1.5 rounded-lg data-[state=active]:shadow-sm"><FileText className="h-3.5 w-3.5" /> Dados</TabsTrigger>
                  <TabsTrigger value="layout" className="text-xs gap-1.5 rounded-lg data-[state=active]:shadow-sm"><LayoutTemplate className="h-3.5 w-3.5" /> Layout</TabsTrigger>
                  <TabsTrigger value="theme" className="text-xs gap-1.5 rounded-lg data-[state=active]:shadow-sm"><Palette className="h-3.5 w-3.5" /> Tema</TabsTrigger>
                  {form.plansConfig.map((plan, i) => (
                    <TabsTrigger key={i} value={`plan${i}`} className={`text-xs gap-1.5 rounded-lg data-[state=active]:shadow-sm ${plan.hidden ? 'opacity-50' : ''}`}><DollarSign className="h-3.5 w-3.5" /> {plan.name || `Opção ${i + 1}`}</TabsTrigger>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 h-7 rounded-lg" onClick={addNewPlan}>
                    <Plus className="h-3 w-3" /> Plano
                  </Button>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <TabsContent value="info" className="mt-0 space-y-5">
                  {/* Client selector */}
                  {!editingId && clients.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="h-3 w-3" /> Preencher com dados de um cliente existente</Label>
                      <Select value={form.selectedClientId} onValueChange={(clientId) => {
                        const cl = clients.find((c) => c.id === clientId);
                        if (cl) {
                          setForm((f) => ({
                            ...f,
                            clientName: cl.name,
                            businessType: cl.business_type || "",
                            city: cl.city || "",
                            whatsappNumber: cl.whatsapp || "",
                            selectedClientId: clientId,
                          }));
                          toast({ title: "Dados preenchidos!", description: `Dados de "${cl.name}" carregados. O orçamento será vinculado automaticamente.` });
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} — {c.business_type} ({c.city})
                              {c.quote_id && " ✓ já tem orçamento"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.selectedClientId && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> O orçamento será vinculado ao cliente automaticamente
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nome do Cliente</Label>
                      <Input value={form.clientName} onChange={(e) => updateField("clientName", e.target.value)} required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tipo de Negócio</Label>
                      <Input value={form.businessType} onChange={(e) => updateField("businessType", e.target.value)} required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cidade</Label>
                      <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">WhatsApp do Cliente (informativo)</Label>
                      <MaskedInput mask="phone" value={form.whatsappNumber} onValueChange={(v) => updateField("whatsappNumber", v)} placeholder="(11) 99999-9999" className="h-10" />
                      <p className="text-xs text-muted-foreground">Apenas para referência. Os CTAs usam o WhatsApp configurado na aba Planos.</p>
                    </div>

                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Slug (URL personalizada)</Label>
                    <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder={editingId ? "slug-atual" : "gerado-automaticamente"} className="h-10 font-mono text-sm" />
                    <p className="text-xs text-muted-foreground">Acessível em: <span className="font-mono">{getQuoteUrl(form.slug || "nome-cliente")}</span></p>
                  </div>

                  {/* Tipo de Serviço (somente informativo ao editar) */}
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center gap-3">
                    {(() => { const meta = getServiceTypeMeta(form.serviceType); const Icon = meta.icon; return (
                      <>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center ring-1 ${meta.ring}`}>
                          <Icon className={`h-5 w-5 ${meta.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Tipo de Serviço</div>
                          <div className="text-sm font-semibold">{meta.label}</div>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-semibold ${meta.badge}`}>{meta.short}</span>
                      </>
                    ); })()}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Gênero do Cliente</Label>
                      <Select value={form.gender} onValueChange={(v) => updateField("gender", v as any)}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino (Pronto, Bem-vindo)</SelectItem>
                          <SelectItem value="feminino">Feminino (Pronta, Bem-vinda)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Adapta saudações como "Pronto/Pronta" automaticamente.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Shield className="h-3 w-3" /> Senha de Proteção</Label>
                      <Input value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Deixe vazio para acesso livre" className="h-10" />
                      <p className="text-xs text-muted-foreground">Se preenchido, o orçamento só será visível após digitar a senha.</p>
                    </div>
                  </div>
                </TabsContent>


                <TabsContent value="layout" className="mt-0 space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-3 block">Tipo de Layout do Orçamento</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" onClick={() => updateField("layoutType", "simple")}
                        className={`rounded-xl border-2 p-6 text-left transition-all ${form.layoutType === "simple" ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-border/80"}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
                          <span className="font-semibold">Simples</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Layout direto ao ponto com as seções essenciais: Estratégia, Plataformas, Google, Instagram, WhatsApp, Métricas e Planos.</p>
                      </button>
                      <button type="button" onClick={() => updateField("layoutType", "detailed")}
                        className={`rounded-xl border-2 p-6 text-left transition-all ${form.layoutType === "detailed" ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-border/80"}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <LayoutTemplate className="h-6 w-6 text-primary" />
                          <span className="font-semibold">Detalhada</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Layout completo com seções extras: Como Vamos Trabalhar, Cronograma, Prova Social, FAQ, CTA Final com WhatsApp e termos de contrato.</p>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Widget do WhatsApp</Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Configurações do botão flutuante de WhatsApp no orçamento.</p>
                    </div>
                    <ConfigActionBar type="whatsapp" module="quote" whatsappConfig={whatsappWidgetConfig} onImportWhatsApp={setWhatsappWidgetConfig} />
                    <WhatsAppWidgetSettings config={whatsappWidgetConfig} onChange={setWhatsappWidgetConfig} context="quote" />
                  </div>
                </TabsContent>

                <TabsContent value="theme" className="mt-0 space-y-6">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-3 block">Tema Padrão do Orçamento</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {colorThemes.map((t) => (
                        <button type="button" key={t.id} onClick={() => updateField("colorTheme", t.id)}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all text-left ${form.colorTheme === t.id ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-border/80"}`}>
                          <div className="flex gap-1.5">
                            <div className="h-8 w-8 rounded-full shadow-inner" style={{ backgroundColor: t.bg }} />
                            <div className="h-8 w-8 rounded-full shadow-inner" style={{ backgroundColor: t.accent }} />
                          </div>
                          <span className="text-sm font-medium">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Cores Disponíveis para o Cliente</Label>
                    <p className="text-xs text-muted-foreground mb-3">Selecione quais cores o cliente poderá escolher. Se nenhuma for selecionada, todas ficam disponíveis.</p>
                    <div className="flex flex-wrap gap-3">
                      {colorThemes.map((t) => {
                        const selected = form.availableColors.includes(t.id);
                        return (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => {
                              const newColors = selected
                                ? form.availableColors.filter((c) => c !== t.id)
                                : [...form.availableColors, t.id];
                              updateField("availableColors", newColors);
                            }}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all"
                            style={{
                              borderColor: selected ? t.accent : "transparent",
                              background: selected ? t.accent + "15" : "transparent",
                            }}
                          >
                            <div className="w-10 h-10 rounded-full shadow-md" style={{ background: t.accent }} />
                            <span className="text-[10px] font-medium text-muted-foreground">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>




                {form.plansConfig.map((_, i) => (
                  <TabsContent key={i} value={`plan${i}`} className="mt-0">
                    {renderPlanFields(i)}
                  </TabsContent>
                ))}
              </div>
            </Tabs>

            <div className="border-t px-6 py-4 bg-muted/30">
              <Button type="submit" size="lg" className="w-full font-semibold h-11" disabled={submitting}>
                {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Gerar Orçamento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog open={!!deleteQuoteTarget} onOpenChange={open => !open && cancelDeleteQuote()} onConfirm={confirmDeleteQuote} title="⚠️ Excluir orçamento" description="Esta ação é irreversível! O orçamento será excluído definitivamente do sistema." />
    </div>
  );
}
