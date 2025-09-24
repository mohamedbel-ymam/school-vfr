<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class MeController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user()->load([
            'degree:id,slug,name',
        ]);

        // Build roles array safely (Spatie or fallback to single role column)
        $spatie = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $roles  = ($spatie && $spatie->count() > 0)
            ? $spatie->values()->all()
            : array_values(array_filter([$user->role]));

        return response()->json([
            'data' => array_merge($user->toArray(), [
                'roles'       => $roles,                                   // what FE expects
                'degree_slug' => $user->degree?->slug,                     // convenience
                'degree_obj'  => $user->degree?->only(['id','slug','name'])// light object
            ]),
        ]);
    }
}
