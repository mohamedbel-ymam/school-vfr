<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Timetable extends Model
{
    protected $fillable = [
        'degree_id','teacher_id','subject_id','room_id',
        'day_of_week','period',
        // ✅ allow both variants; whichever exists in your DB will be persisted
        'start_time','end_time',
        'starts_at','ends_at',
        'title',
    ];

    public function degree(): BelongsTo { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function room(): BelongsTo   { return $this->belongsTo(\App\Models\Room::class); }
}
