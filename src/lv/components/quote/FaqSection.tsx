// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lv/integrations/supabase/client";
import type { ColorTheme } from "@/lv/lib/colorThemes";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

interface Props {
  theme: ColorTheme;
  layoutType: "simple" | "detailed";
  userId?: string;
}

export default function FaqSection({ theme, layoutType, userId }: Props) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchFaq = async () => {
      let query = supabase
        .from("quote_faq_items")
        .select("id, question, answer, sort_order")
        .eq("is_active", true)
        .eq(layoutType === "simple" ? "show_on_simple" : "show_on_detailed", true)
        .order("sort_order", { ascending: true });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data } = await query;
      setItems((data as FaqItem[]) || []);
      setLoaded(true);
    };
    fetchFaq();
  }, [layoutType, userId]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="py-20 px-6" style={{ background: "var(--q-bg2, " + theme.bgSecondary + ")" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14 animate-on-scroll">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">❓ Perguntas Frequentes</h2>
        </div>
        <div className="space-y-3">
          {items.map((faq, i) => (
            <div
              key={faq.id}
              className="rounded-xl border overflow-hidden animate-on-scroll"
              style={{ background: theme.card, borderColor: theme.cardBorder }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
                style={{ color: theme.text }}
              >
                <span className="font-semibold text-sm pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                  style={{ color: theme.accent }}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-96 pb-5 px-5" : "max-h-0"}`}>
                <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
