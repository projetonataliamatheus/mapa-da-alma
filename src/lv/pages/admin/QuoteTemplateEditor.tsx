// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { useAuth } from "@/lv/hooks/useAuth";
import { useToast } from "@/lv/hooks/use-toast";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/lv/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/lv/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { Label } from "@/lv/components/ui/label";
import { Save, Plus, LayoutTemplate, Check, Trash2, Image as ImageIcon, Sparkles, Palette, PanelLeftClose, PanelLeft, Copy, RefreshCw, Eye } from "lucide-react";
import { ANIMATION_OPTIONS } from "@/lv/components/quote/WhatsAppCTAButton";
import { Slider } from "@/lv/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/lv/components/ui/popover";
import { getDefaultTemplateBySlugAndService, type TemplateSection } from "@/lv/lib/defaultTemplateContent";
import { SERVICE_TYPES, getServiceTypeMeta, type ServiceTypeKey } from "@/lv/lib/serviceTypes";
import { getTheme, colorThemes } from "@/lv/lib/colorThemes";
import SimpleLayout from "@/lv/components/quote/SimpleLayout";
import DetailedLayout from "@/lv/components/quote/DetailedLayout";
import SitesLayout from "@/lv/components/quote/SitesLayout";
import EcommerceLayout from "@/lv/components/quote/EcommerceLayout";
import SystemsLayout from "@/lv/components/quote/SystemsLayout";
import SectionManager from "@/lv/components/quote/SectionManager";
import CustomSectionRenderer from "@/lv/components/quote/CustomSectionRenderer";
import { SIMPLE_BUILTIN_SECTIONS, DETAILED_BUILTIN_SECTIONS, getBuiltinSectionsForService, type SectionDefinition } from "@/lv/lib/sectionTypes";
import { SOPHISTICATED_ICONS } from "@/lv/components/icons/SophisticatedIcons";

interface Template {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  hero_image_url: string;
  hero_emoji: string;
  service_type?: string;
  sections: TemplateSection;
}

const cloneSections = (sections: TemplateSection): TemplateSection =>
  JSON.parse(JSON.stringify(sections)) as TemplateSection;

const NON_TRAFFIC_COPY_VERSION = "specialized-sites-v4-live-preview-2026-07";

const normalizeServiceType = (value?: string | null): ServiceTypeKey =>
  SERVICE_TYPES.some((s) => s.key === value) ? (value as ServiceTypeKey) : "trafego_pago";

const normalizeBaseSlug = (value?: string | null): "simple" | "detailed" | null =>
  value === "simple" || value === "detailed" ? value : null;

const getTemplateBaseSlug = (template: Pick<Template, "slug" | "name" | "sections">): "simple" | "detailed" => {
  const direct = normalizeBaseSlug(template.slug);
  if (direct) return direct;
  const name = (template.name || "").toLowerCase();
  if (name.includes("detalh") || name.includes("complet") || template.sections?.howwework_title) return "detailed";
  return "simple";
};

const isServiceBaseTemplate = (template: Pick<Template, "slug" | "name">) => {
  if (normalizeBaseSlug(template.slug)) return true;
  const name = (template.name || "").toLowerCase();
  return name.includes("simplific") || name.includes("detalh");
};

