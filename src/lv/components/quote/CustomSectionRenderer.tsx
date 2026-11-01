// @ts-nocheck
"use client";
import { useState } from "react";
import { Input } from "@/lv/components/ui/input";
import { Textarea } from "@/lv/components/ui/textarea";
import { Button } from "@/lv/components/ui/button";
import { Label } from "@/lv/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import type { SectionDefinition } from "@/lv/lib/sectionTypes";
import type { ColorTheme } from "@/lv/lib/colorThemes";

interface Props {
  section: SectionDefinition;
  theme: ColorTheme;
  onChange: (updated: SectionDefinition) => void;
  editMode?: boolean;
}

export default function CustomSectionRenderer({ section, theme, onChange, editMode }: Props) {
  const data = section.data || {};

  const updateData = (patch: Partial<typeof data>) => {
    onChange({ ...section, data: { ...data, ...patch } });
  };

  // --- TEXT SECTION ---
  if (section.type === "text") {
    return (
      <section className="py-16 px-6" style={{ background: theme.bgSecondary }}>
        <div className="max-w-3xl mx-auto text-center">
          {editMode ? (
            <div className="space-y-3">
              <Input
                value={data.title || ""}
                onChange={e => updateData({ title: e.target.value })}
                placeholder="Título da seção"
                className="text-center text-2xl font-bold bg-transparent border-dashed"
                style={{ color: theme.text }}
              />
              <Textarea
                value={data.content || ""}
                onChange={e => updateData({ content: e.target.value })}
                placeholder="Conteúdo da seção..."
                className="text-center bg-transparent border-dashed min-h-[100px] resize-none"
                style={{ color: theme.textMuted }}
              />
            </div>
          ) : (
            <>
              {data.title && (
                <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.text }}>
                  {data.title}
                </h2>
              )}
              {data.content && (
                <p className="text-base md:text-lg leading-relaxed whitespace-pre-line" style={{ color: theme.textMuted }}>
                  {data.content}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  // --- IMAGE SECTION ---
  if (section.type === "image") {
    return (
      <section className="py-12 px-6" style={{ background: theme.bgSecondary }}>
        <div className="max-w-4xl mx-auto">
          {editMode ? (
            <div className="space-y-3">
              <Input
                value={data.title || ""}
                onChange={e => updateData({ title: e.target.value })}
                placeholder="Título (opcional)"
                className="bg-transparent border-dashed"
                style={{ color: theme.text }}
              />
              <Input
                value={data.imageUrl || ""}
                onChange={e => updateData({ imageUrl: e.target.value })}
                placeholder="URL da imagem (https://...)"
                className="bg-transparent border-dashed text-sm"
                style={{ color: theme.textMuted }}
              />
              {data.imageUrl && (
                <img
                  src={data.imageUrl}
                  alt={data.imageAlt || ""}
                  className="w-full rounded-xl max-h-96 object-cover"
                />
              )}
              {!data.imageUrl && (
                <div className="w-full h-48 rounded-xl border-2 border-dashed flex items-center justify-center" style={{ borderColor: theme.cardBorder }}>
                  <div className="text-center" style={{ color: theme.textMuted }}>
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Cole a URL da imagem acima</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {data.title && (
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: theme.text }}>{data.title}</h2>
              )}
              {data.imageUrl && (
                <img
                  src={data.imageUrl}
                  alt={data.imageAlt || ""}
                  className="w-full rounded-xl max-h-[500px] object-cover"
                />
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  // --- VIDEO SECTION ---
  if (section.type === "video") {
    const getEmbedUrl = (url: string) => {
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      return url;
    };

    return (
      <section className="py-16 px-6" style={{ background: theme.bgSecondary }}>
        <div className="max-w-4xl mx-auto">
          {editMode ? (
            <div className="space-y-3">
              <Input
                value={data.title || ""}
                onChange={e => updateData({ title: e.target.value })}
                placeholder="Título (opcional)"
                className="bg-transparent border-dashed"
                style={{ color: theme.text }}
              />
              <div className="flex gap-2">
                <Select
                  value={data.videoType || "youtube"}
                  onValueChange={v => updateData({ videoType: v as any })}
                >
                  <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="url">URL Direta</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={data.videoUrl || ""}
                  onChange={e => updateData({ videoUrl: e.target.value })}
                  placeholder="Cole o link do vídeo..."
                  className="flex-1 bg-transparent border-dashed text-sm"
                  style={{ color: theme.textMuted }}
                />
              </div>
              {data.videoUrl && (
                <div className="aspect-video rounded-xl overflow-hidden border" style={{ borderColor: theme.cardBorder }}>
                  {data.videoType === "url" ? (
                    <video src={data.videoUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <iframe src={getEmbedUrl(data.videoUrl)} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {data.title && (
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: theme.text }}>{data.title}</h2>
              )}
              {data.videoUrl && (
                <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                  {data.videoType === "url" ? (
                    <video src={data.videoUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <iframe src={getEmbedUrl(data.videoUrl)} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  // --- CAROUSEL SECTION ---
  if (section.type === "carousel") {
    const images = data.images || [];

    const addImage = () => {
      updateData({ images: [...images, { url: "", caption: "" }] });
    };

    const updateImage = (i: number, patch: Partial<{ url: string; caption: string }>) => {
      const updated = images.map((img, idx) => idx === i ? { ...img, ...patch } : img);
      updateData({ images: updated });
    };

    const removeImage = (i: number) => {
      updateData({ images: images.filter((_, idx) => idx !== i) });
    };

    return (
      <section className="py-16 px-6" style={{ background: theme.bgSecondary }}>
        <div className="max-w-5xl mx-auto">
          {editMode ? (
            <div className="space-y-4">
              <Input
                value={data.title || ""}
                onChange={e => updateData({ title: e.target.value })}
                placeholder="Título do carrossel (opcional)"
                className="bg-transparent border-dashed"
                style={{ color: theme.text }}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border" style={{ borderColor: theme.cardBorder, background: theme.card }}>
                    {img.url ? (
                      <img src={img.url} alt={img.caption || ""} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center" style={{ color: theme.textMuted }}>
                        <ImageIcon className="h-6 w-6 opacity-30" />
                      </div>
                    )}
                    <div className="p-2 space-y-1">
                      <Input
                        value={img.url}
                        onChange={e => updateImage(i, { url: e.target.value })}
                        placeholder="URL da imagem"
                        className="h-7 text-[10px] bg-transparent border-dashed"
                      />
                      <Input
                        value={img.caption || ""}
                        onChange={e => updateImage(i, { caption: e.target.value })}
                        placeholder="Legenda"
                        className="h-7 text-[10px] bg-transparent border-dashed"
                      />
                    </div>
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addImage}
                  className="h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1"
                  style={{ borderColor: theme.cardBorder, color: theme.textMuted }}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Adicionar</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {data.title && (
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: theme.text }}>{data.title}</h2>
              )}
              {images.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
                  {images.filter(img => img.url).map((img, i) => (
                    <div key={i} className="flex-shrink-0 snap-center w-72 md:w-80 rounded-xl overflow-hidden shadow-md" style={{ background: theme.card }}>
                      <img src={img.url} alt={img.caption || ""} className="w-full h-48 object-cover" />
                      {img.caption && (
                        <p className="p-3 text-sm" style={{ color: theme.textMuted }}>{img.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  return null;
}
