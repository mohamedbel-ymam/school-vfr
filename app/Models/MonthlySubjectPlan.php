<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlySubjectPlan extends Model
{
    protected $fillable = [
        'plan_date','degree_id','subject_id','teacher_id','title','notes','sequence'
    ];

    public function degree(){ return $this->belongsTo(Degree::class); }
    public function subject(){ return $this->belongsTo(Subject::class); }

    // keep both names if your UI expects "enseignant"
    public function teacher(){ return $this->belongsTo(User::class, 'teacher_id'); }
    public function enseignant(){ return $this->belongsTo(User::class, 'teacher_id'); }
}