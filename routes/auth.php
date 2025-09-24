<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;

// — Inscription
Route::post('/register', [RegisteredUserController::class, 'store'])
    ->middleware('guest')
    ->name('register');

// — Connexion (session + CSRF)
Route::post('/connexion', [AuthenticatedSessionController::class, 'store'])
    ->middleware('guest')
    ->name('connexion');

// — Redirection après déconnexion / mot de passe oublié
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
    ->middleware('guest')
    ->name('password.email');
Route::post('/reset-password', [NewPasswordController::class, 'store'])
    ->middleware('guest')
    ->name('password.store');

// — Vérification email
Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['auth','signed','throttle:6,1'])
    ->name('verification.verify');

// — Renvoi notification pour vérification email
Route::post('/email/verification-notification',
    [EmailVerificationNotificationController::class, 'store'])
    ->middleware(['auth','throttle:6,1'])
    ->name('verification.send');

// — Déconnexion (session)
Route::post('/déconnexion', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('déconnexion');
