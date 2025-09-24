<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Timetable extends Model
{
    protected $fillable = [
        'degree_id','teacher_id','subject_id','room_id',
        'day_of_week','period',
        // keep whatever your DB actually has; if your columns are starts_at/ends_at keep them,
        // otherwise use start_time/end_time. (Your controller already normalizes.)
        'starts_at','ends_at',
        'title'
    ];

    public function degree(): BelongsTo { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }

    // ✅ Fix typo + point to teacher_id
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Room::class);
    }
}
