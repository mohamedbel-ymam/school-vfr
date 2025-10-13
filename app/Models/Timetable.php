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
        // keep TIME columns as strings (no timezone mutation)
        'start_time' => 'string',
        'end_time'   => 'string',
    ];

    /** Always include normalized, TZ-free fields in JSON */
    protected $appends = ['start', 'end', 'start_minutes', 'end_minutes'];

    /* ---------- accessors (normalize TIME "HH:MM:SS" -> "HH:MM") ---------- */

    public function getStartAttribute(): ?string
    {
        return $this->formatTimeForApi($this->start_time);
    }

    public function getEndAttribute(): ?string
    {
        return $this->formatTimeForApi($this->end_time);
    }

    public function getStartMinutesAttribute(): ?int
    {
        return $this->toMinutes($this->start_time);
    }

    public function getEndMinutesAttribute(): ?int
    {
        return $this->toMinutes($this->end_time);
    }

    private function formatTimeForApi($t): ?string
    {
        if (empty($t)) return null;
        $s = (string) $t;
        // "HH:MM:SS" -> "HH:MM"
        if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $s)) return substr($s, 0, 5);
        // already "HH:MM"
        if (preg_match('/^\d{1,2}:\d{2}$/', $s)) return $s;
        // anything else: best-effort (e.g. "9:0" or "9")
        if (preg_match('/^(\d{1,2}):(\d{1,2})$/', $s, $m)) {
            return str_pad($m[1], 2, '0', STR_PAD_LEFT).':'.str_pad($m[2], 2, '0', STR_PAD_LEFT);
        }
        if (preg_match('/^(\d{1,2})$/', $s, $m)) {
            return str_pad($m[1], 2, '0', STR_PAD_LEFT).':00';
        }
        return null;
    }

    private function toMinutes($t): ?int
    {
        $s = $this->formatTimeForApi($t);
        if (!$s) return null;
        [$h, $m] = array_map('intval', explode(':', $s));
        return $h * 60 + $m;
    }

    /* -------------------- relations -------------------- */
    public function degree(): BelongsTo  { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function room(): BelongsTo    { return $this->belongsTo(Room::class); }
}
