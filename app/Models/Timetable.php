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

    private function formatTimeForApi($time): ?string
        {
            if (!$time) return null;
        
            // Already "HH:mm" or "HH:mm:ss"
            if (preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
                return substr($time, 0, 5);
            }
        
            try {
                return \Carbon\Carbon::parse($time)->format('H:i');
            } catch (\Throwable $e) {
                return null;
            }
        }
        
        private function toMinutes(?string $hhmm): ?int
        {
            if (!$hhmm || !preg_match('/^\d{2}:\d{2}$/', $hhmm)) return null;
            [$h, $m] = explode(':', $hhmm);
            return ((int)$h) * 60 + (int)$m;
        }

    /* -------------------- relations -------------------- */
    public function degree(): BelongsTo  { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function room(): BelongsTo    { return $this->belongsTo(Room::class); }
}
