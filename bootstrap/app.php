<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Permission\Contracts\Role;
use Spatie\Permission\Middleware\PermissionMiddleware as MiddlewarePermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware as MiddlewareRoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware as MiddlewareRoleOrPermissionMiddleware;
use Spatie\Permission\Middlewares\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'role'               => MiddlewareRoleMiddleware::class,
            'permission'         => MiddlewarePermissionMiddleware::class,
            'role_or_permission' => MiddlewareRoleOrPermissionMiddleware::class,
        ]);
    

        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
