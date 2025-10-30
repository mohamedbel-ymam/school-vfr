// src/components/teacher/SubjectBackground.jsx
import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * SubjectBackground Pro
 * Layers:
 *  1) Gradient glow (animated radial sweep)
 *  2) Ribbons (organic bezier curves, slow drift)
 *  3) Glyph cloud (parallax, micro float/rotate/scale)
 *
 * Props:
 *  - theme: { from, to, ring, motifs[], hue?: number }
 *  - clarity: "soft" | "default" | "bold"
 *  - density: "low" | "default" | "high"
 *  - seed: number (deterministic layout)
 *  - parallax: 0..1 intensity for layer drift
 */
function SubjectBackground({
  theme,
  clarity = "default",
  density = "default",
  seed = 17,
  parallax = 1,
}) {
  const reduced = useReducedMotion();

  /* ---------- Presets ---------- */
  const preset = useMemo(() => {
    const p = {
      opacity: 0.16,
      strokeWidth: 0.45,
      count: 36,
      minSize: 16,
      maxSize: 32,
      ribbonCount: 4,
    };
    if (clarity === "soft")  { p.opacity = 0.10; p.strokeWidth = 0.35; }
    if (clarity === "bold")  { p.opacity = 0.22; p.strokeWidth = 0.60; }
    if (density === "low")   { p.count = 22; p.minSize = 14; p.maxSize = 28; p.ribbonCount = 3; }
    if (density === "high")  { p.count = 54; p.minSize = 16; p.maxSize = 36; p.ribbonCount = 6; }
    return p;
  }, [clarity, density]);

  /* ---------- Deterministic PRNG ---------- */
  function mulberry32(a){return function(){let t=(a+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  const rnd = useMemo(() => mulberry32(seed), [seed]);
  const r = (min, max) => min + (max - min) * rnd();

  /* ---------- Motifs ---------- */
  const glyphs = useMemo(() => {
    const motifs = theme?.motifs?.length ? theme.motifs : ["●", "◦", "·"];
    const range = preset.maxSize - preset.minSize;
    return Array.from({ length: preset.count }).map((_, i) => {
      const layer = i % 3; // 0 foreground, 1 mid, 2 back
      const layerScale = [1, 0.92, 0.85][layer];
      const wobble = [0.6, 0.45, 0.35][layer]; // motion amplitude
      const size = Math.round((preset.minSize + r(0, range)) * layerScale);
      return {
        id: i,
        m: motifs[i % motifs.length],
        x: r(6, 94),
        y: r(10, 90),
        s: size,
        rotA: r(-5, 5),
        rotB: r(-2, 2),
        scaleA: 1,
        scaleB: 1 + r(0.02, 0.06),
        delay: r(0, 2.5),
        dur: r(9, 18),
        wobble,
        layer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, preset, seed]);

  /* ---------- Ribbons (bezier curves) ---------- */
  const ribbons = useMemo(() => {
    const arr = [];
    for (let i = 0; i < preset.ribbonCount; i++) {
      const y1 = r(10, 90), y2 = r(10, 90);
      const c1x = r(15, 35), c2x = r(65, 85);
      const c1y = r(5, 95),  c2y = r(5, 95);
      arr.push({
        id: i,
        d: `M 0 ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, 100 ${y2}`,
        width: r(12, 28) / 10, // stroke width
        opacity: r(0.05, 0.12),
        drift: r(12, 22),
        dur: r(28, 45),
        delay: r(0, 4),
      });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.ribbonCount, seed]);

  /* ---------- Layer motions ---------- */
  const layerDrift = reduced ? {} : {
    animate: { x: [0, 8 * parallax, 0, -6 * parallax, 0], y: [0, 4 * parallax, 0, -3 * parallax, 0] },
    transition: { duration: 60, repeat: Infinity, ease: "easeInOut" },
  };

  /* ---------- Hue shift via CSS filter (optional) ---------- */
  const hue = typeof theme?.hue === "number" ? theme.hue : 0;

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl"
      style={{
        WebkitMaskImage:
          "radial-gradient(125% 95% at 50% 0%, rgba(0,0,0,0.96) 40%, rgba(0,0,0,0.6) 72%, transparent 100%)",
        maskImage:
          "radial-gradient(125% 95% at 50% 0%, rgba(0,0,0,0.96) 40%, rgba(0,0,0,0.6) 72%, transparent 100%)",
        filter: hue ? `hue-rotate(${hue}deg)` : undefined,
      }}
    >
      {/* Base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.from} ${theme.to}`} />

      {/* 1) Animated glow sweep */}
      <motion.div
        aria-hidden="true"
        className="absolute -inset-1"
        style={{
          background:
            "radial-gradient(60% 40% at 70% 0%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(60% 40% at 20% 10%, rgba(255,255,255,0.08), transparent 60%)",
          mixBlendMode: "soft-light",
        }}
        animate={reduced ? undefined : { backgroundPosition: ["0% 0%", "30% 5%", "0% 0%"] }}
        transition={reduced ? undefined : { duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 2) Ribbons */}
      <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" {...layerDrift} aria-hidden="true">
        <defs>
          <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopOpacity="0.0" stopColor="currentColor" />
            <stop offset="50%" stopOpacity="0.35" stopColor="currentColor" />
            <stop offset="100%" stopOpacity="0.0" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g className="text-white dark:text-slate-100" opacity={0.25}>
          {ribbons.map(rb => (
            <motion.path
              key={rb.id}
              d={rb.d}
              fill="none"
              stroke="url(#ribbonGrad)"
              strokeWidth={rb.width}
              strokeLinecap="round"
              initial={reduced ? undefined : { pathLength: 0.85 }}
              animate={reduced ? undefined : { pathLength: [0.85, 1, 0.85] }}
              transition={reduced ? undefined : { duration: rb.dur, delay: rb.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </g>
      </motion.svg>

      {/* 3) Glyph Cloud with micro-motion */}
      <motion.svg className="absolute inset-0 w-full h-full" {...layerDrift} aria-hidden="true">
        <defs>
          <filter id="motifGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Depth groups: back -> mid -> front */}
        {[2,1,0].map(layer => (
          <g
            key={layer}
            className="fill-current text-slate-700/90 dark:text-slate-100/90"
            opacity={preset.opacity * (layer === 0 ? 1 : layer === 1 ? 0.9 : 0.8)}
            filter="url(#motifGlow)"
          >
            {glyphs.filter(g => g.layer === layer).map((it) => (
              <motion.text
                key={it.id}
                x={`${it.x}%`}
                y={`${it.y}%`}
                fontSize={it.s}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  paintOrder: "stroke",
                  stroke: "currentColor",
                  strokeOpacity: 0.5,
                  strokeWidth: preset.strokeWidth,
                  transformBox: "fill-box",
                  transformOrigin: "50% 50%",
                }}
                animate={
                  reduced ? undefined : {
                    rotate: [it.rotA, it.rotB, it.rotA],
                    scale: [it.scaleA, it.scaleB, it.scaleA],
                    x: [0, it.wobble, 0, -it.wobble, 0],
                    y: [0, it.wobble * 0.6, 0, -it.wobble * 0.6, 0],
                  }
                }
                transition={
                  reduced ? undefined : {
                    duration: it.dur,
                    delay: it.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                }
              >
                {it.m}
              </motion.text>
            ))}
          </g>
        ))}
      </motion.svg>

      {/* Edge ring */}
      <div className={`absolute inset-0 ring-1 ${theme.ring} rounded-3xl`} />
    </div>
  );
}

export default memo(SubjectBackground);
