// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/lv/components/ui/card";
import { Label } from "@/lv/components/ui/label";
import { Switch } from "@/lv/components/ui/switch";
import { Slider } from "@/lv/components/ui/slider";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Badge } from "@/lv/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { supabase } from "@/lv/integrations/supabase/client";
import { toast } from "@/lv/hooks/use-toast";
import { Sparkles, Save, RotateCcw } from "lucide-react";
import {
  DEFAULT_FLOATING_ICONS_CONFIG,
  type FloatingIconType,
  type FloatingIconsConfig,
  type FloatingDirection,
} from "@/lv/hooks/useFloatingIconsConfig";
import FloatingHeroIcons from "@/lv/components/quote/FloatingHeroIcons";

const ICON_OPTIONS: { value: FloatingIconType; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "money", label: "Dinheiro" },
  { value: "heart", label: "Coração" },
  { value: "fire", label: "Fogo" },
  { value: "star", label: "Estrela" },
  { value: "trending", label: "Crescimento" },
  { value: "pin", label: "Pin GPS" },
];

const DIRECTION_OPTIONS: { value: FloatingDirection; label: string }[] = [
  { value: "up", label: "Subir" },
  { value: "down", label: "Descer" },
  { value: "diagonal-left", label: "Diagonal Esquerda" },
  { value: "diagonal-right", label: "Diagonal Direita" },
  { value: "wave", label: "Onda" },
];

export default function QuoteFloatingIconsSettings() {
  const [config, setConfig] = useState<FloatingIconsConfig>(DEFAULT_FLOATING_ICONS_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("sales_page_config").select("config").eq("id", "quote_floating_icons" as any).maybeSingle()
      .then(({ data }: any) => {
        if (data?.config) setConfig({ ...DEFAULT_FLOATING_ICONS_CONFIG, ...(data.config as any) });
        setLoaded(true);
      });
  }, []);

  const update = <K extends keyof FloatingIconsConfig>(key: K, value: FloatingIconsConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const toggleIcon = (icon: FloatingIconType) => {
    setConfig(prev => {
      const set = new Set(prev.enabledIcons);
      if (set.has(icon)) set.delete(icon); else set.add(icon);
      return { ...prev, enabledIcons: Array.from(set) as FloatingIconType[] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("sales_page_config").upsert({
      id: "quote_floating_icons" as any,
      config: config as any,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas", description: "Os ícones flutuantes foram atualizados." });
    }
  };

  const handleReset = () => setConfig(DEFAULT_FLOATING_ICONS_CONFIG);

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Ícones Flutuantes do Orçamento</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Efeito tipo "live do Instagram" abaixo do botão "Ver Planos e Investimento". WhatsApp, Instagram, Dinheiro e Foguete subindo na tela.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Restaurar padrão
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <Label className="text-base font-semibold">Ativar efeito</Label>
              <p className="text-sm text-muted-foreground">Mostrar os ícones subindo abaixo do CTA do herói</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={v => update("enabled", v)} />
          </div>

          {/* Live preview */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Pré-visualização ao vivo</Label>
            <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
              <div className="px-6 pt-6 pb-2 text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white font-semibold shadow-lg">
                  Ver Planos e Investimento
                </div>
              </div>
              <div className="h-[340px] relative">
                <FloatingHeroIcons configOverride={config} height={320} />
              </div>
            </div>
          </div>

          {/* Icons selection */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Ícones que sobem</Label>
            <p className="text-sm text-muted-foreground mb-3">Selecione quais ícones aparecem na chuva flutuante</p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(opt => {
                const active = config.enabledIcons.includes(opt.value);
                return (
                  <Badge
                    key={opt.value}
                    onClick={() => toggleIcon(opt.value)}
                    className={`cursor-pointer px-4 py-2 text-sm transition ${
                      active
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Sliders grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SliderField
              label="Tamanho dos ícones"
              suffix="px"
              value={config.iconSize}
              min={16} max={80} step={1}
              onChange={v => update("iconSize", v)}
            />
            <SliderField
              label="Velocidade da animação"
              suffix="s"
              value={config.speed}
              min={1.5} max={10} step={0.1}
              onChange={v => update("speed", v)}
            />
            <SliderField
              label="Intervalo entre rajadas"
              suffix="ms"
              value={config.emitInterval}
              min={300} max={3000} step={50}
              onChange={v => update("emitInterval", v)}
            />
            <SliderField
              label="Ícones por rajada"
              value={config.iconsPerBurst}
              min={1} max={6} step={1}
              onChange={v => update("iconsPerBurst", v)}
            />
            <SliderField
              label="Largura da expansão lateral"
              suffix="px"
              value={config.spreadWidth}
              min={40} max={500} step={10}
              onChange={v => update("spreadWidth", v)}
            />
            <SliderField
              label="Distância de subida"
              suffix="px"
              value={config.travelDistance}
              min={120} max={600} step={10}
              onChange={v => update("travelDistance", v)}
            />
            <SliderField
              label="Opacidade máxima"
              value={config.fadeOpacity}
              min={0.2} max={1} step={0.05}
              onChange={v => update("fadeOpacity", v)}
            />
            <div>
              <Label className="text-sm font-medium mb-2 block">Direção</Label>
              <Select value={config.direction} onValueChange={(v: FloatingDirection) => update("direction", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleRow label="Rotação suave" description="Os ícones giram um pouco enquanto sobem"
              checked={config.rotation} onChange={v => update("rotation", v)} />
            <ToggleRow label="Brilho neon (glow)" description="Aplica brilho colorido nos ícones"
              checked={config.glow} onChange={v => update("glow", v)} />
          </div>

          {/* Rocket */}
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Foguete de Crescimento</Label>
                <p className="text-sm text-muted-foreground">Foguete subindo continuamente como símbolo de crescimento</p>
              </div>
              <Switch checked={config.rocketEnabled} onCheckedChange={v => update("rocketEnabled", v)} />
            </div>
            {config.rocketEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SliderField
                  label="Tamanho do foguete"
                  suffix="px"
                  value={config.rocketSize}
                  min={24} max={120} step={1}
                  onChange={v => update("rocketSize", v)}
                />
                <SliderField
                  label="Velocidade do foguete"
                  suffix="s"
                  value={config.rocketSpeed}
                  min={2} max={12} step={0.1}
                  onChange={v => update("rocketSpeed", v)}
                />
              </div>
            )}
          </div>

          {/* Colors */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Cores</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorField label="WhatsApp" value={config.colorWhatsapp} onChange={v => update("colorWhatsapp", v)} />
              <ColorField label="Instagram" value={config.colorInstagram} onChange={v => update("colorInstagram", v)} />
              <ColorField label="Dinheiro" value={config.colorMoney} onChange={v => update("colorMoney", v)} />
              <ColorField label="Foguete" value={config.colorRocket} onChange={v => update("colorRocket", v)} />
              <ColorField label="Pin GPS" value={config.colorPin} onChange={v => update("colorPin", v)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SliderField({
  label, value, onChange, min, max, step, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {value}{suffix || ""}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={v => onChange(v[0])} />
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium mb-1 block text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded border cursor-pointer bg-transparent"
        />
        <Input value={value} onChange={e => onChange(e.target.value)} className="h-10 font-mono text-xs" />
      </div>
    </div>
  );
}
