<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceStat extends Model
{
    // If your table name is standard "attendance_stats", you can omit $table.
    // protected $table = 'attendance_stats';

    protected $fillable = [
        'student_id',
        'scope',            // 'overall' | 'month' | 'week'
        'period_key',       // 'overall' | 'YYYY-MM' | 'YYYY-Www'
        'absences',
        'justified_absences',
        'presences',
        'meta',
    ];

    protected $casts = [
        'absences'            => 'integer',
        'justified_absences'  => 'integer',
        'presences'           => 'integer',
        'meta'                => 'array',
    ];

    // Optional: sane defaults (helps when firstOrCreate runs)
    protected $attributes = [
        'absences'            => 0,
        'justified_absences'  => 0,
        'presences'           => 0,
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
