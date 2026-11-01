// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { db } from "@/lv/lib/supabaseClient";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/lv/components/ui/card";
import { useToast } from "@/lv/hooks/use-toast";
import { Star, Plus, Trash2, Upload, Save, GripVertical, LayoutPanelTop } from "lucide-react";
import { Switch } from "@/lv/components/ui/switch";
import { colorThemes, getTheme } from "@/lv/lib/colorThemes";
import { starAnimations } from "@/lv/components/quote/ProfessionalFooter";
import MaskedInput from "@/lv/components/admin/MaskedInput";

interface FooterData {
  professional_name: string;
  professional_photo_url: string;
  rating: number;
  star_color: string;
  services: string[];
  star_animation: string;
  cnpj: string;
  copyright_text: string;
  website_url: string;
  website_label: string;
  website_visible: boolean;
  website_position: number;
}

const defaultData: FooterData = {
  professional_name: "Matheus Rangel",
  professional_photo_url: "",
  rating: 5,
  star_color: "#3b82f6",
  services: ["Web Designer", "Gestor de Tráfego Pago", "Anúncios", "Programação & Desenvolvimento", "Automações e IA's"],
  star_animation: "none",
  cnpj: "",
  copyright_text: "",
  website_url: "https://www.matheusrangel.com.br",
  website_label: "Visite o meu site",
  website_visible: true,
  website_position: 3,
};

const CARD_ELEMENTS = [
  { id: "photo", label: "📷 Foto" },
  { id: "name", label: "✏️ Nome" },
  { id: "rating", label: "⭐ Avaliação" },
  { id: "services", label: "🏷️ Serviços" },
];

