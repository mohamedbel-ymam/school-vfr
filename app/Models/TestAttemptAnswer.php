<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestAttemptAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'attempt_id',
        'question_id',
        'student_answer',
        'is_correct',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function attempt()
    {
        return $this->belongsTo(TestAttempt::class, 'attempt_id');
    }

    public function question()
    {
        return $this->belongsTo(TestQuestion::class, 'question_id');
    }
}

