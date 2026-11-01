// @ts-nocheck
"use client";
import { useState } from "react";
import { Pencil, X } from "lucide-react";

export type WhatsAppAnimation = "pulse" | "glow" | "shake" | "shine" | "bounce" | "none";

export const ANIMATION_OPTIONS: { value: WhatsAppAnimation; label: string; emoji: string }[] = [
  { value: "pulse", label: "Pulsar", emoji: "💓" },
  { value: "glow", label: "Brilhar", emoji: "✨" },
  { value: "shake", label: "Tremer", emoji: "📳" },
  { value: "shine", label: "Reflexo", emoji: "🌟" },
  { value: "bounce", label: "Quicar", emoji: "⬆️" },
  { value: "none", label: "Nenhum", emoji: "⏹️" },
];

interface Props {
  href: string;
  label: string;
  animation?: WhatsAppAnimation;
  editMode?: boolean;
  whatsappMessage?: string;
  onSaveLabel?: (label: string) => void;
  onSaveMessage?: (message: string) => void;
}

export default function WhatsAppCTAButton({ href, label, animation = "pulse", editMode, whatsappMessage, onSaveLabel, onSaveMessage }: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftMessage, setDraftMessage] = useState(whatsappMessage || "");

  const animClass = {
    pulse: "wa-btn-pulse",
    glow: "wa-btn-glow",
    shake: "wa-btn-shake",
    shine: "wa-btn-shine",
    bounce: "wa-btn-bounce",
    none: "",
  }[animation];

  const handleSave = () => {
    onSaveLabel?.(draftLabel);
    onSaveMessage?.(draftMessage);
    setShowEditor(false);
  };

  return (
    <>
      <style>{`
        .wa-btn-base {
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          box-shadow: 0 8px 32px rgba(37, 211, 102, 0.4), 0 0 0 0 rgba(37, 211, 102, 0.3);
          transition: all 0.3s ease;
        }
        .wa-btn-base:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(37, 211, 102, 0.5);
        }
        .wa-btn-pulse { animation: waPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes waPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(37, 211, 102, 0.4), 0 0 0 0 rgba(37, 211, 102, 0.4); }
          50% { box-shadow: 0 8px 32px rgba(37, 211, 102, 0.4), 0 0 0 16px rgba(37, 211, 102, 0); }
        }
        .wa-btn-glow { animation: waGlow 2s ease-in-out infinite; }
        @keyframes waGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(37, 211, 102, 0.3), 0 0 40px rgba(37, 211, 102, 0.1); }
          50% { box-shadow: 0 0 30px rgba(37, 211, 102, 0.6), 0 0 60px rgba(37, 211, 102, 0.3), 0 0 90px rgba(37, 211, 102, 0.1); }
        }
        .wa-btn-shake { animation: waShake 3s ease-in-out infinite; }
        @keyframes waShake {
          0%, 85%, 100% { transform: translateX(0); }
          87% { transform: translateX(-3px) rotate(-1deg); }
          89% { transform: translateX(3px) rotate(1deg); }
          91% { transform: translateX(-3px) rotate(-1deg); }
          93% { transform: translateX(3px) rotate(1deg); }
          95% { transform: translateX(-2px); }
          97% { transform: translateX(2px); }
        }
        .wa-btn-shine { position: relative; overflow: hidden; }
        .wa-btn-shine::after {
          content: '';
          position: absolute;
          top: -50%; left: -60%;
          width: 40%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-25deg);
          animation: waShine 3s ease-in-out infinite;
        }
        @keyframes waShine { 0%, 100% { left: -60%; } 50% { left: 120%; } }
        .wa-btn-bounce { animation: waBounce 2s ease-in-out infinite; }
        @keyframes waBounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-6px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-3px); }
        }
        .wa-icon-3d { filter: drop-shadow(2px 3px 4px rgba(0,0,0,0.3)); }
      `}</style>
      <div className="relative inline-block group/wa">
        <a
          href={editMode ? undefined : href}
          target={editMode ? undefined : "_blank"}
          rel="noopener noreferrer"
          onClick={editMode ? (e) => { e.preventDefault(); setShowEditor(!showEditor); } : undefined}
          className={`wa-btn-base ${animClass} inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white cursor-pointer`}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 wa-icon-3d" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {label}
        </a>

        {/* Edit mode pencil indicator */}
        {editMode && (
          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-30 opacity-0 group-hover/wa:opacity-100 transition-opacity">
            <Pencil className="h-3 w-3" />
          </span>
        )}

        {/* Edit popup */}
        {editMode && showEditor && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-80 rounded-xl border shadow-2xl p-4 space-y-3"
            style={{ background: "white", borderColor: "#e5e7eb", color: "#1a1a2e" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "#1a1a2e" }}>Editar Botão WhatsApp</span>
              <button onClick={() => setShowEditor(false)} className="hover:opacity-70" style={{ color: "#6b7280" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#6b7280" }}>Texto do Botão</label>
              <input
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: "#d1d5db", background: "white", color: "#1a1a2e" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#6b7280" }}>Mensagem pré-preenchida no WhatsApp</label>
              <textarea
                value={draftMessage}
                onChange={e => setDraftMessage(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: "#d1d5db", background: "white", color: "#1a1a2e" }}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowEditor(false)} className="px-3 py-1.5 text-xs rounded-md border hover:opacity-70" style={{ borderColor: "#d1d5db", color: "#374151" }}>Cancelar</button>
              <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded-md hover:opacity-90" style={{ background: "#25D366", color: "white" }}>Salvar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
