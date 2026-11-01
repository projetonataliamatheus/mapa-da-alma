// @ts-nocheck
"use client";
/**
 * Shared Matrix effect settings component for Reports and Quotes admin.
 * 100% faithful to the Sales Page Matrix controls.
 */
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Switch } from "@/lv/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lv/components/ui/card";
import { Terminal, Film, Palette, Type } from "lucide-react";

const FONT_OPTIONS = [
  "Poppins", "JetBrains Mono", "Inter", "Roboto", "Montserrat", "Oswald", "Bebas Neue",
  "Raleway", "Playfair Display", "Lato", "Open Sans", "Anton", "Bangers", "Permanent Marker",
  "Nunito", "Quicksand", "Rubik", "Outfit", "Space Grotesk", "Lexend", "Kanit", "Teko",
  "Exo 2", "Fira Sans", "Ubuntu", "Cabin", "Josefin Sans", "Titillium Web", "Comfortaa",
];

export interface MatrixConfig {
  enabled: boolean;
  effect: string;
  duration: number;
  color: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  line1Text: string;
  line1Color: string;
  line1ColorMode: "auto" | "manual";
  line2Text: string;
  line2Color: string;
  line2ColorMode: "auto" | "manual";
  speed: number;
  density: number;
  fadeSpeed: number;
  glowIntensity: number;
  charSet: string;
}

export const defaultMatrixConfig: MatrixConfig = {
  enabled: false,
  effect: "converge",
  duration: 2000,
  color: "#00ff41",
  text: "",
  fontSize: 48,
  fontFamily: "JetBrains Mono",
  line1Text: "",
  line1Color: "#FFFFFF",
  line1ColorMode: "auto",
  line2Text: "",
  line2Color: "#00ff41",
  line2ColorMode: "auto",
  speed: 50,
  density: 30,
  fadeSpeed: 50,
  glowIntensity: 40,
  charSet: "matrix",
};

export function parseMatrixConfig(raw: any): MatrixConfig {
  if (!raw) return { ...defaultMatrixConfig };
  return {
    enabled: raw.matrix_enabled ?? raw.enabled ?? false,
    effect: raw.matrix_effect ?? raw.effect ?? "converge",
    duration: raw.matrix_duration ?? raw.duration ?? 2000,
    color: raw.matrix_color ?? raw.color ?? "#00ff41",
    text: raw.matrix_text ?? raw.text ?? "",
    fontSize: raw.fontSize ?? 48,
    fontFamily: raw.fontFamily ?? "JetBrains Mono",
    line1Text: raw.line1Text ?? "",
    line1Color: raw.line1Color ?? "#FFFFFF",
    line1ColorMode: raw.line1ColorMode ?? "auto",
    line2Text: raw.line2Text ?? "",
    line2Color: raw.line2Color ?? "#00ff41",
    line2ColorMode: raw.line2ColorMode ?? "auto",
    speed: raw.speed ?? 50,
    density: raw.density ?? 30,
    fadeSpeed: raw.fadeSpeed ?? 50,
    glowIntensity: raw.glowIntensity ?? 40,
    charSet: raw.charSet ?? "matrix",
  };
}

