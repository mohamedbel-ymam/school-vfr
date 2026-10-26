<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // Detect login input from 'login', 'email', or 'phone'
        $rawLogin = $request->input('login') ?? $request->input('email') ?? $request->input('phone');
        if ($rawLogin !== null) {
            $request->merge(['login' => $rawLogin]);
        }

        $request->validate([
            'login'    => ['required'],
            'password' => ['required'],
        ]);

        $login = $request->login;

        $field = filter_var($login, FILTER_VALIDATE_EMAIL)
            ? 'email'
            : 'phone';

        if (! Auth::attempt([
            $field    => $login,
            'password'=> $request->password,
        ])) {
            return response()->json([
                'message' => 'Identifiants invalides',
            ], 401);
        }

        $request->session()->regenerate();

        return response()->json([
            'data' => Auth::user(),
        ]);
    }

    public function logout(Request $request)
    {
        // IMPORTANT: force web guard for session-based auth
        Auth::guard('web')->logout();

        // Invalidate session + rotate CSRF token
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Déconnecté avec succès']);
    }
}
