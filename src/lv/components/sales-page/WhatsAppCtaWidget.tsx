// @ts-nocheck
"use client";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";
import { useTrackClick } from "@/lv/pages/SalesPage";
import { useSmartCta } from "@/lv/components/sales-page/useSmartCta";

export function buildStyles(p: string) {
  return `
@keyframes ${p}-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes ${p}-shake {
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(12deg); }
  30% { transform: rotate(-10deg); }
  45% { transform: rotate(8deg); }
  60% { transform: rotate(-6deg); }
  75% { transform: rotate(3deg); }
}
@keyframes ${p}-neon-pulse {
  0%, 100% { box-shadow: 0 0 6px #25D366, 0 0 14px #25D36680; }
  50% { box-shadow: 0 0 16px #25D366, 0 0 32px #25D366A0; }
}
@keyframes ${p}-glitch {
  0%, 100% { transform: translate(0); filter: none; }
  10% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
  20% { transform: translate(2px, -1px); filter: hue-rotate(-90deg) saturate(2); }
  30% { transform: translate(0); filter: none; }
  40% { transform: translate(-1px, -2px) skewX(-1deg); filter: hue-rotate(45deg) brightness(1.3); }
  50% { transform: translate(1px, 1px); filter: none; }
  60% { transform: translate(-2px, 0) skewX(1deg); filter: hue-rotate(-45deg); }
  70% { transform: translate(0); filter: none; }
  80% { transform: translate(2px, -1px); filter: saturate(1.5) brightness(0.9); }
  90% { transform: translate(0); filter: none; }
}
@keyframes ${p}-flicker {
  0%, 100% { opacity: 1; }
  5% { opacity: 0.2; }
  10% { opacity: 1; }
  15% { opacity: 0.6; }
  20% { opacity: 1; }
  50% { opacity: 1; }
  52% { opacity: 0.3; }
  54% { opacity: 1; }
  80% { opacity: 1; }
  82% { opacity: 0.1; }
  83% { opacity: 1; }
}
@keyframes ${p}-malcontact {
  0%, 100% { transform: translate(0) scale(1); opacity: 1; filter: none; }
  3% { transform: translate(-3px, 1px) scale(1.01); opacity: 0.8; filter: brightness(1.4); }
  6% { transform: translate(2px, -1px) scale(0.99); opacity: 1; filter: none; }
  9% { transform: translate(0) scale(1); opacity: 0.3; filter: brightness(2); }
  12% { transform: translate(1px, 2px) scale(1); opacity: 1; filter: none; }
  40% { transform: translate(0) scale(1); opacity: 1; filter: none; }
  42% { transform: translate(-1px, 0) scale(1.005); opacity: 0.6; filter: hue-rotate(30deg); }
  44% { transform: translate(0) scale(1); opacity: 1; filter: none; }
  70% { transform: translate(0) scale(1); opacity: 1; filter: none; }
  72% { opacity: 0.1; transform: translate(3px, -2px) skewX(-2deg); filter: brightness(1.5); }
  74% { opacity: 1; transform: translate(0) skewX(0); filter: none; }
}
@keyframes ${p}-malcontact-v2 {
  0%, 100% { transform: translateX(0); opacity: 1; filter: none; }
  4% { transform: translateX(-6px); opacity: 0.7; filter: brightness(1.6) hue-rotate(20deg); }
  8% { transform: translateX(4px); opacity: 1; filter: none; }
  12% { transform: translateX(-2px); opacity: 0.2; filter: brightness(2.5); }
  16% { transform: translateX(0); opacity: 1; filter: none; }
  50% { transform: translateX(0); opacity: 1; filter: none; }
  52% { transform: translateX(5px); opacity: 0.5; filter: hue-rotate(-40deg); }
  54% { transform: translateX(-3px); opacity: 0.9; filter: none; }
  56% { transform: translateX(0); opacity: 1; filter: none; }
}
@keyframes ${p}-malcontact-v3 {
  0%, 100% { transform: translate(0) skew(0); opacity: 1; filter: none; }
  2% { transform: translate(0, -3px) skewX(3deg); opacity: 0.6; filter: brightness(1.8) saturate(2); }
  4% { transform: translate(0, 2px) skewX(-2deg); opacity: 1; filter: none; }
  6% { transform: translate(0, -1px) skewX(1deg); opacity: 0.1; filter: brightness(3); }
  8% { transform: translate(0) skew(0); opacity: 1; filter: none; }
  35% { transform: translate(0) skew(0); opacity: 1; filter: none; }
  36% { transform: translate(0, 2px) skewY(1deg); opacity: 0.4; filter: hue-rotate(60deg); }
  38% { transform: translate(0) skew(0); opacity: 1; filter: none; }
  65% { transform: translate(0) skew(0); opacity: 1; filter: none; }
  66% { transform: translate(0, -4px) skewX(-3deg); opacity: 0.3; filter: brightness(2) saturate(3); }
  68% { transform: translate(0) skew(0); opacity: 1; filter: none; }
}
@keyframes ${p}-malcontact-hz {
  0%, 100% { transform: translateX(0) scaleX(1); opacity: 1; filter: none; }
  3% { transform: translateX(-8px) scaleX(1.02); opacity: 0.7; filter: brightness(1.5) hue-rotate(15deg); }
  5% { transform: translateX(6px) scaleX(0.98); opacity: 0.3; filter: brightness(2); }
  7% { transform: translateX(-3px) scaleX(1.01); opacity: 0.9; filter: none; }
  9% { transform: translateX(0) scaleX(1); opacity: 1; filter: none; }
  30% { transform: translateX(0) scaleX(1); opacity: 1; filter: none; }
  32% { transform: translateX(10px) scaleX(0.97); opacity: 0.5; filter: hue-rotate(-30deg) saturate(1.5); }
  34% { transform: translateX(-5px) scaleX(1.01); opacity: 0.8; filter: brightness(1.3); }
  36% { transform: translateX(0) scaleX(1); opacity: 1; filter: none; }
  60% { transform: translateX(0) scaleX(1); opacity: 1; filter: none; }
  61% { transform: translateX(-12px) scaleX(1.03); opacity: 0.15; filter: brightness(2.5); }
  63% { transform: translateX(7px) scaleX(0.99); opacity: 0.6; filter: none; }
  65% { transform: translateX(0) scaleX(1); opacity: 1; filter: none; }
}
@keyframes ${p}-pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(37,211,102,0.3), 0 0 20px rgba(37,211,102,0.1); }
  50% { box-shadow: 0 0 20px rgba(37,211,102,0.6), 0 0 60px rgba(37,211,102,0.3), 0 0 100px rgba(37,211,102,0.1); }
}
@keyframes ${p}-interference {
  0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); filter: none; }
  5% { clip-path: inset(20% 0 30% 0); transform: translate(-4px, 0); filter: hue-rotate(90deg); }
  10% { clip-path: inset(0 0 0 0); transform: translate(0); filter: none; }
  25% { clip-path: inset(50% 0 10% 0); transform: translate(3px, 0); filter: saturate(2); }
  30% { clip-path: inset(0 0 0 0); transform: translate(0); filter: none; }
  55% { clip-path: inset(10% 0 60% 0); transform: translate(-2px, 0); filter: hue-rotate(-60deg); }
  60% { clip-path: inset(0 0 0 0); transform: translate(0); filter: none; }
  80% { clip-path: inset(40% 0 20% 0); transform: translate(2px, 0); filter: brightness(1.5); }
  85% { clip-path: inset(0 0 0 0); transform: translate(0); filter: none; }
}
@keyframes ${p}-scanline-move {
  0% { top: -30%; }
  100% { top: 110%; }
}
@keyframes ${p}-hacker-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
`;
}