function SliderField({ label, value, onChange, min = 0, max = 100, unit = "" }: {
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

interface Props {
  config: MatrixConfig;
  onChange: (config: MatrixConfig) => void;
  context: "report" | "quote";
}

export default function MatrixEffectSettings({ config, onChange, context }: Props) {
  const u = (partial: Partial<MatrixConfig>) => onChange({ ...config, ...partial });
  const contextLabel = context === "report" ? "relatório" : "orçamento";

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Terminal className="h-4 w-4 text-emerald-500" /> Efeito Matrix na Abertura</CardTitle>
          <CardDescription>Exibe animação Matrix ao desbloquear o {contextLabel} com senha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Ativar efeito Matrix</Label>
            <Switch checked={config.enabled} onCheckedChange={(v) => u({ enabled: v })} />
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Effect Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Film className="h-4 w-4 text-primary" /> Tipo de Efeito</CardTitle>
              <CardDescription>Escolha o estilo da animação de abertura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "converge", label: "Convergir" },
                  { key: "rain", label: "Chuva Matrix" },
                  { key: "typewriter", label: "Typewriter" },
                  { key: "spiral", label: "Espiral" },
                  { key: "explosion", label: "Explosão" },
                ].map((fx) => (
                  <button
                    key={fx.key}
                    type="button"
                    onClick={() => u({ effect: fx.key })}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      config.effect === fx.key
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {fx.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timing & Speed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Velocidade & Timing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Duração total (ms)</Label>
                <Input type="number" min={500} max={15000} step={100} value={config.duration} onChange={(e) => u({ duration: parseInt(e.target.value) || 2000 })} />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>Rápido (500ms)</span><span>Lento (15s)</span></div>
              </div>
              <SliderField label="Velocidade da chuva" value={config.speed} onChange={(v) => u({ speed: v })} min={10} max={100} unit="%" />
              <SliderField label="Densidade dos caracteres" value={config.density} onChange={(v) => u({ density: v })} min={5} max={80} unit="%" />
              <SliderField label="Velocidade do fade" value={config.fadeSpeed} onChange={(v) => u({ fadeSpeed: v })} min={10} max={100} unit="%" />
            </CardContent>
          </Card>

          {/* Colors & Glow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Cores & Brilho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorField label="Cor principal do efeito" value={config.color} onChange={(v) => u({ color: v })} />
              <SliderField label="Intensidade do glow" value={config.glowIntensity} onChange={(v) => u({ glowIntensity: v })} min={0} max={100} unit="%" />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Conjunto de caracteres</Label>
                <Select value={config.charSet} onValueChange={(v) => u({ charSet: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matrix">Matrix (Katakana)</SelectItem>
                    <SelectItem value="binary">Binário (0/1)</SelectItem>
                    <SelectItem value="hex">Hexadecimal</SelectItem>
                    <SelectItem value="code">Código (símbolos)</SelectItem>
                    <SelectItem value="emoji">Emoji</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Text Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Type className="h-4 w-4 text-primary" /> Texto Revelado</CardTitle>
              <CardDescription>Texto que aparece durante/após a animação. Suporte a duas linhas independentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Line 1 */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linha 1</span>
                <Input placeholder={context === "report" ? "Nome do relatório" : "Nome do cliente"} value={config.line1Text} onChange={(e) => u({ line1Text: e.target.value })} />
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Cor:</Label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => u({ line1ColorMode: "auto" })}
                      className={`px-2 py-1 text-[10px] rounded border ${config.line1ColorMode === "auto" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}>
                      Auto
                    </button>
                    <button type="button" onClick={() => u({ line1ColorMode: "manual" })}
                      className={`px-2 py-1 text-[10px] rounded border ${config.line1ColorMode === "manual" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}>
                      Manual
                    </button>
                  </div>
                  {config.line1ColorMode === "manual" && (
                    <div className="flex items-center gap-1">
                      <input type="color" value={config.line1Color} onChange={(e) => u({ line1Color: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
                      <Input value={config.line1Color} onChange={(e) => u({ line1Color: e.target.value })} className="w-20 text-[10px] font-mono h-7" />
                    </div>
                  )}
                </div>
              </div>

              {/* Line 2 */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linha 2</span>
                <Input placeholder="Texto secundário (opcional)" value={config.line2Text} onChange={(e) => u({ line2Text: e.target.value })} />
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Cor:</Label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => u({ line2ColorMode: "auto" })}
                      className={`px-2 py-1 text-[10px] rounded border ${config.line2ColorMode === "auto" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}>
                      Auto (cor do efeito)
                    </button>
                    <button type="button" onClick={() => u({ line2ColorMode: "manual" })}
                      className={`px-2 py-1 text-[10px] rounded border ${config.line2ColorMode === "manual" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}>
                      Manual
                    </button>
                  </div>
                  {config.line2ColorMode === "manual" && (
                    <div className="flex items-center gap-1">
                      <input type="color" value={config.line2Color} onChange={(e) => u({ line2Color: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
                      <Input value={config.line2Color} onChange={(e) => u({ line2Color: e.target.value })} className="w-20 text-[10px] font-mono h-7" />
                    </div>
                  )}
                </div>
              </div>

              {/* Font */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tamanho da fonte</Label>
                  <Input type="number" min={16} max={120} value={config.fontSize} onChange={(e) => u({ fontSize: parseInt(e.target.value) || 48 })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Família da fonte</Label>
                  <select
                    value={config.fontFamily}
                    onChange={(e) => u({ fontFamily: e.target.value })}
                    className="w-full px-2 py-2 text-sm rounded-md border bg-background text-foreground"
                    style={{ fontFamily: config.fontFamily }}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
