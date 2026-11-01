// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lv/hooks/useAuth";
import { supabase } from "@/lv/integrations/supabase/client";
import { useToast } from "@/lv/hooks/use-toast";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Card, CardContent } from "@/lv/components/ui/card";
import { Switch } from "@/lv/components/ui/switch";
import { Slider } from "@/lv/components/ui/slider";
import { Zap, Save } from "lucide-react";
import { ConnectorEffectLine } from "@/lv/components/quote/ConnectorEffects";

const EFFECT_OPTIONS = [
  { id: "pulse", label: "Gradiente Fluido", desc: "Cor fluindo da esquerda para direita com gradiente suave" },
  { id: "slide", label: "Pulso de Pontos", desc: "Ponto luminoso viajando pelo caminho" },
  { id: "glow", label: "Feixe de Energia", desc: "Brilho pulsante com efeito glow intenso" },
  { id: "bounce", label: "Fluxo de Dados", desc: "Múltiplos traços rápidos simulando transferência" },
  { id: "rotate", label: "Onda Pulsante", desc: "Onda senoidal pulsando entre os cards" },
  { id: "zigzag", label: "Rastro de Partículas", desc: "Partículas aparecendo e desaparecendo" },
  { id: "wave", label: "Neon Glow", desc: "Brilho neon vibrante com halo pulsante" },
  { id: "spiral", label: "Matrix Rain", desc: "Chuva de dados estilo Matrix entre os cards" },
  { id: "flash", label: "Laser Scanner", desc: "Feixe laser varrendo da esquerda para direita" },
  { id: "morph", label: "Túnel Quântico", desc: "Efeito de tunelamento quântico com blur" },
  { id: "radar", label: "Arco de Plasma", desc: "Arco elétrico pulsante entre os cards" },
  { id: "orbit", label: "Cyber Dash", desc: "Traço cibernético com rastro digital" },
  { id: "dna", label: "Holograma", desc: "Linha holográfica com efeito RGB shift" },
  { id: "lightning", label: "Faísca Elétrica", desc: "Centelhas elétricas saltando entre cards" },
  { id: "matrix", label: "Warp Drive", desc: "Efeito de velocidade warp com desfoque direcional" },
];

interface ConnectorConfig {
  enabled: boolean;
  selectedEffect: string;
  color: string;
  thickness: number;
  dashLength: number;
  dashGap: number;
  speed: number;
}

const defaultConfig: ConnectorConfig = {
  enabled: true,
  selectedEffect: "pulse",
  color: "",
  thickness: 2,
  dashLength: 8,
  dashGap: 6,
  speed: 2,
};

