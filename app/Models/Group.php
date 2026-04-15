<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;
use App\Models\Degree;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'degree_id',
        'name',
        'slug',
        'description',
    ];

    /* ------------------------- Relations ------------------------- */

    public function degree()
    {
        return $this->belongsTo(Degree::class, 'degree_id');
    }

    public function students()
    {
        return $this->belongsToMany(
            User::class,     // ✅ users table
            'group_user',    // pivot table
            'group_id',      // FK on pivot
            'user_id'        // related FK
        )->wherePivot('role', 'student');
    }

    public function teachers()
    {
        return $this->belongsToMany(
            User::class,     // ✅ users table
            'group_user',
            'group_id',
            'user_id'
        )->wherePivot('role', 'teacher');
    }
}
