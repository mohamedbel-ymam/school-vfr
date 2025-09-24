<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;

class AuthenticatedSessionController extends Controller
{
    public function store(LoginRequest $request): Response|RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        return $request->expectsJson()
            ? response()->noContent()                 // SPA / XHR
            : redirect()->intended('/');              // classic form
    }

    public function destroy(Request $request): Response|RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $request->expectsJson()
            ? response()->noContent()                 // SPA / XHR
            : redirect('/');                          // classic link/button
    }
}
