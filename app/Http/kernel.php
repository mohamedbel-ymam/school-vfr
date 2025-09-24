<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Http\Middleware\HandleCors;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

class Kernel extends HttpKernel
{
    /**
     * The application's route middleware groups.
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
            HandleCors::class,
            EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            SubstituteBindings::class,
        ],
    ];

    /**
     * Laravel 10/11 name
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
        'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
        'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,

        // Your custom
        'lock.degree' => \App\Http\Middleware\EnsureStudentHasCorrectDegree::class,
    ];

    /**
     * Laravel 8/9 name (same aliases copied here)
     */
    protected $routeMiddleware = [
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
        'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
    'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
    'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,

        // Your custom
        'lock.degree' => \App\Http\Middleware\EnsureStudentHasCorrectDegree::class,
    ];
}

        
       



