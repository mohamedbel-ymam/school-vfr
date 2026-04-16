<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // 🔥 REQUIRED for SPA Sanctum
        $request->session()->regenerate();

        $user = User::with('subject')->find(Auth::id());

        return response()->json([
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'data' => $request->user()->load('subject'),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        // 🔥 REQUIRED cleanup
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }
}
