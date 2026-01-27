import React from "react";
import { Star } from "lucide-react";

export default function StarBar({ value = 0 }) {
  const v = Number(value || 0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={n <= Math.round(v) ? "fill-current" : ""} size={16} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{v ? v.toFixed(2) : "—"}</span>
    </div>
  );
}
