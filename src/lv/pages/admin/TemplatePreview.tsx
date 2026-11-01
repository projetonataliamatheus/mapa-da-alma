// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "@/lv/shims/router";
import { Monitor, Tablet, Smartphone, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/lv/integrations/supabase/client";
import { getTheme, colorThemes } from "@/lv/lib/colorThemes";
import SitesLayout from "@/lv/components/quote/SitesLayout";
import EcommerceLayout from "@/lv/components/quote/EcommerceLayout";
import SystemsLayout from "@/lv/components/quote/SystemsLayout";
import DetailedLayout from "@/lv/components/quote/DetailedLayout";
import SimpleLayout from "@/lv/components/quote/SimpleLayout";
import { getServiceTypeMeta } from "@/lv/lib/serviceTypes";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_META: Record<Device, { label: string; width: number; icon: any }> = {
  desktop: { label: "Desktop", width: 1280, icon: Monitor },
  tablet: { label: "Tablet", width: 820, icon: Tablet },
  mobile: { label: "Mobile", width: 390, icon: Smartphone },
};

const SAMPLE_QUOTE = {
  id: "preview",
  client_name: "Nome do Cliente",
  client_business_type: "Consultório Odontológico",
  city: "Piracicaba",
  slug: "preview",
  subtitle: "",
  color_theme: "gold-dark",
  layout_type: "detailed",
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
  gender: "masc",
  ticket_medio: "R$ 500",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "",
} as any;

export default function TemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const [device, setDevice] = useState<Device>((params.get("device") as Device) || "desktop");
  const [themeId, setThemeId] = useState<string>(params.get("theme") || "gold-dark");
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from("quote_templates").select("*").eq("id", id).maybeSingle();
      setTemplate(data);
      setLoading(false);
      document.title = `Preview · ${(data as any)?.name || "Modelo"}`;
    })();
  }, [id]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("device", device);
    next.set("theme", themeId);
    setParams(next, { replace: true });
  }, [device, themeId]);

  const serviceType = (template?.service_type || "trafego_pago") as string;
  const serviceMeta = getServiceTypeMeta(serviceType as any);
  const theme = getTheme(themeId);
  const previewQuote = useMemo(
    () => ({ ...SAMPLE_QUOTE, service_type: serviceType, color_theme: themeId }),
    [serviceType, themeId],
  );

  const frameWidth = DEVICE_META[device].width;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-300">
        <Loader2 className="h-6 w-6 animate-spin mr-3" /> Carregando modelo…
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-300">
        Modelo não encontrado.
      </div>
    );
  }

  const isDetailed = template.slug === "detailed" || !!template.sections?.howwework_title;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Preview · {template.name}</p>
            <p className="text-[11px] text-neutral-400 truncate">{serviceMeta.label} · Visualização apenas leitura</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-800/70 p-1 rounded-xl border border-neutral-700">
              {(Object.keys(DEVICE_META) as Device[]).map((d) => {
                const Icon = DEVICE_META[d].icon;
                const active = device === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active ? "bg-white text-neutral-900 shadow" : "text-neutral-300 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {DEVICE_META[d].label}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-1 pl-2 border-l border-neutral-700">
              {colorThemes.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setThemeId(ct.id)}
                  title={ct.name}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    themeId === ct.id ? "border-white scale-125" : "border-transparent hover:scale-110"
                  }`}
                  style={{ background: ct.accent }}
                />
              ))}
            </div>

            <button
              onClick={() => window.close()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all"
              title="Fechar aba"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Device frame */}
      <div className="flex-1 flex justify-center p-6">
        <div
          className="rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-neutral-800 bg-neutral-900 transition-[width] duration-300"
          style={{ width: `min(100%, ${frameWidth}px)` }}
        >
          <div
            style={{
              background: theme.bg,
              color: theme.text,
              "--q-bg": theme.bg,
              "--q-bg2": theme.bgSecondary,
              "--q-accent": theme.accent,
              "--q-accent-fg": theme.accentFg,
              "--q-text": theme.text,
              "--q-text-muted": theme.textMuted,
              "--q-card": theme.card,
              "--q-card-border": theme.cardBorder,
            } as React.CSSProperties}
          >
            <style>{`.animate-on-scroll{opacity:1 !important;transform:none !important;}`}</style>
            {serviceType === "sites_paginas" ? (
              <SitesLayout quote={previewQuote} theme={theme} />
            ) : serviceType === "loja_virtual" ? (
              <EcommerceLayout quote={previewQuote} theme={theme} />
            ) : serviceType === "sistemas_app" ? (
              <SystemsLayout quote={previewQuote} theme={theme} />
            ) : isDetailed ? (
              <DetailedLayout
                quote={previewQuote}
                theme={theme}
                templateOverride={template.sections}
                heroImageOverride={template.hero_image_url}
                heroEmojiOverride={template.hero_emoji}
                sectionOrder={template.sections?.section_order}
              />
            ) : (
              <SimpleLayout
                quote={previewQuote}
                theme={theme}
                templateOverride={template.sections}
                heroImageOverride={template.hero_image_url}
                heroEmojiOverride={template.hero_emoji}
                sectionOrder={template.sections?.section_order}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
