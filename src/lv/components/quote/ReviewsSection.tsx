// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import type { ColorTheme } from "@/lv/lib/colorThemes";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { GoogleIcon } from "@/lv/components/icons/PlatformIcons";

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_photo_url: string;
  review_text: string;
  rating: number;
  reviewer_location: string;
  review_layout: string;
}

interface DisplaySettings {
  maxCount: number;
  autoPlay: boolean;
  autoPlayInterval: number;
  infiniteLoop: boolean;
}

interface Props {
  theme: ColorTheme;
}

function loadDisplaySettings(): DisplaySettings {
  try {
    const saved = localStorage.getItem("google_reviews_display_settings");
    if (saved) return { maxCount: 0, autoPlay: true, autoPlayInterval: 5, infiniteLoop: true, ...JSON.parse(saved) };
  } catch {}
  return { maxCount: 0, autoPlay: true, autoPlayInterval: 5, infiniteLoop: true };
}

export default function ReviewsSection({ theme }: Props) {
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [layout, setLayout] = useState("carousel");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings] = useState<DisplaySettings>(loadDisplaySettings);

  useEffect(() => {
    supabase
      .from("google_reviews")
      .select("*")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllReviews(data as any[]);
          setLayout((data as any[])[0].review_layout || "carousel");
        }
      });
  }, []);

  const reviews = settings.maxCount > 0 ? allReviews.slice(0, settings.maxCount) : allReviews;

  // Auto-play for carousel
  const next = useCallback(() => {
    setCurrentIndex(i => {
      if (settings.infiniteLoop) return (i + 1) % reviews.length;
      return i < reviews.length - 1 ? i + 1 : i;
    });
  }, [reviews.length, settings.infiniteLoop]);

  const prev = useCallback(() => {
    setCurrentIndex(i => {
      if (settings.infiniteLoop) return (i - 1 + reviews.length) % reviews.length;
      return i > 0 ? i - 1 : i;
    });
  }, [reviews.length, settings.infiniteLoop]);

  useEffect(() => {
    if (layout !== "carousel" || !settings.autoPlay || reviews.length <= 1) return;
    const timer = setInterval(next, settings.autoPlayInterval * 1000);
    return () => clearInterval(timer);
  }, [layout, settings.autoPlay, settings.autoPlayInterval, reviews.length, next]);

  if (reviews.length === 0) return null;

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const RatingStars = ({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${size} ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );

  const ReviewerAvatar = ({ r }: { r: Review }) => (
    r.reviewer_photo_url ? (
      <img src={r.reviewer_photo_url} alt={r.reviewer_name} className="w-12 h-12 rounded-full object-cover" />
    ) : (
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
        style={{ background: theme.accent + "22", color: theme.accent }}>
        {r.reviewer_name.charAt(0).toUpperCase()}
      </div>
    )
  );

  // ============== LAYOUT: CAROUSEL ==============
  if (layout === "carousel") {
    const review = reviews[currentIndex];

    return (
      <section className="py-20 px-6 animate-on-scroll" data-section-id="reviews" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Resultados que Falam por Si</h2>
          <p className="text-sm mb-10" style={{ color: theme.textMuted }}>O que nossos clientes dizem sobre nosso trabalho</p>

          <div className="rounded-2xl border p-8 md:p-10 relative overflow-hidden" style={{ background: theme.card, borderColor: theme.cardBorder }}>
            <Quote className="w-8 h-8 mb-4 mx-auto" style={{ color: theme.accent + "44" }} />
            <div className="transition-opacity duration-500" key={currentIndex}>
              <p className="text-lg md:text-xl italic leading-relaxed mb-6" style={{ color: theme.text }}>
                {review.review_text}
              </p>
              <div className="flex flex-col items-center gap-2">
                <ReviewerAvatar r={review} />
                <p className="font-semibold" style={{ color: theme.text }}>{review.reviewer_name}</p>
                {review.reviewer_location && (
                  <p className="text-xs" style={{ color: theme.textMuted }}>{review.reviewer_location}</p>
                )}
                <RatingStars rating={review.rating} size="h-5 w-5" />
              </div>
            </div>

            {reviews.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button onClick={prev} className="p-2 rounded-full border hover:scale-105 transition-transform"
                  style={{ borderColor: theme.cardBorder, color: theme.textMuted }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-1.5">
                  {reviews.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIndex(i)}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ background: i === currentIndex ? theme.accent : theme.cardBorder }} />
                  ))}
                </div>
                <button onClick={next} className="p-2 rounded-full border hover:scale-105 transition-transform"
                  style={{ borderColor: theme.cardBorder, color: theme.textMuted }}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { value: `+${reviews.length * 10}`, label: "Resultados no 1º mês" },
              { value: `R$ 3,50`, label: "Custo médio por conversa no WhatsApp" },
              { value: `${avgRating}/5`, label: "Nota média dos clientes ativos" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border p-4" style={{ background: theme.card, borderColor: theme.cardBorder }}>
                <p className="text-2xl font-bold" style={{ color: theme.accent }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ============== LAYOUT: GRID ==============
  if (layout === "grid") {
    return (
      <section className="py-20 px-6 animate-on-scroll" data-section-id="reviews" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">O que dizem nossos clientes</h2>
            <div className="flex items-center justify-center gap-2 mt-3">
              <GoogleIcon className="w-5 h-5" />
              <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>{avgRating}/5 · {reviews.length} avaliações</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map(r => (
              <div key={r.id} className="rounded-xl border p-6 hover:-translate-y-1 transition-all duration-300"
                style={{ background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 4px 20px ${theme.accent}10` }}>
                <div className="flex items-center gap-3 mb-4">
                  <ReviewerAvatar r={r} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: theme.text }}>{r.reviewer_name}</p>
                    {r.reviewer_location && <p className="text-xs" style={{ color: theme.textMuted }}>{r.reviewer_location}</p>}
                  </div>
                </div>
                <RatingStars rating={r.rating} />
                <p className="text-sm mt-3 leading-relaxed" style={{ color: theme.textMuted }}>{r.review_text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ============== LAYOUT: HIGHLIGHT ==============
  if (layout === "highlight") {
    const main = reviews[0];
    const others = reviews.slice(1);

    return (
      <section className="py-20 px-6 animate-on-scroll" data-section-id="reviews" style={{ background: "var(--q-bg2)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Depoimentos de Clientes</h2>

          <div className="rounded-2xl border p-8 md:p-12 text-center mb-8" style={{ background: theme.card, borderColor: theme.cardBorder, boxShadow: `0 8px 30px ${theme.accent}12` }}>
            <ReviewerAvatar r={main} />
            <Quote className="w-10 h-10 mx-auto mt-4 mb-4" style={{ color: theme.accent + "33" }} />
            <p className="text-xl md:text-2xl italic leading-relaxed mb-6" style={{ color: theme.text }}>"{main.review_text}"</p>
            <p className="font-bold text-lg" style={{ color: theme.text }}>{main.reviewer_name}</p>
            {main.reviewer_location && <p className="text-sm" style={{ color: theme.textMuted }}>{main.reviewer_location}</p>}
            <div className="mt-3 flex justify-center"><RatingStars rating={main.rating} size="h-6 w-6" /></div>
          </div>

          {others.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {others.map(r => (
                <div key={r.id} className="rounded-xl border p-5 flex gap-4 items-start"
                  style={{ background: theme.card, borderColor: theme.cardBorder }}>
                  <ReviewerAvatar r={r} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: theme.text }}>{r.reviewer_name}</p>
                    <RatingStars rating={r.rating} size="h-3.5 w-3.5" />
                    <p className="text-sm mt-2 leading-relaxed line-clamp-3" style={{ color: theme.textMuted }}>{r.review_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ============== LAYOUT: LIST ==============
  return (
    <section className="py-20 px-6 animate-on-scroll" data-section-id="reviews" style={{ background: "var(--q-bg2)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Avaliações dos Clientes</h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <RatingStars rating={Math.round(Number(avgRating))} size="h-5 w-5" />
            <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>{avgRating} de 5</span>
          </div>
        </div>
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="rounded-xl border p-6" style={{ background: theme.card, borderColor: theme.cardBorder }}>
              <div className="flex items-center gap-3 mb-3">
                <ReviewerAvatar r={r} />
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: theme.text }}>{r.reviewer_name}</p>
                  {r.reviewer_location && <p className="text-xs" style={{ color: theme.textMuted }}>{r.reviewer_location}</p>}
                </div>
                <RatingStars rating={r.rating} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{r.review_text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
