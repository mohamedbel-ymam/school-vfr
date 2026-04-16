<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_id',
        'student_id',
        'can_retry',
        'is_locked',
    ];

    protected $casts = [
        'can_retry' => 'boolean',
        'is_locked' => 'boolean',
    ];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}

