<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStudentHasCorrectDegree
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            $requestedDegreeId = $request->route('degree');

            if ($requestedDegreeId != $user->degree_id) {
                return response()->json(['message' => 'Access Denied. Wrong degree.'], 403);
            }
        }

        return $next($request);
    }
}
