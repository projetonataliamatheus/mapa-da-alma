// @ts-nocheck
"use client";
/**
 * Visual connectors between Instagram strategy cards.
 * 15 animated effects controlled by admin connector config.
 */
import type { ConnectorConfig } from "@/lv/hooks/useConnectorConfig";
import { ConnectorEffectLine, ConnectorEffectLineVertical } from "./ConnectorEffects";

interface Props {
  index: number;
  total: number;
  accentColor: string;
  isLast: boolean;
  config?: ConnectorConfig;
}

export default function InstagramConnector({ index, total, accentColor, isLast, config }: Props) {
  const effect = config?.selectedEffect || "pulse";
  const color = config?.color || accentColor;
  const thickness = config?.thickness || 2;
  const dashLength = config?.dashLength || 8;
  const dashGap = config?.dashGap || 6;
  const speed = config?.speed || 2;

  const effectConfig = { effect, color, thickness, dashLength, dashGap, speed };

  return (
    <>
      {/* Horizontal connector (desktop) */}
      <div className="hidden lg:flex items-center justify-center" style={{ minWidth: 48 }}>
        <ConnectorEffectLine {...effectConfig} width="100%" height={28} />
      </div>
      {/* Vertical connector (mobile/tablet) */}
      <div className="flex lg:hidden items-center justify-center py-1">
        <ConnectorEffectLineVertical {...effectConfig} height={32} />
      </div>
    </>
  );
}

/** Legacy export - no longer injects CSS since effects are inline SVG now */
export function buildConnectorStyles(_speed?: number): string {
  return ""; // Effects are now SVG-based, no CSS needed
}

export const CONNECTOR_STYLES = "";
