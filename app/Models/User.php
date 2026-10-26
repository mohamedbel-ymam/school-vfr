<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * Spatie guard
     */
    protected $guard_name = 'web';

    /* -----------------------------------------------------------------
     | Mass assignment / Hidden / Casts
     |-----------------------------------------------------------------*/

    protected $fillable = [
        'firstname',
        'lastname',
        'date_of_birth',
        'gender',
        'blood_type',
        'address',
        'phone',
        'email',
        'password',

        'degree_id',
        'subject_id',
        'student_parent_id',
        'email_verified_at', 	
        'avatar_status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'avatar_pending_url',
        'avatar_reviewed_at',
        'avatar_reviewed_by',
        'avatar_url',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'avatar_reviewed_at' => 'datetime',
    ];

    /**
     * Appended attributes (SAFE names only)
     */
    protected $appends = [
        'degree_slug',
        'degree_obj',
        'full_name',
        'name',
        'avatar_public_url',
    ];

    /* -----------------------------------------------------------------
     | Relationships
     |-----------------------------------------------------------------*/

    public function degree()
    {
        return $this->belongsTo(Degree::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class,'subject_id');
    }

    // Parent / children (same users table)
    public function parentUser()
    {
        return $this->belongsTo(User::class, 'student_parent_id');
    }

    public function children()
    {
        return $this->hasMany(User::class, 'student_parent_id');
    }

    // Groups (pivot: group_user)
    public function groups()
    {
        return $this->belongsToMany(Group::class, 'group_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function getAvatarPublicUrlAttribute()
    {
        if (($this->avatar_status ?? 'none') !== 'approved') return null;
        if (!$this->avatar_url) return null;

        // already absolute
        if (preg_match('/^https?:\/\//', $this->avatar_url)) return $this->avatar_url;

        // avatar_url stored like: "avatars/approved/223/avatar.png"
        return Storage::disk('public')->url($this->avatar_url); // => /storage/avatars/approved/223/avatar.png
    }

    // Boursier
    public function boursierProfile()
    {
        return $this->hasOne(BoursierProfile::class, 'user_id');
    }

    /* -----------------------------------------------------------------
     | Accessors (SAFE)
     |-----------------------------------------------------------------*/

    public function getDegreeSlugAttribute(): ?string
    {
        return $this->degree?->slug;
    }

    public function getDegreeObjAttribute()
    {
        return $this->degree;
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->firstname} {$this->lastname}");
    }

    public function getNameAttribute(): string
    {
        return $this->full_name;
    }

    /* -----------------------------------------------------------------
     | Role helpers (Spatie-compatible)
     |-----------------------------------------------------------------*/

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isTeacher(): bool
    {
        return $this->hasRole('teacher');
    }

    public function isStudent(): bool
    {
        return $this->hasRole('student');
    }

    public function isParent(): bool
    {
        return $this->hasRole('parent');
    }
}