interface WhatsAppCtaWidgetProps {
  sectionKey: string;
}

export default function WhatsAppCtaWidget({ sectionKey }: WhatsAppCtaWidgetProps) {
  const c = usePublicConfig();
  const trackClick = useTrackClick();
  const smart = useSmartCta("widget");

  if (!c.whatsappCtaSections?.includes(sectionKey)) return null;

  const marginBottom = c.whatsappCtaMarginBottom ?? 0;

  return (
    <>
      <style>{buildStyles("wca")}</style>
      <div className="flex flex-col items-center px-4 gap-3" style={{ marginTop: "40px", marginBottom: `${marginBottom}px` }}>
        {/* CTA Phrase */}
        {c.whatsappCtaPhraseEnabled && c.whatsappCtaPhraseText && (
          <p
            style={{
              fontSize: c.whatsappCtaPhraseSize || 16,
              color: c.whatsappCtaPhraseColor || "#FFFFFF",
              fontFamily: c.whatsappCtaPhraseFont || "Poppins",
              fontWeight: c.whatsappCtaPhraseBold ? 700 : 400,
              fontStyle: c.whatsappCtaPhraseItalic ? "italic" : "normal",
              textAlign: c.whatsappCtaPhraseAlign || "center",
              lineHeight: c.whatsappCtaPhraseLineHeight ?? 1.4,
              letterSpacing: `${c.whatsappCtaPhraseLetterSpacing ?? 0}px`,
            }}
            className="max-w-xl w-full"
          >
            {c.whatsappCtaPhraseText}
          </p>
        )}
        <WhatsAppCtaBanner config={c} onClick={() => {
          trackClick(`wca-${sectionKey}`, `WhatsApp CTA - ${sectionKey}`);
          if (smart.requiresSimulator) {
            smart.onClick();
          } else {
            window.open(smart.href, "_blank");
          }
        }} />
      </div>
    </>
  );
}

