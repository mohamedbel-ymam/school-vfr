<?php

// app/Models/AttendanceSession.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $fillable = ['degree_id', 'teacher_id', 'session_date'];

    protected $casts = [
        'degree_id' => 'integer',
        'teacher_id' => 'integer',
        'session_date' => 'date:Y-m-d',
    ];

    public function degree(): BelongsTo
    {
        return $this->belongsTo(Degree::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }
}
