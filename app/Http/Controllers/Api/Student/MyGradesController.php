<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\Request;
use App\Support\AppliesTermDateFilter;

class MyGradesController extends Controller
{
    use AppliesTermDateFilter;

    public function __invoke(Request $request)
    {
        $student = $request->user();

        $q = Grade::query()
            ->where('student_id', $student->id)
            ->with([
                'subject:id,name',
                'teacher:id,firstname,lastname',
            ])
            ->latest();

	if ($request->filled('term')) {
            $term = (string) $request->string('term');
            $q->where('term', $term);
            $this->applyTermDateFilter($q, $term);
 	}
        $rows = $q->get();

        // ✅ compute global summary (for dashboard card)
        $sumScore = 0;
        $sumMax = 0;
        foreach ($rows as $g) {
            $m = (float) $g->max_score;
            if ($m <= 0) continue;
            $sumScore += (float) $g->score;
            $sumMax   += $m;
        }
        $avgPercent = $sumMax > 0 ? round(($sumScore / $sumMax) * 100, 2) : null;

        $gradesBySubject = $rows->groupBy(fn($g) => $g->subject?->name ?? '—');

        return response()->json([
            'student_id' => $student->id,
            'summary' => [
                'count' => $rows->count(),
                'avg_percent' => $avgPercent,
            ],
            'grades_by_subject' => $gradesBySubject,
        ]);
    }
}
