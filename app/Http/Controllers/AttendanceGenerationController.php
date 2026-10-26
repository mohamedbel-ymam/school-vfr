<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lesson;
use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;

class AttendanceGenerationController extends Controller
{
    public function generateFromTimetable(Request $request)
    {
        $request->validate([
            'degree_id' => 'required|exists:degrees,id',
        ]);

        $degreeId = $request->degree_id;

        // Determine week_start (Monday)
        $weekStart = Carbon::now()->startOfWeek(Carbon::MONDAY)->toDateString();
        $weekEnd   = Carbon::now()->endOfWeek(Carbon::SUNDAY)->toDateString();

        // Count lessons for the week
        $count = Lesson::where('degree_id', $degreeId)
            ->whereBetween('date', [$weekStart, $weekEnd])
            ->count();

        // Get all students of the degree
        $students = User::role('student')
            ->where('degree_id', $degreeId)
            ->get();

        foreach ($students as $s) {
            // Get or create WEEK record
            $week = Attendance::firstOrCreate([
                'student_id' => $s->id,
                'period' => 'week',
                'week_start' => $weekStart,
            ]);

            $old = $week->presences;
            $delta = $count - $old;

            // Update week
            $week->presences = $count;
            $week->save();

            // Cascade to month & global
            Attendance::incrementPeriod($s->id, 'month', $delta);
            Attendance::incrementPeriod($s->id, 'overall', $delta);
        }

        return response()->json([
            'message' => 'Presences generated successfully.',
            'lessons' => $count,
        ]);
    }
}
