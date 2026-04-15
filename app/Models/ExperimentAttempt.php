<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExperimentAttempt extends Model
{
    protected $fillable = [
        'experiment_id',
        'user_id',
        'mode',
        'state',
        'started_at',
        'ended_at',
	'public_token',   
 ];

    protected $casts = [
        'state' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function experiment(): BelongsTo
    {
        return $this->belongsTo(Experiment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ExperimentAttemptAnswer::class, 'attempt_id');
    }
}
