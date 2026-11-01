// @ts-nocheck
"use client";
/**
 * Shared WhatsApp CTA Widget settings for Reports and Quotes admin.
 * 100% faithful to the Sales Page WhatsApp CTA settings.
 */
import { useState } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Switch } from "@/lv/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lv/components/ui/card";
import { Upload, Trash2, Smartphone, Eye, MessageCircle, Palette, Sparkles, Zap, Monitor, Ruler } from "lucide-react";
import { WhatsAppCtaBanner, buildStyles } from "@/lv/components/sales-page/WhatsAppCtaWidget";
import { toast } from "sonner";

const FONT_OPTIONS = [
  "Poppins", "JetBrains Mono", "Inter", "Roboto", "Montserrat", "Oswald", "Bebas Neue",
  "Raleway", "Playfair Display", "Lato", "Open Sans", "Anton", "Bangers", "Permanent Marker",
  "Nunito", "Quicksand", "Rubik", "Outfit", "Space Grotesk", "Lexend", "Kanit", "Teko",
];

export interface WhatsAppWidgetConfig {
  enabled: boolean;
  whatsappNumber: string;
  whatsappCtaAvatarUrl: string;
  whatsappCtaAvatarSize: number;
  whatsappCtaIconSize: number;
  whatsappCtaTitle1: string;
  whatsappCtaTitle2: string;
  whatsappCtaBtnText: string;
  whatsappCtaTextAlign: string;
  whatsappCtaTitle1Size: number;
  whatsappCtaTitle1Color: string;
  whatsappCtaTitle1Font: string;
  whatsappCtaTitle1Bold: boolean;
  whatsappCtaTitle1Italic: boolean;
  whatsappCtaTitle1LetterSpacing: number;
  whatsappCtaTitle1LineHeight: number;
  whatsappCtaTitle2Size: number;
  whatsappCtaTitle2Gradient1: string;
  whatsappCtaTitle2Gradient2: string;
  whatsappCtaTitle2Font: string;
  whatsappCtaTitle2Bold: boolean;
  whatsappCtaTitle2Italic: boolean;
  whatsappCtaTitle2LetterSpacing: number;
  whatsappCtaTitle2LineHeight: number;
  whatsappCtaBtnSize: number;
  whatsappCtaBtnColor: string;
  whatsappCtaBtnGradient1: string;
  whatsappCtaBtnGradient2: string;
  whatsappCtaBtnFont: string;
  whatsappCtaBtnBold: boolean;
  whatsappCtaBtnItalic: boolean;
  whatsappCtaBtnLetterSpacing: number;
  whatsappCtaBtnLineHeight: number;
  whatsappCta3D: boolean;
  whatsappCtaBtnBlink: boolean;
  whatsappCtaBtnBlinkSpeed: number;
  whatsappCtaIconShake: boolean;
  whatsappCtaIconShakeSpeed: number;
  whatsappCtaNeonBorder: boolean;
  whatsappCtaNeonSpeed: number;
  whatsappCtaGlobalEffect: string;
  whatsappCtaGlobalEffectSpeed: number;
  whatsappCtaScanlines: boolean;
  whatsappCtaScanlineThickness: number;
  whatsappCtaScanlineOpacity: number;
  whatsappCtaScanlineSpeed: number;
  whatsappCtaScanlineColor: string;
  whatsappCtaHackerGlow: boolean;
  whatsappCtaHackerGlowColor: string;
  whatsappCtaHackerGlowIntensity: number;
  whatsappCtaHackerGlowSpeed: number;
  whatsappCtaPhraseEnabled: boolean;
  whatsappCtaPhraseText: string;
  whatsappCtaPhraseSize: number;
  whatsappCtaPhraseColor: string;
  whatsappCtaPhraseFont: string;
  whatsappCtaPhraseBold: boolean;
  whatsappCtaPhraseItalic: boolean;
  whatsappCtaPhraseAlign: string;
  whatsappCtaPhraseLetterSpacing: number;
  whatsappCtaPhraseLineHeight: number;
  whatsappCtaMarginBottom: number;
}

