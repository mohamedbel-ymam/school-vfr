<?php

// app/Models/AttendanceSession.php
namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $table = 'attendance_sessions';

    protected $fillable = [
        'degree_id',
        'group_id',
        'teacher_id',
        'timetable_id',
        'subject_id',
        'session_date',
        'start_time',
        'end_time',
        'session_type', // 'regular' | 'rattrapage' | 'changement'
        'week_number',
        'year',
        'title',
        'room',
        'status', // 'scheduled' | 'completed' | 'cancelled'
    ];

    protected $casts = [
        'degree_id'    => 'integer',
        'group_id'     => 'integer',
        'teacher_id'   => 'integer',
        'timetable_id' => 'integer',
        'subject_id'   => 'integer',
        'session_date' => 'date:Y-m-d',
        'week_number'  => 'integer',
        'year'         => 'integer',
        'start_time'   => 'string',
        'end_time'     => 'string',
    ];

    /* -------------------- Boot hooks -------------------- */
    protected static function booted()
    {
        static::saving(function (self $model) {
            if ($model->session_date && (!$model->week_number || !$model->year)) {
                $c = Carbon::parse($model->session_date);
                $model->week_number = $model->week_number ?: (int) $c->isoWeek();
                $model->year = $model->year ?: (int) $c->isoWeekYear();
            }
        });
    }

    /* -------------------- Relations -------------------- */
    public function degree(): BelongsTo
    {
        return $this->belongsTo(Degree::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class, 'timetable_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'attendance_session_id');
    }

    /* -------------------- Scopes -------------------- */
    public function scopeForWeek(Builder $query, int $degreeId, int $weekNumber, int $year): Builder
    {
        return $query->where('degree_id', $degreeId)
            ->where('week_number', $weekNumber)
            ->where('year', $year)
            ->orderBy('session_date')
            ->orderBy('start_time');
    }

    public function scopeBetweenDates(Builder $query, int $degreeId, string $startDate, string $endDate): Builder
    {
        return $query->where('degree_id', $degreeId)
            ->whereBetween('session_date', [$startDate, $endDate])
            ->orderBy('session_date')
            ->orderBy('start_time');
    }
}
