"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const TRAIL_DOTS = 10;

type Point = {
  x: number;
  y: number;
};

export default function MouseTrail() {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const targetRef = useRef<Point>({ x: 0, y: 0 });
  const pointsRef = useRef<Point[]>(
    Array.from({ length: TRAIL_DOTS }, () => ({ x: 0, y: 0 }))
  );
  const rafRef = useRef<number | null>(null);

  const palette = useMemo(
    () =>
      theme === "dark"
        ? [
            "rgba(56, 189, 248, 0.9)",
            "rgba(52, 211, 153, 0.78)",
            "rgba(251, 191, 36, 0.7)",
          ]
        : [
            "rgba(2, 132, 199, 0.78)",
            "rgba(5, 150, 105, 0.66)",
            "rgba(217, 119, 6, 0.58)",
          ],
    [theme]
  );

  useEffect(() => {
    const mediaFinePointer = window.matchMedia("(pointer: fine)");
    const mediaReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateEnabled = () => {
      setEnabled(mediaFinePointer.matches && !mediaReducedMotion.matches);
    };

    updateEnabled();
    mediaFinePointer.addEventListener("change", updateEnabled);
    mediaReducedMotion.addEventListener("change", updateEnabled);

    return () => {
      mediaFinePointer.removeEventListener("change", updateEnabled);
      mediaReducedMotion.removeEventListener("change", updateEnabled);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const onMove = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      if (!visible) {
        const firstPoint = { x: event.clientX, y: event.clientY };
        pointsRef.current = Array.from({ length: TRAIL_DOTS }, () => ({ ...firstPoint }));
        setVisible(true);
      }
    };

    const onLeave = () => {
      setVisible(false);
    };

    const animate = () => {
      const points = pointsRef.current;

      for (let i = 0; i < points.length; i += 1) {
        const lead = i === 0 ? targetRef.current : points[i - 1];
        const current = points[i];
        const easing = i === 0 ? 0.36 : 0.3;

        current.x += (lead.x - current.x) * easing;
        current.y += (lead.y - current.y) * easing;

        const dot = dotRefs.current[i];
        if (dot) {
          const size = 10 - i * 0.62;
          dot.style.transform = `translate3d(${current.x - size / 2}px, ${current.y - size / 2}px, 0) scale(${1 - i * 0.045})`;
          dot.style.opacity = visible ? `${1 - i * 0.085}` : "0";
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, visible]);

  if (!enabled) {
    return null;
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {Array.from({ length: TRAIL_DOTS }).map((_, index) => (
        <span
          key={index}
          ref={(node) => {
            dotRefs.current[index] = node;
          }}
          className="absolute rounded-full blur-[0.5px] transition-opacity duration-300"
          style={{
            width: "10px",
            height: "10px",
            backgroundColor: palette[index % palette.length],
            opacity: 0,
            willChange: "transform, opacity",
            boxShadow: `0 0 16px ${palette[index % palette.length]}`,
          }}
        />
      ))}
    </div>
  );
}
