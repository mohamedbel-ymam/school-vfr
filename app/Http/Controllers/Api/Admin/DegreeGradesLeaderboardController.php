<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Degree;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\AppliesTermDateFilter;

class DegreeGradesLeaderboardController extends Controller
{
    use AppliesTermDateFilter;

    public function __invoke(Request $request, Degree $degree)
    {
        $term      = $request->query('term');
        $subjectId = $request->query('subject_id');

        $range = $term ? $this->termDateRange((string) $term) : null;

        $q = User::query()
            ->where('users.role', 'student')
            ->where('users.degree_id', $degree->id)
            ->leftJoin('grades as g', function ($join) use ($term, $subjectId, $range) {
                $join->on('g.student_id', '=', 'users.id');

                if ($term) {
                    $join->where('g.term', '=', (string) $term);
                }

                if ($range) {
                    [$from, $to] = $range;
                    $join->whereBetween('g.graded_at', [$from, $to]);
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
    DB::raw("ROUND(SUM(g.score), 2) as total_score"),
    DB::raw("ROUND(SUM(g.max_score), 2) as total_max"),
    DB::raw("ROUND((SUM(g.score) / NULLIF(SUM(g.max_score), 0)) * 100, 2) as total_percent"),
    DB::raw("ROUND(AVG(CASE WHEN g.max_score > 0 THEN (g.score / g.max_score) * 100 END), 2) as avg_percent"),
])
->groupBy('users.id', 'users.firstname', 'users.lastname', 'users.avatar_url')
->orderByRaw('avg_percent IS NULL ASC')
->orderByDesc('avg_percent');

$limit = (int) $request->query('limit', 60);

$students = $q->limit(max(1, min($limit, 300)))->get();

$students->transform(function ($s) {
    $path = $s->avatar_url;
    $s->avatar_url = $path
        ? (str_starts_with($path, 'http') ? $path : url('storage/'.$path))
        : null;
    return $s;
});

return response()->json([
    'degree'  => ['id' => $degree->id, 'name' => $degree->name ?? null],
    'filters' => ['term' => $term ?? null, 'subject_id' => $subjectId ?? null],
    'data'    => $students,
]);
    }
}
