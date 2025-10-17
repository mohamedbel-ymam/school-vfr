<?php
// app/Models/MonthlySubjectPlan.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlySubjectPlan extends Model
{
    protected $fillable = [
        'plan_date','degree_id','subject_id','teacher_id',
        'title','notes','sequence',
        'start_time','end_time',            // NEW
    ];

    protected $casts = [
        'plan_date'  => 'date',
        'degree_id'  => 'integer',
        'subject_id' => 'integer',
        'teacher_id' => 'integer',
        // keep TIME columns as strings (avoid TZ mutation)
        'start_time' => 'string',
        'end_time'   => 'string',
    ];

    // Normalized, FE-friendly props (same names the FE already understands)
    protected $appends = ['start','end','start_minutes','end_minutes']; // NEW

    /* accessors (mirror Timetable model) */
    public function getStartAttribute(): ?string { return $this->formatTimeForApi($this->start_time); }
    public function getEndAttribute(): ?string   { return $this->formatTimeForApi($this->end_time); }
    public function getStartMinutesAttribute(): ?int { return $this->toMinutes($this->start_time); }
    public function getEndMinutesAttribute(): ?int   { return $this->toMinutes($this->end_time); }

    private function formatTimeForApi($t): ?string
    {
        if (empty($t)) return null;
        $s = (string) $t;
        if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $s)) return substr($s, 0, 5);
        if (preg_match('/^\d{1,2}:\d{2}$/', $s)) return $s;
        if (preg_match('/^(\d{1,2}):(\d{1,2})$/', $s, $m))
            return str_pad($m[1], 2, '0', STR_PAD_LEFT).':'.str_pad($m[2], 2, '0', STR_PAD_LEFT);
        if (preg_match('/^(\d{1,2})$/', $s, $m))
            return str_pad($m[1], 2, '0', STR_PAD_LEFT).':00';
        return null;
    }
    private function toMinutes($t): ?int
    {
        $s = $this->formatTimeForApi($t);
        if (!$s) return null;
        [$h,$m] = array_map('intval', explode(':', $s));
        return $h*60 + $m;
    }

    public function degree(): BelongsTo { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function enseignant(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); } // alias
}
