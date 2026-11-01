// @ts-nocheck
"use client";
/**
 * Botões de importação de configurações da Página de Vendas e 
 * gerenciamento de padrões para Matrix e WhatsApp Widget.
 */
import { useState } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { Button } from "@/lv/components/ui/button";
import { Card, CardContent } from "@/lv/components/ui/card";
import { Download, Save, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MatrixConfig } from "./MatrixEffectSettings";
import { defaultMatrixConfig } from "./MatrixEffectSettings";
import type { WhatsAppWidgetConfig } from "./WhatsAppWidgetSettings";
import { defaultWhatsAppWidgetConfig } from "./WhatsAppWidgetSettings";

type ConfigType = "matrix" | "whatsapp";
type ModuleType = "quote" | "report";

async function fetchSalesPageConfig(): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from("sales_page_config")
    .select("config")
    .eq("id", "default")
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).config as Record<string, any>;
}

function salesConfigToMatrix(sp: Record<string, any>): MatrixConfig {
  return {
    ...defaultMatrixConfig,
    enabled: true,
    effect: sp.matrixEffect || "converge",
    duration: sp.matrixTransitionDuration || 2000,
    color: sp.accentColor || "#00ff41",
    text: sp.matrixText || "",
    fontSize: 48,
    fontFamily: "JetBrains Mono",
    line1Text: sp.matrixText?.split?.(" ")?.slice(0, 2)?.join(" ") || "",
    line1Color: "#FFFFFF",
    line1ColorMode: "auto",
    line2Text: sp.matrixText?.split?.(" ")?.slice(2)?.join(" ") || "",
    line2Color: sp.accentColor || "#00ff41",
    line2ColorMode: "auto",
    speed: sp.matrixCharSpeed || 50,
    density: 30,
    fadeSpeed: 50,
    glowIntensity: 40,
    charSet: "matrix",
  };
}

