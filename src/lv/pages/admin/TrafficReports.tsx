// @ts-nocheck
"use client";
import { useState, useEffect, useMemo } from "react";
import { getReportUrl, getReportShareUrl } from "@/lv/lib/domainUtils";
import { useAuth } from "@/lv/hooks/useAuth";
import { supabase } from "@/lv/integrations/supabase/client";
import { db } from "@/lv/lib/supabaseClient";
import MatrixEffectSettings, { type MatrixConfig, defaultMatrixConfig, parseMatrixConfig } from "@/lv/components/admin/MatrixEffectSettings";
import WhatsAppWidgetSettings, { type WhatsAppWidgetConfig, defaultWhatsAppWidgetConfig, parseWhatsAppWidgetConfig } from "@/lv/components/admin/WhatsAppWidgetSettings";
import ConfigActionBar, { loadDefaultConfig } from "@/lv/components/admin/ConfigImportActions";
import { PageHeader } from "@/lv/components/admin/PageHeader";

import { Button } from "@/lv/components/ui/button";
import { Switch } from "@/lv/components/ui/switch";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Textarea } from "@/lv/components/ui/textarea";
import { Card, CardContent } from "@/lv/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/lv/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lv/components/ui/tabs";
import { Badge } from "@/lv/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { useToast } from "@/lv/hooks/use-toast";
import { reportThemes, getReportTheme } from "@/lv/lib/reportThemes";
import { parseMetaAdsFile, type MetaAdsMetric, type DailySnapshot, formatMetricValue } from "@/lv/lib/metaAdsParser";
import { restrictToApprovedReportMetrics, sanitizeMetricSnapshots } from "@/lv/lib/trafficReportMetricRules";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/lv/components/ui/table";
import { InternalViewIcon, ExternalViewIcon, ViewCountBadge, RowActionsMenu } from "@/lv/components/admin/PremiumViewIcons";
import { Popover, PopoverContent, PopoverTrigger } from "@/lv/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Trash2, Eye, EyeOff, Copy, Pencil, BarChart2, Upload, FileSpreadsheet,
  AlertTriangle, Check, Calendar, Link2, Lock, X, TrendingUp, Image,
  Printer, Search, ArrowUpDown, ArrowUp, ArrowDown, Settings2, UserPlus, RotateCcw, ChevronDown, ChevronUp,
  Target, CheckCircle2, FileText
} from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/lv/components/ui/confirm-delete-dialog";
import ReportMetricDefaults from "@/lv/components/admin/ReportMetricDefaults";
import StrategyMetricDefaults from "@/lv/components/admin/StrategyMetricDefaults";
import { REPORT_LAYOUTS } from "@/lv/components/report/ReportLayoutSwitcher";

