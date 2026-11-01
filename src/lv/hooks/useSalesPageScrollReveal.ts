// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";

export function useSalesPageScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/**
 * Hook for staggered children reveal — each child animates in sequence
 */
export function useStaggerReveal(itemCount: number, baseDelay = 100) {
  const { ref, isVisible } = useSalesPageScrollReveal(0.1);

  const getDelay = (index: number) => ({
    transitionDelay: isVisible ? `${index * baseDelay}ms` : "0ms",
  });

  const getClassName = (isVis: boolean) =>
    `transition-all duration-500 ${isVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`;

  return { ref, isVisible, getDelay, getClassName };
}