function salesConfigToWhatsApp(sp: Record<string, any>): WhatsAppWidgetConfig {
  return {
    ...defaultWhatsAppWidgetConfig,
    enabled: true,
    whatsappNumber: sp.whatsappLink?.match?.(/\d+/)?.[0] || "",
    whatsappCtaAvatarUrl: sp.whatsappCtaAvatarUrl || "",
    whatsappCtaAvatarSize: sp.whatsappCtaAvatarSize || 72,
    whatsappCtaIconSize: sp.whatsappCtaIconSize || 44,
    whatsappCtaTitle1: sp.whatsappCtaTitle1 || "ATENDIMENTO",
    whatsappCtaTitle2: sp.whatsappCtaTitle2 || "WHATSAPP",
    whatsappCtaBtnText: sp.whatsappCtaBtnText || "Clique Aqui Agora",
    whatsappCtaTextAlign: sp.whatsappCtaTextAlign || "left",
    whatsappCtaTitle1Size: sp.whatsappCtaTitle1Size || 18,
    whatsappCtaTitle1Color: sp.whatsappCtaTitle1Color || "#FFFFFF",
    whatsappCtaTitle1Font: sp.whatsappCtaTitle1Font || "Poppins",
    whatsappCtaTitle1Bold: sp.whatsappCtaTitle1Bold ?? true,
    whatsappCtaTitle1Italic: sp.whatsappCtaTitle1Italic ?? false,
    whatsappCtaTitle1LetterSpacing: sp.whatsappCtaTitle1LetterSpacing ?? 1,
    whatsappCtaTitle1LineHeight: sp.whatsappCtaTitle1LineHeight ?? 1.1,
    whatsappCtaTitle2Size: sp.whatsappCtaTitle2Size || 26,
    whatsappCtaTitle2Gradient1: sp.whatsappCtaTitle2Gradient1 || "#25D366",
    whatsappCtaTitle2Gradient2: sp.whatsappCtaTitle2Gradient2 || "#0AE85E",
    whatsappCtaTitle2Font: sp.whatsappCtaTitle2Font || "Poppins",
    whatsappCtaTitle2Bold: sp.whatsappCtaTitle2Bold ?? true,
    whatsappCtaTitle2Italic: sp.whatsappCtaTitle2Italic ?? false,
    whatsappCtaTitle2LetterSpacing: sp.whatsappCtaTitle2LetterSpacing ?? 2,
    whatsappCtaTitle2LineHeight: sp.whatsappCtaTitle2LineHeight ?? 1.1,
    whatsappCtaBtnSize: sp.whatsappCtaBtnSize || 14,
    whatsappCtaBtnColor: sp.whatsappCtaBtnColor || "#FFFFFF",
    whatsappCtaBtnGradient1: sp.whatsappCtaBtnGradient1 || "#25D366",
    whatsappCtaBtnGradient2: sp.whatsappCtaBtnGradient2 || "#0AE85E",
    whatsappCtaBtnFont: sp.whatsappCtaBtnFont || "Poppins",
    whatsappCtaBtnBold: sp.whatsappCtaBtnBold ?? true,
    whatsappCtaBtnItalic: sp.whatsappCtaBtnItalic ?? false,
    whatsappCtaBtnLetterSpacing: sp.whatsappCtaBtnLetterSpacing ?? 0,
    whatsappCtaBtnLineHeight: sp.whatsappCtaBtnLineHeight ?? 1.2,
    whatsappCta3D: sp.whatsappCta3D ?? true,
    whatsappCtaBtnBlink: sp.whatsappCtaBtnBlink ?? false,
    whatsappCtaBtnBlinkSpeed: sp.whatsappCtaBtnBlinkSpeed ?? 2,
    whatsappCtaIconShake: sp.whatsappCtaIconShake ?? false,
    whatsappCtaIconShakeSpeed: sp.whatsappCtaIconShakeSpeed ?? 2,
    whatsappCtaNeonBorder: sp.whatsappCtaNeonBorder ?? false,
    whatsappCtaNeonSpeed: sp.whatsappCtaNeonSpeed ?? 2,
    whatsappCtaGlobalEffect: sp.whatsappCtaGlobalEffect || "none",
    whatsappCtaGlobalEffectSpeed: sp.whatsappCtaGlobalEffectSpeed ?? 2,
    whatsappCtaScanlines: sp.whatsappCtaScanlines ?? false,
    whatsappCtaScanlineThickness: sp.whatsappCtaScanlineThickness ?? 2,
    whatsappCtaScanlineOpacity: sp.whatsappCtaScanlineOpacity ?? 0.15,
    whatsappCtaScanlineSpeed: sp.whatsappCtaScanlineSpeed ?? 3,
    whatsappCtaScanlineColor: sp.whatsappCtaScanlineColor || "#00ff41",
    whatsappCtaHackerGlow: sp.whatsappCtaHackerGlow ?? false,
    whatsappCtaHackerGlowColor: sp.whatsappCtaHackerGlowColor || "#25D366",
    whatsappCtaHackerGlowIntensity: sp.whatsappCtaHackerGlowIntensity ?? 5,
    whatsappCtaHackerGlowSpeed: sp.whatsappCtaHackerGlowSpeed ?? 2,
    whatsappCtaPhraseEnabled: sp.whatsappCtaPhraseEnabled ?? false,
    whatsappCtaPhraseText: sp.whatsappCtaPhraseText || "",
    whatsappCtaPhraseSize: sp.whatsappCtaPhraseSize ?? 16,
    whatsappCtaPhraseColor: sp.whatsappCtaPhraseColor || "#FFFFFF",
    whatsappCtaPhraseFont: sp.whatsappCtaPhraseFont || "Poppins",
    whatsappCtaPhraseBold: sp.whatsappCtaPhraseBold ?? false,
    whatsappCtaPhraseItalic: sp.whatsappCtaPhraseItalic ?? false,
    whatsappCtaPhraseAlign: sp.whatsappCtaPhraseAlign || "center",
    whatsappCtaPhraseLetterSpacing: sp.whatsappCtaPhraseLetterSpacing ?? 0,
    whatsappCtaPhraseLineHeight: sp.whatsappCtaPhraseLineHeight ?? 1.4,
    whatsappCtaMarginBottom: sp.whatsappCtaMarginBottom ?? 0,
  };
}

