// @ts-nocheck
"use client";
import { motion } from "framer-motion";
import { Sparkles, MapPin, LucideIcon } from "lucide-react";

interface Props {
  city?: string | null;
  clientName?: string | null;
  businessType?: string | null;
  serviceLabel: string;
  ServiceIcon?: LucideIcon;
  accent: string;
  textMuted: string;
  text: string;
  quoteNumber?: string | null;
}

/**
 * Apple-premium exclusive client header used at the top of the hero
 * for Sites, E-commerce and Systems layouts. Signals to the client that
 * the proposal was crafted specifically for them.
 */
export default function ExclusiveClientHeader({
  city,
  clientName,
  businessType,
  serviceLabel,
  ServiceIcon,
  accent,
  textMuted,
  text,
  quoteNumber,
}: Props) {
  const displayName = (clientName || "").trim();
  const displayBusiness = (businessType || "").trim();
  const displayCity = (city || "").trim();

  return (
    <div className="mb-6">
      <style>{`
        @keyframes exclShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes exclPulseDot {
          0%,100% { transform: scale(1); opacity: 1; }
          50%     { transform: scale(1.4); opacity: 0.55; }
        }
        @keyframes exclUnderline {
          0%   { transform: scaleX(0); transform-origin: left; }
          60%  { transform: scaleX(1); transform-origin: left; }
          100% { transform: scaleX(1); transform-origin: left; }
        }
        .excl-shimmer {
          background-image: linear-gradient(90deg,
            var(--excl-accent) 0%,
            var(--excl-accent) 30%,
            #ffffff 50%,
            var(--excl-accent) 70%,
            var(--excl-accent) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: exclShimmer 5s linear infinite;
        }
        .excl-dot { animation: exclPulseDot 1.8s ease-in-out infinite; }
        .excl-underline { animation: exclUnderline 1.4s ease-out both; transform-origin: left; }
        @media (prefers-reduced-motion: reduce) {
          .excl-shimmer, .excl-dot, .excl-underline { animation: none; }
          .excl-shimmer { -webkit-text-fill-color: var(--excl-accent); color: var(--excl-accent); }
        }
      `}</style>

      {/* Badge row */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-center gap-2"
      >
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest ring-1 backdrop-blur"
          style={{
            background: `${accent}15`,
            color: accent,
            borderColor: `${accent}44`,
          }}
        >
          <span className="excl-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          <Sparkles className="h-3 w-3" />
          Proposta Exclusiva
          {displayCity && (
            <>
              <span className="opacity-40">•</span>
              <MapPin className="h-3 w-3" />
              {displayCity}
            </>
          )}
        </div>

        {ServiceIcon && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ring-1"
            style={{ background: `${accent}0a`, color: textMuted, borderColor: `${accent}22` }}
          >
            <ServiceIcon className="h-3 w-3" />
            {serviceLabel}
          </div>
        )}

        {quoteNumber && (
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ring-1"
            style={{ background: `${accent}0a`, color: textMuted, borderColor: `${accent}22` }}
          >
            Nº {quoteNumber}
          </div>
        )}
      </motion.div>

      {/* Personalized headline */}
      {displayName && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-5"
          style={{ ["--excl-accent" as any]: accent } as React.CSSProperties}
        >
          <p
            className="text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: textMuted }}
          >
            Preparada exclusivamente para
          </p>
          <div className="mt-1 flex items-baseline flex-wrap gap-x-3">
            <h2
              className="excl-shimmer text-2xl md:text-4xl font-bold leading-tight tracking-tight"
              style={{ ["--excl-accent" as any]: accent } as React.CSSProperties}
            >
              {displayName}
            </h2>
            {displayBusiness && (
              <span
                className="text-xs md:text-sm font-medium"
                style={{ color: textMuted }}
              >
                — {displayBusiness}
              </span>
            )}
          </div>
          <div
            className="excl-underline mt-2 h-[2px] rounded-full"
            style={{
              width: `min(${Math.max(120, displayName.length * 12)}px, 320px)`,
              background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
