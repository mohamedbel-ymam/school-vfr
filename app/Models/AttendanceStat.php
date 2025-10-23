<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceStat extends Model
{
    protected $fillable = [
        'student_id', 'scope', 'period_key', 'absences', 'presences', 'meta',
    ];

    protected $casts = [
        'absences' => 'integer',
        'presences' => 'integer',
        'meta' => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