export default function FooterSettings() {
  const { toast } = useToast();
  const [data, setData] = useState<FooterData>({ ...defaultData });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewTheme, setPreviewTheme] = useState("gold-dark");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("site_settings" as any)
      .select("*")
      .eq("id", "main")
      .single()
      .then(({ data: row }: any) => {
        if (row) {
          setData({
            professional_name: row.professional_name || "",
            professional_photo_url: row.professional_photo_url || "",
            rating: row.rating ?? 5,
            star_color: row.star_color || "#3b82f6",
            services: Array.isArray(row.services) ? row.services : [],
            star_animation: row.star_animation || "none",
            cnpj: row.cnpj || "",
            copyright_text: row.copyright_text || "",
            website_url: row.website_url || "",
            website_label: row.website_label || "Visite o meu site",
            website_visible: row.website_visible !== false,
            website_position: row.website_position ?? 3,
          });
        }
      });
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `professional-photo.${ext}`;
    await supabase.storage.from("site-assets").remove([path]);
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setData((d) => ({ ...d, professional_photo_url: urlData.publicUrl + "?t=" + Date.now() }));
      toast({ title: "Foto atualizada!" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (db.from("site_settings") as any)
      .upsert({
        id: "main",
        professional_name: data.professional_name,
        professional_photo_url: data.professional_photo_url,
        rating: data.rating,
        star_color: data.star_color,
        services: data.services,
        star_animation: data.star_animation,
        cnpj: data.cnpj,
        copyright_text: data.copyright_text,
        website_url: data.website_url,
        website_label: data.website_label,
        website_visible: data.website_visible,
        website_position: data.website_position,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rodapé salvo! Atualizado em todos os orçamentos e relatórios." });
    }
    setSaving(false);
  };

  const theme = getTheme(previewTheme);
  const rating = Math.min(5, Math.max(0, data.rating));
  const animClass = starAnimations[data.star_animation]?.css || "";

  // Build preview card elements with website at configurable position
  const displayDomain = data.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const websitePreview = data.website_url && data.website_visible ? (
    <div key="website" className="flex flex-col items-center gap-1 my-2">
      <div className="flex items-center gap-2">
        <span className="inline-block animate-spin text-xl" style={{ animationDuration: "3s", color: "#3b82f6" }}>🌐</span>
        <span className="text-sm font-medium" style={{ color: theme.accent }}>{displayDomain}</span>
      </div>
      <span className="text-[11px]" style={{ color: theme.accent + "99" }}>{data.website_label || "Visite o meu site"}</span>
    </div>
  ) : null;

  const photoPreview = data.professional_photo_url ? (
    <div key="photo" className="flex justify-center mb-4">
      <div className="w-24 h-24 rounded-full overflow-hidden border-4" style={{ borderColor: theme.accent }}>
        <img src={data.professional_photo_url} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  ) : null;

  const namePreview = (
    <h3 key="name" className="text-xl font-bold mb-2" style={{ color: theme.text }}>{data.professional_name || "Seu Nome"}</h3>
  );

  const ratingPreview = (
    <div key="rating" className="flex items-center justify-center gap-1 mb-4">
      <span className="text-sm font-semibold mr-1" style={{ color: theme.textMuted }}>{rating}/5</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-5 h-5 ${animClass}`} style={{ animationDelay: `${i * 0.15}s` }}
          fill={i < rating ? data.star_color : "transparent"} stroke={data.star_color} strokeWidth={1.5} />
      ))}
    </div>
  );

  const servicesPreview = data.services.filter(Boolean).length > 0 ? (
    <div key="services" className="flex flex-wrap justify-center gap-2">
      {data.services.filter(Boolean).map((s, i) => (
        <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium border"
          style={{ borderColor: theme.accent + "55", color: theme.text, background: theme.accent + "11" }}>{s}</span>
      ))}
    </div>
  ) : null;

  const baseElements = [photoPreview, namePreview, ratingPreview, servicesPreview];
  const previewElements = [...baseElements];
  previewElements.splice(Math.min(data.website_position, previewElements.length), 0, websitePreview);

  return (
    <div className="space-y-6 pb-24">
      {/* Hero header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <LayoutPanelTop className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Rodapé do Orçamento</h2>
          <p className="text-sm text-muted-foreground">Bloco de assinatura profissional aplicado em orçamentos e relatórios.</p>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Profissional</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                  {data.professional_photo_url ? (
                    <img src={data.professional_photo_url} alt="Foto" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                  )}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="mr-1 h-3 w-3" /> {uploading ? "Enviando..." : "Enviar Foto"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={data.professional_name} onChange={(e) => setData((d) => ({ ...d, professional_name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nota (0-5)</Label>
                  <Input type="number" min={0} max={5} step={0.1} value={data.rating} onChange={(e) => setData((d) => ({ ...d, rating: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cor das Estrelas</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={data.star_color} onChange={(e) => setData((d) => ({ ...d, star_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                    <Input value={data.star_color} onChange={(e) => setData((d) => ({ ...d, star_color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Star Animation */}
          <Card>
            <CardHeader><CardTitle className="text-base">Efeito das Estrelas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(starAnimations).map(([key, { name, css }]) => (
                  <button key={key} onClick={() => setData((d) => ({ ...d, star_animation: key }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm ${
                      data.star_animation === key ? "border-primary bg-primary/10 font-semibold" : "border-border hover:border-primary/50"
                    }`}>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${css}`} style={{ animationDelay: `${i * 0.15}s`, color: data.star_color }}
                          fill={data.star_color} stroke={data.star_color} strokeWidth={1.5} />
                      ))}
                    </div>
                    <span className="text-xs">{name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader><CardTitle className="text-base">Serviços Oferecidos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.services.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s} onChange={(e) => {
                    const copy = [...data.services]; copy[i] = e.target.value;
                    setData((d) => ({ ...d, services: copy }));
                  }} className="text-sm" />
                  <Button variant="ghost" size="icon" onClick={() => setData((d) => ({ ...d, services: d.services.filter((_, idx) => idx !== i) }))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setData((d) => ({ ...d, services: [...d.services, ""] }))}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar Serviço
              </Button>
            </CardContent>
          </Card>

          {/* CNPJ e Copyright */}
          <Card>
            <CardHeader><CardTitle className="text-base">CNPJ e Copyright</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">CNPJ</Label>
                <MaskedInput mask="cnpj" placeholder="00.000.000/0000-00" value={data.cnpj} onValueChange={(v) => setData((d) => ({ ...d, cnpj: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Texto de Copyright (opcional)</Label>
                <Input placeholder="Todos os direitos reservados." value={data.copyright_text} onChange={(e) => setData((d) => ({ ...d, copyright_text: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {/* Website Link */}
          <Card>
            <CardHeader><CardTitle className="text-base">🌐 Link do Site</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Exibir link do site no rodapé</Label>
                <Switch checked={data.website_visible} onCheckedChange={(v) => setData((d) => ({ ...d, website_visible: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL do Site</Label>
                <Input placeholder="https://www.seusite.com.br" value={data.website_url} onChange={(e) => setData((d) => ({ ...d, website_url: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Texto abaixo do domínio</Label>
                <Input placeholder="Visite o meu site" value={data.website_label} onChange={(e) => setData((d) => ({ ...d, website_label: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Posição do site dentro do card</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Clique nos botões para mover a posição do link do site</p>
                <div className="flex flex-wrap gap-2">
                  {["Antes do nome", "Após nome", "Após avaliação", "Após serviços"].map((label, idx) => (
                    <button key={idx} onClick={() => setData((d) => ({ ...d, website_position: idx + 1 }))}
                      className={`px-3 py-1.5 rounded-lg text-xs border-2 transition-all ${
                        data.website_position === idx + 1 ? "border-primary bg-primary/10 font-semibold" : "border-border hover:border-primary/50"
                      }`}>
                      <GripVertical className="inline w-3 h-3 mr-1" />{label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Preview com tema:</Label>
            <div className="flex gap-1">
              {colorThemes.map((t) => (
                <button key={t.id} onClick={() => setPreviewTheme(t.id)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: t.accent, borderColor: previewTheme === t.id ? "white" : t.bg, transform: previewTheme === t.id ? "scale(1.2)" : "scale(1)" }}
                  title={t.name} />
              ))}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden sticky top-4" style={{ background: theme.bgSecondary }}>
            <div className="p-8">
              <div className="rounded-2xl border p-8 text-center"
                style={{ background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 8px 30px ${theme.accent}15` }}>
                {previewElements}
              </div>
              <p className="text-center text-sm mt-6" style={{ color: theme.textMuted }}>
                © {new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date())} — Proposta exclusiva para Nome do Cliente • Cidade
              </p>
              <p className="text-center text-[10px] mt-3" style={{ color: theme.textMuted + "90" }}>
                Sistema de Orçamento Desenvolvido por{" "}
                <a href="https://www.matheusrangel.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline underline-offset-2" style={{ color: theme.accent }}>
                  Matheus Rangel
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-2 md:-mx-4 mt-6 z-10">
        <div className="rounded-2xl border border-border/60 bg-background/85 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">Alterações são aplicadas em <strong>todos os orçamentos e relatórios</strong>.</p>
          <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 ml-auto" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar e Aplicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
