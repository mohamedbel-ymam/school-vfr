<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
// use App\Enums\UserRole; // only if you really use it

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $guard_name = 'web';

    /* ---------------- Relationships ---------------- */
    public function degree()  { return $this->belongsTo(Degree::class); }
    public function subject() { return $this->belongsTo(Subject::class); }
    public function parent()      { return $this->belongsTo(User::class, 'student_parent_id'); }
    public function parentUser()  { return $this->parent(); }
    public function children()    { return $this->hasMany(User::class, 'student_parent_id'); }

    /* ---------------- Mass assignment / Hidden / Casts ---------------- */
    protected $fillable = [
        'firstname','lastname','date_of_birth','gender','blood_type','address','phone','email','password',
        'role','degree_id','subject_id','student_parent_id','email_verified_at',
    ];

    protected $hidden = ['password','remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        // 'role' => UserRole::class, // only if using backed enum
    ];

    // ✅ Only these are appended. DO NOT append "roles" here.
    protected $appends = ['degree_slug', 'degree_obj'];

    /* ---------------- Accessors / Mutators ---------------- */
    protected function role(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if ($value instanceof \BackedEnum) $value = $value->value;
                return self::normalizeRole($value);
            },
            set: function ($value) {
                if ($value instanceof \BackedEnum) $value = $value->value;
                return self::normalizeRole($value);
            }
        );
    }

    private static function normalizeRole(?string $r): ?string
    {
        if ($r === null) return null;
        $r = preg_replace('/\x{00A0}/u', '', $r);
        $r = strtolower(trim($r));

        return match ($r) {
            'élève','eleve','étudiant','etudiant','student'    => 'student',
            'enseignant','prof','professeur','teacher'          => 'teacher',
            'parent'                                            => 'parent',
            'administrateur','administrator','admin'            => 'admin',
            default                                             => $r,
        };
    }

    // ✅ Appended: degree_slug / degree_obj (safe names, no collisions)
    public function getDegreeSlugAttribute(): ?string
    {
        return $this->degree?->slug;
    }

    public function getDegreeObjAttribute()
    {
        return $this->degree; // alias for FE convenience
    }

    /* ---------------- Convenience ---------------- */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->firstname} {$this->lastname}");
    }

    public function isAdmin(): bool   { return $this->role === 'admin'; }
    public function isTeacher(): bool { return $this->role === 'teacher'; }
    public function isStudent(): bool { return $this->role === 'student'; }
    public function isParent(): bool  { return $this->role === 'parent'; }
}