/** Shared render used by both widget and admin preview */
export function WhatsAppCtaBanner({ config: c, onClick, animPrefix = "wca" }: { config: any; onClick?: () => void; animPrefix?: string }) {
  const avatarUrl = c.whatsappCtaAvatarUrl || "";
  const avatarSize = c.whatsappCtaAvatarSize || 72;
  const iconSize = c.whatsappCtaIconSize || 44;
  const iconSvgSize = Math.round(iconSize * 0.5);
  const title1 = c.whatsappCtaTitle1 || "ATENDIMENTO";
  const title2 = c.whatsappCtaTitle2 || "WHATSAPP";
  const btnText = c.whatsappCtaBtnText || "Clique Aqui Agora";
  const is3D = c.whatsappCta3D !== false;
  const align = c.whatsappCtaTextAlign || "left";

  const t1Size = c.whatsappCtaTitle1Size || 18;
  const t1Color = c.whatsappCtaTitle1Color || "#FFFFFF";
  const t2Size = c.whatsappCtaTitle2Size || 26;
  const g1 = c.whatsappCtaTitle2Gradient1 || "#25D366";
  const g2 = c.whatsappCtaTitle2Gradient2 || "#0AE85E";
  const btnSize = c.whatsappCtaBtnSize || 14;
  const bg1 = c.whatsappCtaBtnGradient1 || "#25D366";
  const bg2 = c.whatsappCtaBtnGradient2 || "#0AE85E";
  const btnColor = c.whatsappCtaBtnColor || "#FFFFFF";
  const t1Font = c.whatsappCtaTitle1Font || "Poppins";
  const t1Bold = c.whatsappCtaTitle1Bold !== false;
  const t1Italic = c.whatsappCtaTitle1Italic || false;
  const t1Spacing = c.whatsappCtaTitle1LetterSpacing ?? 0;
  const t1LH = c.whatsappCtaTitle1LineHeight ?? 1.1;
  const t2Font = c.whatsappCtaTitle2Font || "Poppins";
  const t2Bold = c.whatsappCtaTitle2Bold !== false;
  const t2Italic = c.whatsappCtaTitle2Italic || false;
  const t2Spacing = c.whatsappCtaTitle2LetterSpacing ?? 0;
  const t2LH = c.whatsappCtaTitle2LineHeight ?? 1.1;
  const btnFont = c.whatsappCtaBtnFont || "Poppins";
  const btnBold = c.whatsappCtaBtnBold !== false;
  const btnItalic = c.whatsappCtaBtnItalic || false;
  const btnSpacing = c.whatsappCtaBtnLetterSpacing ?? 0;
  const btnLH = c.whatsappCtaBtnLineHeight ?? 1.2;

  const bezel3D = is3D
    ? "0 12px 40px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 4px rgba(0,0,0,0.3)"
    : "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)";

  const avatarBezel = is3D
    ? "0 4px 16px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.2)"
    : "none";

  const textAlignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  const globalEffect = c.whatsappCtaGlobalEffect || "none";
  const gSpeed = c.whatsappCtaGlobalEffectSpeed || 2;
  const globalAnim = globalEffect !== "none"
    ? `${animPrefix}-${globalEffect} ${gSpeed}s ease-in-out infinite`
    : "none";

  // Responsive scaling for mobile
  const mobileScale = 0.65;
  const isMobileQuery = typeof window !== "undefined" && window.innerWidth < 640;
  const rT1Size = isMobileQuery ? Math.round(t1Size * mobileScale) : t1Size;
  const rT2Size = isMobileQuery ? Math.round(t2Size * mobileScale) : t2Size;
  const rBtnSize = isMobileQuery ? Math.round(btnSize * mobileScale) : btnSize;
  const rAvatarSize = isMobileQuery ? Math.min(avatarSize, 56) : avatarSize;
  const rIconSize = isMobileQuery ? Math.min(iconSize, 36) : iconSize;
  const rIconSvgSize = Math.round(rIconSize * 0.5);

  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-3 sm:gap-4 md:gap-6 px-3 sm:px-5 md:px-8 py-3 sm:py-4 md:py-5 cursor-pointer group w-full max-w-xl transition-shadow duration-300"
      style={{
        background: "linear-gradient(145deg, #222222 0%, #1a1a1a 40%, #111111 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: is3D ? "20px" : "16px",
        boxShadow: bezel3D,
        animation: globalAnim,
      }}
      onMouseEnter={(e) => {
        const accent = c.whatsappCtaTitle2Gradient1 || "#25D366";
        e.currentTarget.style.boxShadow = `${bezel3D}, 0 0 30px ${accent}40, 0 0 60px ${accent}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = bezel3D;
      }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: rAvatarSize, height: rAvatarSize,
            borderRadius: "50%",
            border: "3.5px solid #25D366",
            animation: c.whatsappCtaNeonBorder ? `${animPrefix}-neon-pulse ${c.whatsappCtaNeonSpeed || 2}s ease-in-out infinite` : "none",
            boxShadow: avatarBezel,
          }}
        >
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
        </div>
      ) : (
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: rAvatarSize, height: rAvatarSize,
            borderRadius: "50%",
            border: "3.5px solid #25D366",
            background: "#1a1a1a",
            animation: c.whatsappCtaNeonBorder ? `${animPrefix}-neon-pulse ${c.whatsappCtaNeonSpeed || 2}s ease-in-out infinite` : "none",
            boxShadow: avatarBezel,
          }}
        >
          <span className="text-xs" style={{ color: "#555" }}>Foto</span>
        </div>
      )}

      {/* Text content */}
      <div className={`flex-1 min-w-0 ${textAlignClass}`}>
        <div
          className="truncate"
          style={{ fontSize: rT1Size, color: t1Color, fontFamily: t1Font, fontWeight: t1Bold ? 800 : 400, fontStyle: t1Italic ? "italic" : "normal", letterSpacing: `${t1Spacing}px`, lineHeight: t1LH }}
        >
          {title1}
        </div>
        <div
          className="truncate"
          style={{
            fontSize: rT2Size,
            fontFamily: t2Font,
            fontWeight: t2Bold ? 900 : 400,
            fontStyle: t2Italic ? "italic" : "normal",
            letterSpacing: `${t2Spacing}px`,
            lineHeight: Math.max(t2LH, 1),
            backgroundImage: `linear-gradient(90deg, ${g1}, ${g2})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {title2}
        </div>
        <div
          className="mt-1.5 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5"
          style={{
            fontSize: rBtnSize,
            fontFamily: btnFont,
            fontWeight: btnBold ? 700 : 400,
            fontStyle: btnItalic ? "italic" : "normal",
            letterSpacing: `${btnSpacing}px`,
            lineHeight: btnLH,
            background: `linear-gradient(90deg, ${bg1}, ${bg2})`,
            color: btnColor,
            borderRadius: is3D ? "8px" : "6px",
            boxShadow: is3D ? `0 4px 12px ${bg1}40, inset 0 1px 0 rgba(255,255,255,0.15)` : "none",
            animation: c.whatsappCtaBtnBlink ? `${animPrefix}-blink ${c.whatsappCtaBtnBlinkSpeed || 2}s ease-in-out infinite` : "none",
          }}
        >
          {btnText}
          {/* Cursor click icon like reference */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 sm:w-[18px] sm:h-[18px]">
            <path d="M7 17L17 7M17 7H7M17 7V17" stroke={btnColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* WhatsApp icon */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: rIconSize, height: rIconSize,
          borderRadius: is3D ? "14px" : "12px",
          background: "rgba(37, 211, 102, 0.08)",
          border: "1px solid rgba(37, 211, 102, 0.25)",
          animation: c.whatsappCtaIconShake ? `${animPrefix}-shake ${c.whatsappCtaIconShakeSpeed || 2}s ease-in-out infinite` : "none",
          animationDelay: "1s",
          boxShadow: is3D ? "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
        }}
      >
        <svg width={rIconSvgSize} height={rIconSvgSize} viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>

      {/* 3D bezel overlay */}
      {is3D && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "20px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 2px rgba(0,0,0,0.3), inset 1px 0 0 rgba(255,255,255,0.03), inset -1px 0 0 rgba(255,255,255,0.03)",
          }}
        />
      )}

      {/* Scanlines overlay */}
      {c.whatsappCtaScanlines && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ borderRadius: is3D ? "20px" : "16px" }}
        >
          {/* Repeating horizontal lines */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${c.whatsappCtaScanlineThickness || 2}px, ${c.whatsappCtaScanlineColor || "#00ff41"} ${c.whatsappCtaScanlineThickness || 2}px, ${c.whatsappCtaScanlineColor || "#00ff41"} ${(c.whatsappCtaScanlineThickness || 2) + 1}px)`,
              opacity: c.whatsappCtaScanlineOpacity ?? 0.15,
              backgroundSize: `100% ${(c.whatsappCtaScanlineThickness || 2) * 3}px`,
            }}
          />
          {/* Moving scan beam */}
          <div
            className="absolute left-0 right-0"
            style={{
              height: "30%",
              top: "-30%",
              background: `linear-gradient(180deg, transparent 0%, ${c.whatsappCtaScanlineColor || "#00ff41"}15 40%, ${c.whatsappCtaScanlineColor || "#00ff41"}25 50%, ${c.whatsappCtaScanlineColor || "#00ff41"}15 60%, transparent 100%)`,
              animation: `${animPrefix}-scanline-move ${c.whatsappCtaScanlineSpeed || 3}s linear infinite`,
            }}
          />
        </div>
      )}

      {/* Hacker glow shadow */}
      {c.whatsappCtaHackerGlow && (
        <div
          className="absolute -inset-1 pointer-events-none"
          style={{
            borderRadius: is3D ? "24px" : "20px",
            boxShadow: `0 0 ${(c.whatsappCtaHackerGlowIntensity || 5) * 3}px ${c.whatsappCtaHackerGlowColor || "#25D366"}60, 0 0 ${(c.whatsappCtaHackerGlowIntensity || 5) * 6}px ${c.whatsappCtaHackerGlowColor || "#25D366"}30, 0 0 ${(c.whatsappCtaHackerGlowIntensity || 5) * 10}px ${c.whatsappCtaHackerGlowColor || "#25D366"}15`,
            animation: `${animPrefix}-hacker-glow ${c.whatsappCtaHackerGlowSpeed || 2}s ease-in-out infinite`,
          }}
        />
      )}
    </button>
  );
}
