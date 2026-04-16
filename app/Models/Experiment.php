<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Experiment extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'subject',
        'is_public',
        'level_tags',
        'briefing',
        'synthese',
        'simulation',
        'runner_config',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'level_tags' => 'array',
        'briefing' => 'array',
        'synthese' => 'array',
        'simulation' => 'array',
        'runner_config' => 'array',
    ];

    public function questions(): HasMany
    {
        return $this->hasMany(ExperimentQuestion::class)->orderBy('order');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExperimentAttempt::class);
    }
}
