<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentRating extends Model
{
    protected $table = 'student_ratings';

    protected $fillable = [
       'student_id','rater_id','rater_role','term','period','rated_at','stars','comment'

    ];

    protected $casts = [
        'student_id' => 'integer',
        'rater_id'   => 'integer',
        'stars'      => 'integer',
        'rated_at'   => 'date:Y-m-d',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function rater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rater_id');
    }
}
