// src/components/teacher/SubjectBackground.jsx
import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

function SubjectBackground({ theme, clarity = "default", density = "default", seed = 17 }) {
  const reduced = useReducedMotion();

  const preset = useMemo(() => {
    const p = { opacity: 0.16, strokeWidth: 0.45, count: 36, minSize: 16, maxSize: 32 };
    if (clarity === "soft")  { p.opacity = 0.10; p.strokeWidth = 0.35; }
    if (clarity === "bold")  { p.opacity = 0.22; p.strokeWidth = 0.60; }
    if (density === "low")   { p.count = 22; p.minSize = 14; p.maxSize = 28; }
    if (density === "high")  { p.count = 54; p.minSize = 16; p.maxSize = 36; }
    return p;
  }, [clarity, density]);

  // small deterministic PRNG so layout is stable for a given seed
  function mulberry32(a){return function(){let t=(a+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  const rnd = useMemo(()=>mulberry32(seed),[seed]);
  const rand = (min,max)=>min+(max-min)*rnd();

  const items = useMemo(() => {
    const motifs = theme?.motifs?.length ? theme.motifs : ["●","◦","·"];
    const range = preset.maxSize - preset.minSize;
    return Array.from({ length: preset.count }).map((_, i) => ({
      id: i,
      m: motifs[i % motifs.length],
      x: rand(5, 95),
      y: rand(8, 92),
      s: Math.round(preset.minSize + rand(0, range)),
      rotA: rand(-6, 6),
      rotB: rand(-2, 2),
      scaleA: 1,
      scaleB: 1 + rand(0.02, 0.06),
      delay: rand(0, 2.5),
      dur: rand(8, 16),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, preset, seed]);

  const layerMotion = reduced ? {} : {
    animate: { x: [0, 8, 0, -6, 0], y: [0, 4, 0, -3, 0] },
    transition: { duration: 60, repeat: Infinity, ease: "easeInOut" },
  };

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl"
      style={{
        WebkitMaskImage:
          "radial-gradient(120% 90% at 50% 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.6) 70%, transparent 100%)",
        maskImage:
          "radial-gradient(120% 90% at 50% 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.6) 70%, transparent 100%)",
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.from} ${theme.to}`} />

      <motion.svg className="absolute inset-0 w-full h-full" {...layerMotion} aria-hidden="true">
        <defs>
          <filter id="motifGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="fill-current text-slate-700/90 dark:text-slate-100/90" opacity={preset.opacity} filter="url(#motifGlow)">
          {items.map((it) => (
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
             transformBox: "fill-box",      // CSS property, not a DOM attribute
             transformOrigin: "50% 50%",    // or use originX/originY below
           }}
         >
              {it.m}
            </motion.text>
          ))}
        </g>
      </motion.svg>

      <div className={`absolute inset-0 ring-1 ${theme.ring} rounded-3xl`} />
    </div>
  );
}

export default memo(SubjectBackground);
