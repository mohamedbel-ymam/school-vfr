<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
    	'test_id',
    	'statement',
    	'options',
    	'correct_answer',
    	'order',
    	'images',
    	'categories',
    	'difficulty',
	];

	protected $casts = [
    	'options' => 'array',
    	'images' => 'array',
    	'categories' => 'array',
	];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function answers()
    {
        return $this->hasMany(TestAttemptAnswer::class, 'question_id');
    }
}

