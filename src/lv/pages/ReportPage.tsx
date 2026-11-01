// @ts-nocheck
"use client";
import { pwMatch } from "@/lv/lib/pwMatch";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchHiddenMetricKeys } from "@/lv/components/admin/ReportMetricDefaults";
import { getCanonicalLabel } from "@/lv/lib/metaAdsParser";
import ReportDateFilter, { filterMetricsByPeriod, filterSnapshotsByPeriod, getDateRangeForFilter } from "@/lv/components/report/ReportDateFilter";
import { fetchStrategyMetricConfig, type StrategyMetricConfig } from "@/lv/components/admin/StrategyMetricDefaults";
import { useParams } from "@/lv/shims/router";
import { supabase } from "@/lv/integrations/supabase/client";
import { db } from "@/lv/lib/supabaseClient";
import { getReportTheme, getReportThemeVariant } from "@/lv/lib/reportThemes";
import { Lock, icons as LucideIcons, CalendarCheck } from "lucide-react";
import ReportTrendCharts, { ReportPeriodTimeline } from "@/lv/components/report/ReportTrendCharts";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import MatrixRain from "@/lv/components/sales-page/MatrixRain";
import { WhatsAppCtaBanner, buildStyles } from "@/lv/components/sales-page/WhatsAppCtaWidget";
import ReportLayoutDefault from "@/lv/components/report/ReportLayoutDefault";
import ReportLayoutAnalytics from "@/lv/components/report/ReportLayoutAnalytics";
import ReportLayoutMarketing from "@/lv/components/report/ReportLayoutMarketing";
import ReportLayoutCorporate from "@/lv/components/report/ReportLayoutCorporate";
import ReportLayoutModern from "@/lv/components/report/ReportLayoutModern";
import ReportLayoutFunnel from "@/lv/components/report/ReportLayoutFunnel";
import ReportLayoutPerformance from "@/lv/components/report/ReportLayoutPerformance";
import ReportLayoutDataTable from "@/lv/components/report/ReportLayoutDataTable";
import ReportLayoutExecutive from "@/lv/components/report/ReportLayoutExecutive";
import ReportLayoutDashboard from "@/lv/components/report/ReportLayoutDashboard";
import ReportLayoutSwitcher, { type ReportLayoutId } from "@/lv/components/report/ReportLayoutSwitcher";
import ReportToolbar from "@/lv/components/report/ReportToolbar";
import ReportDarkLightToggle from "@/lv/components/report/ReportDarkLightToggle";
import ReportProfessionalHeader from "@/lv/components/report/ReportProfessionalHeader";
import ReportProfessionalFooter from "@/lv/components/report/ReportProfessionalFooter";
import ReportHistorySummary from "@/lv/components/report/ReportHistorySummary";
import { restrictToApprovedReportMetrics, sanitizeMetricSnapshots } from "@/lv/lib/trafficReportMetricRules";
import ReportCampaignFilter from "@/lv/components/report/ReportCampaignFilter";

const AVERAGE_METRIC_KEYS = new Set([
  "cpm", "cpc", "cpc_all", "ctr", "ctr_all", "ctr_unique", "ctr_unique_all",
  "frequency", "cost_per_result", "cost_per_message", "cost_per_lead",
  "cost_per_purchase", "cost_per_landing_page_view", "cost_per_thruplay",
  "cost_per_content_view", "cost_per_app_install", "cost_per_outbound_click",
  "cost_per_new_message_contact", "cost_per_unique_link_click", "cost_per_unique_click_all",
  "cost_per_checkout", "cost_per_registration", "cost_per_add_to_cart",
  "cost_per_1k_accounts_reached", "avg_purchase_value", "roas", "result_roas",
  "result_rate", "outbound_ctr", "outbound_ctr_unique", "conversation_rate",
  "creative_quality_ctr", "instagram_profile_quality", "creative_pct",
]);

