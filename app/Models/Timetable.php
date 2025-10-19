<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Timetable extends Model
{
    protected $table = 'timetables';

    protected $fillable = [
        'degree_id','subject_id','teacher_id','room_id',
        'day_of_week','period',
        'start_time','end_time',
        'title','week_start',
    ];

    protected $casts = [
        'degree_id'  => 'integer',
        'subject_id' => 'integer',
        'teacher_id' => 'integer',
        'room_id'    => 'integer',
        'day_of_week'=> 'integer',
        'period'     => 'integer',
        'week_start' => 'date',
        // keep TIME columns as strings (avoid timezone mutation)
        'start_time' => 'string',
        'end_time'   => 'string',
    ];

    // Expose normalized fields automatically
    protected $appends = ['start', 'end', 'start_minutes', 'end_minutes'];

    /* -------------------- Accessors (with fallbacks) -------------------- */

    public function getStartAttribute(): ?string
    {
        // Preferred: DB time
        $s = $this->formatTimeForApi($this->start_time);
        if ($s) return $s;

        // Fallback: derive from period
        [$sm, $em] = $this->periodToWindow();
        return $sm !== null ? $this->minsToHHMM($sm) : null;
    }

    public function getEndAttribute(): ?string
    {
        $e = $this->formatTimeForApi($this->end_time);
        if ($e) return $e;

        [$sm, $em] = $this->periodToWindow();
        return $em !== null ? $this->minsToHHMM($em) : null;
    }

    public function getStartMinutesAttribute(): ?int
    {
        $m = $this->toMinutes($this->formatTimeForApi($this->start_time));
        if ($m !== null) return $m;

        [$sm, $em] = $this->periodToWindow();
        return $sm;
    }

    public function getEndMinutesAttribute(): ?int
    {
        $m = $this->toMinutes($this->formatTimeForApi($this->end_time));
        if ($m !== null) return $m;

        [$sm, $em] = $this->periodToWindow();
        return $em;
    }

    /* -------------------- Helpers -------------------- */

    // Accepts "H", "H:M", "HH:MM", "HH:MM:SS", or integers like 9 -> 09:00
    private function formatTimeForApi($t): ?string
    {
        if (empty($t)) return null;
        $s = (string) $t;

        if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $s)) return substr($s, 0, 5);
        if (preg_match('/^\d{1,2}:\d{2}$/', $s))     return $this->padTime($s);
        if (preg_match('/^(\d{1,2}):(\d{1,2})$/', $s, $m))
            return $this->padTime($m[1].':'.$m[2]);
        if (preg_match('/^(\d{1,2})$/', $s, $m))
            return $this->padTime($m[1].':00');

        return null;
    }

    private function padTime(string $hhmm): string
    {
        [$h,$m] = explode(':', $hhmm);
        return str_pad($h, 2, '0', STR_PAD_LEFT).':'.str_pad($m, 2, '0', STR_PAD_LEFT);
    }

    private function toMinutes(?string $hhmm): ?int
    {
        if (!$hhmm || !preg_match('/^\d{2}:\d{2}$/', $hhmm)) return null;
        [$h, $m] = explode(':', $hhmm);
        return ((int)$h) * 60 + (int)$m;
    }

    private function minsToHHMM(int $m): string
    {
        $h = intdiv($m, 60);
        $mm = $m % 60;
        return str_pad((string)$h, 2, '0', STR_PAD_LEFT).':'.str_pad((string)$mm, 2, '0', STR_PAD_LEFT);
    }

    /**
     * Derive [start,end] minutes from period when times are missing.
     * Defaults keep parity with the FE constants (School @ 09:00, 90min periods).
     * If you have a real bell schedule, adjust here or move to config().
     */
    private function periodToWindow(): array
    {
        if (!$this->period) return [null, null];

        $idx = max(1, min(20, (int)$this->period));
        $SCHOOL_START_MINS   = 9 * 60;   // 09:00
        $PERIOD_DURATION_MIN = 90;       // 1h30

        $start = $SCHOOL_START_MINS + ($idx - 1) * $PERIOD_DURATION_MIN;
        $end   = $start + $PERIOD_DURATION_MIN;
        return [$start, $end];
    }

    /* -------------------- Relations -------------------- */

    public function degree(): BelongsTo  { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function room(): BelongsTo    { return $this->belongsTo(Room::class); }
}
