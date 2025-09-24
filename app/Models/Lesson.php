<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    protected $fillable = [
        'timetable_id','subject_id','teacher_id','room',
        'day_of_week','start_time','end_time','notes'
    ];

    public function timetable() { return $this->belongsTo(Timetable::class); }
    public function subject()   { return $this->belongsTo(Subject::class); }
    public function teacher()   { return $this->belongsTo(User::class, 'teacher_id'); }
}
