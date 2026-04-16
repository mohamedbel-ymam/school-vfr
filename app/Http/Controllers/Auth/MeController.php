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
            'subject:id,name,code', // ✅ ADD THIS
        ]);

        $spatie = method_exists($user, 'getRoleNames')
            ? $user->getRoleNames()
            : collect();

        $roles = $user->getRoleNames()->values()->all();

	return response()->json([
  	'data' => array_merge($user->toArray(), [
    	'roles' => $roles,
    	'role'  => $roles[0] ?? null, // ✅ derived, not stored
    	'user' => $request->user()->load('subject:id,name,code'),
  	
]),
	]);
    }
}
