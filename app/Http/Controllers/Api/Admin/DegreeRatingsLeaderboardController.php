<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Degree;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DegreeRatingsLeaderboardController extends Controller
{
    public function __invoke(Request $request, Degree $degree)
    {
        $term   = $request->query('term');
        $period = $request->query('period'); // YYYY-MM

        $q = User::query()
            ->where('users.role', 'student')
            ->where('users.degree_id', $degree->id)
            ->leftJoin('student_ratings as sr', function ($join) use ($term, $period) {
                $join->on('sr.student_id', '=', 'users.id');

                if ($term)   $join->where('sr.term', '=', (string) $term);
                if ($period) $join->where('sr.period', '=', (string) $period);
            })
->select([
    'users.id',
    'users.avatar_url',

    DB::raw("TRIM(CONCAT(COALESCE(users.firstname,''),' ',COALESCE(users.lastname,''))) as name"),

    DB::raw("ROUND(AVG(CASE WHEN sr.rater_role='teacher' THEN sr.stars END), 2) as avg_teacher_stars"),
    DB::raw("ROUND(AVG(CASE WHEN sr.rater_role='admin' THEN sr.stars END), 2) as avg_admin_stars"),
    DB::raw("ROUND(AVG(sr.stars), 2) as avg_all_stars"),

    DB::raw("SUM(CASE WHEN sr.rater_role='teacher' THEN 1 ELSE 0 END) as teacher_count"),
    DB::raw("SUM(CASE WHEN sr.rater_role='admin' THEN 1 ELSE 0 END) as admin_count"),
])
->groupBy('users.id', 'users.firstname', 'users.lastname', 'users.avatar_url')
->orderByRaw('avg_all_stars IS NULL ASC')
->orderByDesc('avg_all_stars');

$limit = (int) $request->query('limit', 120);

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
    'filters' => ['term' => $term, 'period' => $period],
    'data'    => $students,
]);
    }
}
