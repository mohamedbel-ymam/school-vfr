<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExperimentAttemptAnswer extends Model
{
    protected $fillable = [
        'attempt_id',
        'question_id',
        'user_answer',
        'is_correct',
        'feedback',
        'tries',
    ];

    protected $casts = [
        'user_answer' => 'array',
        'is_correct' => 'boolean',
        'tries' => 'integer',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExperimentAttempt::class, 'attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(ExperimentQuestion::class, 'question_id');
    }
}
