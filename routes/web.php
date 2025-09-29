<?php
// routes/web.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show'])
    ->middleware('web')
    ->name('sanctum.csrf-cookie');

    Route::get('/', function () {
    return ['Laravel' => app()->version()];
});
Route::middleware('web')->group(function () {
    // CSRF cookie (Sanctum)
    Route::get('/sanctum/csrf-cookie', fn () => response()->noContent());

    // Login via Breeze
    Route::post('/connexion', [AuthenticatedSessionController::class, 'store'])->name('web.connexion');

    // ✅ ASCII alias for logout to match your frontend
    Route::post('/deconnexion', [AuthenticatedSessionController::class, 'destroy'])->name('web.deconnexion');

    // Optional: keep the accent route too (Breeze default)
    Route::post('/déconnexion', [AuthenticatedSessionController::class, 'destroy'])->name('web.déconnexion');

    // Optional: legacy alias if some code still posts here
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('web.login');
});

require __DIR__ . '/auth.php';
