<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceStat;
use App\Support\AttendancePeriod;
use Illuminate\Http\Request;

class AttendanceReadController extends Controller
{
    public function me(Request $request)
{
    $user = $request->user();
    if (!$user) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    $period = $request->query('period','overall');
    [$scope, $key, $meta] = \App\Support\AttendancePeriod::resolve($period);

    $s = \App\Models\AttendanceStat::where('student_id', $user->id)
        ->where('scope', $scope)
        ->where('period_key', $key)
        ->first();

    return response()->json([
        'data' => [
            'period' => ['scope'=>$scope,'key'=>$key,'range'=>$meta],
            'attendance' => [
                'absences'            => (int)($s->absences ?? 0),
                'justified_absences'  => (int)($s->justified_absences ?? 0),
                'presences'           => (int)($s->presences ?? 0),
            ],
        ],
    ]);
}

}
