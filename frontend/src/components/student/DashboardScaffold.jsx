// src/components/Student/Dashboards/_parts/DashboardScaffold.jsx
import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";

// 🔧 FIXED import paths to the shared UI kit
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";

// --------------------------- small helpers ----------------------------
const nf = (n) => (Number.isFinite(+n) ? (+n).toLocaleString() : "—");

function Ring({ value = 0, size = 112, stroke = 10, label = "Taux" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number.isFinite(+value) ? +value : 0));
  const dash = c - (pct / 100) * c;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${pct}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          className="text-muted/30"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke="currentColor"
          className="text-green-600 transition-all duration-500"
          strokeDasharray={c}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-xl font-semibold">{pct}%</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ title, value, hint, right }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

/**
 * DashboardScaffold
 *
 * Props:
 * - title: string
 * - images: string[] (carousel)
 * - stats: Array<{ title, value, hint?, right? }>
 * - shortcuts: Array<{ label, onClick }>
 * - onBack: () => void
 * - attendance?: { a:number, j:number, p:number, rate:number, range?: {from?:string,to?:string} }
 * - attendanceLoading?: boolean
 * - period?: 'overall'|'month'|'week'
 * - onPeriodChange?: (p) => void
 */
export default function DashboardScaffold({
  title,
  images = [],
  stats = [],
  shortcuts = [],
  onBack,

  // attendance
  attendance,
  attendanceLoading = false,

  // period control
  period,
  onPeriodChange,
}) {
  const autoplay = useRef(Autoplay({ delay: 3800, stopOnInteraction: false }));

  const a = attendance?.a ?? 0;
  const j = attendance?.j ?? 0;
  const p = attendance?.p ?? 0;
  const rate = attendance?.rate ?? 0;

  const hasPeriod = typeof onPeriodChange === "function" && !!period;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          {hasPeriod && (
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={period}
              onChange={(e) => onPeriodChange?.(e.target.value)}
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="overall">Global</option>
            </select>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Changer de filière
            </Button>
          )}
        </div>
      </div>

      {/* Attendance block (personal) */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold">Ma présence</div>
              {attendance?.range?.from && attendance?.range?.to ? (
                <div className="text-xs text-muted-foreground">
                  Période: {attendance.range.from} → {attendance.range.to}
                </div>
              ) : null}
            </div>
            {/* Reserved space if you want a detail link later */}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rate ring */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 flex items-center justify-center min-h-[152px]">
                {attendanceLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement…</div>
                ) : (
                  <Ring value={rate} label="Taux de présence" />
                )}
              </CardContent>
            </Card>

            {/* Counters */}
            <StatCard
              title="Présences"
              value={attendanceLoading ? "…" : nf(p)}
              hint="Total comptabilisé"
            />
            <StatCard
              title="Absences (non just.)"
              value={attendanceLoading ? "…" : nf(a)}
              hint="À surveiller"
            />
            <StatCard
              title="Absences justifiées"
              value={attendanceLoading ? "…" : nf(j)}
              hint="Motifs fournis"
            />
          </div>
        </div>
      </Card>

      {/* Carousel (you’ll update visuals later) */}
      {!!images.length && (
        <Carousel plugins={[autoplay.current]} className="w-full max-w-4xl mx-auto">
          <CarouselContent>
            {images.map((src, i) => (
              <CarouselItem key={i}>
                <div className="p-1">
                  <img
                    src={src}
                    alt={`slide-${i + 1}`}
                    className="rounded-xl w-full h-64 object-cover"
                    loading="lazy"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}

      {/* Generic stats from page (optional extras) */}
      {stats?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>
      )}

      {/* Shortcuts */}
      {!!shortcuts.length && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-medium">Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {shortcuts.map((sc) => (
              <Button key={sc.label} variant="secondary" onClick={sc.onClick}>
                {sc.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
