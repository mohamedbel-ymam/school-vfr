<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'attendance_session_id',
        'student_id',
        'status',
        'date',
        'marked_by',
        'marked_at',
    ];

    protected $casts = [
        'attendance_session_id' => 'integer',
        'student_id'            => 'integer',
        'date'                  => 'date:Y-m-d',
        'marked_by'             => 'integer',
        'marked_at'             => 'datetime',
    ];

    protected static function booted()
    {
        static::saving(function (self $model) {
            // Auto-fill date from session if not provided
            if (!$model->date && $model->attendance_session_id) {
                $session = $model->relationLoaded('session') ? $model->session : AttendanceSession::find($model->attendance_session_id);
                if ($session) {
                    $model->date = $session->session_date;
                }
            }
        });
    }

    /* -------------------- Accessors & Mutators -------------------- */

    // Support both 'present' and 'presence', 'absent' and 'absence'
    public function setStatusAttribute($value): void
    {
        $normalized = strtolower(trim((string)$value));
        $map = [
            'presence' => 'present',
            'present'  => 'present',
            'absence'  => 'absent',
            'absent'   => 'absent',
            'retard'   => 'retard',
            'late'     => 'retard',
            'absence_justifiee' => 'absence_justifiee',
            'not_marked' => 'not_marked',
        ];
        $this->attributes['status'] = $map[$normalized] ?? $normalized;
    }

    // seance_id alias for attendance_session_id
    public function getSeanceIdAttribute(): ?int
    {
        return $this->attendance_session_id;
    }

    public function setSeanceIdAttribute($value): void
    {
        $this->attributes['attendance_session_id'] = $value;
    }

    /* -------------------- Relations -------------------- */

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function seance(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function marker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
