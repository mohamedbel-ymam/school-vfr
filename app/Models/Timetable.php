<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Timetable extends Model
{
    protected $table = 'timetables';

    protected $fillable = [
    'degree_id','group_id','subject_id','teacher_id','room_id',
    'day_of_week','period','start_time','end_time',
    'title','week_start',
];

    protected $casts = [
        'degree_id'   => 'integer',
	'group_id'    => 'integer',  
        'subject_id'  => 'integer',
        'teacher_id'  => 'integer',
        'room_id'     => 'integer',
        'day_of_week' => 'integer',
        'period'      => 'integer',
        'week_start'  => 'date',
        // keep TIME as strings to avoid timezone issues
        'start_time'  => 'string',
        'end_time'    => 'string',
    ];

    /* -------------------- Accessors (front-safe) -------------------- */

    // Standardized "start"/"end" (front reads these)
    public function getStartAttribute(): ?string
    {
        return $this->ensureHHMM($this->start_time)
            ?? $this->startFromPeriod();
    }

    public function getEndAttribute(): ?string
    {
        return $this->ensureHHMM($this->end_time)
            ?? $this->endFromPeriod();
    }

    private function ensureHHMM(?string $v): ?string
    {
        if (!$v) return null;
        // Accept "H:MM" or "HH:MM[:SS]" → return "HH:MM"
        if (preg_match('/^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*$/', $v, $m)) {
            $h = str_pad((string) ((int)$m[1]), 2, '0', STR_PAD_LEFT);
            $i = $m[2];
            return "$h:$i";
        }
        return null;
    }

    // Simple period-to-time fallback (adjust to your bell times)
    private function startFromPeriod(): ?string
    {
        if (!$this->period || $this->period < 1) return null;
        [$start,] = $this->periodToMinutes($this->period);
        return $this->minutesToHHMM($start);
    }

    private function endFromPeriod(): ?string
    {
        if (!$this->period || $this->period < 1) return null;
        [, $end] = $this->periodToMinutes($this->period);
        return $this->minutesToHHMM($end);
    }

    private function minutesToHHMM(int $mins): string
    {
        $h = intdiv($mins, 60);
        $m = $mins % 60;
        return str_pad((string)$h, 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)$m, 2, '0', STR_PAD_LEFT);
    }

    /**
     * Map period index to minutes since day start.
     * Example: school starts 08:00, each period 55 min + 5 min break (adjust as you wish)
     */
    private function periodToMinutes(int $idx): array
    {
        // CHANGE these to your real schedule if needed
        $SCHOOL_START = 8 * 60; // 08:00
        $PERIOD_MIN   = 55;
        $BREAK_MIN    = 5;

        $start = $SCHOOL_START + ($idx - 1) * ($PERIOD_MIN + $BREAK_MIN);
        $end   = $start + $PERIOD_MIN;
        return [$start, $end];
    }

    /* -------------------- Relations -------------------- */

    public function degree(): BelongsTo  { return $this->belongsTo(Degree::class); }
  public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class); // ✅ ADD
    }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function room(): BelongsTo    { return $this->belongsTo(Room::class); }
}

