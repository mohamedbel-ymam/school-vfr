<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    protected $fillable = [
        'student_id',
        'subject_id',
        'entered_by',
        'teacher_id',
        'term',
        'exam_type',
        'title',
        'score',
        'max_score',
        'graded_at',
        'comment',
        // exam_key NOT fillable from request (we compute it)
        'exam_key',
    ];

    protected $casts = [
        'student_id' => 'integer',
        'subject_id' => 'integer',
        'entered_by' => 'integer',
        'teacher_id' => 'integer',
        'score'      => 'decimal:2',
        'max_score'  => 'decimal:2',
        'graded_at'  => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (Grade $grade) {
            // ensure exam_key always computed server-side
            $grade->exam_key = hash('sha256', implode('|', [
    	$grade->student_id,
    	$grade->subject_id,
    	$grade->term ?? 'S1',
    	$grade->exam_type ?? 'Exam',
    	$grade->title ?? '',
    	optional($grade->graded_at)->format('Y-m-d') ?? '',
	]));
        });
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
