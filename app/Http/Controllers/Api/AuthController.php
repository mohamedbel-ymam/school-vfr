<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    // POST /api/login
    public function login(Request $req)
    {
        $req->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if (! Auth::attempt($req->only('email','password'))) {
            return response()->json(['message'=>'Invalid credentials'], 401);
        }

        // session-cookie is now set automatically
        return response()->json([
            'user' => $req->user(),
        ], 200);
    }

    // GET /api/me
    public function me(Request $req)
    {
        // this will 401 if not authenticated,
        // or return the user object otherwise
        return response()->json($req->user(), 200);
    }

    // POST /api/logout
    public function logout(Request $req)
    {
        Auth::logout();
        return response()->json(['message'=>'Logged out'], 200);
    }
}
