// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Briefcase, Rocket, CheckCircle2, Check } from "lucide-react";
import { MoneyFloatIcon, RocketGrowthIcon } from "@/lv/components/icons/SophisticatedIcons";
import type { ColorTheme } from "@/lv/lib/colorThemes";
import type { Tables } from "@/lv/integrations/supabase/types";
import { WhatsAppIcon, InstagramIcon } from "@/lv/components/icons/PlatformIcons";
import { resolveQuotePlans, normalizePlanDefaults, type QuotePlanConfig } from "@/lv/lib/quotePlans";
import InstagramConnector, { buildConnectorStyles } from "./InstagramConnector";
import { useConnectorConfig } from "@/lv/hooks/useConnectorConfig";
import ProfessionalFooter from "./ProfessionalFooter";
import ReviewsSection from "./ReviewsSection";
import { supabase } from "@/lv/integrations/supabase/client";
import { DETAILED_TEMPLATE, type TemplateSection } from "@/lv/lib/defaultTemplateContent";
import { EditableText, EditableImage, EditableEmoji, EditableCard, AddCardButton } from "./EditableField";
import { EditableIcon } from "./EditableIcon";
import WhatsAppCTAButton, { type WhatsAppAnimation } from "./WhatsAppCTAButton";
import FaqSection from "./FaqSection";
import type { SectionDefinition } from "@/lv/lib/sectionTypes";
import { IG_STRATEGY_ICONS } from "@/lv/components/icons/InstagramStrategyIcons";
import { WA_STRATEGY_ICONS } from "@/lv/components/icons/WhatsAppStrategyIcons";
import { SOPHISTICATED_ICONS } from "@/lv/components/icons/SophisticatedIcons";
import { normalizeQuoteText } from "@/lv/lib/quoteTextNormalizer";
import FloatingHeroIcons from "./FloatingHeroIcons";
import BestPlanBadge, { parseBestPlanStyle, DEFAULT_BEST_PLAN_STYLE, type BestPlanStyleConfig } from "./BestPlanBadge";

interface Props {
  quote: Tables<"quotes">;
  theme: ColorTheme;
  editMode?: boolean;
  templateOverride?: TemplateSection;
  heroImageOverride?: string;
  heroEmojiOverride?: string;
  onUpdateField?: (key: string, value: any) => void;
  onUpdateHeroImage?: (url: string) => void;
  onUpdateHeroEmoji?: (emoji: string) => void;
  sectionOrder?: SectionDefinition[];
  customSectionRenderer?: (section: SectionDefinition) => React.ReactNode;
}

