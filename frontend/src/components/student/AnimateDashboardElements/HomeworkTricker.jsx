import { useMemo } from "react";
import { motion } from "framer-motion";

export default function HomeworkTicker({ items = [] }) {
  const rows = useMemo(() =>
    (items || []).slice(0, 12).map(d => ({
      id: d.id, title: d.title,
      due: d.due_at ? new Date(d.due_at).toLocaleDateString() : "—",
      url: d.file_url
    })), [items]);

  if (!rows.length) return null;

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60">
        Devoirs à venir
      </div>
      <div className="relative">
        <motion.div
          className="flex gap-6 px-3 py-2 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
          onMouseEnter={(e) => e.currentTarget.getAnimations().forEach(a => a.pause())}
          onMouseLeave={(e) => e.currentTarget.getAnimations().forEach(a => a.play())}
        >
          {[...rows, ...rows].map((d, i) => (
            <a key={`${d.id}-${i}`} href={d.url || "#"} target="_blank" rel="noreferrer"
               className="text-sm hover:underline">
              <span className="font-medium">{d.title}</span>
              <span className="opacity-60"> · échéance {d.due}</span>
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
