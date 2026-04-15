<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/';

    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting(): void
    {
        // LOGIN (anti brute-force): 5/min per IP+email
        RateLimiter::for('auth-login', function (Request $request) {
            $email = mb_strtolower((string) $request->input('email', ''));
            return Limit::perMinute(5)->by($request->ip() . '|' . $email);
        });

        // PUBLIC READ: 60/min per IP
        RateLimiter::for('public-read', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // PUBLIC WRITE: 20/min per IP
        RateLimiter::for('public-write', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // AUTHENTICATED API: 120/min per user (fallback IP)
        RateLimiter::for('api-auth', function (Request $request) {
            $key = $request->user()?->id
                ? 'user:' . $request->user()->id
                : 'ip:' . $request->ip();

            return Limit::perMinute(120)->by($key);
        });
    }
}