interface Creative {
  id?: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

interface ReportForm {
  title: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  layoutTheme: number;
  status: string;
  strategyNotes: string;
  investmentTip: string;
  accessPassword: string;
  contactWhatsapp: string;
  contactEmail: string;
  allowLayoutSwitch: boolean;
  goalTarget: number;
  goalReference: number;
  strategyType: string;
  slug: string;
  clientCompanyName: string;
  clientContactName: string;
  clientLogoUrl: string;
  headerPadding: number;
  matrixEnabled: boolean;
  matrixEffect: string;
  matrixDuration: number;
  matrixColor: string;
  matrixText: string;
  headerBgType: string;
  headerBgColor: string;
  headerBgGradient: string;
  headerBgImageUrl: string;
  headerMatrixEnabled: boolean;
  headerMatrixColor: string;
  headerMatrixText: string;
  headerMatrixSpeed: number;
  updateInfoConfig: {
    iconName: string;
    iconSize: number;
    iconColor: string;
    labelText: string;
    labelSize: number;
    labelColor: string;
    dateColor: string;
    dateBold: boolean;
    subtitleText: string;
    subtitleColor: string;
    subtitleSize: number;
    subtitleBold: boolean;
  };
  allowedLayouts: string[];
}

interface Simulation {
  current_investment: number;
  simulated_investment: number;
  projected_clicks: number;
  projected_leads: number;
  projected_messages: number;
  projected_reach: number;
  notes: string;
}

const emptyForm: ReportForm = {
  title: "", clientId: "", periodStart: "", periodEnd: "",
  layoutTheme: 1, status: "draft", strategyNotes: "", investmentTip: "",
  accessPassword: "", contactWhatsapp: "", contactEmail: "", allowLayoutSwitch: true,
  goalTarget: 0, goalReference: 0, strategyType: "", slug: "",
  clientCompanyName: "", clientContactName: "", clientLogoUrl: "",
  headerPadding: 40,
  matrixEnabled: false, matrixEffect: "converge", matrixDuration: 2000, matrixColor: "#00ff41", matrixText: "",
  headerBgType: "theme", headerBgColor: "#6366f1", headerBgGradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  headerBgImageUrl: "", headerMatrixEnabled: false, headerMatrixColor: "#00ff41", headerMatrixText: "", headerMatrixSpeed: 30,
  updateInfoConfig: {
    iconName: "CalendarCheck", iconSize: 18, iconColor: "#00ff41",
    labelText: "Data da Última Atualização de Dados:", labelSize: 12, labelColor: "",
    dateColor: "#00ff41", dateBold: true,
    subtitleText: "Esses dados são atualizados semanalmente! 1 vez por semana.",
    subtitleColor: "#fb923c", subtitleSize: 12, subtitleBold: true,
  },
  allowedLayouts: ["default","analytics","marketing","corporate","modern","funnel","performance","datatable","executive","dashboard"],
};

const isSchemaCacheMiss = (error: any, columnName: string) => {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return message.includes(columnName.toLowerCase()) && message.includes("schema cache");
};

export default function TrafficReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportForm>({ ...emptyForm });
  const [formTab, setFormTab] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [parsedMetrics, setParsedMetrics] = useState<MetaAdsMetric[]>([]);
  const [parsedDailySnapshots, setParsedDailySnapshots] = useState<DailySnapshot[]>([]);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [existingSnapshots, setExistingSnapshots] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([
    { current_investment: 0, simulated_investment: 0, projected_clicks: 0, projected_leads: 0, projected_messages: 0, projected_reach: 0, notes: "" },
    { current_investment: 0, simulated_investment: 0, projected_clicks: 0, projected_leads: 0, projected_messages: 0, projected_reach: 0, notes: "" },
    { current_investment: 0, simulated_investment: 0, projected_clicks: 0, projected_leads: 0, projected_messages: 0, projected_reach: 0, notes: "" },
  ]);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [uploadingCreative, setUploadingCreative] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [matrixConfig, setMatrixConfig] = useState<MatrixConfig>({ ...defaultMatrixConfig });
  const [whatsappWidgetConfig, setWhatsappWidgetConfig] = useState<WhatsAppWidgetConfig>({ ...defaultWhatsAppWidgetConfig });
  const [showMetricDefaults, setShowMetricDefaults] = useState(false);
  const [showStrategyMetrics, setShowStrategyMetrics] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashRetentionDays, setTrashRetentionDays] = useState(30);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchReports(); fetchClients(); }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

  const fetchReports = async () => {
    const { data, error } = await (supabase
      .from("traffic_reports") as any)
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching reports:", error);
      toast({ title: "Erro ao buscar relatórios", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setReports(data);
  };

  const activeReports = reports.filter((r: any) => !r.deleted_at);
  const deletedReports = reports.filter((r: any) => !!r.deleted_at);

  const fetchClients = async () => {
    const { data } = await db.from("clients").select("*").order("name");
    if (data) setClients(data);
  };

  const openCreate = async () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setParsedMetrics([]);
    setParsedDailySnapshots([]);
    setMissingCols([]);
    setUploadFileName("");
    setCampaignName("");
    setExistingSnapshots([]);
    setCreatives([]);
    setSimulations([
      { current_investment: 0, simulated_investment: 0, projected_clicks: 0, projected_leads: 0, projected_messages: 0, projected_reach: 0, notes: "" },
      { current_investment: 0, simulated_investment: 0, projected_clicks: 0, projected_leads: 0, projected_messages: 0, projected_reach: 0, notes: "" },
      { current_investment: 0, simulated_investment: 0, projected_clicks: 0, projected_leads: 0, projected_messages: 0, projected_reach: 0, notes: "" },
    ]);
    setFormTab("info");
    setStoredPassword(null);
    setShowPassword(false);
    setShowForm(true);
    // Load saved defaults
    const [matrixDef, whatsappDef] = await Promise.all([
      loadDefaultConfig("report", "matrix"),
      loadDefaultConfig("report", "whatsapp"),
    ]);
    setMatrixConfig(matrixDef ? { ...defaultMatrixConfig, ...matrixDef } : { ...defaultMatrixConfig });
    setWhatsappWidgetConfig(whatsappDef ? { ...defaultWhatsAppWidgetConfig, ...whatsappDef } : { ...defaultWhatsAppWidgetConfig });
  };

  const openEdit = async (r: any) => {
    setEditingId(r.id);
    setForm({
      title: r.title, clientId: r.client_id || "", periodStart: r.period_start || "",
      periodEnd: r.period_end || "", layoutTheme: r.layout_theme, status: r.status,
      strategyNotes: r.strategy_notes || "", investmentTip: r.investment_tip || "",
      accessPassword: "", contactWhatsapp: r.contact_whatsapp || "", contactEmail: r.contact_email || "",
      allowLayoutSwitch: r.allow_layout_switch !== false,
      goalTarget: r.goal_target || 0, goalReference: r.goal_reference || 0,
      strategyType: r.strategy_type || "", slug: r.slug || "",
      clientCompanyName: r.client_company_name || "", clientContactName: r.client_contact_name || "",
      clientLogoUrl: r.client_logo_url || "",
      headerPadding: r.header_padding ?? 40,
      matrixEnabled: r.matrix_enabled ?? false,
      matrixEffect: r.matrix_effect || "converge",
      matrixDuration: r.matrix_duration || 2000,
      matrixColor: r.matrix_color || "#00ff41",
      matrixText: r.matrix_text || "",
      headerBgType: r.header_bg_type || "theme",
      headerBgColor: r.header_bg_color || "#6366f1",
      headerBgGradient: r.header_bg_gradient || "linear-gradient(135deg, #6366f1, #8b5cf6)",
      headerBgImageUrl: r.header_bg_image_url || "",
      headerMatrixEnabled: r.header_matrix_enabled ?? false,
      headerMatrixColor: r.header_matrix_color || "#00ff41",
      headerMatrixText: r.header_matrix_text || "",
      headerMatrixSpeed: r.header_matrix_speed ?? 30,
      updateInfoConfig: { ...emptyForm.updateInfoConfig, ...(r.update_info_config || {}) },
      allowedLayouts: Array.isArray(r.allowed_layouts) ? r.allowed_layouts : ["default","analytics","marketing","corporate","modern","funnel","performance","datatable","executive","dashboard"],
    });
    setStoredPassword(r.access_password || null);
    setShowPassword(false);

    const { data: metrics } = await db.from("traffic_metrics").select("*").eq("report_id", r.id);
    if (metrics) {
      setParsedMetrics(restrictToApprovedReportMetrics(metrics.map((m: any) => ({
        metric_key: m.metric_key, metric_value: m.metric_value, metric_label: m.metric_label,
        metric_icon: m.metric_icon, metric_color: m.metric_color, metric_category: m.metric_category,
      })) as any));
    }

    // Load existing simulations
    const { data: sims } = await db.from("traffic_report_simulations").select("*").eq("report_id", r.id);
    if (sims && sims.length > 0) {
      setSimulations(sims.map((s: any) => ({
        current_investment: s.current_investment, simulated_investment: s.simulated_investment,
        projected_clicks: s.projected_clicks, projected_leads: s.projected_leads,
        projected_messages: s.projected_messages, projected_reach: s.projected_reach, notes: s.notes || "",
      })));
    }

    // Load existing creatives
    const { data: creativesData } = await db.from("traffic_report_creatives").select("*").eq("report_id", r.id).order("sort_order");
    setCreatives(creativesData?.map((c: any) => ({ id: c.id, image_url: c.image_url, caption: c.caption || "", sort_order: c.sort_order })) || []);

    // Load matrix and whatsapp widget configs
    setMatrixConfig(parseMatrixConfig({ matrix_enabled: r.matrix_enabled, matrix_effect: r.matrix_effect, matrix_duration: r.matrix_duration, matrix_color: r.matrix_color, matrix_text: r.matrix_text }));
    setWhatsappWidgetConfig(parseWhatsAppWidgetConfig(r.whatsapp_widget_config || {}));

    // Load existing snapshots
    const { data: snapshotsData } = await db.from("traffic_report_snapshots").select("*").eq("report_id", r.id).order("created_at", { ascending: false });
    setExistingSnapshots(snapshotsData || []);
    setUploadFileName("");
    setCampaignName("");
    
    setParsedDailySnapshots([]);
    setMissingCols([]);
    setFormTab("info");
    setShowForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadFileName(file.name);
    try {
      const result = await parseMetaAdsFile(file);
      const sanitizedMetrics = restrictToApprovedReportMetrics(result.metrics as any);
      const sanitizedSnapshots = sanitizeMetricSnapshots(result.dailySnapshots || []);

      if (sanitizedMetrics.length === 0) {
        throw new Error("Nenhuma das 12 métricas padrão do relatório foi encontrada nessa planilha.");
      }

      console.log("📊 Parse result:", {
        metrics: sanitizedMetrics.length,
        dailySnapshots: sanitizedSnapshots.length,
        periodStart: result.detectedPeriodStart,
        periodEnd: result.detectedPeriodEnd,
        headers: result.rawData?.[0] ? Object.keys(result.rawData[0]).slice(0, 5) : [],
      });
      setParsedMetrics(sanitizedMetrics);
      setParsedDailySnapshots(sanitizedSnapshots as DailySnapshot[]);
      setMissingCols(result.missingColumns);

      // Auto-fill period dates from CSV if detected
      if (result.detectedPeriodStart && !form.periodStart) {
        setForm(f => ({ ...f, periodStart: result.detectedPeriodStart! }));
      }
      if (result.detectedPeriodEnd && !form.periodEnd) {
        setForm(f => ({ ...f, periodEnd: result.detectedPeriodEnd! }));
      }

      // Auto-fill simulation current investment
      const spend = sanitizedMetrics.find(m => m.metric_key === 'spend');
      if (spend) {
        setSimulations(prev => prev.map((s) => ({ ...s, current_investment: spend.metric_value })));
      }

      const uniqueDays = new Set(sanitizedSnapshots.map(s => s.period_start)).size;
      const snapshotMsg = uniqueDays > 0
        ? ` | ${uniqueDays} dias com dados detectados.`
        : '';
      toast({ title: "Planilha processada!", description: `${sanitizedMetrics.length} métricas padrão encontradas.${snapshotMsg}` });
    } catch (err: any) {
      toast({ title: "Erro ao processar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Update a snapshot's campaign name
  const handleUpdateSnapshotCampaign = async (snapId: string, newCampaign: string) => {
    const cleanCampaign = newCampaign.trim();
    const { data, error } = await db.rpc("update_traffic_snapshot_campaign", {
      _snapshot_id: snapId,
      _campaign_name: cleanCampaign,
    });
    const result = data as { success?: boolean; error?: string } | null;
    if (error || result?.success === false) {
      toast({ title: "Erro ao atualizar campanha", description: error?.message || result?.error || "Não foi possível salvar a campanha.", variant: "destructive" });
      return;
    }
    setExistingSnapshots(prev => prev.map(s => s.id === snapId ? { ...s, campaign_name: cleanCampaign || null } : s));
    toast({ title: "Campanha atualizada" });
  };

  // Delete a single snapshot from upload history
  const handleDeleteSnapshot = async (snapId: string) => {
    const { error } = await db.from("traffic_report_snapshots").delete().eq("id", snapId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setExistingSnapshots(prev => prev.filter(s => s.id !== snapId));
    toast({ title: "Snapshot excluído" });
  };

  // Clear ALL upload history (snapshots + metrics) for the current report
  const handleClearAllUploadData = async () => {
    if (!editingId) return;
    const { error: e1 } = await db.from("traffic_report_snapshots").delete().eq("report_id", editingId);
    const { error: e2 } = await db.from("traffic_metrics").delete().eq("report_id", editingId);
    if (e1 || e2) {
      toast({ title: "Erro ao limpar dados", description: (e1?.message || "") + (e2?.message || ""), variant: "destructive" });
      return;
    }
    setExistingSnapshots([]);
    setParsedMetrics([]);
    setParsedDailySnapshots([]);
    setUploadFileName("");
    toast({ title: "✅ Dados limpos", description: "Todas as métricas e snapshots foram removidos. Faça um novo upload." });
  };

  // ===== Campaign group helpers (group snapshots by campaign_name) =====
  type CampaignGroup = {
    key: string;             // grouping key (campaign_name or "__none__")
    name: string;            // display name ("" => sem nome)
    snapshots: any[];
    sortOrder: number;
    minDate: string;
    maxDate: string;
    fileName: string;
  };

  const campaignGroups = useMemo<CampaignGroup[]>(() => {
    const map = new Map<string, CampaignGroup>();
    for (const s of existingSnapshots) {
      const name = (s.campaign_name || "").trim();
      const key = name || "__none__";
      const existing = map.get(key);
      const so = typeof s.sort_order === "number" ? s.sort_order : 0;
      if (!existing) {
        map.set(key, {
          key, name,
          snapshots: [s],
          sortOrder: so,
          minDate: s.period_start || "",
          maxDate: s.period_end || s.period_start || "",
          fileName: s.file_name || "",
        });
      } else {
        existing.snapshots.push(s);
        existing.sortOrder = Math.min(existing.sortOrder, so);
        if (s.period_start && (!existing.minDate || s.period_start < existing.minDate)) existing.minDate = s.period_start;
        const end = s.period_end || s.period_start || "";
        if (end && end > existing.maxDate) existing.maxDate = end;
        if (!existing.fileName && s.file_name) existing.fileName = s.file_name;
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [existingSnapshots]);

  // Rename all snapshots (and metrics) in a group
  const handleRenameCampaignGroup = async (oldName: string, newName: string) => {
    if (!editingId) return;
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (cleanOld === cleanNew) return;

    const snapQ = db.from("traffic_report_snapshots").update({ campaign_name: cleanNew || null }).eq("report_id", editingId);
    const metQ = db.from("traffic_metrics").update({ campaign_name: cleanNew || null }).eq("report_id", editingId);
    const { error: e1 } = await (cleanOld ? snapQ.eq("campaign_name", cleanOld) : snapQ.is("campaign_name", null));
    const { error: e2 } = await (cleanOld ? metQ.eq("campaign_name", cleanOld) : metQ.is("campaign_name", null));
    if (e1 || e2) {
      toast({ title: "Erro ao renomear campanha", description: (e1?.message || "") + " " + (e2?.message || ""), variant: "destructive" });
      return;
    }
    setExistingSnapshots(prev => prev.map(s => {
      const matches = cleanOld ? (s.campaign_name || "") === cleanOld : !s.campaign_name;
      return matches ? { ...s, campaign_name: cleanNew || null } : s;
    }));
    toast({ title: "Campanha renomeada", description: `Atualizada em todos os dias e métricas vinculadas.` });
  };

  // Delete all snapshots + metrics of a campaign group
  const handleDeleteCampaignGroup = async (name: string) => {
    if (!editingId) return;
    const clean = name.trim();
    const snapQ = db.from("traffic_report_snapshots").delete().eq("report_id", editingId);
    const metQ = db.from("traffic_metrics").delete().eq("report_id", editingId);
    const { error: e1 } = await (clean ? snapQ.eq("campaign_name", clean) : snapQ.is("campaign_name", null));
    const { error: e2 } = await (clean ? metQ.eq("campaign_name", clean) : metQ.is("campaign_name", null));
    if (e1 || e2) {
      toast({ title: "Erro ao excluir campanha", description: (e1?.message || "") + " " + (e2?.message || ""), variant: "destructive" });
      return;
    }
    setExistingSnapshots(prev => prev.filter(s => clean ? (s.campaign_name || "") !== clean : !!s.campaign_name));
    toast({ title: "Campanha removida", description: "Todos os dias e métricas vinculados foram apagados." });
  };

  // Reorder: move a group up/down by swapping sort_order with neighbor
  const handleMoveCampaignGroup = async (groupKey: string, direction: "up" | "down") => {
    if (!editingId) return;
    const idx = campaignGroups.findIndex(g => g.key === groupKey);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= campaignGroups.length) return;

    const a = campaignGroups[idx];
    const b = campaignGroups[swapIdx];
    // Use index-based sort orders to keep sequence stable
    const newOrders = campaignGroups.map((_, i) => i * 10);
    newOrders[idx] = swapIdx * 10;
    newOrders[swapIdx] = idx * 10;

    // Persist new order for each affected group (only the 2 swapped to keep it cheap)
    const persist = async (groupName: string, sortOrder: number) => {
      const clean = groupName.trim();
      const q = (db as any).from("traffic_report_snapshots").update({ sort_order: sortOrder }).eq("report_id", editingId);
      return clean ? q.eq("campaign_name", clean) : q.is("campaign_name", null);
    };
    const { error: ea } = await persist(a.name, newOrders[idx]);
    const { error: eb } = await persist(b.name, newOrders[swapIdx]);
    if (ea || eb) {
      toast({ title: "Erro ao reordenar", description: (ea?.message || "") + " " + (eb?.message || ""), variant: "destructive" });
      return;
    }
    setExistingSnapshots(prev => prev.map(s => {
      const n = (s.campaign_name || "").trim();
      if ((a.name && n === a.name) || (!a.name && !n)) return { ...s, sort_order: newOrders[idx] };
      if ((b.name && n === b.name) || (!b.name && !n)) return { ...s, sort_order: newOrders[swapIdx] };
      return s;
    }));
  };



  const handleCreativeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingCreative(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('report-creatives').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('report-creatives').getPublicUrl(path);
        setCreatives(prev => [...prev, { image_url: publicUrl, caption: '', sort_order: prev.length }]);
      }
      toast({ title: "Criativos enviados!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCreative(false);
      e.target.value = '';
    }
  };

  const removeCreative = (index: number) => {
    setCreatives(prev => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, sort_order: i })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const slug = form.slug || generateSlug(form.title || "relatorio");
    const payload: any = {
      title: form.title, client_id: form.clientId || null, period_start: form.periodStart || null,
      period_end: form.periodEnd || null, layout_theme: form.layoutTheme, status: form.status,
      strategy_notes: form.strategyNotes, investment_tip: form.investmentTip,
      contact_whatsapp: form.contactWhatsapp, contact_email: form.contactEmail,
      allow_layout_switch: form.allowLayoutSwitch,
      goal_target: form.goalTarget || 0, goal_reference: form.goalReference || 0,
      strategy_type: form.strategyType || "",
      slug: slug,
      client_company_name: form.clientCompanyName || "",
      client_contact_name: form.clientContactName || "",
      client_logo_url: form.clientLogoUrl || "",
      header_padding: form.headerPadding || 40,
      matrix_enabled: matrixConfig.enabled,
      matrix_effect: matrixConfig.effect,
      matrix_duration: matrixConfig.duration,
      matrix_color: matrixConfig.color,
      matrix_text: matrixConfig.text,
      whatsapp_widget_config: whatsappWidgetConfig,
      header_bg_type: form.headerBgType,
      header_bg_color: form.headerBgColor,
      header_bg_gradient: form.headerBgGradient,
      header_bg_image_url: form.headerBgImageUrl,
      header_matrix_enabled: form.headerMatrixEnabled,
      header_matrix_color: form.headerMatrixColor,
      header_matrix_text: form.headerMatrixText,
      header_matrix_speed: form.headerMatrixSpeed,
      update_info_config: form.updateInfoConfig,
      allowed_layouts: form.allowedLayouts,
      updated_at: new Date().toISOString(),
    };

    if (form.accessPassword) {
      payload.access_password = form.accessPassword;
    }

    let reportId = editingId;
    let error;
    let usedSchemaFallback = false;

    const saveTrafficReport = async (reportPayload: any) => {
      if (editingId) {
        return db.from("traffic_reports").update(reportPayload).eq("id", editingId);
      }

      return db.from("traffic_reports")
        .insert({ ...reportPayload, user_id: user.id })
        .select("id")
        .maybeSingle();
    };

    let result = await saveTrafficReport(payload);

    if (isSchemaCacheMiss(result.error, "update_info_config")) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.update_info_config;
      usedSchemaFallback = true;
      result = await saveTrafficReport(fallbackPayload);
    }

    error = result.error;
    if (!editingId && result.data) reportId = result.data.id;

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    if (usedSchemaFallback) {
      toast({
        title: "Relatório salvo",
        description: "O cache do banco ignorou a configuração visual da data, mas os dados da planilha foram atualizados.",
      });
    }

    const sanitizedMetrics = restrictToApprovedReportMetrics(parsedMetrics);
    const sanitizedSnapshots = sanitizeMetricSnapshots(parsedDailySnapshots || []);
    const cleanCampaignName = campaignName.trim();
    const hasNewUpload = !!uploadFileName && sanitizedMetrics.length > 0;
    const snapshotCampaignNames = Array.from(new Set(
      sanitizedSnapshots
        .map((snap: any) => String(snap.campaign_name || "").trim())
        .filter(Boolean)
    ));
    const replaceCampaignNames = cleanCampaignName ? [cleanCampaignName] : snapshotCampaignNames;

    // Só grava/apaga métricas quando um novo arquivo foi escolhido nesta edição.
    // Editar tema, senha, período ou outros campos NÃO pode mexer no histórico já salvo.
    if (reportId && hasNewUpload) {
      const failUploadSave = (message: string) => {
        toast({ title: "Erro ao salvar planilha", description: message, variant: "destructive" });
        setSubmitting(false);
      };

      if (replaceCampaignNames.length > 0) {
        for (const name of replaceCampaignNames) {
          const { error: delMetricsErr } = await db.from("traffic_metrics").delete().eq("report_id", reportId).eq("campaign_name", name);
          if (delMetricsErr) return failUploadSave(delMetricsErr.message);
        }
        if (!cleanCampaignName) {
          const { error: delNullMetricsErr } = await db.from("traffic_metrics").delete().eq("report_id", reportId).is("campaign_name", null);
          if (delNullMetricsErr) return failUploadSave(delNullMetricsErr.message);
        }
      } else {
        const { error: delMetricsErr } = await db.from("traffic_metrics").delete().eq("report_id", reportId).is("campaign_name", null);
        if (delMetricsErr) return failUploadSave(delMetricsErr.message);
      }

      const metricsPayload = sanitizedMetrics.map(m => ({
        report_id: reportId!,
        campaign_name: cleanCampaignName || null,
        ...m,
      }));
      const { error: insMetricsErr } = await db.from("traffic_metrics").insert(metricsPayload);
      if (insMetricsErr) return failUploadSave(insMetricsErr.message);

      if (replaceCampaignNames.length > 0) {
        for (const name of replaceCampaignNames) {
          const { error: delSnapErr } = await db.from("traffic_report_snapshots").delete().eq("report_id", reportId).eq("campaign_name", name);
          if (delSnapErr) return failUploadSave(delSnapErr.message);
        }
        if (!cleanCampaignName) {
          const { error: delNullSnapErr } = await db.from("traffic_report_snapshots").delete().eq("report_id", reportId).is("campaign_name", null);
          if (delNullSnapErr) return failUploadSave(delNullSnapErr.message);
        }
      } else {
        const { error: delSnapErr } = await db.from("traffic_report_snapshots").delete().eq("report_id", reportId).is("campaign_name", null);
        if (delSnapErr) return failUploadSave(delSnapErr.message);
      }

      if (sanitizedSnapshots.length > 0) {
        const preparedRows = sanitizedSnapshots.map((snap: any) => {
          const snapshotCampaign = cleanCampaignName || String(snap.campaign_name || "").trim() || null;
          return {
            report_id: reportId!,
            period_start: snap.period_start,
            period_end: snap.period_end,
            file_name: uploadFileName,
            upload_label: snapshotCampaign || new Date(snap.period_start + 'T12:00:00').toLocaleDateString("pt-BR"),
            campaign_name: snapshotCampaign,
            metrics: snap.metrics as any,
          };
        });
        const averageMetricKeys = new Set(["cpm", "cpc", "cpc_all", "ctr", "ctr_all", "frequency", "cost_per_message", "conversation_rate", "creative_quality_ctr", "instagram_profile_quality"]);
        const snapshotRows = Array.from(preparedRows.reduce((acc, row: any) => {
          const key = `${row.period_start}|${row.period_end}|${row.campaign_name || ""}`;
          const current = acc.get(key);
          if (!current) {
            acc.set(key, { ...row, metrics: [...(Array.isArray(row.metrics) ? row.metrics : [])] });
            return acc;
          }

          const metricMap = new Map<string, { item: any; sum: number; count: number }>();
          for (const metric of [...(current.metrics || []), ...(Array.isArray(row.metrics) ? row.metrics : [])]) {
            if (!metric?.metric_key) continue;
            const found = metricMap.get(metric.metric_key) || { item: metric, sum: 0, count: 0 };
            found.sum += Number(metric.metric_value || 0);
            found.count += 1;
            metricMap.set(metric.metric_key, found);
          }
          current.metrics = Array.from(metricMap.values()).map(({ item, sum, count }) => ({
            ...item,
            metric_value: Math.round((averageMetricKeys.has(item.metric_key) ? sum / Math.max(count, 1) : sum) * 100) / 100,
          }));
          return acc;
        }, new Map<string, any>()).values());
        const { error: snapError } = await db.from("traffic_report_snapshots").insert(snapshotRows);
        if (snapError) return failUploadSave(snapError.message);
      } else if (form.periodStart && form.periodEnd) {
        const { error: snapError } = await db.from("traffic_report_snapshots").insert([{
          report_id: reportId!,
          period_start: form.periodStart,
          period_end: form.periodEnd,
          file_name: uploadFileName,
          upload_label: cleanCampaignName || `${new Date(form.periodStart + 'T12:00:00').toLocaleDateString("pt-BR")} a ${new Date(form.periodEnd + 'T12:00:00').toLocaleDateString("pt-BR")}`,
          campaign_name: cleanCampaignName || null,
          metrics: sanitizedMetrics as any,
        }]);
        if (snapError) return failUploadSave(snapError.message);
      }
    }

    // Save simulations
    if (reportId) {
      await db.from("traffic_report_simulations").delete().eq("report_id", reportId);
      const validSims = simulations.filter(s => s.simulated_investment > 0);
      if (validSims.length > 0) {
        await db.from("traffic_report_simulations").insert(
          validSims.map(s => ({ report_id: reportId!, ...s }))
        );
      }
    }

    // Save creatives
    if (reportId) {
      await db.from("traffic_report_creatives").delete().eq("report_id", reportId);
      if (creatives.length > 0) {
        await db.from("traffic_report_creatives").insert(
          creatives.map((c, i) => ({ report_id: reportId!, image_url: c.image_url, caption: c.caption, sort_order: i }))
        );
      }
    }

    setShowForm(false);
    fetchReports();
    setSubmitting(false);
  };

  const deleteReport = async (id: string) => {
    try {
      console.log("Iniciando exclusão do relatório:", id);
      
      // Deletar o relatório (as FKs agora têm ON DELETE CASCADE no banco de dados)
      const { error } = await supabase
        .from("traffic_reports")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.warn("Hard delete falhou:", error.message);
        throw error;
      }

      toast({ title: "Relatório excluído com sucesso" });
      await fetchReports();
    } catch (err: any) {
      console.error("Erro completo na exclusão:", err);
      toast({ 
        title: "Erro ao excluir", 
        description: "Verifique suas permissões ou se o relatório ainda existe.", 
        variant: "destructive" 
      });
    }
  };

  const restoreReport = async (id: string) => {
    try {
      const { error } = await (db as any).from("traffic_reports").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
      await fetchReports();
      toast({ title: "Relatório restaurado!" });
    } catch (err: any) {
      toast({ title: "Erro ao restaurar", description: err.message, variant: "destructive" });
    }
  };

  const permanentDeleteReport = async (id: string) => {
    try {
      // Delete related data first
      const results = await Promise.all([
        db.from("traffic_metrics").delete().eq("report_id", id),
        db.from("traffic_report_snapshots").delete().eq("report_id", id),
        db.from("traffic_report_creatives").delete().eq("report_id", id),
        db.from("traffic_report_simulations").delete().eq("report_id", id),
      ]);
      
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) throw errorResult.error;

      const { error } = await db.from("traffic_reports").delete().eq("id", id);
      if (error) throw error;
      
      await fetchReports();
      toast({ title: "Relatório excluído permanentemente" });
    } catch (err: any) {
      console.error("Permanent delete error:", err);
      toast({ title: "Erro ao excluir permanentemente", description: err.message, variant: "destructive" });
    }
  };

  const { deleteTarget: permDeleteTarget, requestDelete: requestPermDelete, confirmDelete: confirmPermDelete, cancelDelete: cancelPermDelete } = useConfirmDelete(permanentDeleteReport);

  const { deleteTarget: deleteReportTarget, requestDelete: requestDeleteReport, confirmDelete: confirmDeleteReport, cancelDelete: cancelDeleteReport } = useConfirmDelete(deleteReport);

  const getReportLink = (r: any) => r.slug || r.access_token;

  const copyLink = (r: any) => {
    navigator.clipboard.writeText(getReportShareUrl(getReportLink(r)));
    toast({ title: "Link copiado!", description: "Link otimizado para WhatsApp copiado." });
  };

  const handlePrint = (r: any) => {
    const w = window.open(getReportUrl(getReportLink(r)), "_blank");
    if (w) w.addEventListener("load", () => setTimeout(() => w.print(), 1500));
  };

  const convertToClient = async (r: any) => {
    if (!user) return;
    // Check if client already linked
    if (r.client_id) {
      toast({ title: "Já vinculado", description: "Este relatório já possui um cliente vinculado.", variant: "destructive" });
      return;
    }
    const clientName = r.client_company_name || r.client_contact_name || r.title || "Novo Cliente";
    const { data, error } = await db.from("clients").insert({
      user_id: user.id,
      name: clientName,
      whatsapp: r.contact_whatsapp || null,
      email: r.contact_email || null,
      business_type: "",
      city: "",
      status: "orcamento",
      monthly_value: 0,
      due_day: 10,
    }).select("id").single();
    if (error || !data) {
      toast({ title: "Erro ao criar cliente", description: error?.message, variant: "destructive" });
      return;
    }
    // Link report to new client
    await db.from("traffic_reports").update({ client_id: data.id }).eq("id", r.id);
    toast({ title: "Cliente criado!", description: `"${clientName}" foi pré-cadastrado. Complete os dados na página de Clientes.` });
    fetchReports();
  };

  const updateReportSlug = async (id: string, newSlug: string) => {
    const { error } = await db.from("traffic_reports").update({ slug: newSlug }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Slug atualizado!" }); fetchReports(); }
  };

  const updateField = (field: keyof ReportForm, value: any) => setForm(f => ({ ...f, [field]: value }));

  const updateSimulation = (index: number, field: keyof Simulation, value: any) => {
    setSimulations(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "created_at" ? "desc" : "asc"); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = (filterClient === "all" ? activeReports : activeReports.filter(r => r.client_id === filterClient))
    .filter(r => !search ||
      (r.title || "").toLowerCase().includes(search.toLowerCase()) ||
      ((r as any).clients?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.slug || "").toLowerCase().includes(search.toLowerCase()) ||
      r.access_token.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case "title": valA = (a.title || "").toLowerCase(); valB = (b.title || "").toLowerCase(); break;
        case "client": valA = ((a as any).clients?.name || "").toLowerCase(); valB = ((b as any).clients?.name || "").toLowerCase(); break;
        case "status": valA = a.status; valB = b.status; break;
        default: valA = a.created_at; valB = b.created_at;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const reportsWithClient = activeReports.filter((r: any) => !!r.client_id).length;
  const reportsProtected = activeReports.filter((r: any) => !!r.access_password).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in-50 duration-300">
      {/* Apple-style header */}
      <PageHeader
        icon={BarChart2}
        title="Relatórios de Tráfego"
        subtitle="Gerencie relatórios de campanhas Meta Ads e apresente resultados ao cliente."
        gradient="from-orange-500 to-red-600"
        shadowColor="shadow-orange-500/25"
        badge={activeReports.length}
        actions={
          <>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-300 border border-orange-500/20">
              {activeReports.length} {activeReports.length === 1 ? "relatório" : "relatórios"}
            </Badge>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" onClick={() => { fetchReports(); fetchClients(); toast({ title: "Dados atualizados!" }); }} title="Atualizar dados">
              <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" onClick={() => setShowStrategyMetrics(true)}>
              <Settings2 className="h-3.5 w-3.5" /> <span className="hidden md:inline">Métricas por Estratégia</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" onClick={() => setShowMetricDefaults(true)}>
              <Settings2 className="h-3.5 w-3.5" /> <span className="hidden md:inline">Métricas Padrão</span>
            </Button>
            <Button onClick={openCreate} size="sm" className="h-9 gap-2 rounded-full shadow-sm bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 text-white">
              <Plus className="h-4 w-4" /> Novo Relatório
            </Button>
          </>
        }
      />

      {/* KPI Apple Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent backdrop-blur-xl shadow-lg shadow-orange-500/10">
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Relatórios</p>
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-300 dark:to-red-300 bg-clip-text text-transparent">{activeReports.length}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-xl shadow-lg shadow-emerald-500/10">
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vinculados a Clientes</p>
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{reportsWithClient}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent backdrop-blur-xl shadow-lg shadow-indigo-500/10">
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Protegidos por Senha</p>
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Lock className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{reportsProtected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: filtros em uma linha coesa */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-full sm:w-[240px] h-10 rounded-xl bg-muted/40 border-border/60"><SelectValue placeholder="Filtrar por cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por título, cliente ou slug..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl bg-muted/40 border-border/60 focus-visible:bg-background transition-colors" />
          </div>
        </div>
      </div>

      {/* Table List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 ring-1 ring-border/60">
              <BarChart2 className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium">Nenhum relatório encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro relatório de tráfego e ele aparecerá aqui.</p>
            <Button variant="outline" size="sm" className="mt-5 rounded-full gap-2" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Criar primeiro relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/70 backdrop-blur-sm overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
          <Table className="min-w-0">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 hover:from-muted/60 hover:via-muted/40 hover:to-muted/60 border-border/60">
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("title")}>
                  <span className="flex items-center">Relatório <SortIcon field="title" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("client")}>
                  <span className="flex items-center">Cliente <SortIcon field="client" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center">Criado <SortIcon field="created_at" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12" onClick={() => toggleSort("status")}>
                  <span className="flex items-center">Status <SortIcon field="status" /></span>
                </TableHead>
                <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold h-12" title="Visualizações da equipe/admin logados">
                  <span className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <InternalViewIcon size={16} /> Interno
                  </span>
                </TableHead>
                <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold h-12" title="Visualizações de clientes/dispositivos externos">
                  <span className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <ExternalViewIcon size={16} /> Externo
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12">Último Acesso</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-12 pr-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const clientName = (r as any).clients?.name as string | undefined;
                const initials = (clientName || "—").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "—";
                const isPublished = r.status === "published";
                const lastInt = (r as any).last_internal_viewed_at;
                const lastExt = (r as any).last_external_viewed_at;
                const last = (r as any).last_viewed_at;
                return (
                <TableRow key={r.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.title || "Sem título"}</span>
                      {r.access_password && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-foreground/70 bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded">
                        <Link2 className="h-2.5 w-2.5 opacity-60" />/{r.slug || r.access_token.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{getReportTheme(r.layout_theme).name}</span>
                    </div>
                    {r.period_start && r.period_end && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(r.period_start).toLocaleDateString("pt-BR")} — {new Date(r.period_end).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {clientName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center text-[10px] font-semibold text-primary">
                          {initials}
                        </div>
                        <span className="text-sm truncate max-w-[160px]">{clientName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm tabular-nums">{format(new Date(r.created_at), "dd/MM/yy", { locale: ptBR })}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{format(new Date(r.created_at), "HH:mm")}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${isPublished ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" : "bg-muted/60 text-muted-foreground border-border/60"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                      {isPublished ? "Publicado" : "Rascunho"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <ViewCountBadge
                      variant="internal"
                      count={(r as any).internal_view_count || 0}
                      lastAt={lastInt ? format(new Date(lastInt), "dd/MM HH:mm", { locale: ptBR }) : null}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <ViewCountBadge
                      variant="external"
                      count={(r as any).external_view_count || 0}
                      lastAt={lastExt ? format(new Date(lastExt), "dd/MM HH:mm", { locale: ptBR }) : null}
                    />
                  </TableCell>
                  <TableCell>
                    {last ? (
                      <div>
                        <div className="text-sm tabular-nums">{format(new Date(last), "dd/MM/yy", { locale: ptBR })}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{format(new Date(last), "HH:mm:ss")}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Nunca acessado</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end">
                      <RowActionsMenu items={[
                        { label: "Visualizar", icon: Eye, onClick: () => window.open(getReportUrl(getReportLink(r)), "_blank") },
                        { label: "Editar", icon: Pencil, onClick: () => openEdit(r) },
                        { label: "Copiar Link", icon: Copy, onClick: () => copyLink(r) },
                        { label: "Copiar Senha", icon: Copy, onClick: () => { navigator.clipboard.writeText(r.access_password || ""); toast({ title: "Senha copiada!" }); }, hidden: !r.access_password },
                        { label: "Imprimir", icon: Printer, onClick: () => handlePrint(r) },
                        { label: "Converter em Cliente", icon: UserPlus, onClick: () => convertToClient(r), tone: "success", hidden: !!r.client_id },
                        { label: "Excluir", icon: Trash2, onClick: () => requestDeleteReport(r.id), tone: "danger" },
                      ]} />
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
      {deletedReports.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTrash ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <Trash2 className="h-4 w-4" />
            Relatórios Excluídos ({deletedReports.length})
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
              <div className="rounded-2xl border border-dashed border-destructive/30 overflow-hidden bg-card/40">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/60">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-10">Relatório</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-10">Cliente</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-10">Excluído em</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-10">Expira em</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground h-10">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedReports.map((r: any) => {
                      const deletedDate = new Date(r.deleted_at);
                      const expiresDate = new Date(deletedDate.getTime() + trashRetentionDays * 24 * 60 * 60 * 1000);
                      const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                      return (
                        <TableRow key={r.id} className="opacity-70 hover:opacity-100 border-border/40 transition-opacity">
                          <TableCell className="font-medium">{r.title || "Sem título"}</TableCell>
                          <TableCell className="text-sm">{r.clients?.name || "—"}</TableCell>
                          <TableCell className="text-sm tabular-nums">{format(deletedDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${daysLeft <= 7 ? "bg-destructive/10 text-destructive border-destructive/25" : "bg-muted/60 text-muted-foreground border-border/60"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${daysLeft <= 7 ? "bg-destructive" : "bg-muted-foreground/50"}`} />
                              {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10" onClick={() => restoreReport(r.id)} title="Restaurar">
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => requestPermDelete(r.id)} title="Excluir Permanentemente">
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editingId ? "Editar Relatório" : "Novo Relatório"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <Tabs value={formTab} onValueChange={setFormTab} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4">
                <TabsList className="w-full grid grid-cols-9 h-10">
                  <TabsTrigger value="info" className="text-xs">Dados</TabsTrigger>
                  <TabsTrigger value="upload" className="text-xs">Planilha</TabsTrigger>
                  <TabsTrigger value="creatives" className="text-xs">Criativos</TabsTrigger>
                  <TabsTrigger value="theme" className="text-xs">Tema</TabsTrigger>
                  <TabsTrigger value="banner" className="text-xs">Banner</TabsTrigger>
                  <TabsTrigger value="matrix" className="text-xs">Matrix</TabsTrigger>
                  <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
                  <TabsTrigger value="strategy" className="text-xs">Estratégia</TabsTrigger>
                  <TabsTrigger value="simulations" className="text-xs">Simulações</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* INFO TAB */}
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <Input placeholder="Relatório Junho/2025" value={form.title} onChange={e => updateField("title", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cliente</Label>
                      <Select value={form.clientId} onValueChange={v => updateField("clientId", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Início do Período</Label>
                      <Input type="date" value={form.periodStart} onChange={e => updateField("periodStart", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Fim do Período</Label>
                      <Input type="date" value={form.periodEnd} onChange={e => updateField("periodEnd", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Senha de Acesso</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={editingId && storedPassword ? "Senha atual definida" : editingId ? "Deixe vazio para manter" : "Definir senha..."}
                            value={form.accessPassword}
                            onChange={e => updateField("accessPassword", e.target.value)}
                          />
                          {(form.accessPassword || storedPassword) && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        {editingId && storedPassword && !form.accessPassword && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="shrink-0"
                            onClick={async () => {
                              await db.from("traffic_reports").update({ access_password: null } as any).eq("id", editingId);
                              setStoredPassword(null);
                              toast({ title: "Senha removida" });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                          </Button>
                        )}
                      </div>
                      {editingId && storedPassword && !form.accessPassword && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Senha atual: <span className={showPassword ? "" : "blur-sm select-none"}>{storedPassword}</span>
                          {!showPassword && <button type="button" onClick={() => setShowPassword(true)} className="ml-1 text-primary underline text-xs">ver</button>}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={form.status} onValueChange={v => updateField("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="published">Publicado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Slug do Link</Label>
                    <Input placeholder="nome-do-cliente (deixe vazio para gerar automaticamente)" value={form.slug} onChange={e => updateField("slug", e.target.value)} />
                    <p className="text-xs text-muted-foreground">URL: relatorios.matheusrangel.com.br/<strong>{form.slug || "auto-gerado"}</strong></p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">WhatsApp de contato</Label>
                      <Input placeholder="5511999999999" value={form.contactWhatsapp} onChange={e => updateField("contactWhatsapp", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">E-mail de contato</Label>
                      <Input placeholder="contato@agencia.com" value={form.contactEmail} onChange={e => updateField("contactEmail", e.target.value)} />
                    </div>
                  </div>

                  {/* Client Branding Section */}
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Image className="h-4 w-4 text-primary" /> Identidade do Cliente
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nome do Cliente / Responsável</Label>
                        <Input placeholder="João Silva" value={form.clientContactName} onChange={e => updateField("clientContactName", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nome da Empresa</Label>
                        <Input placeholder="Empresa XYZ Ltda" value={form.clientCompanyName} onChange={e => updateField("clientCompanyName", e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Logo da Empresa</Label>
                      <div className="flex items-center gap-4">
                        {form.clientLogoUrl && (
                          <div className="w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0 bg-muted">
                            <img src={form.clientLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <Input placeholder="https://... ou faça upload abaixo" value={form.clientLogoUrl} onChange={e => updateField("clientLogoUrl", e.target.value)} />
                          <Input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const ext = file.name.split('.').pop();
                            const path = `client-logos/${crypto.randomUUID()}.${ext}`;
                            const { error } = await supabase.storage.from('report-creatives').upload(path, file);
                            if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
                            const { data: { publicUrl } } = supabase.storage.from('report-creatives').getPublicUrl(path);
                            updateField("clientLogoUrl", publicUrl);
                            toast({ title: "Logo enviado!" });
                          }} className="text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* UPLOAD TAB */}
                <TabsContent value="upload" className="mt-0 space-y-4">
                  <div className="bg-muted/30 rounded-xl p-6 border border-dashed border-primary/20">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Step 1: Campaign Name */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">1</div>
                          <Label htmlFor="campaign-name" className="text-sm font-bold uppercase tracking-wide">
                            Identificar Campanha
                          </Label>
                        </div>
                        <div className="space-y-2">
                          <Input 
                            id="campaign-name"
                            placeholder="Ex: Lançamento Julho, Black Friday..."
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            className="h-11 text-base shadow-sm border-primary/20 focus-visible:ring-primary/30"
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                            O nome que você colocar aqui será o nome que o seu cliente verá nos botões de filtro. 
                            <strong> Deixe em branco para usar o nome da planilha.</strong>
                          </p>
                        </div>
                      </div>

                      {/* Step 2: File Upload */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">2</div>
                          <Label className="text-sm font-bold uppercase tracking-wide">Anexar Planilha (.csv)</Label>
                        </div>
                        <div className="relative group">
                          <div className={`
                            border-2 border-dashed rounded-xl p-4 transition-all
                            ${uploading ? 'bg-primary/5 border-primary/40' : 'bg-background border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'}
                            flex flex-col items-center justify-center gap-2 cursor-pointer relative
                          `}>
                            <Upload className={`h-8 w-8 ${uploading ? 'animate-bounce text-primary' : 'text-muted-foreground/40 group-hover:text-primary'}`} />
                            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">
                              {uploadFileName ? uploadFileName : 'Clique ou arraste o arquivo aqui'}
                            </span>
                            <Input 
                              type="file" 
                              accept=".xlsx,.xls,.csv,.ods,.tsv,.txt" 
                              onChange={handleFileUpload} 
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              disabled={uploading} 
                            />
                          </div>
                          {uploading && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl">
                              <span className="text-xs font-bold animate-pulse">PROCESSANDO...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {missingCols.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Colunas não encontradas:</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{missingCols.join(", ")}</p>
                      </div>
                    </div>
                  )}

                  {parsedMetrics.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-medium">{parsedMetrics.length} métricas mapeadas</p>
                        {parsedDailySnapshots.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="h-3 w-3" />
                            {parsedDailySnapshots.length} dias com dados
                          </Badge>
                        )}
                        {parsedDailySnapshots.length > 0 && (() => {
                          const dates = parsedDailySnapshots.map(s => s.period_start).sort();
                          const first = dates[0];
                          const last = dates[dates.length - 1];
                          return (
                            <Badge variant="secondary" className="text-xs gap-1">
                              {new Date(first + 'T12:00:00').toLocaleDateString("pt-BR")} — {new Date(last + 'T12:00:00').toLocaleDateString("pt-BR")}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {parsedMetrics.map(m => (
                          <div key={m.metric_key} className="flex items-center gap-3 p-3 rounded-lg border">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.metric_color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.metric_label}</p>
                              <p className="text-xs text-muted-foreground">{m.metric_key}</p>
                            </div>
                            <p className="text-sm font-mono font-semibold">
                              {formatMetricValue(m.metric_key, m.metric_label, m.metric_value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing Snapshots History */}
                  {existingSnapshots.length > 0 && (
                    <div className="space-y-3 bg-muted/10 rounded-xl p-5 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold uppercase tracking-tight">Campanhas Enviadas</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                              {campaignGroups.length} campanha{campaignGroups.length === 1 ? "" : "s"} • {existingSnapshots.length} dias de dados no total
                            </p>
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1.5 h-8 text-[11px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive" 
                          onClick={handleClearAllUploadData}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> LIMPAR TUDO E RECOMEÇAR
                        </Button>
                      </div>

                      <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg text-[11px] text-foreground/80 leading-relaxed">
                        💡 <strong>Como funciona:</strong> Cada campanha abaixo vira <strong>1 botão de filtro</strong> no relatório do cliente. Para atualizar uma campanha, basta reenviar o CSV usando <strong>o mesmo nome de campanha</strong> — os dados antigos são substituídos pelos novos automaticamente, sem duplicar. Use as setas <ArrowUp className="inline h-3 w-3" />/<ArrowDown className="inline h-3 w-3" /> para definir a ordem dos botões.
                      </div>

                      <div className="space-y-2.5">
                        {campaignGroups.map((group, idx) => {
                          const totalMetrics = group.snapshots.reduce((sum, s) => sum + (Array.isArray(s.metrics) ? s.metrics.length : 0), 0);
                          const fmtBR = (d: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString("pt-BR") : "—";
                          const displayName = group.name || "Sem nome (Geral)";
                          return (
                            <div key={group.key} className="flex items-stretch gap-2 p-3.5 rounded-xl bg-background border border-border/60 hover:border-primary/30 transition-all shadow-sm group">
                              {/* Reorder column */}
                              <div className="flex flex-col items-center justify-center gap-1 pr-2 border-r border-border/40">
                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md" disabled={idx === 0}
                                  onClick={() => handleMoveCampaignGroup(group.key, "up")} title="Mover para cima">
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-[10px] font-mono font-bold text-muted-foreground">{idx + 1}</span>
                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md" disabled={idx === campaignGroups.length - 1}
                                  onClick={() => handleMoveCampaignGroup(group.key, "down")} title="Mover para baixo">
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              {/* Group info */}
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                                    Campanha
                                  </Badge>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {fmtBR(group.minDate)} → {fmtBR(group.maxDate)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                                    {group.snapshots.length} dia{group.snapshots.length === 1 ? "" : "s"} • {totalMetrics} métricas
                                  </span>
                                </div>
                                <p className="text-sm font-bold truncate">{displayName}</p>
                                {group.fileName && (
                                  <p className="text-[10px] text-muted-foreground font-medium truncate">
                                    Arquivo: {group.fileName}
                                  </p>
                                )}
                                <div className="space-y-1 pt-1 border-t border-dashed border-border/60">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                    <Pencil className="h-2.5 w-2.5" /> Nome do botão (filtro do cliente):
                                  </Label>
                                  <Input
                                    className="h-8 text-xs bg-muted/20 border-border/40 focus:bg-background"
                                    placeholder="Digite o nome da campanha..."
                                    defaultValue={group.name}
                                    onBlur={(e) => {
                                      if (e.target.value !== group.name) handleRenameCampaignGroup(group.name, e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Delete group */}
                              <div className="flex items-start">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (window.confirm(`Remover a campanha "${displayName}" e todos os ${group.snapshots.length} dia(s) de dados vinculados? Esta ação não pode ser desfeita.`)) {
                                      handleDeleteCampaignGroup(group.name);
                                    }
                                  }}
                                  title="Excluir campanha inteira"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                          <strong>Dica:</strong> Renomear uma campanha atualiza o botão de filtro do cliente automaticamente. Para reenviar dados atualizados (mais dias), faça o upload com <strong>o mesmo nome</strong> — sem duplicações.
                        </p>
                      </div>

                    </div>
                  )}
                </TabsContent>

                {/* CREATIVES TAB */}
                <TabsContent value="creatives" className="mt-0 space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Image className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">Envie imagens dos criativos das campanhas</p>
                    <Input type="file" accept="image/*" multiple onChange={handleCreativeUpload} className="max-w-xs mx-auto" disabled={uploadingCreative} />
                  </div>
                  {creatives.length > 0 && (
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                      {creatives.map((c, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border">
                          <img src={c.image_url} alt={c.caption || `Criativo ${i + 1}`} className="w-full aspect-square object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                            <Input placeholder="Legenda..." value={c.caption} onChange={e => setCreatives(prev => prev.map((cr, ci) => ci === i ? { ...cr, caption: e.target.value } : cr))}
                              className="text-xs h-8 bg-white/10 border-white/20 text-white placeholder:text-white/50" />
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeCreative(i)} className="gap-1">
                              <Trash2 className="h-3 w-3" /> Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="theme" className="mt-0 space-y-4">
                  {/* Layout switch toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border">
                    <div>
                      <p className="text-sm font-semibold">Permitir troca de layout</p>
                      <p className="text-xs text-muted-foreground">O cliente poderá alternar entre layouts na visualização</p>
                    </div>
                    <Switch checked={form.allowLayoutSwitch} onCheckedChange={(v) => updateField("allowLayoutSwitch", v)} />
                  </div>

                  {/* Allowed layouts selection */}
                  {form.allowLayoutSwitch && (
                    <div className="p-4 rounded-xl border space-y-3">
                      <div>
                        <p className="text-sm font-semibold">Layouts Disponíveis para o Cliente</p>
                        <p className="text-xs text-muted-foreground">Selecione quais layouts o cliente poderá visualizar</p>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {REPORT_LAYOUTS.map(layout => {
                          const isChecked = form.allowedLayouts.includes(layout.id);
                          return (
                            <label key={layout.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? "bg-primary/5 border-primary/30" : "border-border hover:border-primary/20"}`}>
                              <input type="checkbox" checked={isChecked} onChange={() => {
                                const next = isChecked
                                  ? form.allowedLayouts.filter(l => l !== layout.id)
                                  : [...form.allowedLayouts, layout.id];
                                updateField("allowedLayouts", next.length > 0 ? next : [layout.id]);
                              }} className="accent-primary" />
                              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                style={{ background: layout.color }}>
                                {layout.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{layout.name}</p>
                                <p className="text-[10px] text-muted-foreground">{layout.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => updateField("allowedLayouts", REPORT_LAYOUTS.map(l => l.id))}>
                          Selecionar Todos
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => updateField("allowedLayouts", ["default"])}>
                          Apenas Padrão
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Header padding control */}
                  <div className="p-4 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Altura do Cabeçalho</p>
                        <p className="text-xs text-muted-foreground">Controle o espaçamento vertical da seção do cabeçalho</p>
                      </div>
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{form.headerPadding}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={80}
                      step={4}
                      value={form.headerPadding}
                      onChange={e => updateField("headerPadding", parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Compacto</span>
                      <span>Espaçoso</span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {reportThemes.map(t => (
                      <button key={t.id} type="button"
                        className={`p-4 rounded-xl border-2 text-left transition-all ${form.layoutTheme === t.id ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50"}`}
                        onClick={() => updateField("layoutTheme", t.id)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: t.gradient, color: t.accentFg }}>
                            {t.id}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {t.chartColors.map((c, i) => (
                            <div key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                {/* BANNER TAB */}
                <TabsContent value="banner" className="mt-0 space-y-4">
                  <p className="text-sm font-semibold mb-2">Fundo do Banner do Topo</p>

                  {/* Type selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo de Fundo</Label>
                    <Select value={form.headerBgType} onValueChange={v => updateField("headerBgType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="theme">🎨 Usar Gradiente do Tema</SelectItem>
                        <SelectItem value="color">🟣 Cor Sólida</SelectItem>
                        <SelectItem value="gradient">🌈 Gradiente Personalizado</SelectItem>
                        <SelectItem value="image">🖼️ Imagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.headerBgType === "color" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cor de Fundo</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={form.headerBgColor} onChange={e => updateField("headerBgColor", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                        <Input value={form.headerBgColor} onChange={e => updateField("headerBgColor", e.target.value)} className="font-mono flex-1" />
                      </div>
                      {/* Preset colors */}
                      <div className="flex gap-2 flex-wrap">
                        {["#6366f1", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#1e293b", "#0f172a", "#09090b"].map(c => (
                          <button key={c} type="button" className={`w-8 h-8 rounded-lg border-2 transition-all ${form.headerBgColor === c ? "ring-2 ring-primary scale-110" : "border-transparent hover:scale-105"}`}
                            style={{ backgroundColor: c }} onClick={() => updateField("headerBgColor", c)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {form.headerBgType === "gradient" && (
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">CSS do Gradiente</Label>
                      <Input value={form.headerBgGradient} onChange={e => updateField("headerBgGradient", e.target.value)}
                        placeholder="linear-gradient(135deg, #6366f1, #8b5cf6)" className="font-mono text-xs" />
                      <div className="h-16 rounded-lg border" style={{ background: form.headerBgGradient || "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
                      {/* Gradient presets */}
                      <Label className="text-xs text-muted-foreground">Presets</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Roxo", css: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
                          { label: "Azul", css: "linear-gradient(135deg, #3b82f6, #60a5fa)" },
                          { label: "Verde", css: "linear-gradient(135deg, #10b981, #34d399)" },
                          { label: "Sunset", css: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)" },
                          { label: "Rosa", css: "linear-gradient(135deg, #ec4899, #f472b6)" },
                          { label: "Dourado", css: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
                          { label: "Oceano", css: "linear-gradient(135deg, #0ea5e9, #06b6d4)" },
                          { label: "Noite", css: "linear-gradient(135deg, #1e293b, #334155)" },
                        ].map(p => (
                          <button key={p.label} type="button" className="h-10 rounded-lg border text-xs font-medium text-white flex items-center justify-center hover:scale-105 transition-all"
                            style={{ background: p.css }} onClick={() => updateField("headerBgGradient", p.css)}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.headerBgType === "image" && (
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">URL da Imagem</Label>
                      <div className="flex items-center gap-3">
                        {form.headerBgImageUrl && (
                          <div className="w-20 h-14 rounded-lg border overflow-hidden flex-shrink-0">
                            <img src={form.headerBgImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <Input value={form.headerBgImageUrl} onChange={e => updateField("headerBgImageUrl", e.target.value)} placeholder="https://..." />
                          <Input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const ext = file.name.split('.').pop();
                            const path = `header-bgs/${crypto.randomUUID()}.${ext}`;
                            const { error } = await supabase.storage.from('report-creatives').upload(path, file);
                            if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
                            const { data: { publicUrl } } = supabase.storage.from('report-creatives').getPublicUrl(path);
                            updateField("headerBgImageUrl", publicUrl);
                            toast({ title: "Imagem enviada!" });
                          }} className="text-xs" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Matrix Rain Loop on Banner */}
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Efeito Matrix no Banner</p>
                        <p className="text-xs text-muted-foreground">Chuva de caracteres rodando em loop no fundo do banner</p>
                      </div>
                      <Switch checked={form.headerMatrixEnabled} onCheckedChange={v => updateField("headerMatrixEnabled", v)} />
                    </div>

                    {form.headerMatrixEnabled && (
                      <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cor dos Caracteres</Label>
                          <div className="flex items-center gap-3">
                            <input type="color" value={form.headerMatrixColor} onChange={e => updateField("headerMatrixColor", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                            <Input value={form.headerMatrixColor} onChange={e => updateField("headerMatrixColor", e.target.value)} className="font-mono flex-1" />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {["#00ff41", "#ff0033", "#6366f1", "#3b82f6", "#f59e0b", "#ec4899", "#ffffff"].map(c => (
                              <button key={c} type="button" className={`w-7 h-7 rounded-md border-2 transition-all ${form.headerMatrixColor === c ? "ring-2 ring-primary scale-110" : "border-transparent hover:scale-105"}`}
                                style={{ backgroundColor: c }} onClick={() => updateField("headerMatrixColor", c)} />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Frase Exibida (misturada nos caracteres)</Label>
                          <Input value={form.headerMatrixText} onChange={e => updateField("headerMatrixText", e.target.value)} placeholder="Ex: MATHEUS RANGEL" />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Velocidade</Label>
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{form.headerMatrixSpeed} fps</span>
                          </div>
                          <input type="range" min={10} max={60} step={5} value={form.headerMatrixSpeed}
                            onChange={e => updateField("headerMatrixSpeed", parseInt(e.target.value))} className="w-full accent-primary" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Lento</span>
                            <span>Rápido</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Update Info (Última Atualização de Dados) */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Aviso de Última Atualização</p>
                          <p className="text-xs text-muted-foreground">Personalize a frase, ícone e cores do bloco "Data da Última Atualização de Dados"</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Ícone (nome Lucide)</Label>
                          <Input value={form.updateInfoConfig.iconName} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, iconName: e.target.value })} placeholder="CalendarCheck" />
                          <p className="text-[10px] text-muted-foreground">Ex: CalendarCheck, CalendarDays, Calendar, Clock, RefreshCw</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Tamanho do ícone ({form.updateInfoConfig.iconSize}px)</Label>
                          <input type="range" min={12} max={32} step={1} value={form.updateInfoConfig.iconSize}
                            onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, iconSize: parseInt(e.target.value) })} className="w-full accent-primary" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cor do ícone</Label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.updateInfoConfig.iconColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, iconColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                            <Input value={form.updateInfoConfig.iconColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, iconColor: e.target.value })} className="font-mono flex-1" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cor da data</Label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.updateInfoConfig.dateColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, dateColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                            <Input value={form.updateInfoConfig.dateColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, dateColor: e.target.value })} className="font-mono flex-1" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Texto principal (rótulo)</Label>
                        <Input value={form.updateInfoConfig.labelText} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, labelText: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Tamanho texto ({form.updateInfoConfig.labelSize}px)</Label>
                          <input type="range" min={9} max={20} step={1} value={form.updateInfoConfig.labelSize}
                            onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, labelSize: parseInt(e.target.value) })} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cor do rótulo (vazio = tema)</Label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.updateInfoConfig.labelColor || "#888888"} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, labelColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                            <Input value={form.updateInfoConfig.labelColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, labelColor: e.target.value })} placeholder="(tema)" className="font-mono flex-1" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <Switch checked={form.updateInfoConfig.dateBold} onCheckedChange={v => updateField("updateInfoConfig", { ...form.updateInfoConfig, dateBold: v })} />
                          <Label className="text-xs text-muted-foreground">Data em negrito</Label>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border">
                        <Label className="text-xs text-muted-foreground">Texto secundário (linha de baixo)</Label>
                        <Input value={form.updateInfoConfig.subtitleText} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, subtitleText: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Tamanho ({form.updateInfoConfig.subtitleSize}px)</Label>
                          <input type="range" min={9} max={20} step={1} value={form.updateInfoConfig.subtitleSize}
                            onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, subtitleSize: parseInt(e.target.value) })} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cor</Label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.updateInfoConfig.subtitleColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, subtitleColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                            <Input value={form.updateInfoConfig.subtitleColor} onChange={e => updateField("updateInfoConfig", { ...form.updateInfoConfig, subtitleColor: e.target.value })} className="font-mono flex-1" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <Switch checked={form.updateInfoConfig.subtitleBold} onCheckedChange={v => updateField("updateInfoConfig", { ...form.updateInfoConfig, subtitleBold: v })} />
                          <Label className="text-xs text-muted-foreground">Negrito</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>


                {/* MATRIX TAB */}
                <TabsContent value="matrix" className="mt-0">
                  <ConfigActionBar type="matrix" module="report" matrixConfig={matrixConfig} onImportMatrix={setMatrixConfig} />
                  <MatrixEffectSettings config={matrixConfig} onChange={setMatrixConfig} context="report" />
                </TabsContent>

                {/* WHATSAPP TAB */}
                <TabsContent value="whatsapp" className="mt-0">
                  <ConfigActionBar type="whatsapp" module="report" whatsappConfig={whatsappWidgetConfig} onImportWhatsApp={setWhatsappWidgetConfig} />
                  <WhatsAppWidgetSettings config={whatsappWidgetConfig} onChange={setWhatsappWidgetConfig} context="report" />
                </TabsContent>

                {/* STRATEGY TAB */}
                <TabsContent value="strategy" className="mt-0 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo de Estratégia</Label>
                    <Select value={form.strategyType} onValueChange={v => updateField("strategyType", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione a estratégia..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensagens">📲 Geração de Mensagens</SelectItem>
                        <SelectItem value="leads">📋 Captação de Leads</SelectItem>
                        <SelectItem value="vendas">🛒 Vendas Diretas</SelectItem>
                        <SelectItem value="engajamento">📱 Engajamento e Seguidores</SelectItem>
                        <SelectItem value="conteudo">📢 Distribuição de Conteúdo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Meta de Resultados do Período</Label>
                      <p className="text-xs text-muted-foreground/70">Quantos resultados o cliente espera alcançar</p>
                      <Input type="number" placeholder="Ex: 100" value={form.goalTarget || ""} onChange={e => updateField("goalTarget", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Referência / Baseline</Label>
                      <p className="text-xs text-muted-foreground/70">Valor de referência para comparação</p>
                      <Input type="number" placeholder="Ex: 50" value={form.goalReference || ""} onChange={e => updateField("goalReference", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Estratégia Atual</Label>
                    <p className="text-xs text-muted-foreground/70">Este texto aparecerá no relatório do cliente na seção "O que estamos fazendo"</p>
                    <Textarea placeholder="Descreva a estratégia atual da campanha..." value={form.strategyNotes} onChange={e => updateField("strategyNotes", e.target.value)} rows={5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Dica do Especialista</Label>
                    <p className="text-xs text-muted-foreground/70">Mensagem personalizada para o cliente sobre investimento ou melhorias</p>
                    <Textarea placeholder="Dica personalizada para o cliente..." value={form.investmentTip} onChange={e => updateField("investmentTip", e.target.value)} rows={4} />
                  </div>
                </TabsContent>

                {/* SIMULATIONS TAB */}
                <TabsContent value="simulations" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground">Configure cenários de crescimento para o cliente</p>
                  {simulations.map((sim, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-semibold">
                            {i === 0 ? "Cenário Atual" : i === 1 ? "Cenário Intermediário" : "Cenário Ideal"}
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Investimento (R$)</Label>
                            <Input type="number" step="0.01" value={sim.simulated_investment || ""} onChange={e => updateSimulation(i, "simulated_investment", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Alcance Estimado</Label>
                            <Input type="number" value={sim.projected_reach || ""} onChange={e => updateSimulation(i, "projected_reach", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Cliques Estimados</Label>
                            <Input type="number" value={sim.projected_clicks || ""} onChange={e => updateSimulation(i, "projected_clicks", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Leads Estimados</Label>
                            <Input type="number" value={sim.projected_leads || ""} onChange={e => updateSimulation(i, "projected_leads", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Mensagens Estimadas</Label>
                            <Input type="number" value={sim.projected_messages || ""} onChange={e => updateSimulation(i, "projected_messages", parseFloat(e.target.value) || 0)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </div>

              <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar Relatório"}
                </Button>
              </div>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog open={!!deleteReportTarget} onOpenChange={open => !open && cancelDeleteReport()} onConfirm={confirmDeleteReport} title="Mover para lixeira" description="O relatório será movido para a lixeira. Você poderá restaurá-lo ou excluí-lo permanentemente depois." />
      <ConfirmDeleteDialog open={!!permDeleteTarget} onOpenChange={open => !open && cancelPermDelete()} onConfirm={confirmPermDelete} title="⚠️ Excluir permanentemente" description="Esta ação é irreversível! O relatório e todos os seus dados (métricas, criativos, simulações) serão excluídos definitivamente." />

      {/* Metric Defaults Dialog */}
      <Dialog open={showMetricDefaults} onOpenChange={setShowMetricDefaults}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Métricas Padrão</DialogTitle>
          </DialogHeader>
          <ReportMetricDefaults />
        </DialogContent>
      </Dialog>

      {/* Strategy Metric Defaults Dialog */}
      <Dialog open={showStrategyMetrics} onOpenChange={setShowStrategyMetrics}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Métricas por Estratégia</DialogTitle>
          </DialogHeader>
          <StrategyMetricDefaults />
        </DialogContent>
      </Dialog>
    </div>
  );
}
