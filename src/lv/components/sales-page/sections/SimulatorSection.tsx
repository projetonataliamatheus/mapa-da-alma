// @ts-nocheck
"use client";
import { useMemo, useState, useEffect, Fragment, useCallback } from "react";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";
import { useSalesPageScrollReveal } from "@/lv/hooks/useSalesPageScrollReveal";
import FloatingSectionIcon from "@/lv/components/sales-page/FloatingSectionIcon";
import SectionBadge from "@/lv/components/sales-page/SectionBadge";
import MultiLineTitle from "@/lv/components/sales-page/MultiLineTitle";
import SectionSubtitle2 from "@/lv/components/sales-page/SectionSubtitle2";
import SectionSubtitleStyled from "@/lv/components/sales-page/SectionSubtitleStyled";
import SectionClosingPhrase from "@/lv/components/sales-page/SectionClosingPhrase";
import { Slider } from "@/lv/components/ui/slider";
import { useTrackClick } from "@/lv/pages/SalesPage";
import { useSimulatorContext, SIMULATOR_ANCHOR_ID, applyPlanTemplate } from "@/lv/components/sales-page/SimulatorContext";
import WhatsAppCtaWidget, { WhatsAppCtaBanner, buildStyles as buildWcaStyles } from "@/lv/components/sales-page/WhatsAppCtaWidget";
import {
  Calculator,
  Megaphone,
  Laptop,
  BadgeDollarSign,
  ChevronDown,
  Sparkles,
  Plus as PlusIcon,
  Equal as EqualIcon,
} from "lucide-react";

export interface SimulatorPlan {
  name?: string;
  prefix?: string;
  perDay: number;
  perDayMax?: number;
  perDaySeparator?: string;
  perMonth: number;
  perMonthMax?: number;
  perMonthSeparator?: string;
  ads: number;
  management: number;
  total: number;
}

export const DEFAULT_SIMULATOR_PLANS: SimulatorPlan[] = [
  { perDay: 1, perMonth: 30, ads: 300, management: 799, total: 1099 },
  { perDay: 2, perMonth: 60, ads: 600, management: 799, total: 1399 },
  { perDay: 3, perMonth: 90, ads: 900, management: 900, total: 1800 },
  { perDay: 4, perMonth: 120, ads: 1200, management: 1100, total: 2300 },
  { perDay: 5, perMonth: 150, ads: 1500, management: 1100, total: 2600 },
  { perDay: 6, perMonth: 180, ads: 1800, management: 1300, total: 3100 },
  { perDay: 7, perMonth: 210, ads: 2100, management: 1300, total: 3400 },
  { perDay: 8, perMonth: 240, ads: 2400, management: 1500, total: 3900 },
];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

function useAnimatedNumber(target: number, duration = 400) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const start = value;
    const delta = target - start;
    if (delta === 0) return;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