// Default configs stored in sales_page_config table with special IDs
const DEFAULT_CONFIG_IDS = {
  quote: { matrix: "quote-matrix-defaults", whatsapp: "quote-whatsapp-defaults" },
  report: { matrix: "report-matrix-defaults", whatsapp: "report-whatsapp-defaults" },
};

export async function loadDefaultConfig(module: ModuleType, type: ConfigType): Promise<any | null> {
  const configId = DEFAULT_CONFIG_IDS[module][type];
  const { data } = await supabase
    .from("sales_page_config")
    .select("config")
    .eq("id", configId)
    .maybeSingle();
  if (data && (data as any).config) return (data as any).config;
  return null;
}

async function saveDefaultConfig(module: ModuleType, type: ConfigType, config: any): Promise<boolean> {
  const configId = DEFAULT_CONFIG_IDS[module][type];
  const { error } = await supabase
    .from("sales_page_config")
    .upsert({ id: configId, config: config as any, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
  return !error;
}

// ─── Import from Sales Page Button ───
interface ImportFromSalesProps {
  type: ConfigType;
  onImportMatrix?: (config: MatrixConfig) => void;
  onImportWhatsApp?: (config: WhatsAppWidgetConfig) => void;
}

export function ImportFromSalesButton({ type, onImportMatrix, onImportWhatsApp }: ImportFromSalesProps) {
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    const sp = await fetchSalesPageConfig();
    if (!sp) {
      toast.error("Não foi possível carregar as configurações da Página de Vendas.");
      setLoading(false);
      return;
    }
    if (type === "matrix" && onImportMatrix) {
      onImportMatrix(salesConfigToMatrix(sp));
      toast.success("Configurações Matrix importadas da Página de Vendas!");
    }
    if (type === "whatsapp" && onImportWhatsApp) {
      onImportWhatsApp(salesConfigToWhatsApp(sp));
      toast.success("Configurações WhatsApp importadas da Página de Vendas!");
    }
    setLoading(false);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleImport} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Importar da Página de Vendas
    </Button>
  );
}

// ─── Save as Default Button ───
interface SaveAsDefaultProps {
  type: ConfigType;
  module: ModuleType;
  currentConfig: MatrixConfig | WhatsAppWidgetConfig;
}

export function SaveAsDefaultButton({ type, module, currentConfig }: SaveAsDefaultProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const ok = await saveDefaultConfig(module, type, currentConfig);
    setLoading(false);
    if (ok) {
      setSaved(true);
      const label = type === "matrix" ? "Matrix" : "WhatsApp";
      const modLabel = module === "quote" ? "orçamentos" : "relatórios";
      toast.success(`Configurações ${label} salvas como padrão para novos ${modLabel}!`);
      setTimeout(() => setSaved(false), 3000);
    } else {
      toast.error("Erro ao salvar configurações padrão.");
    }
  };

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleSave} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      {saved ? "Salvo como padrão!" : "Salvar como padrão"}
    </Button>
  );
}

// ─── Combined Action Bar ───
interface ConfigActionBarProps {
  type: ConfigType;
  module: ModuleType;
  matrixConfig?: MatrixConfig;
  whatsappConfig?: WhatsAppWidgetConfig;
  onImportMatrix?: (config: MatrixConfig) => void;
  onImportWhatsApp?: (config: WhatsAppWidgetConfig) => void;
}

export default function ConfigActionBar({ type, module, matrixConfig, whatsappConfig, onImportMatrix, onImportWhatsApp }: ConfigActionBarProps) {
  const currentConfig = type === "matrix" ? matrixConfig : whatsappConfig;
  const label = type === "matrix" ? "Matrix" : "WhatsApp";

  return (
    <Card className="mb-4 border-dashed border-primary/30 bg-muted/30">
      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium mr-auto">
          ⚡ Ações rápidas — {label}
        </span>
        <ImportFromSalesButton
          type={type}
          onImportMatrix={onImportMatrix}
          onImportWhatsApp={onImportWhatsApp}
        />
        {currentConfig && (
          <SaveAsDefaultButton type={type} module={module} currentConfig={currentConfig} />
        )}
      </CardContent>
    </Card>
  );
}
