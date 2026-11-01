// @ts-nocheck
"use client";
/**
 * Section to display report creatives (campaign images/ads)
 */
import { useState } from "react";
import { type ReportTheme } from "@/lv/lib/reportThemes";
import { Image, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Creative {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

interface Props {
  creatives: Creative[];
  theme: ReportTheme;
}

export default function ReportCreativesSection({ creatives, theme }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!creatives || creatives.length === 0) return null;

  const sorted = [...creatives].sort((a, b) => a.sort_order - b.sort_order);

  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex(i => i !== null ? (i - 1 + sorted.length) % sorted.length : null);
  const next = () => setLightboxIndex(i => i !== null ? (i + 1) % sorted.length : null);

  return (
    <>
      <section className="rounded-xl p-5 md:p-6 border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
        <div className="flex items-center gap-2 mb-4">
          <Image className="h-5 w-5" style={{ color: theme.accent }} />
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>Criativos da Campanha</h2>
        </div>
        <div className={`grid gap-3 ${sorted.length === 1 ? 'grid-cols-1 max-w-sm' : sorted.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          {sorted.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => openLightbox(idx)}
              className="group relative rounded-lg overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ borderColor: theme.cardBorder, aspectRatio: "1" }}
            >
              <img
                src={c.image_url}
                alt={c.caption || `Criativo ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {c.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">{c.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
            <X className="h-5 w-5" />
          </button>

          {sorted.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="max-w-3xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={sorted[lightboxIndex].image_url}
              alt={sorted[lightboxIndex].caption || ""}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            {sorted[lightboxIndex].caption && (
              <p className="mt-3 text-sm text-white/80 text-center">{sorted[lightboxIndex].caption}</p>
            )}
            <p className="mt-1 text-xs text-white/40">{lightboxIndex + 1} / {sorted.length}</p>
          </div>
        </div>
      )}
    </>
  );
}
