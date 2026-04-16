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
        $period = $request->query('period','overall');

        // reuse same mapping logic as admin controller:
        [$scope, $key, $meta] = AttendancePeriod::resolve($period);

        $s = AttendanceStat::where('student_id',$user->id)
            ->where('scope',$scope)->where('period_key',$key)->first();

        return response()->json([
           'data' => [
             'period' => ['scope'=>$scope,'key'=>$key,'range'=>$meta],
             'attendance' => [
               'absences' => (int)($s->absences ?? 0),
               'justified_absences' => (int)($s->justified_absences ?? 0),
               'presences' => (int)($s->presences ?? 0),
             ],
           ]
        ]);
    }
}

