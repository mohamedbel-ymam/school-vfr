// src/components/student/NextUpCard.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export default function NextUpCard({ nextClass }) {
  // nextClass = { subject: "Math", room: "B12", startsAt: "2025-10-30T13:30:00", endsAt: "2025-10-30T14:20:00" }
  const start = useMemo(() => new Date(nextClass?.startsAt), [nextClass]);
  const end   = useMemo(() => new Date(nextClass?.endsAt),   [nextClass]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(1, end - start);
  const elapsed = Math.min(Math.max(0, now - start), total);
  const inProgress = now >= start && now <= end;
  const pct = inProgress ? Math.round((elapsed / total) * 100) : 0;

  const t = Math.max(0, start - now);
  const mm = Math.floor(t / 60000);
  const ss = Math.floor((t % 60000) / 1000);

  return (
    <div className="rounded-2xl border p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 opacity-70" />
        <div className="font-semibold">Prochain cours</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-medium">{nextClass?.subject ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            Salle {nextClass?.room ?? "—"} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="text-right">
          {inProgress ? (
            <div className="text-sm font-medium">En cours</div>
          ) : (
            <div className="text-sm font-medium tabular-nums">
              T– {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
          )}
          <div className="w-36 h-2 rounded bg-slate-200/60 dark:bg-slate-700/50 mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-sky-500"
              initial={{ width: 0 }}
              animate={{ width: `${inProgress ? pct : 0}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
