// @ts-nocheck
"use client";
import { useEffect, useRef } from "react";

const LATIN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>{}[]|/\\";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 255,
    parseInt(h.substring(4, 6), 16) || 65,
  ];
}

interface Props {
  color?: string;
  text?: string;
  speed?: number;
}

export default function ReportHeaderMatrixRain({ color = "#00ff41", text = "", speed = 30 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const [r, g, b] = hexToRgb(color);
    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];
    const textChars = text.toUpperCase().split("");

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -50);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.fillStyle = `rgba(0,0,0,0.06)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      for (let i = 0; i < columns; i++) {
        const charIndex = Math.floor(Math.random() * (textChars.length > 0 ? textChars.length + LATIN_CHARS.length : LATIN_CHARS.length));
        const ch = charIndex < textChars.length ? textChars[charIndex] : LATIN_CHARS[charIndex % LATIN_CHARS.length];
        
        const alpha = 0.3 + Math.random() * 0.5;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      raf = requestAnimationFrame(draw);
    };

    const interval = 1000 / speed;
    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime >= interval) {
        draw();
        lastTime = time;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [color, text, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}