export default function QuoteConnectorsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<ConnectorConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from("sales_page_config").select("config").eq("id", "quote_connectors").maybeSingle();
    if (data?.config) {
      setConfig({ ...defaultConfig, ...(data.config as any) });
    }
  };

  const saveConfig = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("sales_page_config").upsert({
      id: "quote_connectors",
      config: config as any,
      updated_at: new Date().toISOString(),
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configurações salvas!" });
    setSaving(false);
  };

  const effectColor = config.color || "#3b82f6";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Hero header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Conectores Animados</h2>
          <p className="text-sm text-muted-foreground">Linhas animadas que ligam os cards de Instagram e Cronograma no orçamento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main settings */}
        <div className="space-y-6">
          {/* Toggle */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Ativar conectores animados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Linhas animadas ligando os cards principais</p>
                </div>
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
              </div>
            </CardContent>
          </Card>

          {/* Effect selector */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Estilo do Efeito <span className="text-muted-foreground font-normal">({EFFECT_OPTIONS.length} disponíveis)</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {EFFECT_OPTIONS.map((effect) => (
                  <button
                    key={effect.id}
                    onClick={() => setConfig({ ...config, selectedEffect: effect.id })}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      config.selectedEffect === effect.id
                        ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-sm"
                        : "border-border hover:border-emerald-500/40 hover:bg-muted/30"
                    }`}
                  >
                    <p className="text-sm font-medium">{effect.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{effect.desc}</p>
                    <div className="mt-2 h-5">
                      <ConnectorEffectLine
                        effect={effect.id}
                        color={effectColor}
                        thickness={Math.max(1, config.thickness - 1)}
                        dashLength={config.dashLength}
                        dashGap={config.dashGap}
                        speed={config.speed}
                        height={16}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Cor do Conector</h3>
              <p className="text-xs text-muted-foreground">
                Deixe vazio para usar a cor do tema do orçamento automaticamente.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.color || "#3b82f6"}
                  onChange={(e) => setConfig({ ...config, color: e.target.value })}
                  className="w-11 h-11 rounded-xl border border-border cursor-pointer"
                />
                <Input
                  value={config.color}
                  onChange={(e) => setConfig({ ...config, color: e.target.value })}
                  placeholder="Automático (cor do tema)"
                  className="max-w-xs text-sm h-11 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Thickness, Dash, Speed */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6 space-y-5">
              <h3 className="font-semibold text-sm">Espessura, Tracejado e Velocidade</h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Espessura</Label>
                    <span className="text-sm text-muted-foreground tabular-nums">{config.thickness}px</span>
                  </div>
                  <Slider value={[config.thickness]} min={1} max={6} step={1} onValueChange={([v]) => setConfig({ ...config, thickness: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Comprimento do traço</Label>
                    <span className="text-sm text-muted-foreground tabular-nums">{config.dashLength}px</span>
                  </div>
                  <Slider value={[config.dashLength]} min={2} max={20} step={1} onValueChange={([v]) => setConfig({ ...config, dashLength: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Espaço entre traços</Label>
                    <span className="text-sm text-muted-foreground tabular-nums">{config.dashGap}px</span>
                  </div>
                  <Slider value={[config.dashGap]} min={2} max={20} step={1} onValueChange={([v]) => setConfig({ ...config, dashGap: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Velocidade <span className="text-muted-foreground tabular-nums">({config.speed}s)</span></Label>
                    <span className="text-xs text-muted-foreground">Rápida ← → Lenta</span>
                  </div>
                  <Slider value={[config.speed]} min={0.5} max={5} step={0.5} onValueChange={([v]) => setConfig({ ...config, speed: v })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="sticky top-20 space-y-4 self-start">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Pré-visualização ao Vivo</h3>
              <div className="py-4 space-y-3">
                {config.enabled ? (
                  <div className="flex items-center gap-0">
                    <div className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-[10px] text-muted-foreground flex-shrink-0">Card 1</div>
                    <div className="flex-1 px-1"><ConnectorEffectLine effect={config.selectedEffect} color={effectColor} thickness={config.thickness} dashLength={config.dashLength} dashGap={config.dashGap} speed={config.speed} height={24} /></div>
                    <div className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-[10px] text-muted-foreground flex-shrink-0">Card 2</div>
                    <div className="flex-1 px-1"><ConnectorEffectLine effect={config.selectedEffect} color={effectColor} thickness={config.thickness} dashLength={config.dashLength} dashGap={config.dashGap} speed={config.speed} height={24} /></div>
                    <div className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-[10px] text-muted-foreground flex-shrink-0">Card 3</div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">Conectores desativados</div>
                )}
              </div>
              <div className="text-center space-y-1 border-t pt-3">
                <p className="text-xs font-medium">{EFFECT_OPTIONS.find(e => e.id === config.selectedEffect)?.label}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{config.thickness}px • {config.speed}s • Traço: {config.dashLength}px/{config.dashGap}px</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-2 md:-mx-4 mt-6 z-10">
        <div className="rounded-2xl border border-border/60 bg-background/85 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)] flex items-center justify-end gap-3">
          <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5" onClick={saveConfig} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
