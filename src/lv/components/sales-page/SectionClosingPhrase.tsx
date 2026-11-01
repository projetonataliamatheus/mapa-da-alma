// @ts-nocheck
"use client";
import { usePublicConfig } from "@/lv/hooks/useSalesPageConfig";

interface Props {
  sectionKey: string;
}

export default function SectionClosingPhrase({ sectionKey }: Props) {
  const c = usePublicConfig();

  const enabled = c.sectionClosingEnabled?.[sectionKey];
  const l1g = c.sectionClosingLine1Green?.[sectionKey];
  const l1w = c.sectionClosingLine1White?.[sectionKey];
  const l2g = c.sectionClosingLine2Green?.[sectionKey];
  const l2w = c.sectionClosingLine2White?.[sectionKey];

  if (!enabled || (!l1g && !l1w && !l2g && !l2w)) return null;

  return (
    <div className="max-w-3xl mx-auto text-center mt-10">
      <style>{`
        @keyframes sectionClosingLed {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="relative p-6 rounded-xl" style={{ background: "var(--sp-card)", border: "1px solid var(--sp-border)" }}>
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(34,197,94,0.08) 0%, transparent 70%)",
            animation: "sectionClosingLed 2.5s ease-in-out infinite",
          }}
        />
        {(l1g || l1w) && (
          <p className="text-base font-bold relative z-10">
            {l1g && <span style={{ color: "#22c55e" }}>{l1g}</span>}
            {l1w && <> <span style={{ color: "#ffffff" }}>{l1w}</span></>}
          </p>
        )}
        {(l2g || l2w) && (
          <p className="text-base font-bold mt-1 relative z-10">
            {l2g && <span style={{ color: "#22c55e" }}>{l2g}</span>}
            {l2w && <> <span style={{ color: "#ffffff" }}>{l2w}</span></>}
          </p>
        )}
      </div>
    </div>
  );
}