export const defaultWhatsAppWidgetConfig: WhatsAppWidgetConfig = {
  enabled: false,
  whatsappNumber: "",
  whatsappCtaAvatarUrl: "",
  whatsappCtaAvatarSize: 72,
  whatsappCtaIconSize: 44,
  whatsappCtaTitle1: "ATENDIMENTO",
  whatsappCtaTitle2: "WHATSAPP",
  whatsappCtaBtnText: "Clique Aqui Agora",
  whatsappCtaTextAlign: "left",
  whatsappCtaTitle1Size: 18,
  whatsappCtaTitle1Color: "#FFFFFF",
  whatsappCtaTitle1Font: "Poppins",
  whatsappCtaTitle1Bold: true,
  whatsappCtaTitle1Italic: false,
  whatsappCtaTitle1LetterSpacing: 1,
  whatsappCtaTitle1LineHeight: 1.1,
  whatsappCtaTitle2Size: 26,
  whatsappCtaTitle2Gradient1: "#25D366",
  whatsappCtaTitle2Gradient2: "#0AE85E",
  whatsappCtaTitle2Font: "Poppins",
  whatsappCtaTitle2Bold: true,
  whatsappCtaTitle2Italic: false,
  whatsappCtaTitle2LetterSpacing: 2,
  whatsappCtaTitle2LineHeight: 1.1,
  whatsappCtaBtnSize: 14,
  whatsappCtaBtnColor: "#FFFFFF",
  whatsappCtaBtnGradient1: "#25D366",
  whatsappCtaBtnGradient2: "#0AE85E",
  whatsappCtaBtnFont: "Poppins",
  whatsappCtaBtnBold: true,
  whatsappCtaBtnItalic: false,
  whatsappCtaBtnLetterSpacing: 0,
  whatsappCtaBtnLineHeight: 1.2,
  whatsappCta3D: true,
  whatsappCtaBtnBlink: false,
  whatsappCtaBtnBlinkSpeed: 2,
  whatsappCtaIconShake: false,
  whatsappCtaIconShakeSpeed: 2,
  whatsappCtaNeonBorder: false,
  whatsappCtaNeonSpeed: 2,
  whatsappCtaGlobalEffect: "none",
  whatsappCtaGlobalEffectSpeed: 2,
  whatsappCtaScanlines: false,
  whatsappCtaScanlineThickness: 2,
  whatsappCtaScanlineOpacity: 0.15,
  whatsappCtaScanlineSpeed: 3,
  whatsappCtaScanlineColor: "#00ff41",
  whatsappCtaHackerGlow: false,
  whatsappCtaHackerGlowColor: "#25D366",
  whatsappCtaHackerGlowIntensity: 5,
  whatsappCtaHackerGlowSpeed: 2,
  whatsappCtaPhraseEnabled: false,
  whatsappCtaPhraseText: "",
  whatsappCtaPhraseSize: 16,
  whatsappCtaPhraseColor: "#FFFFFF",
  whatsappCtaPhraseFont: "Poppins",
  whatsappCtaPhraseBold: false,
  whatsappCtaPhraseItalic: false,
  whatsappCtaPhraseAlign: "center",
  whatsappCtaPhraseLetterSpacing: 0,
  whatsappCtaPhraseLineHeight: 1.4,
  whatsappCtaMarginBottom: 0,
};

export function parseWhatsAppWidgetConfig(raw: any): WhatsAppWidgetConfig {
  if (!raw) return { ...defaultWhatsAppWidgetConfig };
  return { ...defaultWhatsAppWidgetConfig, ...raw };
}

function SliderField({ label, value, onChange, min = 0, max = 100, unit = "px" }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium flex-1">{label}</Label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-24 text-xs font-mono" />
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function FontField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium flex-1">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="px-2 py-1.5 text-xs rounded-md border bg-background text-foreground" style={{ fontFamily: value }}>
        {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
    </div>
  );
}

interface Props {
  config: WhatsAppWidgetConfig;
  onChange: (config: WhatsAppWidgetConfig) => void;
  context?: "report" | "quote" | "widget-hub";
}

