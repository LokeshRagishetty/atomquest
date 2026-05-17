"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({ value, duration = 800, className = "text-2xl font-bold" }: { value: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    fromRef.current = display;
    function step(now: number) {
      if (!startRef.current) startRef.current = start;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const next = Math.round((value - fromRef.current) * progress + fromRef.current);
      setDisplay(next);
      if (progress < 1) requestAnimationFrame(step);
      else {
        setDisplay(value);
        startRef.current = null;
      }
    }
    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <div className={className}>{display}</div>;
}
