// @ts-nocheck
"use client";
/**
 * ReportTooltipWrapper — Shows simple explanatory tooltips next to cursor
 */
import { ReactNode, useState, useRef, useCallback } from "react";

interface Props {
  tooltip: string;
  children: ReactNode;
  position?: "top" | "bottom";
}

export default function ReportTooltipWrapper({ tooltip, children }: Props) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCoords({ x: e.clientX, y: e.clientY });
  }, []);

  if (!tooltip) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative h-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {show && (
        <div
          className="fixed z-[9999] px-3 py-2 rounded-lg text-xs leading-relaxed max-w-[250px] pointer-events-none shadow-lg"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            backdropFilter: "blur(8px)",
            left: coords.x + 16,
            top: coords.y - 10,
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}