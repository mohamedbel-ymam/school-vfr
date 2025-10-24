import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";

// UI kit
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

// same thresholds you used elsewhere
function statusFrom(a, j) {
  const A = Math.max(0, +a || 0);
  const J = Math.max(0, +j || 0);
  const total = A + J;
  if (A >= 3 || total >= 5) return { label: "Danger", className: "bg-red-100 text-red-700 border border-red-200" };
  if (A >= 1 || total >= 3) return { label: "Attention", className: "bg-amber-100 text-amber-700 border border-amber-200" };
  return { label: "Parfait", className: "bg-green-100 text-green-700 border border-green-200" };
}

/**
 * DashboardScaffold
 *
 * Props:
 * - title: string
 * - images: string[]
 * - stats: Array<{ title, value, hint?, right? }>
 * - shortcuts: Array<{ label, onClick }>
 * - onBack: () => void
 * - attendance?: { a:number, j:number, p:number, rate:number, range?: {from?:string,to?:string} }          // current period
 * - attendanceYear?: { a:number, j:number, p:number, rate:number }                                        // GLOBAL YEAR
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

  attendance,
  attendanceYear,          // NEW
  attendanceLoading = false,

  period,
  onPeriodChange,
}) {
  const autoplay = useRef(Autoplay({ delay: 3800, stopOnInteraction: false }));

  const a = attendance?.a ?? 0;
  const j = attendance?.j ?? 0;
  const p = attendance?.p ?? 0;
  const rate = attendance?.rate ?? 0;

  const yA = attendanceYear?.a ?? null;
  const yJ = attendanceYear?.j ?? null;
  const yP = attendanceYear?.p ?? null;
  const yRate = attendanceYear?.rate ?? null;
  const yStatus = statusFrom(yA ?? 0, yJ ?? 0);

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
          </div>

          {/* Current period + Year global */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Current period ring */}
            <Card className="rounded-2xl lg:col-span-2">
              <CardContent className="p-4 flex items-center justify-center min-h-[152px]">
                {attendanceLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement…</div>
                ) : (
                  <Ring value={rate} label="Taux (période)" />
                )}
              </CardContent>
            </Card>

            {/* Counters for period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-3">
              <StatCard title="Présences" value={attendanceLoading ? "…" : nf(p)} hint="Total comptabilisé" />
              <StatCard title="Absences (non just.)" value={attendanceLoading ? "…" : nf(a)} hint="À surveiller" />
              <StatCard title="Absences justifiées" value={attendanceLoading ? "…" : nf(j)} hint="Motifs fournis" />
            </div>
          </div>

          {/* YEAR (GLOBAL) summary — always visible if provided */}
          {attendanceYear && (
            <div className="mt-4 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold">Année (global)</div>
                <span className={`text-xs px-2 py-1 rounded ${yStatus.className}`}>{yStatus.label}</span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Taux global</div>
                  <div className="text-xl font-semibold">{yRate != null ? `${yRate}%` : "—"}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Présences (année)</div>
                  <div className="text-xl font-semibold">{yP != null ? nf(yP) : "—"}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Absences non just.</div>
                  <div className="text-xl font-semibold">{yA != null ? nf(yA) : "—"}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Absences justifiées</div>
                  <div className="text-xl font-semibold">{yJ != null ? nf(yJ) : "—"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Carousel */}
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

      {/* Optional extra stats */}
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
