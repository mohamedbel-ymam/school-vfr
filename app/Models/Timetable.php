<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Timetable extends Model
{
    // Be explicit; avoids any pluralization surprises
    protected $table = 'timetables';

    protected $fillable = [
        'degree_id','subject_id','teacher_id','room_id',
        'day_of_week','period',
        'start_time','end_time', // you don't have starts_at/ends_at in your schema
        'title','week_start',
    ];

    // Helpful casts (TIME comes back as "HH:MM:SS" string from MySQL)
    protected $casts = [
        'degree_id'  => 'integer',
        'subject_id' => 'integer',
        'teacher_id' => 'integer',
        'room_id'    => 'integer',
        'day_of_week'=> 'integer',
        'period'     => 'integer',  // your earliest migration made it tinyint -> keep numeric
        'week_start' => 'date',
        'start_time' => 'string',
        'end_time'   => 'string',
    ];

    public function degree(): BelongsTo   { return $this->belongsTo(Degree::class); }
    public function subject(): BelongsTo  { return $this->belongsTo(Subject::class); }
    public function teacher(): BelongsTo  { return $this->belongsTo(User::class, 'teacher_id'); }
    public function room(): BelongsTo     { return $this->belongsTo(Room::class); }
}