function aggregateSnapshotMetrics(snapshots: any[]) {
  const metricMap = new Map<string, { sum: number; count: number; meta: any }>();

  const hasDailyRows = (snapshots || []).some((snap) => snap.period_start && snap.period_end && snap.period_start === snap.period_end);
  const sourceSnapshots = hasDailyRows
    ? (snapshots || []).filter((snap) => snap.period_start && snap.period_end && snap.period_start === snap.period_end)
    : (snapshots || []);

  // Deduplicate by (period_start|period_end|campaign_name) to avoid
  // double-counting repeated uploads of the same data. File name is ignored
  // because the same CSV can be reuploaded with a different file name.
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const snap of sourceSnapshots) {
    const key = `${snap.period_start || ""}|${snap.period_end || ""}|${snap.campaign_name || snap.upload_label || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(snap);
  }

  for (const snap of unique) {
    const snapMetrics = Array.isArray(snap.metrics) ? snap.metrics : [];
    for (const metric of snapMetrics) {
      if (!metric?.metric_key) continue;
      const current = metricMap.get(metric.metric_key) || { sum: 0, count: 0, meta: metric };
      current.sum += Number(metric.metric_value || 0);
      current.count += 1;
      metricMap.set(metric.metric_key, current);
    }
  }

  return restrictToApprovedReportMetrics(Array.from(metricMap.entries()).map(([metric_key, item]) => ({
    ...item.meta,
    metric_key,
    metric_value: Math.round((AVERAGE_METRIC_KEYS.has(metric_key) ? item.sum / Math.max(item.count, 1) : item.sum) * 100) / 100,
  })) as any);
}

function dedupeReportSnapshots(snapshots: any[]) {
  const hasDailyRows = (snapshots || []).some((snap) => snap.period_start && snap.period_end && snap.period_start === snap.period_end);
  const sourceSnapshots = hasDailyRows
    ? (snapshots || []).filter((snap) => snap.period_start && snap.period_end && snap.period_start === snap.period_end)
    : (snapshots || []);

  const seen = new Set<string>();
  return sourceSnapshots.filter((snap) => {
    const key = `${snap.period_start || ""}|${snap.period_end || ""}|${snap.campaign_name || snap.upload_label || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ReportPage = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [hiddenMetricKeys, setHiddenMetricKeys] = useState<Set<string>>(new Set());
  const [strategyMetricConfig, setStrategyMetricConfig] = useState<StrategyMetricConfig>({});
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeLayout, setActiveLayout] = useState<ReportLayoutId>("default");
  const [showMatrixOpening, setShowMatrixOpening] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  // Dark/Light mode
  const [isDark, setIsDark] = useState(() => {
    const saved = sessionStorage.getItem("report_dark_mode");
    return saved !== null ? saved === "true" : true; // default dark
  });

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      sessionStorage.setItem("report_dark_mode", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    fetchHiddenMetricKeys().then(setHiddenMetricKeys);
    fetchStrategyMetricConfig().then(setStrategyMetricConfig);
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) { setLoading(false); return; }
      const sessionKey = `report_auth_${token}`;
      const savedAuth = sessionStorage.getItem(sessionKey);

      // Try by slug first, then by access_token
      let data: any = null;
      let error: any = null;

      ({ data, error } = await (supabase
        .from("traffic_reports") as any)
        .select("*")
        .eq("slug", token)
        .eq("status", "published")
        .maybeSingle());

      if (!data) {
        ({ data, error } = await (supabase
          .from("traffic_reports") as any)
          .select("*")
          .eq("access_token", token)
          .eq("status", "published")
          .maybeSingle());
      }

      if (error || !data) { setLoading(false); return; }
      setReport(data);

      // Dynamic OG meta tags for WhatsApp/social sharing
      const companyName = data.client_company_name || "";
      const contactName = data.client_contact_name || "";
      const ogTitle = `Relatório Personalizado - Matheus Rangel`;
      const ogDesc = [contactName, companyName].filter(Boolean).join(" | ") || "Relatório de Tráfego Pago";
      document.title = ogTitle;
      // Update meta tags
      const setMeta = (selector: string, attr: string, val: string) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, val);
      };
      setMeta('meta[property="og:title"]', "content", ogTitle);
      setMeta('meta[name="twitter:title"]', "content", ogTitle);
      setMeta('meta[property="og:description"]', "content", ogDesc);
      setMeta('meta[name="twitter:description"]', "content", ogDesc);
      // Fetch favicon from site_settings and apply as og:image
      const { data: siteData } = await supabase.from("site_settings").select("favicon_url").eq("id", "main").single();
      if (siteData && (siteData as any).favicon_url) {
        const favUrl = (siteData as any).favicon_url;
        setMeta('meta[property="og:image"]', "content", favUrl);
        setMeta('meta[name="twitter:image"]', "content", favUrl);
        // Also set favicon
        let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
        link.href = favUrl;
      }

      if (data.access_password) {
        if (savedAuth === "true") {
          setAuthenticated(true);
          setLocked(false);
          await loadReportData(data);
          import("@/lv/lib/viewTracker").then(({ trackView }) => trackView("report", token!));
        } else {
          setLocked(true);
        }
      } else {
        setAuthenticated(true);
        await loadReportData(data);
        import("@/lv/lib/viewTracker").then(({ trackView }) => trackView("report", token!));
      }
      setLoading(false);
    };
    fetchReport();
  }, [token]);

  const loadReportData = async (r: any) => {
    const [{ data: metricsData }, { data: simsData }, { data: creativesData }, { data: snapshotsData }] = await Promise.all([
      db.from("traffic_metrics").select("*").eq("report_id", r.id),
      db.from("traffic_report_simulations").select("*").eq("report_id", r.id),
      db.from("traffic_report_creatives").select("*").eq("report_id", r.id).order("sort_order"),
      db.from("traffic_report_snapshots").select("*").eq("report_id", r.id).order("period_start"),
    ]);
    if (metricsData) setMetrics(restrictToApprovedReportMetrics(metricsData as any));
    if (simsData) setSimulations(simsData);
    if (creativesData) setCreatives(creativesData);
    if (snapshotsData) setSnapshots(sanitizeMetricSnapshots(snapshotsData as any));
    if (r.client_id) {
      const { data: client } = await supabase.from("clients").select("name").eq("id", r.client_id).single();
      if (client) setClientName(client.name);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockedUntil && Date.now() < blockedUntil) { setPasswordError(true); return; }
    if (await pwMatch(passwordInput, report?.access_password)) {
      setLocked(false);
      setAuthenticated(true);
      setPasswordError(false);
      sessionStorage.setItem(`report_auth_${token}`, "true");
      // Trigger matrix opening if enabled
      if (report?.matrix_enabled) {
        setShowMatrixOpening(true);
      }
      await loadReportData(report);
      import("@/lv/lib/viewTracker").then(({ trackView }) => trackView("report", token!));
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPasswordError(true);
      if (newAttempts >= 3) setBlockedUntil(Date.now() + 5 * 60 * 1000);
    }
  };

  const theme = useMemo(() => report ? getReportThemeVariant(report.layout_theme, isDark) : getReportTheme(1), [report, isDark]);

  const campaigns = useMemo(() => {
    // Track first appearance order via sort_order on snapshots (admin-controlled)
    const orderMap = new Map<string, number>();
    snapshots.forEach((s: any) => {
      const name = s.campaign_name || s.upload_label;
      if (!name) return;
      const so = typeof s.sort_order === "number" ? s.sort_order : 9999;
      if (!orderMap.has(name) || (orderMap.get(name) as number) > so) {
        orderMap.set(name, so);
      }
    });
    // Include campaign names that exist only in metrics (no snapshot) at the end
    metrics.forEach((m: any) => {
      if (m.campaign_name && !orderMap.has(m.campaign_name)) orderMap.set(m.campaign_name, 99999);
    });
    return Array.from(orderMap.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) return a[1] - b[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([name]) => name);
  }, [metrics, snapshots]);


  const filteredSnapshots = useMemo(() => {
    const base = selectedCampaign === "all"
      ? snapshots
      : snapshots.filter(s => (s.campaign_name === selectedCampaign || s.upload_label === selectedCampaign));

    const periodFiltered = filterSnapshotsByPeriod(base, selectedDateFilter);

    // Dedupe by (period_start|period_end|campaign_name) and keep file name out
    // so replacing/reuploading the same period never doubles investment.
    const seen = new Set<string>();
    return periodFiltered.filter((s: any) => {
      const k = `${s.period_start || ""}|${s.period_end || ""}|${s.campaign_name || s.upload_label || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [snapshots, selectedCampaign, selectedDateFilter]);

  const campaignSnapshots = useMemo(() => {
    return selectedCampaign === "all"
      ? snapshots
      : snapshots.filter(s => (s.campaign_name === selectedCampaign || s.upload_label === selectedCampaign));
  }, [snapshots, selectedCampaign]);

  const trendSnapshots = useMemo(() => {
    const base = dedupeReportSnapshots(campaignSnapshots);
    if (selectedCampaign !== "all") return base;
    
    // Group by day for "All" view to avoid duplicate dates in chart/timeline
    const dailyMap = new Map<string, any>();
    base.forEach(snap => {
      const day = snap.period_start;
      if (!day) return;
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { ...snap, metrics: [...(snap.metrics || [])] });
      } else {
        const existing = dailyMap.get(day);
        const mergedMetrics = [...(existing.metrics || []), ...(snap.metrics || [])];
        const metricMap = new Map<string, { sum: number; count: number; meta: any }>();
        mergedMetrics.forEach(m => {
          if (!m?.metric_key) return;
          const current = metricMap.get(m.metric_key) || { sum: 0, count: 0, meta: m };
          current.sum += Number(m.metric_value || 0);
          current.count += 1;
          metricMap.set(m.metric_key, current);
        });
        existing.metrics = Array.from(metricMap.entries()).map(([k, v]) => ({
          ...v.meta,
          metric_key: k,
          metric_value: AVERAGE_METRIC_KEYS.has(k) ? v.sum / Math.max(1, v.count) : v.sum
        }));
      }
    });
    return Array.from(dailyMap.values()).sort((a, b) => (a.period_start || "").localeCompare(b.period_start || ""));
  }, [campaignSnapshots, selectedCampaign]);

  const visibleMetrics = useMemo(() => {
    // 0. Filter by campaign and aggregate if "Geral"
    let currentMetrics = metrics;
    const currentSnapshots = filteredSnapshots;

    if (selectedCampaign !== "all") {
      currentMetrics = metrics.filter(m => m.campaign_name === selectedCampaign);
      if (currentSnapshots.length > 0) {
        currentMetrics = aggregateSnapshotMetrics(currentSnapshots);
      }
    } else if (campaigns.length > 0) {
      // Sum everything for "Geral"
      currentMetrics = currentSnapshots.length > 0 ? aggregateSnapshotMetrics(currentSnapshots) : metrics;
    }

    // 1. Apply date filter using snapshots.
    // IMPORTANT: pass the unfiltered campaignSnapshots so the anchor date (max available date)
    // is computed from the FULL data set, not from already-filtered snapshots.
    // Otherwise "Ontem" would shift back relative to itself and return zeros.
    let filtered = selectedDateFilter === "all"
      ? currentMetrics
      : filterMetricsByPeriod(campaignSnapshots, currentMetrics, selectedDateFilter);
    // 2. Remove hidden metrics
    if (hiddenMetricKeys.size > 0) {
      filtered = filtered.filter(m => !hiddenMetricKeys.has(m.metric_key));
    }
    // 3. Apply strategy-based filtering
    const strategyType = report?.strategy_type?.toLowerCase()?.trim();
    if (strategyType && strategyMetricConfig[strategyType]) {
      const allowedKeys = new Set(strategyMetricConfig[strategyType]);
      filtered = filtered.filter(m => allowedKeys.has(m.metric_key));
    }
    // 4. Suppress duplicate metrics for WhatsApp/mensagens strategy
    if (strategyType === "mensagens") {
      const suppressedKeys = new Set(["results", "cost_per_result", "outbound_ctr_unique"]);
      filtered = filtered.filter(m => !suppressedKeys.has(m.metric_key));
    }
    // 5. Override calculated metrics with manual calculation to ensure accuracy when summing campaigns or filtering periods
    const getMetricValue = (key: string) => filtered.find(m => m.metric_key === key)?.metric_value || 0;
    const spendVal = getMetricValue("spend");
    const reachVal = getMetricValue("reach");
    const impressionsVal = getMetricValue("impressions");
    const clicksVal = getMetricValue("clicks_all") || getMetricValue("link_clicks");
    const resultsVal = getMetricValue("results");

    filtered = filtered.map(m => {
      if (m.metric_key === "cpm" && spendVal > 0 && impressionsVal > 0) {
        return { ...m, metric_value: (spendVal / impressionsVal) * 1000 };
      }
      if (m.metric_key === "cpc" && spendVal > 0 && clicksVal > 0) {
        return { ...m, metric_value: spendVal / clicksVal };
      }
      if (m.metric_key === "ctr" && clicksVal > 0 && impressionsVal > 0) {
        return { ...m, metric_value: (clicksVal / impressionsVal) * 100 };
      }
      if (m.metric_key === "cost_per_result" && spendVal > 0 && resultsVal > 0) {
        return { ...m, metric_value: spendVal / resultsVal };
      }
      return m;
    });
    // 6. Override labels with canonical names
    filtered = filtered.map(m => ({ ...m, metric_label: getCanonicalLabel(m.metric_key, m.metric_label) }));
    return filtered;
  }, [campaigns.length, filteredSnapshots, hiddenMetricKeys, metrics, report, selectedCampaign, selectedDateFilter, strategyMetricConfig]);
  const allowSwitch = report?.allow_layout_switch !== false;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: theme.bg }}>
        <p style={{ color: theme.textMuted }}>Carregando relatório...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: theme.bg }}>
        <p style={{ color: theme.textMuted }}>Relatório não encontrado.</p>
      </div>
    );
  }

  if (locked) {
    const isBlocked = blockedUntil && Date.now() < blockedUntil;
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: theme.bg }}>
        <form onSubmit={handleUnlock} className="flex flex-col items-center gap-6 p-8 rounded-2xl border max-w-sm w-full" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: theme.accent + "22" }}>
            <Lock className="w-8 h-8" style={{ color: theme.accent }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>Relatório Protegido</h2>
            <p className="text-sm" style={{ color: theme.textMuted }}>Digite a senha para acessar.</p>
          </div>
          <input type="password" value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
            placeholder="Digite a senha" disabled={!!isBlocked}
            className="w-full px-4 py-3 rounded-lg border text-center text-lg outline-none"
            style={{ background: theme.bg, borderColor: passwordError ? "#ef4444" : theme.cardBorder, color: theme.text }} autoFocus />
          {passwordError && <p className="text-sm" style={{ color: "#ef4444" }}>
            {isBlocked ? "Muitas tentativas. Tente novamente em 5 minutos." : "Senha incorreta."}
          </p>}
          <button type="submit" disabled={!!isBlocked} className="w-full py-3 rounded-lg font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50" style={{ background: theme.accent, color: theme.accentFg }}>
            Acessar Relatório
          </button>
        </form>
      </div>
    );
  }

  const layoutProps = { 
    report, 
    metrics: visibleMetrics, 
    simulations, 
    creatives, 
    clientName, 
    theme, 
    snapshots: filteredSnapshots, 
    allMetrics: metrics 
  };

  const renderLayout = () => {
    switch (activeLayout) {
      case "analytics": return <ReportLayoutAnalytics {...layoutProps} />;
      case "marketing": return <ReportLayoutMarketing {...layoutProps} />;
      case "corporate": return <ReportLayoutCorporate {...layoutProps} />;
      case "modern": return <ReportLayoutModern {...layoutProps} />;
      case "funnel": return <ReportLayoutFunnel {...layoutProps} />;
      case "performance": return <ReportLayoutPerformance {...layoutProps} />;
      case "datatable": return <ReportLayoutDataTable {...layoutProps} />;
      case "executive": return <ReportLayoutExecutive {...layoutProps} />;
      case "dashboard": return <ReportLayoutDashboard {...layoutProps} />;
      default: return <ReportLayoutDefault {...layoutProps} />;
    }
  };

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }}>
      {/* Matrix Opening Effect */}
      {showMatrixOpening && (
        <div className="fixed inset-0 z-[9999]">
          <MatrixRain
            duration={report.matrix_duration || 2000}
            accentColor={report.matrix_color || "#00ff41"}
            customText={report.matrix_text || report.title || ""}
            effect={report.matrix_effect || "converge"}
            onComplete={() => setShowMatrixOpening(false)}
          />
        </div>
      )}
      {/* Toolbar with goal indicator */}
      <div className="print:hidden">
        <ReportToolbar
          report={report}
          metrics={metrics}
          clientName={clientName}
          theme={theme}
          isDark={isDark}
        />
      </div>

      {/* Dark/Light toggle */}
      <div className="print:hidden">
        <ReportDarkLightToggle isDark={isDark} onToggle={toggleDarkMode} />
      </div>

      {/* Professional Header */}
      <ReportProfessionalHeader
        theme={theme}
        clientName={clientName}
        reportTitle={report.title}
        periodStart={report.period_start}
        periodEnd={report.period_end}
        clientCompanyName={report.client_company_name || ""}
        clientContactName={report.client_contact_name || ""}
        clientLogoUrl={report.client_logo_url || ""}
        headerPadding={report.header_padding ?? 40}
        headerBgType={report.header_bg_type || "theme"}
        headerBgColor={report.header_bg_color || "#6366f1"}
        headerBgGradient={report.header_bg_gradient || ""}
        headerBgImageUrl={report.header_bg_image_url || ""}
        headerMatrixEnabled={report.header_matrix_enabled ?? false}
        headerMatrixColor={report.header_matrix_color || "#00ff41"}
        headerMatrixText={report.header_matrix_text || ""}
        headerMatrixSpeed={report.header_matrix_speed ?? 30}
      />

      {/* Last update info */}
      {(() => {
        const cfg = (report as any).update_info_config || {};
        const iconName: string = cfg.iconName || "CalendarCheck";
        const iconSize: number = cfg.iconSize ?? 18;
        const iconColor: string = cfg.iconColor || "#00ff41";
        const labelText: string = cfg.labelText || "Data da Última Atualização de Dados:";
        const labelSize: number = cfg.labelSize ?? 12;
        const labelColor: string = cfg.labelColor || theme.textMuted;
        const dateColor: string = cfg.dateColor || "#00ff41";
        const dateBold: boolean = cfg.dateBold !== false;
        const subtitleText: string = cfg.subtitleText || "Esses dados são atualizados semanalmente! 1 vez por semana.";
        const subtitleColor: string = cfg.subtitleColor || "#fb923c";
        const subtitleSize: number = cfg.subtitleSize ?? 12;
        const subtitleBold: boolean = cfg.subtitleBold !== false;
        const IconComp: any = (LucideIcons as any)[iconName] || CalendarCheck;
        const dateStr = new Date(report.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
        return (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 text-center">
            <p className="font-semibold uppercase tracking-wider leading-relaxed inline-flex items-center justify-center gap-2 flex-wrap" style={{ color: labelColor, fontSize: labelSize }}>
              <IconComp size={iconSize} style={{ color: iconColor, filter: `drop-shadow(0 0 6px ${iconColor}66)` }} strokeWidth={2.2} />
              <span>{labelText}</span>
              <span style={{ color: dateColor, fontWeight: dateBold ? 700 : 500, textShadow: `0 0 10px ${dateColor}55` }}>
                {dateStr}
              </span>
            </p>
            <p className="mt-1" style={{ color: subtitleColor, fontSize: subtitleSize, fontWeight: subtitleBold ? 700 : 400 }}>
              {subtitleText}
            </p>
          </div>
        );
      })()}

      {/* Campaign and Date Filters */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4 print:hidden space-y-4">
        <ReportCampaignFilter
          campaigns={campaigns}
          selected={selectedCampaign}
          onSelect={setSelectedCampaign}
          theme={theme}
        />
        
        <div className="flex items-center gap-3">
          <ReportDateFilter
            snapshots={campaignSnapshots}
            theme={theme}
            selected={selectedDateFilter}
            onSelect={setSelectedDateFilter}
            periodStart={report.period_start}
            periodEnd={report.period_end}
          />
        </div>

        {(() => {
          const dailySnaps = filteredSnapshots.filter((s: any) => s.period_start && s.period_end && s.period_start === s.period_end);
          const pool = dailySnaps.length > 0 ? dailySnaps : filteredSnapshots;
          const dates: string[] = [];
          for (const s of pool) {
            if (s.period_start) dates.push(s.period_start);
            if (s.period_end) dates.push(s.period_end);
          }
          if (dates.length === 0) return null;
          dates.sort();
          let startStr = dates[0];
          let endStr = dates[dates.length - 1];

          if (selectedDateFilter && selectedDateFilter !== "all") {
            const selectedRange = getDateRangeForFilter(campaignSnapshots, selectedDateFilter);
            if (selectedRange) {
              if (selectedRange.startStr > startStr) startStr = selectedRange.startStr;
              if (selectedRange.endStr < endStr) endStr = selectedRange.endStr;
            }
          }

          const fmt = (ymd: string) => {
            const [y, m, d] = ymd.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
          };
          const sameDay = startStr === endStr;
          const message = sameDay
            ? `Esse relatório representa os dados do dia ${fmt(startStr)}`
            : `Esse relatório representa os dados do dia ${fmt(startStr)} até ${fmt(endStr)}`;

          return (
            <div className="flex justify-center">
              <div
                className="rounded-xl px-5 py-3 text-center font-bold text-sm sm:text-base shadow-md max-w-3xl"
                style={{
                  background: theme.accent + "22",
                  borderWidth: 2,
                  borderStyle: "solid",
                  borderColor: theme.accent,
                  color: theme.text,
                }}
              >
                📅 {message}
              </div>
            </div>
          );
        })()}
      </div>

      {renderLayout()}

      {/* Trend Charts - Historical Data */}
      {trendSnapshots.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <ReportTrendCharts snapshots={trendSnapshots} theme={theme} currentMetrics={visibleMetrics} />
        </div>
      )}

      {/* Historical Summary Table */}
      {(filteredSnapshots.length > 0 || visibleMetrics.length > 0) && (
        <ReportHistorySummary snapshots={filteredSnapshots} theme={theme} metrics={visibleMetrics} />
      )}

      {/* Period Timeline — below Resumo Histórico, with internal scroll */}
      {trendSnapshots.length >= 2 && (
        <ReportPeriodTimeline snapshots={trendSnapshots} theme={theme} />
      )}

      {/* Professional Footer */}
      <ReportProfessionalFooter
        theme={theme}
        clientName={clientName}
        clientCompanyName={report.client_company_name || ""}
        clientContactName={report.client_contact_name || ""}
        clientLogoUrl={report.client_logo_url || ""}
      />
      {allowSwitch && (
        <div className="print:hidden">
          <ReportLayoutSwitcher
            currentLayout={activeLayout}
            onLayoutChange={setActiveLayout}
            allowedLayouts={Array.isArray(report.allowed_layouts) ? report.allowed_layouts : undefined}
            isDark={isDark}
            onToggleDark={toggleDarkMode}
          />
        </div>
      )}

      {/* WhatsApp Widget (banner style from config) */}
      {(() => {
        const wc = report.whatsapp_widget_config || {};
        if (wc.enabled && wc.whatsappNumber) {
          return (
            <>
              <style>{buildStyles("rpt-wca")}</style>
              <div className="fixed bottom-6 right-6 z-50 print:hidden w-80 max-w-[calc(100vw-3rem)]">
                <WhatsAppCtaBanner
                  config={wc}
                  animPrefix="rpt-wca"
                  onClick={() => window.open(`https://wa.me/${wc.whatsappNumber}`, "_blank")}
                />
              </div>
            </>
          );
        }
        // Fallback to simple FAB
        if (report.contact_whatsapp) {
          return (
            <a href={`https://wa.me/${report.contact_whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-110 print:hidden"
              style={{ background: "#25d366" }}>
              <WhatsAppIcon className="h-6 w-6 text-white" />
            </a>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default ReportPage;
