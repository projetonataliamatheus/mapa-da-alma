// @ts-nocheck
"use client";
import { WhatsAppIcon, InstagramIcon } from "@/lv/components/icons/PlatformIcons";
import { Target, User, Search, MapPin, Briefcase, Zap, MessageSquare, HelpCircle, Pill, Camera, Users, TrendingUp, BarChart3, Award } from "lucide-react";
import type { SectionFloatingIcon } from "@/lv/hooks/useSalesPageConfig";

const LUCIDE_MAP: Record<string, React.ComponentType<any>> = {
  Target, User, Search, MapPin, Briefcase, Zap, MessageSquare, HelpCircle, Pill, Camera, Users, TrendingUp, BarChart3, Award,
};

const PLATFORM_MAP: Record<string, { component: React.ComponentType<any>; color: string }> = {
  whatsapp: { component: WhatsAppIcon, color: "#25D366" },
  instagram: { component: InstagramIcon, color: "url(#ig-gradient)" },
};

interface Props {
  config: SectionFloatingIcon;
}

export default function FloatingSectionIcon({ config }: Props) {
  if (config.type === "none") return null;

  const size = config.size || 48;
  const speed = config.speed || 1;
  const animDuration = 2.5 / speed;

  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    animation: `sp-float-icon ${animDuration}s ease-in-out infinite`,
  };

  let content: React.ReactNode = null;

  if (config.type === "platform") {
    const platform = PLATFORM_MAP[config.source?.toLowerCase()];
    if (platform) {
      const Comp = platform.component;
      const isIG = config.source?.toLowerCase() === "instagram";
      content = (
        <>
          {isIG && (
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#feda75" />
                  <stop offset="25%" stopColor="#fa7e1e" />
                  <stop offset="50%" stopColor="#d62976" />
                  <stop offset="75%" stopColor="#962fbf" />
                  <stop offset="100%" stopColor="#4f5bd5" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <Comp
            size={size * 0.75}
            style={{ color: isIG ? undefined : platform.color, fill: isIG ? "url(#ig-gradient)" : platform.color }}
            className=""
          />
        </>
      );
    }
  } else if (config.type === "lucide") {
    const Icon = LUCIDE_MAP[config.source];
    if (Icon) {
      content = <Icon size={size * 0.65} style={{ color: "var(--sp-accent)" }} />;
    }
  } else if (config.type === "image") {
    content = (
      <img
        src={config.source}
        alt="section icon"
        className={`object-cover ${config.isCircle ? "rounded-full" : ""}`}
        style={{
          width: size * 0.8,
          height: size * 0.8,
          ...(config.isCircle ? { border: "3px solid var(--sp-accent)" } : {}),
        }}
      />
    );
  }

  if (!content) return null;

  return (
    <div className="flex justify-center mb-4">
      <style>{`
        @keyframes sp-float-icon {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <div
        style={wrapperStyle}
        className="flex items-center justify-center"
      >
        {content}
      </div>
    </div>
  );
}
