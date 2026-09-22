import { useEffect, useRef } from "react";
import { useStudio } from "@/store/studio";

export function Teleprompter() {
  const script = useStudio((s) => s.script);
  const speed = useStudio((s) => s.speed);
  const fontSize = useStudio((s) => s.fontSize);
  const recState = useStudio((s) => s.recState);
  const offsetRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speed);
  const lastRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (recState === "idle") speedRef.current = speed;
  }, [speed, recState]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (recState === "idle") {
      offsetRef.current = 0;
      node.style.transform = "translate3d(0,0,0)";
      return;
    }

    if (recState === "paused") {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - lastRef.current);
      lastRef.current = now;
      const px = reduce ? speedRef.current * 0.65 : speedRef.current;
      offsetRef.current += (px * dt) / 1000;
      node.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [recState]);

  const lines = script.trim() || "Add your script on the previous screen.";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-x-0 top-[28%] z-20 flex items-center gap-3 px-5">
        <span className="h-px flex-1 bg-fg/35" />
        <span className="size-1.5 rounded-full bg-fg/80" />
        <span className="h-px flex-1 bg-fg/35" />
      </div>

      <div className="prompt-mask absolute inset-0 overflow-hidden">
        <div ref={scrollerRef} className="will-change-transform">
          <div className="h-[28vh]" />
          <p
            className="px-6 text-center font-medium text-fg"
            style={{
              fontSize: `clamp(1.35rem, ${fontSize}px, 2.75rem)`,
              lineHeight: 1.45,
              letterSpacing: "-0.015em",
              textShadow: "0 1px 12px rgb(0 0 0 / 0.85), 0 0 2px rgb(0 0 0 / 0.9)",
              whiteSpace: "pre-wrap",
            }}
          >
            {lines}
          </p>
          <div className="h-[55vh]" />
        </div>
      </div>
    </div>
  );
}
