<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\StudentRating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MyRatingsController extends Controller
{
    public function __invoke(Request $request)
    {
        $q = StudentRating::query()
            ->where('student_id', $request->user()->id);

        if ($request->filled('term'))   $q->where('term', $request->string('term'));
        if ($request->filled('period')) $q->where('period', $request->string('period'));

        $rows = $q->selectRaw("
                term,
                period,
                ROUND(AVG(CASE WHEN rater_role='teacher' THEN stars END), 2) as avg_teacher_stars,
                ROUND(AVG(CASE WHEN rater_role='admin' THEN stars END), 2) as avg_admin_stars,
                ROUND(AVG(stars), 2) as avg_all_stars,
                SUM(CASE WHEN rater_role='teacher' THEN 1 ELSE 0 END) as teacher_count,
                SUM(CASE WHEN rater_role='admin' THEN 1 ELSE 0 END) as admin_count
            ")
            ->groupBy('term', 'period')
            ->orderByDesc('period')
            ->paginate(20);

        return response()->json($rows);
    }
}