export default function WhatsAppWidgetSettings({ config, onChange, context }: Props) {
  const u = (partial: Partial<WhatsAppWidgetConfig>) => onChange({ ...config, ...partial });
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${context}-whatsapp/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      u({ whatsappCtaAvatarUrl: data.publicUrl });
      toast.success("Avatar enviado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Widget WhatsApp CTA</CardTitle>
          <CardDescription>Banner hacker com avatar, efeitos e botão de WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleField label="Ativar widget WhatsApp" value={config.enabled} onChange={(v) => u({ enabled: v })} />
          {config.enabled && (
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Número do WhatsApp</Label>
              <Input placeholder="5511999999999" value={config.whatsappNumber} onChange={(e) => u({ whatsappNumber: e.target.value })} />
            </div>
          )}
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Preview */}
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Preview em tempo real</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0 px-4">
              <style>{buildStyles("wprev")}</style>
              <div className="rounded-xl p-4" style={{ background: "#0a0a0a" }}>
                <div className="flex flex-col items-center gap-2">
                  {config.whatsappCtaPhraseEnabled && config.whatsappCtaPhraseText && (
                    <p className="max-w-xl w-full" style={{
                      fontSize: config.whatsappCtaPhraseSize || 16,
                      color: config.whatsappCtaPhraseColor || "#FFFFFF",
                      fontFamily: config.whatsappCtaPhraseFont || "Poppins",
                      fontWeight: config.whatsappCtaPhraseBold ? 700 : 400,
                      fontStyle: config.whatsappCtaPhraseItalic ? "italic" : "normal",
                      textAlign: (config.whatsappCtaPhraseAlign as any) || "center",
                      lineHeight: config.whatsappCtaPhraseLineHeight ?? 1.4,
                      letterSpacing: `${config.whatsappCtaPhraseLetterSpacing ?? 0}px`,
                    }}>
                      {config.whatsappCtaPhraseText}
                    </p>
                  )}
                  <WhatsAppCtaBanner config={config} animPrefix="wprev" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Conteúdo</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Foto do avatar</Label>
                <div className="flex items-center gap-3">
                  {config.whatsappCtaAvatarUrl ? (
                    <div className="relative">
                      <img src={config.whatsappCtaAvatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: "#25D366" }} />
                      <button onClick={() => u({ whatsappCtaAvatarUrl: "" })} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Enviando..." : "Upload"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
                  </label>
                </div>
              </div>
              <SliderField label="Tamanho da foto" value={config.whatsappCtaAvatarSize} onChange={(v) => u({ whatsappCtaAvatarSize: v })} min={40} max={120} />
              <SliderField label="Tamanho do ícone WhatsApp" value={config.whatsappCtaIconSize} onChange={(v) => u({ whatsappCtaIconSize: v })} min={24} max={80} />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Texto linha 1</Label>
                <Input value={config.whatsappCtaTitle1} onChange={(e) => u({ whatsappCtaTitle1: e.target.value })} placeholder="ATENDIMENTO" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Texto linha 2</Label>
                <Input value={config.whatsappCtaTitle2} onChange={(e) => u({ whatsappCtaTitle2: e.target.value })} placeholder="WHATSAPP" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Texto do botão</Label>
                <Input value={config.whatsappCtaBtnText} onChange={(e) => u({ whatsappCtaBtnText: e.target.value })} placeholder="Clique Aqui Agora" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Alinhamento do texto</Label>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button key={a} type="button" onClick={() => u({ whatsappCtaTextAlign: a })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${config.whatsappCtaTextAlign === a ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-accent"}`}>
                      {a === "left" ? "Esquerda" : a === "center" ? "Centro" : "Direita"}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Phrase */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Frase CTA</CardTitle>
              <CardDescription>Texto de chamada acima do widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleField label="Exibir frase CTA" value={config.whatsappCtaPhraseEnabled} onChange={(v) => u({ whatsappCtaPhraseEnabled: v })} />
              {config.whatsappCtaPhraseEnabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Texto da frase</Label>
                    <Input value={config.whatsappCtaPhraseText} onChange={(e) => u({ whatsappCtaPhraseText: e.target.value })} placeholder="Clique abaixo e fale comigo no WhatsApp 👇" />
                  </div>
                  <SliderField label="Tamanho da fonte" value={config.whatsappCtaPhraseSize} onChange={(v) => u({ whatsappCtaPhraseSize: v })} min={10} max={32} />
                  <ColorField label="Cor" value={config.whatsappCtaPhraseColor} onChange={(v) => u({ whatsappCtaPhraseColor: v })} />
                  <FontField label="Fonte" value={config.whatsappCtaPhraseFont} onChange={(v) => u({ whatsappCtaPhraseFont: v })} />
                  <div className="flex gap-4">
                    <ToggleField label="Negrito" value={config.whatsappCtaPhraseBold} onChange={(v) => u({ whatsappCtaPhraseBold: v })} />
                    <ToggleField label="Itálico" value={config.whatsappCtaPhraseItalic} onChange={(v) => u({ whatsappCtaPhraseItalic: v })} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Tipografia & Cores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linha 1 — "{config.whatsappCtaTitle1}"</span>
                <SliderField label="Tamanho" value={config.whatsappCtaTitle1Size} onChange={(v) => u({ whatsappCtaTitle1Size: v })} min={12} max={36} />
                <ColorField label="Cor" value={config.whatsappCtaTitle1Color} onChange={(v) => u({ whatsappCtaTitle1Color: v })} />
                <FontField label="Fonte" value={config.whatsappCtaTitle1Font} onChange={(v) => u({ whatsappCtaTitle1Font: v })} />
                <div className="flex gap-4">
                  <ToggleField label="Negrito" value={config.whatsappCtaTitle1Bold} onChange={(v) => u({ whatsappCtaTitle1Bold: v })} />
                  <ToggleField label="Itálico" value={config.whatsappCtaTitle1Italic} onChange={(v) => u({ whatsappCtaTitle1Italic: v })} />
                </div>
                <SliderField label="Espaçamento" value={config.whatsappCtaTitle1LetterSpacing} onChange={(v) => u({ whatsappCtaTitle1LetterSpacing: v })} min={-2} max={10} unit="" />
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linha 2 — "{config.whatsappCtaTitle2}" (gradiente)</span>
                <SliderField label="Tamanho" value={config.whatsappCtaTitle2Size} onChange={(v) => u({ whatsappCtaTitle2Size: v })} min={16} max={44} />
                <ColorField label="Gradiente cor 1" value={config.whatsappCtaTitle2Gradient1} onChange={(v) => u({ whatsappCtaTitle2Gradient1: v })} />
                <ColorField label="Gradiente cor 2" value={config.whatsappCtaTitle2Gradient2} onChange={(v) => u({ whatsappCtaTitle2Gradient2: v })} />
                <FontField label="Fonte" value={config.whatsappCtaTitle2Font} onChange={(v) => u({ whatsappCtaTitle2Font: v })} />
                <div className="flex gap-4">
                  <ToggleField label="Negrito" value={config.whatsappCtaTitle2Bold} onChange={(v) => u({ whatsappCtaTitle2Bold: v })} />
                  <ToggleField label="Itálico" value={config.whatsappCtaTitle2Italic} onChange={(v) => u({ whatsappCtaTitle2Italic: v })} />
                </div>
                <SliderField label="Espaçamento" value={config.whatsappCtaTitle2LetterSpacing} onChange={(v) => u({ whatsappCtaTitle2LetterSpacing: v })} min={-2} max={10} unit="" />
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Botão — "{config.whatsappCtaBtnText}"</span>
                <SliderField label="Tamanho" value={config.whatsappCtaBtnSize} onChange={(v) => u({ whatsappCtaBtnSize: v })} min={10} max={24} />
                <ColorField label="Cor do texto" value={config.whatsappCtaBtnColor} onChange={(v) => u({ whatsappCtaBtnColor: v })} />
                <ColorField label="Gradiente cor 1" value={config.whatsappCtaBtnGradient1} onChange={(v) => u({ whatsappCtaBtnGradient1: v })} />
                <ColorField label="Gradiente cor 2" value={config.whatsappCtaBtnGradient2} onChange={(v) => u({ whatsappCtaBtnGradient2: v })} />
                <FontField label="Fonte" value={config.whatsappCtaBtnFont} onChange={(v) => u({ whatsappCtaBtnFont: v })} />
                <div className="flex gap-4">
                  <ToggleField label="Negrito" value={config.whatsappCtaBtnBold} onChange={(v) => u({ whatsappCtaBtnBold: v })} />
                  <ToggleField label="Itálico" value={config.whatsappCtaBtnItalic} onChange={(v) => u({ whatsappCtaBtnItalic: v })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Effects */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Efeitos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ToggleField label="Efeito 3D (moldura e sombras)" value={config.whatsappCta3D} onChange={(v) => u({ whatsappCta3D: v })} />
              <ToggleField label="Botão piscando (blink)" value={config.whatsappCtaBtnBlink} onChange={(v) => u({ whatsappCtaBtnBlink: v })} />
              {config.whatsappCtaBtnBlink && (
                <SliderField label="Velocidade do blink" value={Math.round(config.whatsappCtaBtnBlinkSpeed * 10)} onChange={(v) => u({ whatsappCtaBtnBlinkSpeed: v / 10 })} min={5} max={50} unit="" />
              )}
              <ToggleField label="Ícone tremendo (shake)" value={config.whatsappCtaIconShake} onChange={(v) => u({ whatsappCtaIconShake: v })} />
              {config.whatsappCtaIconShake && (
                <SliderField label="Velocidade do shake" value={Math.round(config.whatsappCtaIconShakeSpeed * 10)} onChange={(v) => u({ whatsappCtaIconShakeSpeed: v / 10 })} min={5} max={50} unit="" />
              )}
              <ToggleField label="Borda neon na foto" value={config.whatsappCtaNeonBorder} onChange={(v) => u({ whatsappCtaNeonBorder: v })} />
              {config.whatsappCtaNeonBorder && (
                <SliderField label="Velocidade do neon" value={Math.round(config.whatsappCtaNeonSpeed * 10)} onChange={(v) => u({ whatsappCtaNeonSpeed: v / 10 })} min={5} max={50} unit="" />
              )}
            </CardContent>
          </Card>

          {/* Global Effect */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Efeito Global (Widget inteiro)</CardTitle>
              <CardDescription>Aplica um efeito hacker/mal contato no widget completo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Modelo do efeito</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "none", label: "Nenhum" },
                    { key: "glitch", label: "Glitch" },
                    { key: "flicker", label: "Flicker" },
                    { key: "malcontact", label: "Mal Contato" },
                    { key: "malcontact-v2", label: "Mal Contato H1" },
                    { key: "malcontact-v3", label: "Mal Contato V2" },
                    { key: "malcontact-hz", label: "Mal Contato HZ" },
                    { key: "pulse-glow", label: "Pulse Glow" },
                    { key: "interference", label: "Interferência" },
                  ].map((fx) => (
                    <button key={fx.key} type="button" onClick={() => u({ whatsappCtaGlobalEffect: fx.key })}
                      className={`px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${config.whatsappCtaGlobalEffect === fx.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-accent"}`}>
                      {fx.label}
                    </button>
                  ))}
                </div>
              </div>
              {config.whatsappCtaGlobalEffect !== "none" && (
                <SliderField label="Velocidade (ciclo)" value={Math.round(config.whatsappCtaGlobalEffectSpeed * 10)} onChange={(v) => u({ whatsappCtaGlobalEffectSpeed: v / 10 })} min={5} max={60} unit="" />
              )}
            </CardContent>
          </Card>

          {/* Scanlines & Glow */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> Scanlines & Sombra Hacker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleField label="Scanlines (linhas horizontais)" value={config.whatsappCtaScanlines} onChange={(v) => u({ whatsappCtaScanlines: v })} />
              {config.whatsappCtaScanlines && (
                <>
                  <SliderField label="Espessura" value={config.whatsappCtaScanlineThickness} onChange={(v) => u({ whatsappCtaScanlineThickness: v })} min={1} max={8} />
                  <SliderField label="Opacidade" value={Math.round(config.whatsappCtaScanlineOpacity * 100)} onChange={(v) => u({ whatsappCtaScanlineOpacity: v / 100 })} min={5} max={50} unit="%" />
                  <SliderField label="Velocidade" value={Math.round(config.whatsappCtaScanlineSpeed * 10)} onChange={(v) => u({ whatsappCtaScanlineSpeed: v / 10 })} min={5} max={80} unit="" />
                  <ColorField label="Cor" value={config.whatsappCtaScanlineColor} onChange={(v) => u({ whatsappCtaScanlineColor: v })} />
                </>
              )}
              <ToggleField label="Sombra hacker (glow externo)" value={config.whatsappCtaHackerGlow} onChange={(v) => u({ whatsappCtaHackerGlow: v })} />
              {config.whatsappCtaHackerGlow && (
                <>
                  <ColorField label="Cor do glow" value={config.whatsappCtaHackerGlowColor} onChange={(v) => u({ whatsappCtaHackerGlowColor: v })} />
                  <SliderField label="Intensidade" value={config.whatsappCtaHackerGlowIntensity} onChange={(v) => u({ whatsappCtaHackerGlowIntensity: v })} min={1} max={15} />
                  <SliderField label="Velocidade" value={Math.round(config.whatsappCtaHackerGlowSpeed * 10)} onChange={(v) => u({ whatsappCtaHackerGlowSpeed: v / 10 })} min={5} max={50} unit="" />
                </>
              )}
            </CardContent>
          </Card>

          {/* Spacing */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" /> Espaçamento</CardTitle></CardHeader>
            <CardContent>
              <SliderField label="Margem inferior (px)" value={config.whatsappCtaMarginBottom} onChange={(v) => u({ whatsappCtaMarginBottom: v })} min={0} max={80} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
