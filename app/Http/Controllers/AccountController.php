<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AccountController extends Controller
{
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required','current_password'],
            'password'         => ['required','confirmed', Password::defaults()],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // (Optional) log out other devices:
        // $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id ?? null)->delete();

        return response()->json(['message' => 'Mot de passe updated successfully.']);
    }
}