export default function DetailedLayout({
  quote, theme, editMode, templateOverride, heroImageOverride, heroEmojiOverride,
  onUpdateField, onUpdateHeroImage, onUpdateHeroEmoji, sectionOrder, customSectionRenderer,
}: Props) {
  const [tpl, setTpl] = useState<TemplateSection>({ ...DETAILED_TEMPLATE, ...(templateOverride || {}) });
  const [heroImage, setHeroImage] = useState(heroImageOverride || "/images/hero-bg.jpg");
  const [heroEmoji, setHeroEmoji] = useState(heroEmojiOverride || "🚀");
  const [heroIconUrl, setHeroIconUrl] = useState<string | undefined>(templateOverride?.hero_icon_url as string | undefined);
  const connectorConfig = useConnectorConfig();
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [planDefaults, setPlanDefaults] = useState<QuotePlanConfig[] | undefined>(undefined);
  const [bestPlanStyle, setBestPlanStyle] = useState<BestPlanStyleConfig>({ ...DEFAULT_BEST_PLAN_STYLE });

  useEffect(() => {
    if (templateOverride) { setTpl({ ...DETAILED_TEMPLATE, ...templateOverride }); return; }
    const svc = (quote as any).service_type || "trafego_pago";
    const applyTemplate = (data: any) => {
      if (!data) return false;
      setTpl({ ...DETAILED_TEMPLATE, ...data.sections });
      if (data.hero_image_url) setHeroImage(data.hero_image_url);
      if (data.hero_emoji) setHeroEmoji(data.hero_emoji);
      return true;
    };
    (supabase.from("quote_templates").select("*").eq("slug", "detailed").eq("is_active", true) as any).eq("service_type", svc).limit(1).maybeSingle()
      .then(async ({ data }: any) => {
        if (applyTemplate(data)) return;
        const { data: fallback } = await supabase.from("quote_templates").select("*").eq("slug", "detailed").eq("is_active", true).limit(1).maybeSingle();
        applyTemplate(fallback);
      });
  }, [templateOverride, (quote as any).service_type]);


  // Fetch admin WhatsApp and plan defaults
  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", "main").maybeSingle()
      .then(({ data }) => {
        if (data) {
          const ss = data as any;
          if (ss.whatsapp_number) setAdminWhatsapp(ss.whatsapp_number);
        }
      });
  }, []);

  useEffect(() => {
    const svc = (quote as any).service_type || "trafego_pago";
    const load = () => supabase.from("sales_page_config").select("config").eq("id", "quote_plans_defaults").maybeSingle()
      .then(({ data }: any) => {
        if (data?.config) {
          setPlanDefaults(normalizePlanDefaults(data.config, svc));
          const cfg = data.config as any;
          if (cfg.whatsappNumber) setAdminWhatsapp(cfg.whatsappNumber);
          if (cfg.bestPlanStyle) setBestPlanStyle(parseBestPlanStyle(cfg.bestPlanStyle));
        }
      });
    load();
    const handler = () => load();
    window.addEventListener("quote-plans-updated", handler);
    return () => window.removeEventListener("quote-plans-updated", handler);
  }, [(quote as any).service_type]);

  useEffect(() => { if (heroImageOverride) setHeroImage(heroImageOverride); }, [heroImageOverride]);
  useEffect(() => { if (heroEmojiOverride) setHeroEmoji(heroEmojiOverride); }, [heroEmojiOverride]);

  const plan1Items = Array.isArray(quote.plan1_items) ? (quote.plan1_items as string[]) : [];
  const plan2Items = Array.isArray(quote.plan2_items) ? (quote.plan2_items as string[]) : [];
  // Use admin WhatsApp for CTAs, quote.whatsapp_number is just client info
  const whatsappNum = adminWhatsapp || "";
  const whatsappLink = whatsappNum ? `https://wa.me/${whatsappNum}` : "#";

  // Normalize niche-specific labels (gender + niche + ticket)
  const gender = (((quote as any).gender as any) || "masculino");
  const ticketMedio = ((quote as any).ticket_medio as string) || null;
  const normalizeLabel = (text: string) =>
    normalizeQuoteText(text || "", gender, ticketMedio)
      .replace(/\bResultados Reais\/Dia\b/gi, "Resultados/Dia")
      .replace(/\bResultados Reais\/Mês\b/gi, "Resultados/Mês");

  const strategyItems = (tpl.strategy_items as any[]) || [];
  const instagramItems = (tpl.instagram_items as any[]) || [];
  const whatsappItems = (tpl.whatsapp_items as any[]) || [];
  const googleTexts = (tpl.google_texts as string[]) || [];
  const howWeWorkItems = (tpl.howwework_items as any[]) || [];
  const timelineItems = (tpl.timeline_items as any[]) || [];
  const socialProofStats = (tpl.social_proof_stats as any[]) || [];
  const ctaBadges = (tpl.cta_badges as string[]) || [];
  const customIconSize = Number(tpl.custom_icon_size) || 40;

  const resolvedPlans = resolveQuotePlans(quote, planDefaults);
  const visiblePlans = resolvedPlans.filter(p => !p.hidden);

  // Build metrics tables dynamically from visible plans
  const dynamicMetricsTables = visiblePlans
    .filter((plan) => Array.isArray(plan.metrics?.rows) && plan.metrics.rows.length > 0)
    .map((plan) => ({
      title: normalizeLabel(`money-float Expectativa Realista com ${plan.metrics.trafficDailyLabel || plan.title}`),
      rows: plan.metrics.rows.map((r) => [normalizeLabel(r[0] || ""), normalizeLabel(r[1] || "")] as [string, string]),
    }));
  const displayMetricsTables = dynamicMetricsTables.length > 0 ? dynamicMetricsTables : ((tpl.metrics_tables as any[]) || []).map((t: any) => ({
    ...t,
    title: normalizeLabel(t.title || ""),
    rows: (t.rows || []).map((r: any) => [normalizeLabel(r[0] || ""), r[1]]),
  }));

  const effectiveSectionOrder = sectionOrder || [];

  // Section visibility via CSS
  const hiddenSectionsCss = effectiveSectionOrder
    .filter(s => !s.visible && s.type === "builtin")
    .map(s => `[data-section-id="${s.id}"] { display: none !important; }`)
    .join("\n");

  // Section visibility helper
  const isSectionVisible = (sectionId: string) => {
    if (effectiveSectionOrder.length === 0) return true;
    const section = effectiveSectionOrder.find(s => s.id === sectionId);
    return section ? section.visible : true;
  };

  // Render custom sections that appear after a given built-in section
  const renderCustomSectionsAfter = (afterId: string) => {
    if (!sectionOrder || !customSectionRenderer) return null;
    const afterIndex = sectionOrder.findIndex(s => s.id === afterId);
    if (afterIndex < 0) return null;
    const customs: React.ReactNode[] = [];
    for (let i = afterIndex + 1; i < sectionOrder.length; i++) {
      const s = sectionOrder[i];
      if (s.type === "builtin") break;
      if (s.visible) customs.push(<div key={s.id}>{customSectionRenderer(s)}</div>);
    }
    return customs.length > 0 ? <>{customs}</> : null;
  };

  // Custom sections before the first built-in section
  const renderLeadingCustomSections = () => {
    if (!sectionOrder || !customSectionRenderer) return null;
    const customs: React.ReactNode[] = [];
    for (const s of sectionOrder) {
      if (s.type === "builtin") break;
      if (s.visible) customs.push(<div key={s.id}>{customSectionRenderer(s)}</div>);
    }
    return customs.length > 0 ? <>{customs}</> : null;
  };

  const renderEmoji = (emoji: string, iconUrl?: string, sizeOverride?: number) => {
    const finalSize = sizeOverride || parseInt(String(customIconSize)) || 48;
    if (iconUrl) {
      return <img src={iconUrl} alt="icon" className="object-contain inline-block" style={{ width: finalSize, height: finalSize }} />;
    }
    if (emoji === "whatsapp") return <WhatsAppIcon className="w-10 h-10 inline-block" style={{ color: "#25D366", width: finalSize, height: finalSize }} />;
    if (emoji === "instagram") return <InstagramIcon className="w-10 h-10 inline-block" style={{ color: "#E1306C", width: finalSize, height: finalSize }} />;
    const sophisticated = SOPHISTICATED_ICONS[emoji];
    if (sophisticated) { const Ic = sophisticated; return <Ic size={finalSize} />; }
    const igIcon = IG_STRATEGY_ICONS[emoji];
    if (igIcon) { const Ic = igIcon; return <Ic size={finalSize} />; }
    const waIcon = WA_STRATEGY_ICONS[emoji];
    if (waIcon) { const Ic = waIcon; return <Ic size={finalSize} />; }
    return emoji;
  };

  const renderMetricsTitle = (title: string) => {
    const clean = title.replace(/^money-float\s+/, "").replace(/\s*rocket-growth\s*$/g, "");
    return <>{renderEmoji("money-float")}<span>{clean}</span>{renderEmoji("rocket-growth")}</>;
  };

  // Edit mode helpers
  const E = editMode
    ? ({ field, children, multiline = true }: { field: string; children?: React.ReactNode; multiline?: boolean }) => (
        <EditableText value={tpl[field] as string || ""} onSave={v => onUpdateField?.(field, v)} multiline={multiline}>{children}</EditableText>
      )
    : ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  const updateArrayItem = (key: string, index: number, newItem: any) => {
    const arr = [...(tpl[key] as any[])];
    arr[index] = typeof newItem === "string" ? newItem : { ...arr[index], ...newItem };
    onUpdateField?.(key, arr);
  };

  const deleteArrayItem = (key: string, index: number) => {
    const arr = [...(tpl[key] as any[])];
    arr.splice(index, 1);
    onUpdateField?.(key, arr);
  };

  const addArrayItem = (key: string, template: any) => {
    const arr = [...((tpl[key] as any[]) || []), template];
    onUpdateField?.(key, arr);
  };

  const wrapCard = (key: string, index: number, item: any, fields: string[], children: React.ReactNode, cardProps?: any, fieldLabels?: Record<string, string>) => {
    if (!editMode) return <div key={index} {...cardProps}>{children}</div>;
    const fieldObj: Record<string, string> = {};
    fields.forEach(f => { fieldObj[f] = item[f] || ""; });
    return (
      <EditableCard
        key={index}
        fields={fieldObj}
        fieldLabels={fieldLabels}
        onSave={updated => updateArrayItem(key, index, updated)}
        onDelete={() => deleteArrayItem(key, index)}
        {...cardProps}
      >
        {children}
      </EditableCard>
    );
  };



  return (
    <>
      {hiddenSectionsCss && <style>{hiddenSectionsCss}</style>}
      <style>{buildConnectorStyles(connectorConfig.speed)}</style>
      {renderLeadingCustomSections()}
      {/* ===== 1. HERO ===== */}
      <section data-section-id="hero" className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
        {editMode ? (
          <EditableImage
            src={heroImage}
            onSave={url => { setHeroImage(url); onUpdateHeroImage?.(url); }}
            storagePath={`templates/hero-detailed`}
            className="absolute inset-0"
          >
            <img src={heroImage} alt="Background" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.bg}ee 0%, ${theme.bg}dd 40%, ${theme.bg}cc 100%)` }} />
          </EditableImage>
        ) : (
          <div className="absolute inset-0">
            <img src={heroImage} alt="Background" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.bg}ee 0%, ${theme.bg}dd 40%, ${theme.bg}cc 100%)` }} />
          </div>
        )}
        <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto animate-fade-up-init">
          <span className="inline-block px-4 py-1.5 mb-4 sm:mb-6 rounded-full border text-xs sm:text-sm tracking-wide"
            style={{ borderColor: theme.accent + "66", backgroundColor: theme.accent + "1a", color: theme.accent }}>
            <E field="hero_badge">{tpl.hero_badge as string}</E> • {quote.city}
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6">
            <span className="block" style={{ color: theme.text }}>
              {editMode ? <E field="hero_title">{tpl.hero_title as string}</E> : normalizeLabel(tpl.hero_title as string)}
            </span>
            <span className="shimmer-text" style={{ color: theme.accent }}>{quote.client_name}</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 px-2" style={{ color: theme.textMuted, whiteSpace: 'pre-line' }}>
            <E field="hero_subtitle">{quote.subtitle || (tpl.hero_subtitle as string) || `Plano para fazer seu negócio começar a receber clientes todos os dias\nCriado com base no que você me falou — focado em gerar conversas e vendas no WhatsApp.`}</E>
          </p>
          <a href={editMode ? undefined : "#estrategia"} className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg pulse-glow hover:scale-105 transition-transform duration-300"
            style={{ background: theme.accent, color: theme.accentFg }}
            onClick={editMode ? e => e.preventDefault() : undefined}>
            {editMode ? <E field="hero_cta">{tpl.hero_cta as string}</E> : normalizeLabel(tpl.hero_cta as string)}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </a>
        </div>
        <div className="absolute inset-x-0 bottom-0 overflow-hidden pointer-events-none z-0" style={{ height: "42%" }}>
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "100%" }}>
            {editMode ? (
              <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 float-animation text-3xl sm:text-4xl select-none pointer-events-auto" style={{ color: theme.accent + "4d" }}>
                <EditableIcon
                  emoji={heroEmoji}
                  iconUrl={heroIconUrl}
                  customIconSize={48}
                  renderNode={(() => {
                    const sophisticated = SOPHISTICATED_ICONS[heroEmoji];
                    if (sophisticated) {
                      const Ic = sophisticated;
                      return <Ic size={48} />;
                    }
                    if (heroEmoji === "whatsapp") return <WhatsAppIcon size={48} style={{ color: "#25D366" }} />;
                    if (heroEmoji === "instagram") return <InstagramIcon size={48} style={{ color: "#E1306C" }} />;
                    return null;
                  })()}
                  onSave={d => {
                    setHeroEmoji(d.emoji);
                    setHeroIconUrl(d.icon_url);
                    onUpdateHeroEmoji?.(d.emoji);
                    onUpdateField?.("hero_icon_url", d.icon_url || "");
                  }}
                />
                <p className="text-[10px] text-center mt-2 opacity-50" style={{ color: theme.textMuted }}>
                  (Substituído por ícones flutuantes na página final)
                </p>
              </div>
            ) : (
              <FloatingHeroIcons height="100%" />
            )}
          </div>
        </div>
    </section>
      {renderCustomSectionsAfter("hero")}

      {/* ===== 2. STRATEGY ===== */}
      <section id="estrategia" data-section-id="strategy" className="py-20 px-6" style={{ background: "var(--q-bg)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4"><E field="strategy_title">{tpl.strategy_title as string}</E></h2>
            <p style={{ color: theme.textMuted }} className="max-w-2xl mx-auto"><E field="strategy_desc" multiline>{tpl.strategy_desc as string}</E></p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strategyItems.map((item: any, i: number) => {
              const normalizedTitle = editMode ? item.title : normalizeLabel(item.title);
              const normalizedDesc = editMode ? item.desc : normalizeLabel(item.desc);
              const inner = (
                <>
                  <span className="text-4xl block mb-4 float-animation">
                    {editMode ? (
                      <EditableIcon emoji={item.emoji} iconUrl={item.icon_url} customIconSize={customIconSize} renderNode={renderEmoji(item.emoji, item.icon_url)}
                        onSave={d => updateArrayItem("strategy_items", i, { ...item, emoji: d.emoji, icon_url: d.icon_url })} />
                    ) : renderEmoji(item.emoji, item.icon_url)}
                  </span>
                  <h3 className="text-xl font-semibold mb-2">{normalizedTitle}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{normalizedDesc}</p>
                </>
              );
              return wrapCard("strategy_items", i, item, ["emoji", "title", "desc"], inner, {
                className: "rounded-xl p-6 border transition-all duration-300 hover:-translate-y-1 animate-on-scroll",
                style: { background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10` },
              });
            })}
            {editMode && <AddCardButton onClick={() => addArrayItem("strategy_items", { emoji: "🎯", title: "Novo Item", desc: "Descrição" })} />}
          </div>
          {tpl.strategy_tip_enabled !== false && (
            <div className="mt-10 p-6 rounded-xl border-l-4 animate-on-scroll" style={{ borderLeftColor: theme.accent, background: theme.accent + "0d" }}>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                <strong style={{ color: theme.accent }}>
                  {editMode ? (
                    <EditableText value={tpl.strategy_tip_title as string || "🎯 O Pulo do Gato"} onSave={v => onUpdateField?.("strategy_tip_title", v)}>
                      {tpl.strategy_tip_title as string || "🎯 O Pulo do Gato"}
                    </EditableText>
                  ) : (
                    normalizeLabel(tpl.strategy_tip_title as string || "🎯 O Pulo do Gato")
                  )}:
                </strong>{" "}
                {editMode ? <E field="strategy_tip" multiline>{tpl.strategy_tip as string || ""}</E> : normalizeLabel(tpl.strategy_tip as string || "")}
              </p>
            </div>
          )}
        </div>
      </section>
      {renderCustomSectionsAfter("strategy")}

      {/* ===== 3. PLATFORMS ===== */}
      <section data-section-id="platforms" className="py-16 px-6" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-on-scroll"><E field="platforms_title">{tpl.platforms_title as string}</E></h2>
          <p className="mb-12 animate-on-scroll whitespace-pre-line" style={{ color: theme.textMuted }}><E field="platforms_desc" multiline>{tpl.platforms_desc as string}</E></p>
          <div className="flex flex-wrap justify-center gap-10">
            {[
              { name: "Facebook Ads", svg: <svg viewBox="0 0 24 24" className="w-12 h-12" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              { name: "Instagram", svg: <svg viewBox="0 0 24 24" className="w-12 h-12"><defs><linearGradient id="ig-grad-d" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFDC80"/><stop offset="25%" stopColor="#F77737"/><stop offset="50%" stopColor="#E1306C"/><stop offset="75%" stopColor="#C13584"/><stop offset="100%" stopColor="#833AB4"/></linearGradient></defs><path fill="url(#ig-grad-d)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
              { name: "WhatsApp", svg: <svg viewBox="0 0 24 24" className="w-12 h-12" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
              { name: "Google Meu Negócio", svg: <svg viewBox="0 0 24 24" className="w-12 h-12"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
            ].map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-3 animate-on-scroll">
                <div className="float-animation" style={{ animationDelay: `${i * 0.3}s` }}>{p.svg}</div>
                <span className="text-sm font-semibold">{p.name}</span>
              </div>
            ))}
          </div>
          {/* Platform bullets */}
          {(() => {
            const bullets = (tpl.platforms_bullets as any[]) || [];
            if (bullets.length === 0) return null;
            const miniIcons: Record<string, React.ReactNode> = {
              facebook: <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
              instagram: <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0"><defs><linearGradient id="ig-b-d" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFDC80"/><stop offset="50%" stopColor="#E1306C"/><stop offset="100%" stopColor="#833AB4"/></linearGradient></defs><path fill="url(#ig-b-d)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
              whatsapp: <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
              google: <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
            };
            return (
              <div className="mt-10 max-w-md mx-auto text-left space-y-3 animate-on-scroll">
                {bullets.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    {miniIcons[b.icon] || <span className="w-5 h-5 flex-shrink-0">✔</span>}
                    <span className="text-sm font-medium" style={{ color: theme.textMuted }}>
                      {editMode ? (
                        <EditableText value={b.text} onSave={v => {
                          const copy = [...bullets];
                          copy[i] = { ...copy[i], text: v };
                          onUpdateField?.("platforms_bullets", copy);
                        }} />
                      ) : b.text}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>
      {renderCustomSectionsAfter("platforms")}

      {/* ===== 4. GOOGLE CARD ===== */}
      <section data-section-id="google" className="py-16 px-6" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-8 md:p-12 text-center relative overflow-hidden" style={{ background: "#2563eb" }}>
            <div className="float-animation mb-6">
              <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">{tpl.google_title as string}</h2>
            <div className="rounded-xl p-6 md:p-8 text-left space-y-4 max-w-3xl mx-auto" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              {googleTexts.map((text, i) => (
                <p key={i} className="leading-relaxed text-white/80" dangerouslySetInnerHTML={{ __html: text }} />
              ))}
            </div>
          </div>
        </div>
      </section>
      {renderCustomSectionsAfter("google")}

      {/* ===== 5. INSTAGRAM ===== */}
      <section data-section-id="instagram" className="py-20 px-6" style={{ background: "var(--q-bg)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" className="w-9 h-9 inline-block"><defs><linearGradient id="ig-title-d" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFDC80"/><stop offset="25%" stopColor="#F77737"/><stop offset="50%" stopColor="#E1306C"/><stop offset="75%" stopColor="#C13584"/><stop offset="100%" stopColor="#833AB4"/></linearGradient></defs><path fill="url(#ig-title-d)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              <E field="instagram_title">{tpl.instagram_title as string}</E>
            </h2>
            <p style={{ color: theme.textMuted }} className="max-w-xl mx-auto"><E field="instagram_desc" multiline>{tpl.instagram_desc as string}</E></p>
          </div>
          <div className={`${instagramItems.length === 2 ? "grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" : "hidden lg:flex items-stretch"} gap-0`}>
            {instagramItems.length <= 2 ? (
              instagramItems.map((item: any, i: number) => {
                const inner = (
                  <>
                    <span className="text-4xl block mb-3 float-animation">
                      {editMode ? (
                        <EditableIcon emoji={item.emoji} iconUrl={item.icon_url} customIconSize={customIconSize} renderNode={renderEmoji(item.emoji, item.icon_url)}
                          onSave={d => updateArrayItem("instagram_items", i, { ...item, emoji: d.emoji, icon_url: d.icon_url })} />
                      ) : renderEmoji(item.emoji, item.icon_url)}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.accent }}>{item.day}</span>
                    <h3 className="text-lg font-semibold mt-2 mb-2">{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                  </>
                );
                return wrapCard("instagram_items", i, item, ["emoji", "day", "title", "desc"], inner, {
                  className: "rounded-xl border p-6 text-center hover:-translate-y-1 transition-all duration-300 animate-on-scroll",
                  style: { background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10` },
                });
              })
            ) : (
              instagramItems.map((item: any, i: number) => {
                const card = (
                  <div key={`card-${i}`} className="flex-1 min-w-0">
                    {wrapCard("instagram_items", i, item, ["emoji", "day", "title", "desc"], (
                      <>
                        <span className="text-4xl block mb-3 float-animation">
                          {editMode ? (
                            <EditableIcon emoji={item.emoji} iconUrl={item.icon_url} customIconSize={customIconSize} renderNode={renderEmoji(item.emoji, item.icon_url)}
                              onSave={d => updateArrayItem("instagram_items", i, { ...item, emoji: d.emoji, icon_url: d.icon_url })} />
                          ) : renderEmoji(item.emoji, item.icon_url)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.accent }}>{item.day}</span>
                        <h3 className="text-lg font-semibold mt-2 mb-2">{item.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                      </>
                    ), {
                      className: "rounded-xl border p-6 text-center hover:-translate-y-1 transition-all duration-300 animate-on-scroll h-full",
                      style: { background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10` },
                    })}
                  </div>
                );
                const connector = (i < instagramItems.length - 1 && connectorConfig.enabled) ? (
                  <InstagramConnector key={`conn-${i}`} index={i} total={instagramItems.length} accentColor={theme.accent} isLast={i === instagramItems.length - 2} config={connectorConfig} />
                ) : null;
                return [card, connector];
              }).flat().filter(Boolean)
            )}
          </div>
          {/* Mobile/tablet fallback for 3+ cards */}
          {instagramItems.length > 2 && (
            <div className="lg:hidden space-y-0">
              {instagramItems.map((item: any, i: number) => (
                <div key={i}>
                  {wrapCard("instagram_items", i, item, ["emoji", "day", "title", "desc"], (
                    <>
                      <span className="text-4xl block mb-3 float-animation">
                        {editMode ? (
                          <EditableIcon emoji={item.emoji} iconUrl={item.icon_url} customIconSize={customIconSize} renderNode={renderEmoji(item.emoji, item.icon_url)}
                            onSave={d => updateArrayItem("instagram_items", i, { ...item, emoji: d.emoji, icon_url: d.icon_url })} />
                        ) : renderEmoji(item.emoji, item.icon_url)}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.accent }}>{item.day}</span>
                      <h3 className="text-lg font-semibold mt-2 mb-2">{item.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                    </>
                  ), {
                    className: "rounded-xl border p-6 text-center hover:-translate-y-1 transition-all duration-300 animate-on-scroll",
                    style: { background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10` },
                  })}
                  {i < instagramItems.length - 1 && connectorConfig.enabled && (
                    <InstagramConnector index={i} total={instagramItems.length} accentColor={theme.accent} isLast={i === instagramItems.length - 2} config={connectorConfig} />
                  )}
                </div>
              ))}
            </div>
          )}
          {editMode && <AddCardButton onClick={() => addArrayItem("instagram_items", { emoji: "📱", day: "Dia", title: "Novo", desc: "Descrição" })} />}
        </div>
      </section>
      {renderCustomSectionsAfter("instagram")}

      {/* ===== 6. WHATSAPP ===== */}
      <section data-section-id="whatsapp" className="py-20 px-6" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <WhatsAppIcon className="w-9 h-9 inline-block" style={{ color: "#25D366" }} />
              <E field="whatsapp_title">{tpl.whatsapp_title as string}</E>
            </h2>
            <p style={{ color: theme.textMuted }} className="max-w-xl mx-auto"><E field="whatsapp_desc" multiline>{tpl.whatsapp_desc as string}</E></p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {whatsappItems.map((item: any, i: number) => {
              const inner = (
                <>
                  <span className="text-3xl float-animation flex-shrink-0">
                    {editMode ? (
                      <EditableIcon emoji={item.emoji} iconUrl={item.icon_url} customIconSize={customIconSize} renderNode={renderEmoji(item.emoji, item.icon_url)}
                        onSave={d => updateArrayItem("whatsapp_items", i, { ...item, emoji: d.emoji, icon_url: d.icon_url })} />
                    ) : renderEmoji(item.emoji, item.icon_url)}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                  </div>
                </>
              );
              return wrapCard("whatsapp_items", i, item, ["emoji", "title", "desc"], inner, {
                className: "rounded-xl border p-6 flex gap-4 items-start hover:-translate-y-1 transition-all duration-300 animate-on-scroll",
                style: { background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10` },
              });
            })}
            {editMode && <AddCardButton onClick={() => addArrayItem("whatsapp_items", { emoji: "💬", title: "Novo", desc: "Descrição" })} />}
          </div>
          <div className="mt-10 p-6 rounded-xl border-l-4 animate-on-scroll" style={{ borderLeftColor: "#25D366", background: "#25D36611" }}>
            <p className="text-sm leading-relaxed">
              <strong style={{ color: "#25D366" }}>🔮 Futuro Próximo:</strong>{" "}
              <E field="whatsapp_tip" multiline>{tpl.whatsapp_tip as string}</E>
            </p>
          </div>
        </div>
      </section>
      {renderCustomSectionsAfter("whatsapp")}

      {/* ===== 7. COMO VAMOS TRABALHAR JUNTOS ===== */}
      <section data-section-id="howwework" className="py-20 px-6" style={{ background: "var(--q-bg)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 inline-flex items-center justify-center gap-3 flex-wrap">
              {renderEmoji("handshake", undefined, 80)}
              <E field="howwework_title">{tpl.howwework_title as string}</E>
            </h2>
            <p style={{ color: theme.textMuted }} className="max-w-xl mx-auto"><E field="howwework_desc" multiline>{tpl.howwework_desc as string}</E></p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {howWeWorkItems.map((item: any, i: number) => {
              const inner = (
                <>
                  <div className="text-4xl mb-4">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold" style={{ background: theme.accent + "22", color: theme.accent }}>
                      {isNaN(Number(item.step)) ? renderEmoji(item.step) : item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: theme.accent }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                </>
              );
              return wrapCard("howwework_items", i, item, ["step", "title", "desc"], inner, {
                className: "rounded-2xl border-2 p-8 animate-on-scroll",
                style: { borderColor: theme.accent + "55", background: theme.card },
              });
            })}
            {editMode && <AddCardButton onClick={() => addArrayItem("howwework_items", { step: String(howWeWorkItems.length + 1), title: "Novo Passo", desc: "Descrição do passo" })} />}
          </div>
        </div>
      </section>
      {renderCustomSectionsAfter("howwework")}

      {/* ===== 8. CRONOGRAMA ===== */}
      <section data-section-id="timeline" className="py-20 px-6" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 inline-flex items-center justify-center gap-3 flex-wrap">
              {renderEmoji("calendar-modern")}
              <E field="timeline_title">{tpl.timeline_title as string}</E>
            </h2>
          </div>
          {/* Desktop: horizontal with connectors */}
          <div className="hidden lg:flex items-stretch gap-0">
            {timelineItems.map((item: any, i: number) => {
              const card = (
                <div key={`tl-card-${i}`} className="flex-1 min-w-0">
                  {wrapCard("timeline_items", i, item, ["week", "title", "desc"], (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full mb-2 inline-block" style={{ background: theme.accent + "22", color: theme.accent }}>{item.week}</span>
                      <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                    </>
                  ), {
                    className: "rounded-xl border p-5 text-center animate-on-scroll h-full",
                    style: { background: theme.card, borderColor: theme.cardBorder },
                  })}
                </div>
              );
              const connector = (i < timelineItems.length - 1 && connectorConfig.enabled) ? (
                <InstagramConnector key={`tl-conn-${i}`} index={i} total={timelineItems.length} accentColor={theme.accent} isLast={i === timelineItems.length - 2} config={connectorConfig} />
              ) : null;
              return [card, connector];
            }).flat().filter(Boolean)}
          </div>
          {/* Mobile/tablet: vertical with connectors */}
          <div className="lg:hidden space-y-0">
            {timelineItems.map((item: any, i: number) => (
              <div key={i}>
                {wrapCard("timeline_items", i, item, ["week", "title", "desc"], (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full mb-2 inline-block" style={{ background: theme.accent + "22", color: theme.accent }}>{item.week}</span>
                    <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>{item.desc}</p>
                  </>
                ), {
                  className: "rounded-xl border p-5 text-center animate-on-scroll",
                  style: { background: theme.card, borderColor: theme.cardBorder },
                })}
                {i < timelineItems.length - 1 && connectorConfig.enabled && (
                  <InstagramConnector index={i} total={timelineItems.length} accentColor={theme.accent} isLast={i === timelineItems.length - 2} config={connectorConfig} />
                )}
              </div>
            ))}
          </div>
          {editMode && <AddCardButton onClick={() => addArrayItem("timeline_items", { week: "Semana X", title: "Novo", desc: "Descrição" })} label="Adicionar Etapa" />}
        </div>
      </section>
      {renderCustomSectionsAfter("timeline")}

      {/* ===== 9. PLANS ===== */}
      {(() => {
        const visiblePlans = resolvedPlans.filter(p => !p.hidden);
        const plansSectionWidth = visiblePlans.length === 1 ? "max-w-3xl" : visiblePlans.length === 2 ? "max-w-6xl" : "max-w-7xl";
        const plansGridClass = visiblePlans.length === 1
          ? "max-w-2xl mx-auto"
          : visiblePlans.length === 2
            ? "md:grid-cols-2 max-w-6xl mx-auto"
            : visiblePlans.length === 3
              ? "md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto"
              : "md:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto";
        return (
          <section data-section-id="plans" id="planos" className="py-20 px-6" style={{ background: "var(--q-bg)" }}>
            <div className={`${plansSectionWidth} mx-auto`}>
              <div className="text-center mb-14 animate-on-scroll">
                <h2 className="text-3xl md:text-4xl font-bold mb-4"><E field="plans_title">{tpl.plans_title as string}</E></h2>
                <p style={{ color: theme.textMuted }} className="max-w-2xl mx-auto"><E field="plans_desc" multiline>{tpl.plans_desc as string}</E></p>
              </div>
              <div className={`grid grid-cols-1 ${plansGridClass} gap-8 items-stretch`}>
                {visiblePlans.map((plan, vi) => {
                  const isHighlighted = plan.highlighted;
                  const isBest = !!plan.bestPlan && bestPlanStyle.enabled;
                  const bestLabel = plan.bestPlanLabel || bestPlanStyle.label;
                  return (
                    <div key={vi} className={`relative min-w-0 h-full rounded-2xl border-2 p-8 transition-all duration-300 animate-on-scroll hover:-translate-y-1 flex flex-col ${isHighlighted ? 'scale-[1.01] md:scale-[1.02]' : ''} ${isBest ? 'best-plan-frame' : ''}`}
                      style={{ background: theme.card, borderColor: isBest ? bestPlanStyle.color : (isHighlighted ? theme.accent : theme.cardBorder), boxShadow: isHighlighted ? `0 8px 40px ${theme.accent}30` : `0 4px 20px ${theme.accent}10`, ...(isBest ? { ['--bp-color' as any]: bestPlanStyle.color, ['--bp-speed' as any]: `${bestPlanStyle.pulseSpeed}s` } : {}) }}>
                      {isBest && <BestPlanBadge label={bestLabel} config={bestPlanStyle} />}
                      {isHighlighted && plan.badge && !isBest && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider pulse-glow"
                          style={{ background: theme.accent, color: theme.accentFg, '--pulse-glow-color': theme.accent + '88' } as React.CSSProperties}>{plan.badge}</div>
                      )}
                      <h3 className="text-xl font-semibold text-center mt-2 mb-4" style={{ color: theme.accent }}>{plan.title}</h3>
                      <div className="text-center mb-6">
                        <span className="text-5xl font-bold">{plan.total}</span>
                        <span className="block text-sm mt-1 font-bold" style={{ color: "#16a34a" }}>/mês (investimento total)</span>
                      </div>
                      {plan.metrics?.rows && plan.metrics.rows.length > 0 && (
                        <div className="rounded-xl p-4 mb-6 space-y-1.5" style={{ background: "rgba(148,163,184,0.10)", border: "1px solid rgba(148,163,184,0.22)" }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5 text-center" style={{ color: theme.accent }}>Expectativa de Resultados:<RocketGrowthIcon size={22} /></p>
                          {plan.metrics.rows.slice(-2).map((row, ri) => (
                            <div key={ri} className="flex justify-between text-xs">
                              <span style={{ color: theme.textMuted }}>{row[0]}</span>
                              <span className="font-semibold" style={{ color: theme.accent }}>{row[1]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="rounded-xl p-4 mb-6 space-y-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5 text-center" style={{ color: theme.accent }}>Divisão do Investimento:<MoneyFloatIcon size={22} /></p>
                        <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5" style={{ color: theme.textMuted }}><Briefcase className="h-3.5 w-3.5" style={{ color: "#3b82f6" }} strokeWidth={2.5} />Mão de Obra</span><span className="font-semibold">{plan.labor}</span></div>
                        <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5" style={{ color: theme.textMuted }}><Rocket className="h-3.5 w-3.5" style={{ color: "#f97316" }} strokeWidth={2.5} />Tráfego Pago</span><span className="font-semibold">{plan.ads}</span></div>
                        <p className="text-xs font-bold mt-2 pt-2 border-t text-center" style={{ color: "#3b82f6", borderColor: theme.cardBorder }}>* O valor de tráfego é pago diretamente ao Facebook/Meta</p>
                      </div>
                      <div className="mb-4 flex-1">
                        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: theme.accent }}><CheckCircle2 className="h-4 w-4" style={{ color: "#10b981" }} strokeWidth={2.5} />O que está incluso:</p>
                        <ul className="space-y-2">
                          {plan.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-sm" style={{ color: theme.textMuted }}>
                              <Check className="mt-0.5 flex-shrink-0 h-4 w-4" style={{ color: "#10b981" }} strokeWidth={3} />{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <a href={editMode ? undefined : `${whatsappLink}?text=${encodeURIComponent(`Olá, tenho interesse no ${plan.title} de ${plan.total} para meu ${quote.client_business_type.toLowerCase()}.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className={`mt-auto flex min-w-0 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3.5 font-semibold text-sm text-center whitespace-nowrap transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] ${isHighlighted ? 'pulse-glow' : ''}`}
                        style={{ background: theme.accent, color: theme.accentFg, '--pulse-glow-color': theme.accent + '66' } as React.CSSProperties}
                        onClick={editMode ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
                        <span className="truncate">{plan.ctaLabel || "Quero Este Plano"}</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}
      {renderCustomSectionsAfter("plans")}

      {/* ===== 10. EXPECTATIVAS DE RESULTADO ===== */}
      <section data-section-id="metrics" className="py-20 px-6" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Expectativa de Resultados</h2>
            <p style={{ color: theme.textMuted }} className="max-w-2xl mx-auto">Projeções conservadoras e realistas para o primeiro mês.</p>
          </div>
          {displayMetricsTables.map((table: any, ti: number) => {
            const matchedPlan = visiblePlans.filter(p => Array.isArray(p.metrics?.rows) && p.metrics.rows.length > 0)[ti];
            const isBestTable = bestPlanStyle.enabled && bestPlanStyle.syncMetricsTable && matchedPlan?.bestPlan;
            return (
            <div key={ti} className="animate-on-scroll mb-10">
              <h3 className="text-2xl font-semibold mb-6 text-center flex items-center justify-center gap-2">
                {typeof table.title === "string" && table.title.startsWith("money-float ") ? renderMetricsTitle(table.title) : table.title}
              </h3>
              <div className={`rounded-xl overflow-hidden border ${isBestTable ? 'best-plan-metrics-frame' : ''}`} style={{ borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10`, ...(isBestTable ? { ['--bp-color' as any]: bestPlanStyle.color, ['--bp-speed' as any]: `${bestPlanStyle.pulseSpeed}s` } : {}) }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: theme.accent + "1a" }}>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: theme.accent }}>Métrica</th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: theme.accent }}>Estimativa (Mês 1)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(table.rows as any[]).map((row: any, ri: number) => (
                      <tr key={ri} className="border-t" style={{ borderColor: theme.cardBorder, background: ri % 2 === 0 ? theme.card : theme.bg }}>
                        <td className="px-6 py-4 text-sm font-medium">{normalizeLabel(row[0])}</td>
                        <td className="px-6 py-4 text-sm font-semibold" style={{ color: ri >= 3 ? theme.accent : theme.textMuted }}>{normalizeLabel(row[1])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          })}
          {tpl.strategy_tip_enabled !== false && (
            <div className="p-6 rounded-xl border-l-4 animate-on-scroll" style={{ borderLeftColor: theme.accent, background: theme.accent + "0d" }}>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                <strong style={{ color: theme.accent }}>
                  {editMode ? (
                    <EditableText value={tpl.strategy_tip_title as string || "🎯 O Pulo do Gato"} onSave={v => onUpdateField?.("strategy_tip_title", v)}>
                      {tpl.strategy_tip_title as string || "🎯 O Pulo do Gato"}
                    </EditableText>
                  ) : (
                    normalizeLabel(tpl.strategy_tip_title as string || "🎯 O Pulo do Gato")
                  )}:
                </strong>{" "}
                {editMode ? <E field="strategy_tip" multiline>{tpl.strategy_tip as string || ""}</E> : normalizeLabel(tpl.strategy_tip as string || "")}
              </p>
            </div>
          )}
        </div>
      </section>
      {renderCustomSectionsAfter("metrics")}

      {/* ===== 11. PROVA SOCIAL ===== */}
      <section data-section-id="social_proof" className="py-20 px-6" style={{ background: "var(--q-bg)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold mb-4"><E field="social_proof_title">{tpl.social_proof_title as string}</E></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
            {socialProofStats.map((stat: any, i: number) => {
              const inner = (
                <>
                  <p className="text-3xl font-bold mb-2" style={{ color: theme.accent }}>{stat.value}</p>
                  <p className="text-sm" style={{ color: theme.textMuted }}>{stat.label}</p>
                </>
              );
              return wrapCard("social_proof_stats", i, stat, ["value", "label"], inner, {
                className: "text-center p-6 rounded-xl border animate-on-scroll",
                style: { background: theme.card, borderColor: theme.cardBorder },
              });
            })}
            {editMode && <AddCardButton onClick={() => addArrayItem("social_proof_stats", { value: "+100", label: "Nova Métrica" })} />}
          </div>
        </div>
      </section>
      {renderCustomSectionsAfter("social_proof")}

      {/* ===== 12. FAQ (from centralized DB) ===== */}
      <div data-section-id="faq">
        {!editMode && <FaqSection theme={theme} layoutType="detailed" userId={quote.user_id} />}
      </div>
      {renderCustomSectionsAfter("faq")}

      {/* ===== 13. CTA FINAL ===== */}
      <section data-section-id="cta" className="py-20 px-6" style={{ background: theme.id.endsWith("-white") ? "#1a1a2e" : theme.bgSecondary }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {editMode ? <E field="cta_title">{tpl.cta_title as string}</E> : normalizeLabel(tpl.cta_title as string || "")}
          </h2>
          <p className="text-base md:text-lg mb-10 text-white/70 max-w-xl mx-auto">
            {editMode ? <E field="cta_desc" multiline>{tpl.cta_desc as string}</E> : normalizeLabel(tpl.cta_desc as string || "")}
          </p>
          <WhatsAppCTAButton
            href={`${whatsappLink}?text=${encodeURIComponent(tpl.cta_whatsapp_message as string || `Olá, vi sua proposta e quero conversar sobre o marketing do meu ${quote.client_business_type.toLowerCase()}.`)}`}
            label={tpl.cta_button as string || "Falar no WhatsApp"}
            animation={(tpl.whatsapp_btn_animation as WhatsAppAnimation) || "pulse"}
            editMode={editMode}
            whatsappMessage={tpl.cta_whatsapp_message as string || ""}
            onSaveLabel={v => onUpdateField?.("cta_button", v)}
            onSaveMessage={v => onUpdateField?.("cta_whatsapp_message", v)}
          />
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-white/60">
            {ctaBadges.map((badge, i) => (
              editMode ? (
                <span key={i} className="flex items-center gap-1 group/badge">
                  ✅ <EditableText value={badge} onSave={v => updateArrayItem("cta_badges", i, v)} />
                  <button
                    onClick={() => {
                      const updated = [...ctaBadges];
                      updated.splice(i, 1);
                      onUpdateField?.("cta_badges", updated);
                    }}
                    className="opacity-0 group-hover/badge:opacity-100 ml-1 text-red-400 hover:text-red-300 transition-opacity"
                    title="Excluir badge"
                  >✕</button>
                </span>
              ) : (
                <span key={i}>✅ {badge}</span>
              )
            ))}
            {editMode && (
              <button onClick={() => addArrayItem("cta_badges", "Novo badge")} className="text-white/30 hover:text-white/60 text-sm">+ Adicionar</button>
            )}
          </div>
        </div>
      </section>
      {renderCustomSectionsAfter("cta")}

      {/* ===== REVIEWS ===== */}
      <div data-section-id="reviews">
        {!editMode && <ReviewsSection theme={theme} />}
      </div>

      {/* ===== 14. FOOTER ===== */}
      <div data-section-id="footer">
        {!editMode && <ProfessionalFooter theme={theme} clientName={quote.client_name} city={quote.city} />}
      </div>
    </>
  );
}