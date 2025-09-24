<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Get the current role value even if it's a PHP Backed Enum
        $role = $user->role;
        if ($role instanceof \BackedEnum) {
            $current = strtolower((string) $role->value);
        } else {
            $current = strtolower((string) $role);
        }

        // Normalize incoming allowed roles (English + French aliases)
        $normalize = function (string $r): string {
            $r = strtolower($r);
            return match ($r) {
                'eleve', 'élève', 'student'     => 'student',
                'enseignant', 'teacher'         => 'teacher',
                'parent'                         => 'parent',
                'admin', 'administrator'        => 'admin',
                default                         => $r,
            };
        };

        $allowed = array_map($normalize, $roles);
        $current = $normalize($current);

        if (!in_array($current, $allowed, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
