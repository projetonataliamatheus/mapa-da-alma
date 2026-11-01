// @ts-nocheck
"use client";
import { pwMatch } from "@/lv/lib/pwMatch";
import { useEffect, useState } from "react";
import { useParams } from "@/lv/shims/router";
import { supabase } from "@/lv/integrations/supabase/client";
import { getTheme, type ColorTheme } from "@/lv/lib/colorThemes";
import type { Tables } from "@/lv/integrations/supabase/types";
import { Lock } from "lucide-react";
import MatrixRain from "@/lv/components/sales-page/MatrixRain";
import { WhatsAppCtaBanner, buildStyles as buildWaStyles } from "@/lv/components/sales-page/WhatsAppCtaWidget";
import ThemeSwitcher from "@/lv/components/quote/ThemeSwitcher";
import SimpleLayout from "@/lv/components/quote/SimpleLayout";
import DetailedLayout from "@/lv/components/quote/DetailedLayout";
import SitesLayout from "@/lv/components/quote/SitesLayout";
import EcommerceLayout from "@/lv/components/quote/EcommerceLayout";
import SystemsLayout from "@/lv/components/quote/SystemsLayout";
import type { SectionDefinition } from "@/lv/lib/sectionTypes";
import { SIMPLE_BUILTIN_SECTIONS, DETAILED_BUILTIN_SECTIONS } from "@/lv/lib/sectionTypes";
import "./QuotePage.css";

const QuotePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quote, setQuote] = useState<Tables<"quotes"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ColorTheme | null>(null);
  const [showMatrixOpening, setShowMatrixOpening] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<SectionDefinition[] | undefined>(undefined);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!slug) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("*")
          .eq("slug", slug)
          .single();
        if (error) console.error("Quote fetch error:", error);
        setQuote(data);
        if (data?.password) {
          setLocked(true);
        } else if (data) {
          trackView(slug);
        }
      } catch (err) {
        console.error("Quote fetch exception:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [slug]);

  const trackView = (quoteSlug: string) => {
    // Dedup por dispositivo + classificação Interno/Externo no servidor.
    import("@/lv/lib/viewTracker").then(({ trackView: track }) => track("quote", quoteSlug));
  };

  // Fetch section order from template
  useEffect(() => {
    if (!quote) return;
    const layoutType = (quote as any).layout_type || "simple";
    const templateSlug = layoutType === "detailed" ? "detailed" : "simple";
    const svc = (quote as any).service_type || "trafego_pago";
    (supabase.from("quote_templates").select("sections").eq("slug", templateSlug).eq("is_active", true) as any).eq("service_type", svc).limit(1).maybeSingle()
      .then(async ({ data }: any) => {
        let sections = data?.sections?.section_order;
        if (!sections) {
          const { data: fb } = await supabase.from("quote_templates").select("sections").eq("slug", templateSlug).eq("is_active", true).limit(1).maybeSingle();
          sections = (fb as any)?.sections?.section_order;
        }
        if (sections) setSectionOrder(sections as SectionDefinition[]);
        else setSectionOrder(layoutType === "detailed" ? DETAILED_BUILTIN_SECTIONS : SIMPLE_BUILTIN_SECTIONS);
      });

  }, [quote]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("animate-visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".animate-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [quote]);

  if (loading) {
    return (
      <div className="quote-page flex min-h-screen items-center justify-center">
        <p className="text-foreground">Carregando orçamento...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="quote-page flex min-h-screen items-center justify-center">
        <p className="text-foreground">Orçamento não encontrado.</p>
      </div>
    );
  }

  const theme = activeTheme || getTheme(quote.color_theme);
  const rawAvailableColors = Array.isArray((quote as any).available_colors) ? (quote as any).available_colors as string[] : [];
  const availableColors = rawAvailableColors.length > 0 && !rawAvailableColors.includes(quote.color_theme)
    ? [quote.color_theme, ...rawAvailableColors]
    : rawAvailableColors;
  const layoutType = (quote as any).layout_type || "simple";

  // Matrix settings
  const matrixEnabled = (quote as any).matrix_enabled ?? false;
  const matrixEffect = (quote as any).matrix_effect || "converge";
  const matrixDuration = (quote as any).matrix_duration || 2000;
  const matrixColor = (quote as any).matrix_color || "#00ff41";
  const matrixText = (quote as any).matrix_text || quote.client_name || "";

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await pwMatch(passwordInput, quote.password)) {
      setLocked(false);
      setPasswordError(false);
      if (slug) trackView(slug);
      // Trigger matrix opening if enabled
      if (matrixEnabled) {
        setShowMatrixOpening(true);
      }
    } else {
      setPasswordError(true);
    }
  };

  return (
    <div
      className="quote-page"
      style={{
        "--q-bg": theme.bg, "--q-bg2": theme.bgSecondary, "--q-accent": theme.accent,
        "--q-accent-fg": theme.accentFg, "--q-text": theme.text, "--q-text-muted": theme.textMuted,
        "--q-card": theme.card, "--q-card-border": theme.cardBorder,
      } as React.CSSProperties}
    >
      {/* Matrix Opening Effect */}
      {showMatrixOpening && (
        <div className="fixed inset-0 z-[9999]">
          <MatrixRain
            duration={matrixDuration}
            accentColor={matrixColor}
            customText={matrixText}
            effect={matrixEffect as any}
            onComplete={() => setShowMatrixOpening(false)}
          />
        </div>
      )}

      {/* Password overlay */}
      {locked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: theme.bg + "f2" }}>
          <form onSubmit={handleUnlock} className="flex flex-col items-center gap-6 p-8 rounded-2xl border max-w-sm w-full mx-4" style={{ background: theme.card, borderColor: theme.cardBorder }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: theme.accent + "22" }}>
              <Lock className="w-8 h-8" style={{ color: theme.accent }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>Orçamento Protegido</h2>
              <p className="text-sm" style={{ color: theme.textMuted }}>Digite a senha para visualizar este orçamento.</p>
            </div>
            <input type="password" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              placeholder="Digite a senha" className="w-full px-4 py-3 rounded-lg border text-center text-lg outline-none"
              style={{ background: theme.bg, borderColor: passwordError ? "#ef4444" : theme.cardBorder, color: theme.text }} autoFocus />
            {passwordError && <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Senha incorreta.</p>}
            <button type="submit" className="w-full py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform" style={{ background: theme.accent, color: theme.accentFg }}>Desbloquear</button>
          </form>
        </div>
      )}

      <main className={`min-h-screen ${locked ? "blur-lg select-none pointer-events-none" : ""}`} style={{ background: "var(--q-bg)", color: "var(--q-text)" }}>
        {(() => {
          const svc = (quote as any).service_type || "trafego_pago";
          if (svc === "sites_paginas") return <SitesLayout quote={quote} theme={theme} />;
          if (svc === "loja_virtual") return <EcommerceLayout quote={quote} theme={theme} />;
          if (svc === "sistemas_app") return <SystemsLayout quote={quote} theme={theme} />;
          if (layoutType === "detailed") return <DetailedLayout quote={quote} theme={theme} sectionOrder={sectionOrder} />;
          return <SimpleLayout quote={quote} theme={theme} sectionOrder={sectionOrder} />;
        })()}
      </main>

      {!locked && (
        <ThemeSwitcher currentTheme={theme} onThemeChange={setActiveTheme} availableThemeIds={availableColors} />
      )}

      {/* WhatsApp Widget */}
      {!locked && (() => {
        const wc = (quote as any).whatsapp_widget_config || {};
        if (wc.enabled && wc.whatsappNumber) {
          return (
            <>
              <style>{buildWaStyles("qt-wca")}</style>
              <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)]">
                <WhatsAppCtaBanner
                  config={wc}
                  animPrefix="qt-wca"
                  onClick={() => window.open(`https://wa.me/${wc.whatsappNumber}`, "_blank")}
                />
              </div>
            </>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default QuotePage;
