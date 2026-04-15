<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_id',
        'student_id',
        'attempt_number',
        'score',
        'is_valid',
        'completed_at',
    ];

    protected $casts = [
        'is_valid' => 'boolean',
        'completed_at' => 'datetime',
        'score' => 'float',
    ];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers()
    {
        return $this->hasMany(TestAttemptAnswer::class, 'attempt_id');
    }
}

