import { Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function StreakFlame({ days = 0 }) {
  const hot = (Number(days) || 0) >= 5;
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 bg-white/60 dark:bg-slate-900/40 backdrop-blur">
      <motion.div initial={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}>
        <Flame className={`h-4 w-4 ${hot ? "text-amber-500" : "text-orange-500"}`} />
      </motion.div>
      <span className="text-sm"><span className="font-semibold">{days}</span> jours de suite</span>
    </div>
  );
}
