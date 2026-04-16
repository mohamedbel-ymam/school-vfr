<?php

namespace App\Policies;

use App\Models\Grade;
use App\Models\User;

class GradePolicy
{
    private function hasRole(User $user, array $roles): bool
    {
        $role = strtolower((string) $user->role);

        if (in_array($role, $roles, true)) return true;

        // If Spatie exists
        if (method_exists($user, 'hasAnyRole')) {
            return $user->hasAnyRole($roles);
        }

        return false;
    }

    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, ['admin', 'superadmin', 'teacher']);
    }

    public function view(User $user, Grade $grade): bool
    {
        if ($this->hasRole($user, ['admin','superadmin'])) return true;

        // teacher can view only what they entered (safe default)
        return $this->hasRole($user, ['teacher']) && $grade->entered_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $this->hasRole($user, ['admin','superadmin','teacher']);
    }

    public function update(User $user, Grade $grade): bool
    {
        if ($this->hasRole($user, ['admin','superadmin'])) return true;

        return $this->hasRole($user, ['teacher']) && $grade->entered_by === $user->id;
    }

    public function delete(User $user, Grade $grade): bool
    {
        return $this->hasRole($user, ['admin','superadmin']);
    }
}
