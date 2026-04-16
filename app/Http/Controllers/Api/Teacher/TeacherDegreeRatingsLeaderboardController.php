<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Degree;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherDegreeRatingsLeaderboardController extends Controller
{
    public function __invoke(Request $request, Degree $degree)
    {
        $term   = $request->query('term');
        $period = $request->query('period'); // YYYY-MM

        $q = User::query()
            ->where('users.role', 'student')
            ->where('users.degree_id', $degree->id)
            ->leftJoin('student_ratings as sr', function ($join) use ($request, $term, $period) {
                $join->on('sr.student_id', '=', 'users.id')
                    ->where('sr.rater_role', '=', 'teacher')
                    ->where('sr.rater_id', '=', $request->user()->id);

                if ($term)   $join->where('sr.term', '=', (string) $term);
                if ($period) $join->where('sr.period', '=', (string) $period);
            })
->select([
    'users.id',
    'users.avatar_url',
    DB::raw("TRIM(CONCAT(COALESCE(users.firstname,''),' ',COALESCE(users.lastname,''))) as name"),
    DB::raw("MAX(sr.stars) as my_stars"),
])
->groupBy('users.id', 'users.firstname', 'users.lastname', 'users.avatar_url')
->orderByRaw('my_stars IS NULL ASC')
->orderByDesc('my_stars');

$limit = (int) $request->query('limit', 150);

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