// Renders text or HTML (for rich text fields). Falls back to plain text when html is empty.
function RichOrPlain({ html, plain, className, style }: { html?: string; plain?: string; className?: string; style?: React.CSSProperties }) {
  if (html && html.trim()) {
    return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className={className} style={style}>{plain}</span>;
}

export default function SimulatorSection() {
  const c = usePublicConfig();
  const { ref, isVisible } = useSalesPageScrollReveal();
  const trackClick = useTrackClick();

  const accent = c.accentColor || "#22c55e";
  const colorLow = c.simulatorColorLow || "#ef4444";
  const colorMid = c.simulatorColorMid || "#eab308";
  const colorHigh = c.simulatorColorHigh || "#22c55e";

  // Global scale (50..130%) — multiplies every font size in this section
  const scale = (c.simulatorGlobalScale ?? 100) / 100;
  const sz = (n: number) => Math.round(n * scale);

  // Card colors
  const cardAdsColor = c.simulatorCardAdsColor || "#3b82f6";
  const cardMgmtColor = c.simulatorCardMgmtColor || "#3b82f6";
  const cardTotalColor = c.simulatorCardTotalColor || "#22c55e";
  const adsLabel = c.simulatorCardAdsLabel || "Anúncios";
  const mgmtLabel = c.simulatorCardMgmtLabel || "Gestão";
  const totalLabel = c.simulatorCardTotalLabel || "Total Mensal";
  const metricFontSize = sz(c.simulatorMetricFontSize ?? 36);
  const metricSubFontSize = sz(c.simulatorMetricSubFontSize ?? 16);
  const growthChartEnabled = c.simulatorGrowthChartEnabled !== false;
  const ctaTextColor = c.simulatorCtaTextColor || "#ffffff";
  const perMonthCardColor = c.simulatorPerMonthCardColor || "#22c55e";
  const perMonthLabel = c.simulatorPerMonthLabel || "Novos Clientes no WhatsApp por mês";
  const perMonthFontSize = sz(c.simulatorPerMonthFontSize || 56);
  const showTotalBeforeCta = c.simulatorShowTotalBeforeCta !== false;
  const totalBeforeCtaLabel = c.simulatorTotalBeforeCtaLabel || "Investimento total mensal";
  const totalBeforeCtaColor = c.simulatorTotalBeforeCtaColor || "#22c55e";
  const ctaFullWidth = c.simulatorCtaFullWidth !== false;
  const ctaFontSize = sz(c.simulatorCtaFontSize || 20);

  // New configurable sizes (scaled)
  const subtitleFontSize = sz(c.simulatorSubtitleFontSize ?? 18);
  const sliderLabelFontSize = sz(c.simulatorSliderLabelFontSize ?? 18);
  const impactFontSize = sz(c.simulatorImpactFontSize ?? 20);
  const microcopyFontSize = sz(c.simulatorMicrocopyFontSize ?? 18);
  const disclaimerFontSize = sz(c.simulatorDisclaimerFontSize ?? 13);
  const transitionFontSize = sz(c.simulatorTransitionFontSize ?? 22);
  const perDayFontSize = sz(c.simulatorPerDayFontSize ?? 64);
  const perDayLabel = c.simulatorPerDayLabel || "clientes/dia";
  const perMonthShowFirst = c.simulatorPerMonthShowFirst !== false;
  const cardGlowEnabled = c.simulatorCardGlowEnabled !== false;
  const cardGlowIntensity = c.simulatorCardGlowIntensity ?? 50;
  const containerBorderUseDyn = c.simulatorContainerBorderUseDyn !== false;
  const containerBorderColor = c.simulatorContainerBorderColor || "#22c55e";
  const iconsFloat = c.simulatorIconsFloat !== false;
  const iconsSize = Math.round((c.simulatorIconsSize ?? 22) * scale);
  const cardOrder = (c.simulatorCardOrder && c.simulatorCardOrder.length > 0) ? c.simulatorCardOrder : ["total", "mgmt", "ads"];

  // Operators between metric cards
  const operatorsEnabled = c.simulatorOperatorsEnabled !== false;
  const opEqColor = c.simulatorOperatorEqualsColor || "#22c55e";
  const opPlusColor = c.simulatorOperatorPlusColor || "#eab308";
  const opSize = sz(c.simulatorOperatorSize ?? 36);

  // Plans strip (chips above the slider)
  const stripEnabled = c.simulatorPlansStripEnabled !== false;
  const stripFontSize = sz(c.simulatorPlansStripFontSize ?? 14);
  const stripActiveColor = c.simulatorPlansStripActiveColor || colorHigh;
  const stripInactiveColor = c.simulatorPlansStripInactiveColor || "#3f3f46";
  const stripGlow = c.simulatorPlansStripGlow !== false;
  const stripPulse = c.simulatorPlansStripPulse !== false;

  // Plan name (between total and CTA)
  const planNameEnabled = c.simulatorPlanNameEnabled !== false;
  const planNameFontSize = sz(c.simulatorPlanNameFontSize ?? 22);
  const planNameColor = c.simulatorPlanNameColor || "#22c55e";
  const planNameGlow = c.simulatorPlanNameGlow !== false;
  const planNameUppercase = c.simulatorPlanNameUppercase !== false;
  const planNameBold = c.simulatorPlanNameBold !== false;

  const plans: SimulatorPlan[] = useMemo(() => {
    const cfg = (c.simulatorPlans as (SimulatorPlan & { active?: boolean })[] | undefined) || [];
    if (!Array.isArray(cfg) || cfg.length < 1) return DEFAULT_SIMULATOR_PLANS;
    const activeCfg = cfg.filter((p) => (p as any)?.active !== false);
    const source = activeCfg.length >= 1 ? activeCfg : DEFAULT_SIMULATOR_PLANS;
    return source.map((p, i) => ({
      name: p?.name,
      prefix: (p as any)?.prefix ?? "",
      perDay: Number(p?.perDay ?? (DEFAULT_SIMULATOR_PLANS[i]?.perDay ?? i + 1)),
      perDayMax: (p as any)?.perDayMax != null && (p as any)?.perDayMax !== "" ? Number((p as any).perDayMax) : undefined,
      perDaySeparator: (p as any)?.perDaySeparator ?? "a",
      perMonth: Number(p?.perMonth ?? (DEFAULT_SIMULATOR_PLANS[i]?.perMonth ?? 30)),
      perMonthMax: (p as any)?.perMonthMax != null && (p as any)?.perMonthMax !== "" ? Number((p as any).perMonthMax) : undefined,
      perMonthSeparator: (p as any)?.perMonthSeparator ?? "a",
      ads: Number(p?.ads ?? (DEFAULT_SIMULATOR_PLANS[i]?.ads ?? 300)),
      management: Number(p?.management ?? (DEFAULT_SIMULATOR_PLANS[i]?.management ?? 799)),
      total: Number(p?.total ?? (DEFAULT_SIMULATOR_PLANS[i]?.total ?? 1099)),
    }));
  }, [c.simulatorPlans]);

  const maxStep = Math.max(0, plans.length - 1);
  const defaultStep = Math.min(2, maxStep);
  const [step, setStepRaw] = useState<number>(defaultStep);
  const safeStep = Math.min(step, maxStep);
  const plan = plans[safeStep] ?? plans[0];

  const { setStepInteracted } = useSimulatorContext();
  const setStep = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(maxStep, next));
      setStepRaw(clamped);
      const target = plans[clamped] ?? plans[0];
      if (target) setStepInteracted(target);
    },
    [maxStep, plans, setStepInteracted],
  );

  // Animated values
  const aPerDay = useAnimatedNumber(plan.perDay);
  const aPerDayMax = useAnimatedNumber(plan.perDayMax ?? plan.perDay);
  const aPerMonth = useAnimatedNumber(plan.perMonth);
  const aPerMonthMax = useAnimatedNumber(plan.perMonthMax ?? plan.perMonth);
  const aAds = useAnimatedNumber(plan.ads);
  const aMgmt = useAnimatedNumber(plan.management);
  const aTotal = useAnimatedNumber(plan.total);

  const hasPerDayRange = plan.perDayMax != null && plan.perDayMax !== plan.perDay;
  const hasPerMonthRange = plan.perMonthMax != null && plan.perMonthMax !== plan.perMonth;
  const perDayDisplay = hasPerDayRange ? `${aPerDay} ${plan.perDaySeparator || "a"} ${aPerDayMax}` : `${aPerDay}`;
  const perMonthDisplay = hasPerMonthRange ? `${aPerMonth} ${plan.perMonthSeparator || "a"} ${aPerMonthMax}` : `${aPerMonth}`;
  const perDayPlain = hasPerDayRange ? `${plan.perDay} ${plan.perDaySeparator || "a"} ${plan.perDayMax}` : `${plan.perDay}`;
  const perMonthPlain = hasPerMonthRange ? `${plan.perMonth} ${plan.perMonthSeparator || "a"} ${plan.perMonthMax}` : `${plan.perMonth}`;

  // Dynamic color based on relative position (low/mid/high)
  const ratio = maxStep === 0 ? 1 : safeStep / maxStep;
  const dynColor = ratio <= 0.25 ? colorLow : ratio <= 0.65 ? colorMid : colorHigh;
  const containerBorder = containerBorderUseDyn ? dynColor : containerBorderColor;

  // Microcopy (rich text supported)
  const microHtml =
    ratio <= 0.25
      ? c.simulatorMicroLowHtml
      : ratio <= 0.65
        ? c.simulatorMicroMidHtml
        : c.simulatorMicroHighHtml;
  const microPlain =
    ratio <= 0.25
      ? c.simulatorMicroLow || "Você começa a ter seus primeiros clientes chegando."
      : ratio <= 0.65
        ? c.simulatorMicroMid || "Seu WhatsApp começa a ter movimento todos os dias."
        : c.simulatorMicroHigh || "🔥 Aqui você entra em crescimento acelerado.";

  // Impact / CTA labels with placeholders
  const impactTpl = c.simulatorImpactText || "Com esse investimento, você pode gerar aproximadamente {month} clientes por mês.";
  const ctaTpl = c.simulatorCtaText || "Quero esses {month} clientes por mês";
  const impact = impactTpl.split("{month}").join(perMonthPlain).split("{day}").join(perDayPlain);
  const impactHtmlTpl = c.simulatorImpactHtml || "";
  const impactHtml = impactHtmlTpl ? impactHtmlTpl.split("{month}").join(perMonthPlain).split("{day}").join(perDayPlain) : "";
  const ctaLabel = ctaTpl.split("{month}").join(perMonthPlain).split("{day}").join(perDayPlain);

  // WhatsApp link with prefilled message — uses configurable template with plan placeholders
  const baseLink = c.whatsappLink || "https://wa.me/5519998701408";
  const tpl =
    c.whatsappMessageTemplate ||
    "Olá Matheus! Quero o plano *{plano}* — {clientes_dia} clientes/dia ({clientes_mes}/mês). Investimento total: *{total}* (Anúncios {anuncios} + Gestão {gestao}).";
  const msg = applyPlanTemplate(tpl, plan);
  const linkBase = baseLink.split("?")[0];
  const ctaLink = `${linkBase}?text=${encodeURIComponent(msg)}`;

  const arrowSize = sz(c.simulatorArrowSize || 48);
  const transitionText = c.simulatorTransitionText || "Agora você decide:";

  // CTA visual extras
  const ctaCenter = c.simulatorCtaCenter !== false;
  const ctaPulseEnabled = c.simulatorCtaPulseEnabled !== false;
  const ctaPulseSpeed = c.simulatorCtaPulseSpeed ?? 2;
  const ctaPulseColor = c.simulatorCtaPulseColor || dynColor;
  const ctaPulseIntensityPct = Math.max(0, Math.min(100, c.simulatorCtaPulseIntensity ?? 70));
  const ctaPulseAlphaHi = Math.round((ctaPulseIntensityPct / 100) * 200).toString(16).padStart(2, "0");
  const ctaPulseAlphaLo = Math.round((ctaPulseIntensityPct / 100) * 90).toString(16).padStart(2, "0");

  const glowAlpha = Math.round((cardGlowIntensity / 100) * 255).toString(16).padStart(2, "0");
  const glowAlphaHalf = Math.round((cardGlowIntensity / 100) * 128).toString(16).padStart(2, "0");

  // Build per-day display block
  const PerDayBlock = (
    <div className="text-center mt-8">
      <div
        className="inline-flex items-baseline gap-3 flex-wrap justify-center"
        style={{ animation: "sp-sim-float 3s ease-in-out infinite" }}
      >
        {plan.prefix && (
          <span
            className="font-bold"
            style={{ color: dynColor, textShadow: `0 0 20px ${dynColor}55`, fontSize: `${perDayFontSize * 0.45}px`, lineHeight: 1 }}
          >
            {plan.prefix}
          </span>
        )}
        <span
          className="sp-sim-num font-black"
          style={{ color: dynColor, textShadow: `0 0 30px ${dynColor}66`, fontSize: `${perDayFontSize}px`, lineHeight: 1 }}
        >
          {perDayDisplay}
        </span>
        <span className="font-semibold" style={{ color: "var(--sp-muted)", fontSize: `${perDayFontSize * 0.3}px` }}>
          {perDayLabel}
        </span>
      </div>
    </div>
  );

  // Per-month highlight card
  const PerMonthBlock = (
    <div className="flex justify-center mt-6">
      <div
        className="inline-flex flex-col items-center gap-2 px-8 py-5 md:px-12 md:py-6 rounded-2xl text-center"
        style={{
          background: `linear-gradient(135deg, ${perMonthCardColor}33, ${perMonthCardColor}15)`,
          border: `2px solid ${perMonthCardColor}`,
          animation: "sp-sim-month-pulse 2.5s ease-in-out infinite",
          maxWidth: "100%",
        }}
      >
        <span
          className="sp-sim-num font-black"
          style={{
            color: perMonthCardColor,
            fontSize: `${perMonthFontSize}px`,
            lineHeight: 1,
            textShadow: `0 0 25px ${perMonthCardColor}99`,
            fontFamily: "inherit",
          }}
        >
          {perMonthDisplay}
        </span>
        <span
          className="font-bold uppercase tracking-wider"
          style={{
            color: perMonthCardColor,
            fontSize: `${Math.max(14, perMonthFontSize * 0.32)}px`,
            fontFamily: "inherit",
            lineHeight: 1.2,
          }}
        >
          {perMonthLabel}
        </span>
      </div>
    </div>
  );

  // Build a single metric card
  const MetricCard = ({ kind }: { kind: "ads" | "mgmt" | "total" }) => {
    const isTotal = kind === "total";
    const color = kind === "ads" ? cardAdsColor : kind === "mgmt" ? cardMgmtColor : cardTotalColor;
    const label = kind === "ads" ? adsLabel : kind === "mgmt" ? mgmtLabel : totalLabel;
    const value = kind === "ads" ? aAds : kind === "mgmt" ? aMgmt : aTotal;
    const subText = isTotal ? "investimento total" : "/mês";
    const Icon = kind === "ads" ? Megaphone : kind === "mgmt" ? Laptop : BadgeDollarSign;
    const glowShadow = cardGlowEnabled
      ? isTotal
        ? `0 0 28px ${color}${glowAlpha}, 0 0 60px ${color}${glowAlphaHalf}`
        : `0 0 18px ${color}${glowAlphaHalf}`
      : "none";

    return (
      <div
        className="sp-sim-card p-5 rounded-2xl text-center relative overflow-hidden"
        style={{
          background: isTotal
            ? `linear-gradient(135deg, ${color}33, ${color}10)`
            : `linear-gradient(135deg, ${color}1a, ${color}05)`,
          border: isTotal ? `2px solid ${color}` : `1px solid ${color}55`,
          boxShadow: glowShadow,
          fontFamily: "inherit",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className="rounded-xl flex items-center justify-center"
            style={{
              background: `${color}33`,
              width: `${iconsSize + 22}px`,
              height: `${iconsSize + 22}px`,
              animation: iconsFloat ? "sp-sim-float 3.4s ease-in-out infinite" : "none",
            }}
          >
            <Icon style={{ color, width: iconsSize, height: iconsSize }} />
          </div>
          <p
            className={`font-black uppercase tracking-wider`}
            style={{ color, fontFamily: "inherit", fontSize: "14px" }}
          >
            {label}
          </p>
        </div>
        <p
          className="sp-sim-num font-black text-center"
          style={{
            color: isTotal ? color : "var(--sp-text)",
            fontFamily: "inherit",
            fontSize: `${metricFontSize}px`,
            lineHeight: 1.1,
          }}
        >
          {fmt(value)}
        </p>
        <p
          className="mt-2 font-bold text-center"
          style={{ color: "var(--sp-muted)", fontFamily: "inherit", fontSize: `${metricSubFontSize}px` }}
        >
          {subText}
        </p>
      </div>
    );
  };

  return (
    <section
      ref={ref}
      id={SIMULATOR_ANCHOR_ID}
      className={`py-20 px-4 transition-all duration-700 scroll-mt-24 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <style>{`
        @keyframes sp-sim-pulse {
          0%, 100% { box-shadow: 0 0 20px ${containerBorder}33, 0 0 40px ${containerBorder}1a; }
          50% { box-shadow: 0 0 35px ${containerBorder}66, 0 0 70px ${containerBorder}33; }
        }
        @keyframes sp-sim-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes sp-sim-arrow {
          0%, 100% { transform: translateY(0); opacity: 0.85; }
          50% { transform: translateY(10px); opacity: 1; }
        }
        @keyframes sp-sim-month-pulse {
          0%, 100% { box-shadow: 0 0 25px ${perMonthCardColor}55, 0 0 50px ${perMonthCardColor}22; transform: scale(1); }
          50% { box-shadow: 0 0 40px ${perMonthCardColor}88, 0 0 80px ${perMonthCardColor}44; transform: scale(1.02); }
        }
        @keyframes sp-sim-total-glow {
          0%, 100% { text-shadow: 0 0 20px ${totalBeforeCtaColor}66, 0 0 40px ${totalBeforeCtaColor}33; }
          50% { text-shadow: 0 0 35px ${totalBeforeCtaColor}99, 0 0 70px ${totalBeforeCtaColor}55; }
        }
        @keyframes sp-sim-bar-rise {
          0% { transform: scaleY(0.6); opacity: 0.5; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes sp-sim-bar-glow {
          0%, 100% { filter: drop-shadow(0 0 4px ${colorHigh}66); }
          50% { filter: drop-shadow(0 0 12px ${colorHigh}cc); }
        }
        @keyframes sp-sim-strip-pulse {
          0%, 100% { box-shadow: 0 0 14px ${stripActiveColor}66, 0 0 28px ${stripActiveColor}33; }
          50% { box-shadow: 0 0 24px ${stripActiveColor}cc, 0 0 48px ${stripActiveColor}66; }
        }
        @keyframes sp-sim-op-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes sp-sim-plan-glow {
          0%, 100% { text-shadow: 0 0 12px ${planNameColor}66, 0 0 24px ${planNameColor}33; }
          50% { text-shadow: 0 0 22px ${planNameColor}cc, 0 0 40px ${planNameColor}66; }
        }
        @keyframes sp-sim-cta-pulse {
          0%, 100% { box-shadow: 0 10px 40px ${ctaPulseColor}${ctaPulseAlphaLo}, 0 0 0 0 ${ctaPulseColor}${ctaPulseAlphaHi}, 0 0 0 2px ${dynColor}; transform: scale(1); }
          50% { box-shadow: 0 16px 60px ${ctaPulseColor}${ctaPulseAlphaHi}, 0 0 0 14px ${ctaPulseColor}00, 0 0 0 2px ${dynColor}; transform: scale(1.025); }
        }
        .sp-sim-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .sp-sim-card:hover { transform: translateY(-4px); }
        .sp-sim-num { font-variant-numeric: tabular-nums; transition: color 0.4s ease; }
      `}</style>

      {/* HEADER */}
      <div className="text-center mb-10 max-w-4xl mx-auto">
        {c.floatingIcons?.simulator && (
          <FloatingSectionIcon config={c.floatingIcons.simulator} />
        )}
        <SectionBadge icon={Calculator} text={c.simulatorBadge || "SIMULADOR"} />
        <h2
          className="font-bold mt-4 leading-tight"
          style={{ fontSize: `clamp(1.75rem, ${(c.simulatorTitleFontSize ?? 48) / 16}vw, ${(c.simulatorTitleFontSize ?? 48) / 16}rem)` }}
        >
          <MultiLineTitle
            sectionKey="simulator"
            fallbackText={c.simulatorTitle || "Monte seu plano em segundos"}
          />
        </h2>
        <div style={{ fontSize: `${subtitleFontSize}px` }}>
          <SectionSubtitleStyled>
            {c.simulatorSubtitle || "Arraste e descubra o investimento ideal pro seu negócio."}
          </SectionSubtitleStyled>
        </div>
        <SectionSubtitle2 sectionKey="simulator" />
      </div>

      {/* SIMULATOR CARD */}
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-3xl p-6 md:p-10 relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: `2px solid ${containerBorder}55`,
            animation: "sp-sim-pulse 3s ease-in-out infinite",
          }}
        >
          {/* SLIDER */}
          <div className="mb-8">
            <p
              className="text-center font-semibold mb-6"
              style={{ color: "var(--sp-text)", fontSize: `${sliderLabelFontSize}px` }}
            >
              {c.simulatorSliderLabel || "Quantos clientes por dia você quer receber no seu WhatsApp?"}
            </p>

            {/* PLANS STRIP — chips with plan names, highlighted on active step */}
            {stripEnabled && plans.some((p) => p.name) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                {plans.map((p, i) => {
                  const isActive = i === safeStep;
                  const color = isActive ? stripActiveColor : stripInactiveColor;
                  return (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className="rounded-full transition-all duration-300 font-bold uppercase tracking-wide"
                      style={{
                        padding: `${Math.max(4, stripFontSize * 0.4)}px ${Math.max(10, stripFontSize * 0.9)}px`,
                        fontSize: `${stripFontSize}px`,
                        color: isActive ? "#fff" : color,
                        background: isActive ? `linear-gradient(135deg, ${color}, ${color}cc)` : `${color}1a`,
                        border: `1.5px solid ${isActive ? color : color + "55"}`,
                        boxShadow: isActive && stripGlow ? `0 0 18px ${color}99, 0 0 36px ${color}55` : "none",
                        animation: isActive && stripPulse ? "sp-sim-strip-pulse 2s ease-in-out infinite" : "none",
                        transform: isActive ? "scale(1.06)" : "scale(1)",
                      }}
                    >
                      {p.name || `Plano ${i + 1}`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* GROWTH BAR CHART (volume crescendo) — modern, animated, follows slider */}
            {growthChartEnabled && (
              <div className="flex items-end justify-between gap-1.5 md:gap-2 h-20 md:h-28 mb-5 px-2">
                {plans.map((_, i) => {
                  const isActive = i <= safeStep;
                  // Smoother curve: combine progressive height + active emphasis
                  const baseHeightPct = 18 + ((i + 1) / plans.length) * 82; // 18% .. 100%
                  const activeBoost = isActive ? 1 : 0.45;
                  const heightPct = baseHeightPct * activeBoost;
                  const isCurrent = i === safeStep;
                  return (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      aria-label={`Plano ${i + 1}`}
                      className="flex-1 rounded-t-xl transition-all duration-500 ease-out hover:opacity-95 relative group"
                      style={{
                        height: `${heightPct}%`,
                        background: isActive
                          ? `linear-gradient(180deg, ${colorHigh} 0%, ${colorHigh}cc 60%, ${colorHigh}88 100%)`
                          : `linear-gradient(180deg, ${colorHigh}22 0%, ${colorHigh}10 100%)`,
                        boxShadow: isActive
                          ? isCurrent
                            ? `0 0 18px ${colorHigh}cc, 0 -4px 0 ${colorHigh} inset, 0 0 0 2px ${colorHigh}aa`
                            : `0 0 10px ${colorHigh}66, 0 -3px 0 ${colorHigh} inset`
                          : "none",
                        border: `1px solid ${isActive ? colorHigh : colorHigh + "33"}`,
                        transformOrigin: "bottom",
                        animation: isCurrent ? "sp-sim-bar-glow 1.6s ease-in-out infinite" : undefined,
                      }}
                    >
                      {/* Tip arrow when active */}
                      {isActive && (
                        <span
                          className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                          style={{
                            background: colorHigh,
                            boxShadow: `0 0 8px ${colorHigh}, 0 0 16px ${colorHigh}88`,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-2">
              <Slider
                value={[safeStep]}
                onValueChange={(v) => setStep(v[0] ?? 0)}
                min={0}
                max={maxStep}
                step={1}
                className="[&_[role=slider]]:h-7 [&_[role=slider]]:w-7 [&_[role=slider]]:border-[3px]"
                style={{
                  ["--sim-color" as any]: dynColor,
                }}
              />
              {/* Min/Max markers only */}
              <div className="flex justify-between mt-3 px-1">
                <button
                  onClick={() => setStep(0)}
                  className="text-sm md:text-base font-mono transition-all"
                  style={{
                    color: safeStep === 0 ? dynColor : "var(--sp-muted)",
                    fontWeight: safeStep === 0 ? 700 : 500,
                    transform: safeStep === 0 ? "scale(1.3)" : "scale(1)",
                  }}
                >
                  {plans[0]?.perDay ?? 1}
                </button>
                <button
                  onClick={() => setStep(maxStep)}
                  className="text-sm md:text-base font-mono transition-all"
                  style={{
                    color: safeStep === maxStep ? dynColor : "var(--sp-muted)",
                    fontWeight: safeStep === maxStep ? 700 : 500,
                    transform: safeStep === maxStep ? "scale(1.3)" : "scale(1)",
                  }}
                >
                  {plans[maxStep]?.perDay ?? 8}
                </button>
              </div>
            </div>

            {/* PER MONTH first (big, attention grabbing), then per-day */}
            {perMonthShowFirst ? (
              <>
                {PerMonthBlock}
                {PerDayBlock}
              </>
            ) : (
              <>
                {PerDayBlock}
                {PerMonthBlock}
              </>
            )}
          </div>

          {/* METRIC CARDS — order configurable via cardOrder, with operator separators */}
          <div
            className={`mb-8 ${operatorsEnabled ? "flex flex-col md:flex-row items-stretch md:items-stretch justify-center gap-3 md:gap-2" : "grid grid-cols-1 md:grid-cols-3 gap-4"}`}
          >
            {cardOrder.map((kind, i) => {
              const isLast = i === cardOrder.length - 1;
              const isTotal = kind === "total";
              const opColor = isTotal ? opEqColor : opPlusColor;
              const OpIcon = isTotal ? EqualIcon : PlusIcon;
              return (
                <Fragment key={kind}>
                  {operatorsEnabled ? (
                    <div className="flex-1 min-w-0 flex">
                      <div className="w-full"><MetricCard kind={kind as any} /></div>
                    </div>
                  ) : (
                    <MetricCard kind={kind as any} />
                  )}
                  {operatorsEnabled && !isLast && (
                    <div
                      className="flex items-center justify-center shrink-0 self-center"
                      style={{ animation: "sp-sim-op-pulse 2.4s ease-in-out infinite" }}
                      aria-hidden
                    >
                      <OpIcon
                        style={{
                          width: opSize,
                          height: opSize,
                          color: opColor,
                          filter: `drop-shadow(0 0 10px ${opColor}aa)`,
                          strokeWidth: 3,
                        }}
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* MICROCOPY */}
          <div
            className="text-center p-4 rounded-xl mb-6 transition-colors duration-500"
            style={{
              background: `${dynColor}10`,
              border: `1px dashed ${dynColor}55`,
            }}
          >
            <p className="font-semibold" style={{ color: dynColor, fontSize: `${microcopyFontSize}px` }}>
              <RichOrPlain html={microHtml} plain={microPlain} />
            </p>
          </div>

          {/* IMPACT BLOCK */}
          <div className="text-center mb-6">
            <p
              className="font-bold leading-relaxed"
              style={{ color: "var(--sp-text)", fontSize: `${impactFontSize}px` }}
            >
              <RichOrPlain html={impactHtml} plain={impact} />
            </p>
          </div>

          {/* TOTAL BEFORE CTA */}
          {showTotalBeforeCta && (
            <div className="text-center mb-6">
              <p className="text-sm md:text-base font-semibold mb-2" style={{ color: "var(--sp-muted)" }}>
                {totalBeforeCtaLabel}
              </p>
              <p
                className="sp-sim-num font-black"
                style={{
                  color: totalBeforeCtaColor,
                  fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
                  lineHeight: 1,
                  animation: "sp-sim-total-glow 2.5s ease-in-out infinite",
                }}
              >
                {fmt(aTotal)}
              </p>
            </div>
          )}

          {/* PLAN NAME (between total and CTA) */}
          {planNameEnabled && plan.name && (
            <div className="text-center mb-5">
              <p
                style={{
                  color: planNameColor,
                  fontSize: `${planNameFontSize}px`,
                  fontWeight: planNameBold ? 900 : 600,
                  textTransform: planNameUppercase ? "uppercase" : "none",
                  letterSpacing: planNameUppercase ? "0.08em" : "normal",
                  lineHeight: 1.2,
                  animation: planNameGlow ? "sp-sim-plan-glow 2.4s ease-in-out infinite" : "none",
                  fontFamily: "inherit",
                }}
              >
                {plan.name}
              </p>
            </div>
          )}

          <div className={ctaCenter ? "flex justify-center" : (ctaFullWidth ? "" : "text-center")}>
            <a
              href={ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick(`simulator-cta-${plan.perDay}`, ctaLabel)}
              className={`inline-flex items-center justify-center gap-3 ${
                ctaFullWidth && !ctaCenter ? "w-full px-6 py-6" : "px-7 py-4"
              } rounded-2xl font-black transition-all hover:scale-[1.02]`}
              style={{
                background: `linear-gradient(135deg, ${dynColor}, ${dynColor}cc)`,
                color: ctaTextColor,
                boxShadow: `0 10px 40px ${dynColor}88, 0 0 0 2px ${dynColor}`,
                fontSize: `${ctaFontSize}px`,
                fontFamily: "inherit",
                animation: ctaPulseEnabled ? `sp-sim-cta-pulse ${ctaPulseSpeed}s ease-in-out infinite` : undefined,
                width: ctaFullWidth && !ctaCenter ? "100%" : undefined,
              }}
            >
              <Sparkles className="shrink-0" style={{ width: ctaFontSize * 1.1, height: ctaFontSize * 1.1 }} />
              {ctaLabel}
            </a>
          </div>

          {/* DISCLAIMER */}
          <p
            className="text-center mt-6 italic whitespace-pre-line"
            style={{ color: "var(--sp-muted)", fontSize: `${disclaimerFontSize}px` }}
          >
            {c.simulatorDisclaimer ||
              "Os valores são estimativas conservadoras.\nNa prática, o custo por cliente pode ser menor."}
          </p>
        </div>

        {/* EXTRA WHATSAPP WIDGET (banner with photo) before "Agora você decide:" */}
        {c.simulatorWidgetExtraEnabled !== false && c.whatsappCtaAvatarUrl && (
          <div className="mt-10">
            <style>{buildWcaStyles("wca-sim-extra")}</style>
            <div className="flex flex-col items-center px-4 gap-3">
              <WhatsAppCtaBanner
                config={c}
                animPrefix="wca-sim-extra"
                onClick={() => {
                  trackClick("simulator-extra-wa", "Simulator Extra WhatsApp");
                  window.open(ctaLink, "_blank");
                }}
              />
            </div>
          </div>
        )}

        {/* TRANSITION TEXT + ARROW */}
        <div className="text-center mt-12">
          <p
            className="font-bold mb-3"
            style={{ color: "var(--sp-text)", fontSize: `${transitionFontSize}px` }}
          >
            {transitionText}
          </p>
          <div className="flex justify-center" style={{ animation: "sp-sim-arrow 1.6s ease-in-out infinite" }}>
            <ChevronDown
              style={{ width: arrowSize, height: arrowSize, color: accent, filter: `drop-shadow(0 0 12px ${accent}88)` }}
            />
          </div>
        </div>
      </div>

      <SectionClosingPhrase sectionKey="simulator" />
    </section>
  );
}
