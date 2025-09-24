<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        Gate::define('isAdmin', function (User $user) {
            // normalize to lowercase just in case
            return strtolower((string) $user->role) === 'admin';
        });
         Gate::define('admin', fn($user) => $user->role === 'admin');

    }
}
