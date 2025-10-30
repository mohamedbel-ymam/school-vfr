import { motion, useReducedMotion } from "framer-motion";

export default function AnimatedAttendanceGauge({ value = 0, label = "Présence (période)" }) {
  const reduced = useReducedMotion();
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const R = 54, C = 2 * Math.PI * R, dash = (v / 100) * C;

  return (
    <div className="relative w-40 h-40 grid place-items-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="drop-shadow-sm">
        <defs>
          <linearGradient id="attGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={R} className="text-slate-300/40 dark:text-slate-700/40"
                stroke="currentColor" strokeWidth="10" fill="none" />
        <motion.circle
          cx="80" cy="80" r={R}
          stroke="url(#attGrad)" strokeWidth="10" fill="none" strokeLinecap="round"
          transform="rotate(-90 80 80)"
          strokeDasharray={`${C} ${C}`}
          initial={reduced ? { strokeDashoffset: C - dash } : { strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - dash }}
          transition={reduced ? { duration: 0 } : { duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold tabular-nums">{v}%</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
