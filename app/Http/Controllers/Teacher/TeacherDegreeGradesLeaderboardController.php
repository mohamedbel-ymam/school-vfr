<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Degree;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherDegreeGradesLeaderboardController extends Controller
{
    public function __invoke(Request $request, Degree $degree)
    {
        $teacherId = $request->user()->id;

        $term      = $request->query('term');
        $subjectId = $request->query('subject_id');

        $q = User::query()
            ->where('users.role', 'student')
            ->where('users.degree_id', $degree->id)
            ->leftJoin('grades as g', function ($join) use ($term, $subjectId, $teacherId) {
                $join->on('g.student_id', '=', 'users.id')
                     ->where('g.entered_by', '=', $teacherId); // ✅ seulement notes saisies par ce prof

                if ($term) {
                    $join->where('g.term', '=', (string) $term);
                }
                if ($subjectId) {
                    $join->where('g.subject_id', '=', (int) $subjectId);
                }
            })
->select([
    'users.id',
    'users.avatar_url',
    DB::raw("TRIM(CONCAT(COALESCE(users.firstname,''),' ',COALESCE(users.lastname,''))) as name"),
    DB::raw("COUNT(g.id) as grades_count"),
    DB::raw("ROUND(AVG(CASE WHEN g.max_score > 0 THEN (g.score / g.max_score) * 100 END), 2) as avg_percent"),
])
->groupBy('users.id', 'users.firstname', 'users.lastname', 'users.avatar_url')
->orderByRaw('avg_percent IS NULL ASC')
->orderByDesc('avg_percent');

$limit = (int) $request->query('limit', 120);
$students = $q->limit(max(1, min($limit, 300)))->get();

$students->transform(function ($s) {
    $s->avatar_url = $s->avatar_url ? url('storage/'.$s->avatar_url) : null;
    return $s;
});

return response()->json([
    'degree' => ['id' => $degree->id, 'name' => $degree->name ?? null],
    'data'   => $students,
]);

    }
}
