<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExperimentQuestion extends Model
{
    protected $fillable = [
        'experiment_id',
        'order',
        'type',
        'prompt',
        'options',
        'answer',
        'tolerance',
        'explanation',
        'is_instant_feedback',
    ];

    protected $casts = [
        'options' => 'array',
        'answer' => 'array',
        'tolerance' => 'float',
        'is_instant_feedback' => 'boolean',
    ];

    public function experiment(): BelongsTo
    {
        return $this->belongsTo(Experiment::class);
    }
}
