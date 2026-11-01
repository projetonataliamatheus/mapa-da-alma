// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/lv/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
  disabled?: boolean;
}

/**
 * Simple canvas-based signature pad. Emits base64 PNG on change.
 */
export function SignaturePad({ value, onChange, height = 180, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // handle DPR
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
      setHasInk(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    lastPt.current = getPos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPt.current = p;
    setHasInk(true);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>
      {!disabled && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <Eraser className="h-4 w-4 mr-1.5" /> Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