const sortTemplatesForService = (list: Template[]) =>
  [...list].sort((a, b) => {
    const baseOrder = (getTemplateBaseSlug(a) === "simple" ? 0 : 1) - (getTemplateBaseSlug(b) === "simple" ? 0 : 1);
    if (baseOrder !== 0) return baseOrder;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

const shouldRefreshNonTrafficCopy = (template: Template) => {
  const serviceType = normalizeServiceType(template.service_type);
  const baseSlug = getTemplateBaseSlug(template);
  if (serviceType === "trafego_pago" || !isServiceBaseTemplate(template)) return false;

  if (template.sections?.template_service_content_version !== NON_TRAFFIC_COPY_VERSION) return true;

  const trafficDefault = getDefaultTemplateBySlugAndService(baseSlug, "trafego_pago");
  const current = template.sections || {};
  const staleCopyScore = ["hero_badge", "hero_title", "strategy_title", "platforms_title", "google_title", "whatsapp_title", "metrics_title", "plans_title", "cta_title"]
    .filter((key) => current[key] === trafficDefault[key]).length;

  return staleCopyScore >= 4;
};

const buildRefreshedNonTrafficSections = (template: Template): TemplateSection => {
  const serviceType = normalizeServiceType(template.service_type);
  const baseSlug = getTemplateBaseSlug(template);
  const expected = cloneSections(getDefaultTemplateBySlugAndService(baseSlug, serviceType));
  const current = template.sections || {};

  return {
    ...expected,
    template_service_content_version: NON_TRAFFIC_COPY_VERSION,
    section_order: getDefaultSections(baseSlug === "detailed", serviceType),
    custom_icon_size: current.custom_icon_size ?? expected.custom_icon_size,
    hero_icon_url: current.hero_icon_url ?? expected.hero_icon_url,
    whatsapp_btn_animation: current.whatsapp_btn_animation ?? expected.whatsapp_btn_animation,
  };
};

// Fake quote for preview
const SAMPLE_QUOTE = {
  id: "preview",
  client_name: "Nome do Cliente",
  client_business_type: "Consultório Odontológico",
  city: "Piracicaba",
  slug: "preview",
  subtitle: "",
  color_theme: "gold-dark",
  layout_type: "simple",
  plan1_total: "R$ 2.000",
  plan1_labor: "R$ 1.100,00",
  plan1_ads: "R$ 900,00 (R$ 30/dia)",
  plan1_items: ["Gestão completa de anúncios", "Criação de criativos", "Relatórios semanais", "Suporte via WhatsApp"],
  plan2_total: "R$ 3.000",
  plan2_labor: "R$ 1.500,00",
  plan2_ads: "R$ 1.500,00 (R$ 50/dia)",
  plan2_items: ["Tudo do Plano 1", "Gestão de Instagram", "Google Meu Negócio", "Automação WhatsApp", "Criativos ilimitados"],
  whatsapp_number: "5519999999999",
  password: null,
  view_count: 0,
  available_colors: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "",
} as any;

function getDefaultSections(isDetailed: boolean, serviceType: string = "trafego_pago"): SectionDefinition[] {
  return getBuiltinSectionsForService(serviceType, isDetailed);
}

export default function QuoteTemplateEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBase, setNewBase] = useState("simple");
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<Template | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState("blue-white");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sectionOrder, setSectionOrder] = useState<SectionDefinition[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [previewGender, setPreviewGender] = useState<"masculino" | "feminino">("masculino");
  const [previewTicket, setPreviewTicket] = useState("R$ 79,00");
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceTypeKey>("trafego_pago");

  const isDetailed = (data: Template) => data.slug === "detailed" || !!data.sections?.howwework_title;

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("quote_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    let t = ((data as any[]) || []) as Template[];

    // Previous seeds may have copied the Tráfego copy into Sites/E-commerce/Sistemas.
    // Repair only non-traffic base templates; Tráfego Pago remains untouched by design.
    if (user) {
      t = await refreshNonTrafficCopies(t);
    }
    setTemplates(t);

    // Ensure each service_type has the "detailed" base template seeded (Simplificada foi descontinuada)
    if (user) {
      const missing = SERVICE_TYPES.flatMap((s) =>
        ["detailed"].filter(
          (slug) => !t.some((x) => x.slug === slug && (x.service_type || "trafego_pago") === s.key),
        ).map((slug) => ({ slug, svc: s.key })),
      );
      if (missing.length > 0) {
        await seedMissing(missing);
        const { data: refreshed } = await supabase.from("quote_templates").select("*").order("sort_order", { ascending: true });
        const rt = await refreshNonTrafficCopies(((refreshed as any[]) || []) as Template[]);
        setTemplates(rt);
        pickInitialTemplate(rt);
        setLoading(false);
        return;
      }
    }
    pickInitialTemplate(t);
    setLoading(false);
  };

  const pickInitialTemplate = (list: Template[]) => {
    const forService = sortTemplatesForService(list.filter((x) => (x.service_type || "trafego_pago") === selectedServiceType && getTemplateBaseSlug(x) === "detailed"));
    if (!selectedId && forService.length > 0) {
      setSelectedId(forService[0].id);
      setEditData(forService[0]);
      loadSectionOrder(forService[0]);
    } else if (selectedId) {
      const found = list.find((x) => x.id === selectedId);
      if (found) { setEditData(found); loadSectionOrder(found); }
    }
  };

  const loadSectionOrder = (t: Template) => {
    const svc = (t as any).service_type || "trafego_pago";
    const defaults = getDefaultSections(isDetailed(t), svc);
    const saved = t.sections?.section_order as SectionDefinition[] | undefined;
    // For non-traffic services, always use service-specific defaults (ignore old traffic-based saved order)
    if (svc !== "trafego_pago") {
      // Merge: preserve custom (non-builtin) sections user added
      const customs = (saved || []).filter(s => s.type !== "builtin");
      const builtinIds = new Set(defaults.map(d => d.id));
      const savedBuiltinsValid = (saved || []).filter(s => s.type === "builtin" && builtinIds.has(s.id));
      if (savedBuiltinsValid.length === defaults.length && customs.length === 0) {
        setSectionOrder(saved!);
      } else {
        setSectionOrder([...defaults, ...customs]);
      }
      return;
    }
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setSectionOrder(saved);
    } else {
      setSectionOrder(defaults);
    }
  };

  const refreshNonTrafficCopies = async (list: Template[]) => {
    const updates = list
      .filter(shouldRefreshNonTrafficCopy)
      .map((template) => ({ ...template, sections: buildRefreshedNonTrafficSections(template) }));

    if (updates.length === 0) return list;

    await Promise.all(updates.map((template) =>
      supabase
        .from("quote_templates")
        .update({ sections: template.sections, updated_at: new Date().toISOString() } as any)
        .eq("id", template.id),
    ));

    return list.map((template) => updates.find((updated) => updated.id === template.id) || template);
  };

  const seedMissing = async (items: { slug: string; svc: ServiceTypeKey }[]) => {
    if (!user) return;
      const rows = items.map(({ slug, svc }, i) => {
      const isDet = slug === "detailed";
      const meta = getServiceTypeMeta(svc);
      const base = getDefaultTemplateBySlugAndService(isDet ? "detailed" : "simple", svc);
      return {
        user_id: user.id,
        name: `${meta.label} — ${isDet ? "Detalhada" : "Simplificada"}`,
        slug,
        service_type: svc,
        sort_order: i,
        hero_image_url: "/images/hero-bg.jpg",
        hero_emoji: "gps-pin",
          sections: {
            ...cloneSections(base),
            ...(svc === "trafego_pago" ? {} : { template_service_content_version: NON_TRAFFIC_COPY_VERSION }),
            section_order: getDefaultSections(isDet, svc),
          },
      };
    });
    await (supabase.from("quote_templates") as any).insert(rows);
  };

  useEffect(() => { fetchTemplates(); }, [user?.id]);

  // When user switches service type, re-pick a template within that group.
  // If no templates exist for this service yet, seed them on demand.
  useEffect(() => {
    const forService = sortTemplatesForService(templates.filter((x) => (x.service_type || "trafego_pago") === selectedServiceType && getTemplateBaseSlug(x) === "detailed"));
    if (forService.length === 0) {
      if (user && !loading) {
        (async () => {
          await seedMissing([
            { slug: "detailed", svc: selectedServiceType },
          ]);
          const { data: refreshed } = await supabase.from("quote_templates").select("*").order("sort_order", { ascending: true });
          const rt = await refreshNonTrafficCopies(((refreshed as any[]) || []) as Template[]);
          setTemplates(rt);
          const first = sortTemplatesForService(rt.filter((x) => (x.service_type || "trafego_pago") === selectedServiceType && getTemplateBaseSlug(x) === "detailed"))[0];
          if (first) {
            setSelectedId(first.id);
            setEditData({ ...first, sections: { ...first.sections } });
            loadSectionOrder(first);
            setHasChanges(false);
          }
        })();
      }
      return;
    }
    if (!forService.some((t) => t.id === selectedId)) {
      const t = forService[0];
      setSelectedId(t.id);
      setEditData({ ...t, sections: { ...t.sections } });
      loadSectionOrder(t);
      setHasChanges(false);
    }
  }, [selectedServiceType, templates, user?.id]);


  const selectTemplate = (t: Template) => {
    if (hasChanges) { setPendingSwitch(t); return; }
    doSwitch(t);
  };

  const doSwitch = (t: Template) => {
    const normalized = shouldRefreshNonTrafficCopy(t)
      ? { ...t, sections: buildRefreshedNonTrafficSections(t) }
      : t;
    setSelectedId(normalized.id);
    setEditData({ ...normalized, sections: { ...normalized.sections } });
    loadSectionOrder(normalized);
    setHasChanges(normalized !== t);
  };

  const handleUpdateField = useCallback((key: string, value: any) => {
    setEditData(prev => {
      if (!prev) return prev;
      return { ...prev, sections: { ...prev.sections, [key]: value } };
    });
    setHasChanges(true);
  }, []);

  const handleUpdateHeroImage = useCallback((url: string) => {
    setEditData(prev => prev ? { ...prev, hero_image_url: url } : prev);
    setHasChanges(true);
  }, []);

  const handleUpdateHeroEmoji = useCallback((emoji: string) => {
    setEditData(prev => prev ? { ...prev, hero_emoji: emoji } : prev);
    setHasChanges(true);
  }, []);

  const handleSectionOrderChange = useCallback((newOrder: SectionDefinition[]) => {
    setSectionOrder(newOrder);
    setEditData(prev => {
      if (!prev) return prev;
      return { ...prev, sections: { ...prev.sections, section_order: newOrder } };
    });
    setHasChanges(true);
  }, []);

  const handleCustomSectionChange = useCallback((updated: SectionDefinition) => {
    setSectionOrder(prev => {
      const newOrder = prev.map(s => s.id === updated.id ? updated : s);
      setEditData(ed => {
        if (!ed) return ed;
        return { ...ed, sections: { ...ed.sections, section_order: newOrder } };
      });
      return newOrder;
    });
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from("quote_templates").update({
      name: editData.name,
      hero_image_url: editData.hero_image_url,
      hero_emoji: editData.hero_emoji,
      sections: { ...editData.sections, section_order: sectionOrder },
      updated_at: new Date().toISOString(),
    } as any).eq("id", editData.id);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Modelo salvo com sucesso! ✨" });
      setHasChanges(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  // Sync texts from another template (e.g. simple → detailed)
  const syncTextsFromTemplate = async (sourceId: string) => {
    const source = templates.find(t => t.id === sourceId);
    if (!source || !editData) return;
    const sourceSections = source.sections;
    const textKeys = Object.keys(sourceSections).filter(k =>
      k !== "section_order" && k !== "custom_icon_size" && k !== "whatsapp_btn_animation"
    );
    const merged = { ...editData.sections };
    for (const key of textKeys) {
      if (sourceSections[key] !== undefined) {
        merged[key] = sourceSections[key];
      }
    }
    setEditData({ ...editData, sections: merged });
    setHasChanges(true);
    toast({ title: "Textos sincronizados!", description: `Textos copiados de "${source.name}". Salve para confirmar.` });
  };

  const restoreCurrentServiceCopy = () => {
    if (!editData) return;
    const serviceType = normalizeServiceType(editData.service_type || selectedServiceType);
    if (serviceType === "trafego_pago") return;

    const refreshed = { ...editData, service_type: serviceType, sections: buildRefreshedNonTrafficSections({ ...editData, service_type: serviceType }) };
    setEditData(refreshed);
    setTemplates(prev => prev.map(t => t.id === refreshed.id ? refreshed : t));
    loadSectionOrder(refreshed);
    setHasChanges(true);
    toast({ title: `Copy de ${getServiceTypeMeta(serviceType).short} aplicada no preview`, description: "Confira no preview e salve para gravar no banco." });
  };

  // Filter templates by selected service type — only the Detailed model is shown/used going forward.
  const visibleTemplates = sortTemplatesForService(
    templates.filter((t) => (t.service_type || "trafego_pago") === selectedServiceType && getTemplateBaseSlug(t) === "detailed"),
  );
  // Get other templates for sync options (same service type)
  const otherTemplates = visibleTemplates.filter(t => t.id !== selectedId);

  const openPreview = () => {
    if (!editData) return;
    const url = `/preview-modelo/${editData.id}?theme=${previewThemeId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    const baseContent = cloneSections(getDefaultTemplateBySlugAndService(newBase === "detailed" ? "detailed" : "simple", selectedServiceType));
    const slug = newName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const defaultOrder = getDefaultSections(newBase === "detailed", selectedServiceType);
    const { error } = await (supabase.from("quote_templates") as any).insert({
      user_id: user.id, name: newName, slug, sort_order: templates.length,
      service_type: selectedServiceType,
      hero_image_url: "/images/hero-bg.jpg", hero_emoji: "🦷",
      sections: {
        ...baseContent,
        ...(selectedServiceType === "trafego_pago" ? {} : { template_service_content_version: NON_TRAFFIC_COPY_VERSION }),
        section_order: defaultOrder,
      },
    });
    if (error) {
      toast({ title: "Erro ao criar", variant: "destructive" });
    } else {
      toast({ title: "Novo modelo criado!" });
      setShowNewDialog(false);
      setNewName("");
      fetchTemplates();
    }
  };


  const handleDelete = async (id: string) => { setPendingDeleteId(id); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    await supabase.from("quote_templates").delete().eq("id", pendingDeleteId);
    if (selectedId === pendingDeleteId) { setSelectedId(null); setEditData(null); }
    setPendingDeleteId(null);
    fetchTemplates();
    toast({ title: "Modelo excluído" });
  };

  const theme = getTheme(previewThemeId);
  const previewQuote = { ...SAMPLE_QUOTE, gender: previewGender, ticket_medio: previewTicket, service_type: selectedServiceType } as any;
  const activeServiceMeta = getServiceTypeMeta(selectedServiceType);
  const ActiveServiceIcon = activeServiceMeta.icon;

  const sectionBadgeLabel = (icon: string, label: string) => `${SOPHISTICATED_ICONS[icon] ? "" : `${icon} `}${label}`;

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando modelos...</p>;

  return (
    <div className="relative">
      {/* Floating toolbar */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="px-4 pt-3 pb-2 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={sidebarOpen ? "Fechar painel" : "Abrir painel"}>
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4 text-muted-foreground" /> : <PanelLeft className="h-4 w-4 text-muted-foreground" />}
              </button>
              <div className="h-8 w-8 rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <ActiveServiceIcon className={`h-4 w-4 ${activeServiceMeta.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">Editor de Modelos · {activeServiceMeta.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Preview ao vivo usando a copy atual deste serviço.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {editData && selectedServiceType !== "trafego_pago" && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={restoreCurrentServiceCopy}>
                  <RefreshCw className="h-3.5 w-3.5" /> Forçar copy de {activeServiceMeta.short}
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={openPreview} disabled={!editData}>
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave} disabled={saving || !hasChanges || !editData}>
                <Save className="h-3.5 w-3.5" />
                {saving ? "Salvando..." : hasChanges ? "Salvar Alterações" : "Salvo ✓"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 overflow-x-auto">
            {SERVICE_TYPES.map((s) => {
              const Icon = s.icon;
              const active = selectedServiceType === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => { if (hasChanges) { if (!confirm("Há alterações não salvas. Deseja trocar mesmo assim?")) return; } setSelectedServiceType(s.key); setSelectedId(null); setActiveSection(null); }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 min-w-fit ${active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title={s.description}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? s.color : ""}`} />
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {visibleTemplates.map(t => (
                <button key={t.id} onClick={() => selectTemplate(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${
                    selectedId === t.id
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Modelo Detalhado
                  {selectedId === t.id && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
            {editData && selectedServiceType !== "trafego_pago" && editData.sections?.template_service_content_version !== NON_TRAFFIC_COPY_VERSION && (
              <span className="text-[11px] text-muted-foreground">Copy antiga detectada — clique em “Forçar copy”.</span>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-t border-border/70 flex items-center gap-3 flex-wrap">
          {editData && (
            <>
              {/* Theme preview selector */}
              <div className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Cor:</span>
                <div className="flex items-center gap-1">
                  {colorThemes.map(ct => (
                    <button
                      key={ct.id}
                      onClick={() => setPreviewThemeId(ct.id)}
                      title={ct.name}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${previewThemeId === ct.id ? "border-primary scale-125 ring-1 ring-primary/50" : "border-transparent hover:scale-110"}`}
                      style={{ background: ct.accent }}
                    />
                  ))}
                </div>
              </div>
              {/* Icon size slider */}
              <div className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Ícones:</span>
                <Slider
                  value={[Number(editData.sections?.custom_icon_size) || 40]}
                  min={24} max={80} step={4} className="w-24"
                  onValueChange={([v]) => {
                    setEditData({ ...editData, sections: { ...editData.sections, custom_icon_size: v as any } });
                    setHasChanges(true);
                  }}
                />
                <span className="text-[10px] text-muted-foreground w-8">{Number(editData.sections?.custom_icon_size) || 40}px</span>
              </div>
              {/* WhatsApp button animation */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Botão WA:</span>
                <Select
                  value={(editData.sections?.whatsapp_btn_animation as string) || "pulse"}
                  onValueChange={v => {
                    setEditData({ ...editData, sections: { ...editData.sections, whatsapp_btn_animation: v } });
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIMATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.emoji} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview Gender/Ticket Controls */}
              <div className="flex items-center gap-2 border-l pl-3 ml-1">
                <Select value={previewGender} onValueChange={(v: any) => setPreviewGender(v)}>
                  <SelectTrigger className="h-7 w-24 text-[10px] bg-muted/30 border-none shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino" className="text-xs">Masculino</SelectItem>
                    <SelectItem value="feminino" className="text-xs">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Ticket:</span>
                  <Input 
                    value={previewTicket} 
                    onChange={e => setPreviewTicket(e.target.value)}
                    className="h-7 w-20 text-[10px] px-1.5 border-none bg-muted/30"
                  />
                </div>
              </div>

              <Input
                value={editData.name}
                onChange={e => { setEditData({ ...editData, name: e.target.value }); setHasChanges(true); }}
                className="h-8 w-48 text-sm border-none bg-muted/50 focus-visible:ring-1"
                placeholder="Nome do modelo"
              />
              {otherTemplates.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <Copy className="h-3 w-3" /> Copiar Textos
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <p className="text-xs text-muted-foreground mb-2 px-1">Copiar todos os textos de:</p>
                    {otherTemplates.map(t => (
                      <button key={t.id} onClick={() => syncTextsFromTemplate(t.id)}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2">
                        <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
                        {t.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(editData.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content: Sidebar + Preview */}
      <div className="flex mt-2 gap-2">
        {/* Section Manager Sidebar */}
        {sidebarOpen && editData && (
          <div className="w-64 flex-shrink-0 flex flex-col gap-2" style={{ height: "calc(100vh - 190px)", position: "sticky", top: 150 }}>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex-1">
              <SectionManager
                sections={sectionOrder}
                onChange={handleSectionOrderChange}
                activeId={activeSection || undefined}
                onSelect={setActiveSection}
                onDoubleClick={(id) => {
                  setActiveSection(id);
                  const el = document.querySelector(`[data-section-id="${id}"]`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onReset={() => {
                  const defaults = getDefaultSections(isDetailed(editData), (editData as any).service_type || selectedServiceType);
                  handleSectionOrderChange(defaults);
                }}
                onRefresh={() => {
                  handleSectionOrderChange([...sectionOrder]);
                }}
              />
            </div>

            {/* Strategy Tip Control */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pulo do Gato</span>
                <div className="flex items-center h-4">
                  <input
                    type="checkbox"
                    checked={editData.sections?.strategy_tip_enabled !== false}
                    onChange={(e) => handleUpdateField("strategy_tip_enabled", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Habilite ou desabilite o destaque de estratégia.
              </p>
            </div>
          </div>
        )}

        {/* Visual editor preview */}
        {editData && (
          <div className="flex-1 min-w-0">
            <div
              className="quote-page rounded-xl overflow-hidden border border-border shadow-lg"
              style={{
                "--q-bg": theme.bg, "--q-bg2": theme.bgSecondary, "--q-accent": theme.accent,
                "--q-accent-fg": theme.accentFg, "--q-text": theme.text, "--q-text-muted": theme.textMuted,
                "--q-card": theme.card, "--q-card-border": theme.cardBorder,
              } as React.CSSProperties}
            >
              <style>{`
                .quote-page .animate-on-scroll { opacity: 1 !important; transform: none !important; }
                .quote-page [data-section-id] { position: relative; }
                .quote-page [data-section-id]::before {
                  content: '';
                  position: absolute; top: 0; left: 0; right: 0; height: 2px;
                  background: hsl(var(--primary) / 0.2);
                  z-index: 10;
                }
                ${sectionOrder.map(s => `
                  .quote-page [data-section-id="${s.id}"]::after {
                    content: '${sectionBadgeLabel(s.icon, s.label)}';
                    position: absolute; top: 4px; left: 12px;
                    font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
                    color: hsl(var(--primary) / 0.5);
                    z-index: 10; pointer-events: none;
                    background: hsl(var(--background) / 0.85); padding: 2px 8px; border-radius: 4px;
                    border: 1px solid hsl(var(--primary) / 0.15);
                  }
                `).join('')}
              `}</style>
              <div style={{ background: theme.bg, color: theme.text }}>
                {/* Render sections in order */}
                {sectionOrder.map(section => {
                  if (!section.visible) return null;

                  // Custom sections
                  if (section.type !== "builtin") {
                    return (
                      <div key={section.id} id={`section-${section.id}`} className={`relative ${activeSection === section.id ? "ring-2 ring-primary/50 ring-offset-2" : ""}`}>
                        <CustomSectionRenderer
                          section={section}
                          theme={theme}
                          onChange={handleCustomSectionChange}
                          editMode={true}
                        />
                      </div>
                    );
                  }

                  // Built-in sections are rendered by the layout component
                  return null;
                })}

                {/* The layout renders built-in sections in the order specified */}
                {selectedServiceType === "sites_paginas" ? (
                  <SitesLayout
                    key={`sites-${editData.id}-${editData.sections?.template_service_content_version || "draft"}`}
                    quote={previewQuote}
                    theme={theme}
                  />
                ) : selectedServiceType === "loja_virtual" ? (
                  <EcommerceLayout
                    key={`ecom-${editData.id}-${editData.sections?.template_service_content_version || "draft"}`}
                    quote={previewQuote}
                    theme={theme}
                  />
                ) : selectedServiceType === "sistemas_app" ? (
                  <SystemsLayout
                    key={`sys-${editData.id}-${editData.sections?.template_service_content_version || "draft"}`}
                    quote={previewQuote}
                    theme={theme}
                  />
                ) : isDetailed(editData) ? (
                  <DetailedLayout
                    key={`detailed-${selectedServiceType}-${editData.id}-${editData.sections?.template_service_content_version || "draft"}`}
                    quote={previewQuote}
                    theme={theme}
                    editMode={true}
                    templateOverride={editData.sections}
                    heroImageOverride={editData.hero_image_url}
                    heroEmojiOverride={editData.hero_emoji}
                    onUpdateField={handleUpdateField}
                    onUpdateHeroImage={handleUpdateHeroImage}
                    onUpdateHeroEmoji={handleUpdateHeroEmoji}
                    sectionOrder={sectionOrder}
                    customSectionRenderer={(section) => (
                      <CustomSectionRenderer
                        section={section}
                        theme={theme}
                        onChange={handleCustomSectionChange}
                        editMode={true}
                      />
                    )}
                  />
                ) : (
                  <SimpleLayout
                    key={`simple-${selectedServiceType}-${editData.id}-${editData.sections?.template_service_content_version || "draft"}`}
                    quote={previewQuote}
                    theme={theme}
                    editMode={true}
                    templateOverride={editData.sections}
                    heroImageOverride={editData.hero_image_url}
                    heroEmojiOverride={editData.hero_emoji}
                    onUpdateField={handleUpdateField}
                    onUpdateHeroImage={handleUpdateHeroImage}
                    onUpdateHeroEmoji={handleUpdateHeroEmoji}
                    sectionOrder={sectionOrder}
                    customSectionRenderer={(section) => (
                      <CustomSectionRenderer
                        section={section}
                        theme={theme}
                        onChange={handleCustomSectionChange}
                        editMode={true}
                      />
                    )}
                  />
                )}

              </div>
            </div>
          </div>
        )}

        {!editData && (
          <div className="flex-1 flex items-center justify-center py-20 text-muted-foreground">
            <p>Selecione um modelo para editar visualmente.</p>
          </div>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="text-sm font-medium">Alterações não salvas</span>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" /> Salvar
          </Button>
        </div>
      )}

      {/* New template dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Modelo de Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do Modelo</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Versão para Restaurantes" />
            </div>
            <div className="space-y-1.5">
              <Label>Base do modelo</Label>
              <Select value={newBase} onValueChange={setNewBase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simples (menos seções)</SelectItem>
                  <SelectItem value="detailed">Detalhada (todas as seções)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>Criar Modelo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={!!pendingSwitch} onOpenChange={open => !open && setPendingSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que ainda não foram salvas. Deseja descartar e trocar de modelo, ou prefere salvar antes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={() => setPendingSwitch(null)}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => {
              handleSave().then(() => {
                if (pendingSwitch) doSwitch(pendingSwitch);
                setPendingSwitch(null);
              });
            }}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar e Trocar
            </Button>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (pendingSwitch) doSwitch(pendingSwitch);
              setPendingSwitch(null);
            }}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={open => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Excluir modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
