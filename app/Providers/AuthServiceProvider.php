<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
	Grade::class => GradePolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        Gate::define('isAdmin', function (User $user) {
            // normalize to lowercase just in case
            return strtolower((string) $user->role) === 'admin';
        });
         Gate::define('admin', fn($user) => $user->role === 'admin');
	
	Gate::define('manage timetables', function (User $user) {
        // allow both admin & superadmin if you use either; adjust to your setup
        $role = strtolower((string) $user->role);
        return in_array($role, ['admin','superadmin'], true)
            || ($user->hasAnyRole?->call($user, ['admin','superadmin']) ?? false); // works if Spatie HasRoles is on User
    });
    }
}
