<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    // Use the HasFactory trait if you plan to use Model Factories for testing or seeding
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'capacity',
    ];

    /**
     * Get the timetables associated with the room.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function timetables(): HasMany
    {
        // Using the fully qualified class name for clarity,
        // but your original usage of \App\Models\Timetable::class was also correct.
        return $this->hasMany(Timetable::class);
    }
}
