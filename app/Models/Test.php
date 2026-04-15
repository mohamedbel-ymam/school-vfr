<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\TestAssignment;
use App\Models\TestAttempt;
use App\Models\TestQuestion;

class Test extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'title',
        'description',
        'global_time_minutes',
        'question_time_minutes',
        'total_questions',
        'grade_value',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function questions()
    {
        return $this->hasMany(TestQuestion::class);
    }

    public function assignments()
    {
        return $this->hasMany(TestAssignment::class);
    }

    public function attempts()
    {
        return $this->hasMany(TestAttempt::class);
    }
}

