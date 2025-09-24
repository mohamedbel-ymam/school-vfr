<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $r)
    {
        $perPage = (int) $r->integer('per_page', 20);

        $q = User::query()
            ->whereHas('roles', fn($qq) => $qq->where('name', 'admin'))
            ->select('id','firstname','lastname','email','created_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json(['data' => $q]);
    }

    public function candidates(Request $r)
    {
        $perPage = (int) $r->integer('per_page', 20);
        $search  = trim((string) $r->get('search', ''));

        $q = User::query()
            ->whereDoesntHave('roles', fn($qq) => $qq->where('name', 'admin'));

        if ($search !== '') {
            $q->where(function($qq) use ($search) {
                $qq->where('email','like',"%{$search}%")
                   ->orWhere('firstname','like',"%{$search}%")
                   ->orWhere('lastname','like',"%{$search}%");
            });
        }

        $q = $q->select('id','firstname','lastname','email','created_at')
               ->orderBy('firstname')
               ->paginate($perPage);

        return response()->json(['data' => $q]);
    }

    public function assign(User $user)
    {
        if ($user->hasRole('admin')) {
            return response()->json(['message' => 'Cet utilisateur est déjà administrateur.'], 200);
        }
        $user->assignRole('admin');
        return response()->json(['message' => 'Rôle administrateur attribué.', 'user' => $user]);
    }

    public function revoke(Request $r, User $user)
    {
        if (! $user->hasRole('admin')) {
            return response()->json(['message' => 'Cet utilisateur n’est pas administrateur.'], 200);
        }

        $adminCount = User::whereHas('roles', fn($qq) => $qq->where('name', 'admin'))->count();
        if ($adminCount <= 1) {
            return response()->json(['message' => 'Impossible de retirer le dernier administrateur.'], 422);
        }

        $user->removeRole('admin');
        return response()->json(['message' => 'Rôle administrateur retiré.', 'user' => $user]);
    }
}
