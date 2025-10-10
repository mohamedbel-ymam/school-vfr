<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Timetable extends Model
{
    protected $table = 'timetables'; // <-- put your REAL table name here
    protected $fillable = [
        'degree_id','teacher_id','subject_id','room_id',
        'day_of_week','period','start_time','end_time','starts_at','ends_at','title',
    ];
    protected $casts = [
        'day_of_week' => 'integer',
        'start_time'  => 'string',
        'end_time'    => 'string',
        'starts_at'   => 'string',
        'ends_at'     => 'string',
    ];

    public function degree(){ return $this->belongsTo(\App\Models\Degree::class); }
    public function subject(){ return $this->belongsTo(\App\Models\Subject::class); }
    public function teacher(){ return $this->belongsTo(\App\Models\User::class, 'teacher_id'); }
    public function room()   { return $this->belongsTo(\App\Models\Room::class); }
}
