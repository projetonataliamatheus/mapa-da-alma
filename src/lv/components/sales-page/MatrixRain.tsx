// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";

export type MatrixEffectType = "converge" | "rain" | "typewriter" | "spiral" | "explosion";

interface MatrixRainProps {
  duration: number;
  accentColor?: string;
  customText?: string;
  orientation?: "vertical" | "horizontal";
  charSpeed?: number;
  effect?: MatrixEffectType;
  onComplete: () => void;
  nameFontFamily?: string;
  nameFontSize?: number;
  nameFontBold?: boolean;
  nameFontItalic?: boolean;
  nameLetterSpacing?: number;
}

// Latin-only characters for background noise
const LATIN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>{}[]|/\\";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const rVal = parseInt(h.substring(0, 2), 16);
  const gVal = parseInt(h.substring(2, 4), 16);
  const bVal = parseInt(h.substring(4, 6), 16);
  return [
    isNaN(rVal) ? 255 : rVal,
    isNaN(gVal) ? 0 : gVal,
    isNaN(bVal) ? 51 : bVal,
  ];
}

function randomChar(charSet?: string) {
  const chars = charSet || LATIN_CHARS;
  return chars[Math.floor(Math.random() * chars.length)];
}

export default function MatrixRain({
  duration,
  accentColor = "#ff0033",
  customText = "",
  orientation = "vertical",
  charSpeed = 50,
  effect = "converge",
  onComplete,
  nameFontFamily = "'JetBrains Mono', monospace",
  nameFontSize,
  nameFontBold = true,
  nameFontItalic = false,
  nameLetterSpacing = 0,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const [r, g, b] = hexToRgb(accentColor);
    const text = customText.length > 0 ? customText.toUpperCase() : "MATHEUS RANGEL";
    
    // Build a character set from the custom text + some extra Latin chars for variety
    const textChars = text.replace(/\s/g, '') + "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    const startTime = Date.now();
    let animId: number;
    const fontWeight = nameFontBold ? "bold" : "normal";
    const fontStyle = nameFontItalic ? "italic" : "normal";
    const buildNameFont = (size: number) => `${fontStyle} ${fontWeight} ${size}px ${nameFontFamily}`;
    const getNameSize = () => nameFontSize || Math.min(canvas.width / (text.length * 0.6), 72);

    // Helper: draw the revealed name large and centered
    const drawRevealedName = (progress: number) => {
      const nameSize = getNameSize();
      ctx.font = buildNameFont(nameSize);
      if (nameLetterSpacing) ctx.letterSpacing = `${nameLetterSpacing}px`;
      const textWidth = ctx.measureText(text).width;
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2 + nameSize / 3;

      for (let i = 0; i < text.length; i++) {
        const charProgress = Math.min(1, Math.max(0, (progress - i / text.length * 0.5) / 0.5));
        const charW = ctx.measureText(text.slice(0, i)).width;
        if (charProgress > 0) {
          const isRevealed = charProgress > 0.7;
          const char = isRevealed ? text[i] : randomChar(textChars);
          ctx.shadowBlur = 0;
          ctx.fillStyle = isRevealed
            ? `rgba(${r}, ${g}, ${b}, 1)`
            : `rgba(${r}, ${g}, ${b}, 0.8)`;
          ctx.fillText(char, x + charW, y);
        }
      }
    };

    if (effect === "converge") {
      // Characters scattered everywhere, slowly converge to form the name at center
      const nameSize = getNameSize();
      interface Particle { x: number; y: number; tx: number; ty: number; char: string; finalChar: string; revealed: boolean }
      const particles: Particle[] = [];
      
      ctx.font = buildNameFont(nameSize);
      const totalW = ctx.measureText(text).width;
      const startX = (canvas.width - totalW) / 2;
      const startY = canvas.height / 2 + nameSize / 3;

      for (let i = 0; i < text.length; i++) {
        const charW = ctx.measureText(text.slice(0, i)).width;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          tx: startX + charW,
          ty: startY,
          char: randomChar(textChars),
          finalChar: text[i],
          revealed: false,
        });
      }
      // Background rain particles
      const bgCount = Math.floor(canvas.width / 14);
      const bgDrops = Array(bgCount).fill(0).map(() => ({ y: Math.random() * canvas.height, speed: 1 + Math.random() * 3 }));

      const draw = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / (duration * 0.8));

        ctx.fillStyle = `rgba(0, 0, 0, ${progress < 0.3 ? 0.02 : 0.04})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Background rain with Latin chars
        ctx.font = `14px 'JetBrains Mono', monospace`;
        for (const drop of bgDrops) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.7 + Math.random() * 0.3})`;
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
          ctx.shadowBlur = 6;
          ctx.fillText(randomChar(textChars), Math.random() * canvas.width, drop.y);
          ctx.shadowBlur = 0;
          drop.y += drop.speed;
          if (drop.y > canvas.height) drop.y = 0;
        }

        // Converging particles
        ctx.font = buildNameFont(nameSize);
        for (const p of particles) {
          const ease = progress * progress;
          p.x += (p.tx - p.x) * ease * 0.08;
          p.y += (p.ty - p.y) * ease * 0.08;

          if (progress > 0.6 && !p.revealed) {
            const dist = Math.hypot(p.x - p.tx, p.y - p.ty);
            if (dist < 5) p.revealed = true;
          }

          const swapInterval = Math.max(3, Math.round(charSpeed / 8));
          if (!p.revealed && Math.random() < 1 / swapInterval) {
            p.char = randomChar(textChars);
          }

          if (p.revealed) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillText(p.finalChar, p.tx, p.ty);
          } else {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
            ctx.shadowBlur = 8;
            ctx.fillText(p.char, p.x, p.y);
            ctx.shadowBlur = 0;
          }
        }

        animId = requestAnimationFrame(draw);
      };
      draw();

    } else if (effect === "rain") {
      // Classic rain with name slowly revealing in center
      const fontSize = 14;
      const columns = Math.floor(canvas.width / fontSize);
      const drops = Array(columns).fill(0).map(() => Math.random() * -50);

      const draw = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / (duration * 0.85));

        ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

        for (let i = 0; i < drops.length; i++) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.8 + Math.random() * 0.2})`;
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
          ctx.shadowBlur = 6;
          ctx.fillText(randomChar(textChars), i * fontSize, drops[i] * fontSize);
          ctx.shadowBlur = 0;
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.5 + Math.random() * 0.5;
        }

        if (progress > 0.3) {
          drawRevealedName((progress - 0.3) / 0.7);
        }

        animId = requestAnimationFrame(draw);
      };
      draw();

    } else if (effect === "typewriter") {
      // Characters type out one by one with a cursor
      const fontSize = 14;
      const columns = Math.floor(canvas.width / fontSize);
      const drops = Array(columns).fill(0).map(() => Math.random() * -30);

      const draw = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / (duration * 0.85));

        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle background rain
        ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
        for (let i = 0; i < drops.length; i++) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
          ctx.fillText(randomChar(textChars), i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) drops[i] = 0;
          drops[i] += 0.3 + Math.random() * 0.3;
        }

        // Typewriter name
        const nameSize = getNameSize();
        ctx.font = buildNameFont(nameSize);
        const totalW = ctx.measureText(text).width;
        const sx = (canvas.width - totalW) / 2;
        const sy = canvas.height / 2 + nameSize / 3;

        const charsToShow = Math.floor(progress * text.length * 1.5);
        for (let i = 0; i < Math.min(charsToShow, text.length); i++) {
          const charW = ctx.measureText(text.slice(0, i)).width;
          const isLast = i === Math.min(charsToShow, text.length) - 1;

          if (isLast && Math.random() > 0.5) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
            ctx.fillText(randomChar(textChars), sx + charW, sy);
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillText(text[i], sx + charW, sy);
          }
        }

        // Blinking cursor
        if (charsToShow <= text.length && Math.floor(elapsed / 400) % 2 === 0) {
          const cursorX = sx + ctx.measureText(text.slice(0, Math.min(charsToShow, text.length))).width;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
          ctx.fillRect(cursorX + 4, sy - nameSize * 0.75, 3, nameSize);
        }

        animId = requestAnimationFrame(draw);
      };
      draw();

    } else if (effect === "spiral") {
      // Characters spiral inward from edges toward center forming the name
      const nameSize = getNameSize();
      ctx.font = buildNameFont(nameSize);
      const totalW = ctx.measureText(text).width;
      const sx = (canvas.width - totalW) / 2;
      const sy = canvas.height / 2 + nameSize / 3;

      interface SpiralChar { angle: number; radius: number; char: string; finalChar: string; tx: number; ty: number; speed: number; revealed: boolean }
      const spirals: SpiralChar[] = text.split("").map((ch, i) => ({
        angle: (i / text.length) * Math.PI * 4 + Math.random(),
        radius: Math.max(canvas.width, canvas.height) * 0.6 + Math.random() * 200,
        char: randomChar(textChars),
        finalChar: ch,
        tx: sx + ctx.measureText(text.slice(0, i)).width,
        ty: sy,
        speed: 0.02 + Math.random() * 0.02,
        revealed: false,
      }));

      const bgParticles = Array(60).fill(0).map(() => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.max(canvas.width, canvas.height) * 0.8,
        speed: 0.005 + Math.random() * 0.01,
      }));

      const draw = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / (duration * 0.85));

        ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.font = `14px 'JetBrains Mono', monospace`;
        for (const bp of bgParticles) {
          bp.angle += bp.speed;
          const bx = cx + Math.cos(bp.angle) * bp.radius * (1 - progress * 0.3);
          const by = cy + Math.sin(bp.angle) * bp.radius * (1 - progress * 0.3);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
          ctx.fillText(randomChar(textChars), bx, by);
        }

        ctx.font = buildNameFont(nameSize);
        for (const s of spirals) {
          s.angle += s.speed;
          s.radius *= (1 - progress * 0.03);

          const swapInt = Math.max(3, Math.round(charSpeed / 8));
          if (!s.revealed && Math.random() < 1 / swapInt) s.char = randomChar(textChars);

          if (s.radius < 20 && progress > 0.5) s.revealed = true;

          if (s.revealed) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillText(s.finalChar, s.tx, s.ty);
          } else {
            const x = cx + Math.cos(s.angle) * s.radius;
            const y = cy + Math.sin(s.angle) * s.radius;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
            ctx.shadowBlur = 6;
            ctx.fillText(s.char, x, y);
            ctx.shadowBlur = 0;
          }
        }

        animId = requestAnimationFrame(draw);
      };
      draw();

    } else if (effect === "explosion") {
      // Name appears at center, chars explode outward and reform
      const nameSize = getNameSize();
      ctx.font = buildNameFont(nameSize);
      const totalW = ctx.measureText(text).width;
      const sx = (canvas.width - totalW) / 2;
      const sy = canvas.height / 2 + nameSize / 3;

      interface ExplodeChar {
        x: number; y: number; vx: number; vy: number;
        tx: number; ty: number; char: string; finalChar: string;
        phase: "scatter" | "return" | "done";
      }
      const chars: ExplodeChar[] = text.split("").map((ch, i) => {
        const charW = ctx.measureText(text.slice(0, i)).width;
        const angle = Math.random() * Math.PI * 2;
        const force = 8 + Math.random() * 12;
        return {
          x: sx + charW, y: sy,
          vx: Math.cos(angle) * force, vy: Math.sin(angle) * force,
          tx: sx + charW, ty: sy,
          char: randomChar(textChars), finalChar: ch,
          phase: "scatter",
        };
      });

      const draw = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / (duration * 0.85));

        ctx.fillStyle = `rgba(0, 0, 0, 0.06)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = buildNameFont(nameSize);

        for (const c of chars) {
          if (progress < 0.4) {
            c.x += c.vx * 0.3;
            c.y += c.vy * 0.3;
            c.vx *= 0.98;
            c.vy *= 0.98;
            if (Math.random() < 0.1) c.char = randomChar(textChars);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.8 + Math.random() * 0.2})`;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
            ctx.shadowBlur = 8;
            ctx.fillText(c.char, c.x, c.y);
            ctx.shadowBlur = 0;
          } else if (progress < 0.85) {
            c.x += (c.tx - c.x) * 0.06;
            c.y += (c.ty - c.y) * 0.06;
            const dist = Math.hypot(c.x - c.tx, c.y - c.ty);
            if (dist < 3) c.phase = "done";

            if (c.phase === "done") {
              ctx.shadowBlur = 0;
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
              ctx.fillText(c.finalChar, c.tx, c.ty);
            } else {
              if (Math.random() < 0.08) c.char = randomChar(textChars);
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
              ctx.fillText(c.char, c.x, c.y);
            }
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillText(c.finalChar, c.tx, c.ty);
          }
        }

        animId = requestAnimationFrame(draw);
      };
      draw();
    }

    const fadeTimer = setTimeout(() => setFading(true), duration - 500);
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      window.removeEventListener("resize", resize);
    };
  }, [duration, onComplete, accentColor, customText, orientation, charSpeed, effect]);

  return (
    <div
      className={`fixed inset-0 z-[9998] transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      style={{ background: "#000" }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
