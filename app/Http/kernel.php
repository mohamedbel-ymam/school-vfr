<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;

// Cookie / Session
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

// CSRF (only for 'web')
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as VerifyCsrfToken;

// Routing / CORS
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Http\Middleware\HandleCors;

// Sanctum
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

class Kernel extends HttpKernel
{
    /**
     * Global middleware (applies to both 'web' and 'api').
     * Keeping CORS here is the Laravel default and avoids surprises.
     */
    protected $middleware = [
        HandleCors::class,
    TrimStrings::class,
    ConvertEmptyStringsToNull::class,
    ];

    /**
     * Route middleware groups.
     */
    protected $middlewareGroups = [
        'web' => [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            VerifyCsrfToken::class,
            SubstituteBindings::class,
        ],

        'api' => [
            // Sanctum: marks browser requests from your SPA as "stateful"
            EnsureFrontendRequestsAreStateful::class,

            // Minimal session support so cookies work in API requests
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,

            // Usual API middleware
            // 'throttle:api', // (optional) enable if you added a rate limiter
            SubstituteBindings::class,
        ],
    ];

    /**
     * Laravel 10/11 aliases.
     */
    protected $middlewareAliases = [
        // Laravel defaults
        'auth'              => \Illuminate\Auth\Middleware\Authenticate::class,
        'auth.basic'        => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'cache.headers'     => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can'               => \Illuminate\Auth\Middleware\Authorize::class,
        'guest'             => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm'  => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed'            => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle'          => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified'          => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,

        // Spatie
        'role'              => \Spatie\Permission\Middleware\RoleMiddleware::class,
        'permission'        => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        'role_or_permission'=> \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,

        // Custom
        'lock.degree'       => \App\Http\Middleware\EnsureStudentHasCorrectDegree::class,
    ];

    /**
     * Back-compat for Laravel 8/9 (same aliases).
     */
    protected $routeMiddleware = [
        'auth'              => \Illuminate\Auth\Middleware\Authenticate::class,
        'auth.basic'        => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'cache.headers'     => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can'               => \Illuminate\Auth\Middleware\Authorize::class,
        'guest'             => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm'  => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed'            => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle'          => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified'          => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,

        // Spatie
        'role'              => \Spatie\Permission\Middleware\RoleMiddleware::class,
        'permission'        => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        'role_or_permission'=> \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,

        // Custom
        'lock.degree'       => \App\Http\Middleware\EnsureStudentHasCorrectDegree::class,
    ];
}
