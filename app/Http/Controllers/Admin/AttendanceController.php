<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\Controller;
use App\Models\AttendanceStat;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    /**
     * List students with attendance counters for a given period.
     * Accepts filters: q, period ('overall'|'month'|'week'), degree_id
     * Response: { data: { items: [...], meta: {...} } }
     */
    public function index(Request $request)
{
    $q        = trim((string) $request->query('q', ''));
    $period   = $request->query('period', 'overall');
    $perPage  = max(1, min(100, (int) $request->query('per_page', 25)));
    $degreeId = $request->query('degree_id');

    [$scope, $key, $meta] = $this->resolveScopeAndKey($period);

    // --- Start a plain builder (NO ->role() call) ---
    $builder = \App\Models\User::query();

    // Prefer Spatie if present; else fall back to a column `role` or `roles` JSON
    if (method_exists(new \App\Models\User, 'scopeRole')) {
        // Spatie-Permission installed and trait on User
        $builder->role('student');
    } else {
        // Fallbacks if you keep a role string or JSON roles column
        $builder->where(function ($w) {
            $w->where('role', 'student'); // string column
            if (Schema::hasColumn('users', 'roles')) {
                // if you store roles as JSON array, this will work on MySQL 8+
                $w->orWhereJsonContains('roles', 'student');
            }
        });
    }

    // Optional join with degrees if schema is present
    $hasDegreeId = Schema::hasColumn('users', 'degree_id');
    $hasDegrees  = Schema::hasTable('degrees');

    if ($hasDegreeId && $hasDegrees) {
        $builder->leftJoin('degrees', 'degrees.id', '=', 'users.degree_id');
    }

    // Filters
    if ($degreeId && $hasDegreeId) {
        $builder->where('users.degree_id', $degreeId);
    }

    if ($q !== '') {
        $like = "%{$q}%";
        $builder->where(function ($w) use ($like, $hasDegrees) {
            $w->where('users.firstname', 'like', $like)
              ->orWhere('users.lastname', 'like', $like)
              ->orWhere('users.email', 'like', $like);
            if ($hasDegrees) {
                $w->orWhere('degrees.name', 'like', $like);
            }
        });
    }

    // Selects (add degree fields only if we joined)
    $select = [
        'users.id', 'users.firstname', 'users.lastname', 'users.email',
    ];
    if ($hasDegreeId)  $select[] = 'users.degree_id';
    if ($hasDegreeId && $hasDegrees) $select[] = 'degrees.name as degree_name';

    $students = $builder
        ->select($select)
        ->orderBy('users.lastname')
        ->orderBy('users.firstname')
        ->paginate($perPage);

    // ... keep the rest of your method exactly the same ...
    $stats = \App\Models\AttendanceStat::query()
        ->where('scope', $scope)
        ->where('period_key', $key)
        ->whereIn('student_id', $students->pluck('id'))
        ->get()
        ->keyBy('student_id');

    $items = $students->getCollection()->map(function ($u) use ($stats) {
        $s = $stats->get($u->id);
        return [
            'id'        => (int) $u->id,
            'firstname' => $u->firstname,
            'lastname'  => $u->lastname,
            'email'     => $u->email,
            'degree'    => (isset($u->degree_id) && $u->degree_id) ? [
                'id'   => (int) $u->degree_id,
                'name' => $u->degree_name ?? null,
            ] : null,
            'attendance' => [
                'absences'            => (int) ($s->absences ?? 0),
                'justified_absences'  => (int) ($s->justified_absences ?? 0),
                'presences'           => (int) ($s->presences ?? 0),
            ],
        ];
    })->values();

    return response()->json([
        'data' => [
            'items' => $items,
            'meta'  => [
                'page'     => $students->currentPage(),
                'per_page' => $students->perPage(),
                'total'    => $students->total(),
                'period'   => [
                    'scope' => $scope,
                    'key'   => $key,
                    'range' => $meta,
                ],
                'filters'  => [
                    'degree_id' => $degreeId,
                ],
            ],
        ],
    ]);
}
    /**
     * Bulk update counters for many students.
     * Body: { period?: 'overall'|'month'|'week', updates: [{ student_id, absences, justified_absences?, presences, period? }, ...] }
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'period' => ['nullable', Rule::in(['overall','month','week'])],
            'updates' => ['required','array','min:1'],
            'updates.*.student_id' => ['required','integer','exists:users,id'],
            'updates.*.absences'   => ['required','integer','min:0'],
            'updates.*.justified_absences' => ['nullable','integer','min:0'],
            'updates.*.presences'  => ['required','integer','min:0'],
            'updates.*.period'     => ['nullable', Rule::in(['overall','month','week'])],
        ]);

        $defaultPeriod = $validated['period'] ?? 'overall';

        foreach ($validated['updates'] as $row) {
            $rowPeriod = $row['period'] ?? $defaultPeriod;
            [$scope, $key, $meta] = $this->resolveScopeAndKey($rowPeriod);

            // Preserve justified_absences when not provided
            $stat = AttendanceStat::firstOrNew([
                'student_id' => (int) $row['student_id'],
                'scope'      => $scope,
                'period_key' => $key,
            ]);

            $stat->absences  = (int) $row['absences'];
            $stat->presences = (int) $row['presences'];
            $stat->justified_absences = array_key_exists('justified_absences', $row)
                ? (int) $row['justified_absences']
                : (int) ($stat->exists ? $stat->justified_absences : 0);

            $stat->meta = $meta;
            $stat->save();
        }

        return response()->json(['data' => ['ok' => true]]);
    }

    /**
     * Quick increment for one student (absence, absence_justified, presence)
     * Body: { type: 'absence'|'absence_justified'|'presence', amount?:1, period?:'overall'|'month'|'week' }
     */
    public function increment(Request $request, User $student)
    {
        $validated = $request->validate([
            'type'   => ['required', Rule::in(['absence','absence_justified','presence'])],
            'amount' => ['nullable','integer','min:1'],
            'period' => ['nullable', Rule::in(['overall','month','week'])],
        ]);

        $period = $validated['period'] ?? 'overall';
        $amount = (int) ($validated['amount'] ?? 1);
        [$scope, $key, $meta] = $this->resolveScopeAndKey($period);

        $stat = AttendanceStat::firstOrCreate(
            [
                'student_id' => (int) $student->id,
                'scope'      => $scope,
                'period_key' => $key,
            ],
            [
                'absences'            => 0,
                'justified_absences'  => 0,
                'presences'           => 0,
                'meta'                => $meta,
            ]
        );

        $field = match ($validated['type']) {
            'absence'           => 'absences',
            'absence_justified' => 'justified_absences',
            default             => 'presences',
        };

        $stat->increment($field, $amount);

        return response()->json(['data' => $stat->fresh()]);
    }

    /**
     * Admin summary for dashboard widgets.
     * GET /api/admin/attendance/summary?period=overall|month|week
     */
    public function summary(Request $request)
    {
        $period = $request->query('period','overall');
        [$scope, $key, $meta] = $this->resolveScopeAndKey($period);

        $agg = AttendanceStat::query()
            ->where('scope', $scope)
            ->where('period_key', $key)
            ->selectRaw('SUM(absences) as a, SUM(justified_absences) as j, SUM(presences) as p')
            ->first();

        $a = (int)($agg->a ?? 0);
        $j = (int)($agg->j ?? 0);
        $p = (int)($agg->p ?? 0);
        $total = $a + $j + $p;
        $attendance_rate = $total ? (int) round(($p / $total) * 100) : 0;

        // Top at-risk students
        $top = AttendanceStat::query()
            ->where('scope', $scope)
            ->where('period_key', $key)
            ->with(['student:id,firstname,lastname,email,degree_id'])
            ->orderByDesc('absences')
            ->orderByDesc(DB::raw('(absences + justified_absences)'))
            ->take(8)
            ->get()
            ->map(fn($s) => [
                'student' => [
                    'id'         => (int) $s->student->id,
                    'firstname'  => $s->student->firstname,
                    'lastname'   => $s->student->lastname,
                    'email'      => $s->student->email,
                    'degree_id'  => $s->student->degree_id,
                ],
                'absences'            => (int) $s->absences,
                'justified_absences'  => (int) $s->justified_absences,
                'presences'           => (int) $s->presences,
            ])->values();

        return response()->json([
            'data' => [
                'period' => ['scope' => $scope, 'key' => $key, 'range' => $meta],
                'totals' => [
                    'absences'            => $a,
                    'justified_absences'  => $j,
                    'presences'           => $p,
                    'attendance_rate'     => $attendance_rate,
                ],
                'top' => $top,
            ]
        ]);
    }

    /**
     * Map UI period -> (scope, key, meta-range)
     */
    protected function resolveScopeAndKey(string $period): array
    {
        $now = CarbonImmutable::now();

        switch ($period) {
            case 'week': {
                $start = $now->startOfWeek(CarbonImmutable::MONDAY);
                $end   = $now->endOfWeek(CarbonImmutable::SUNDAY);
                $year  = $now->isoWeekYear();
                $week  = str_pad((string) $now->isoWeek(), 2, '0', STR_PAD_LEFT);
                return ['week', "{$year}-W{$week}", [
                    'from' => $start->toDateString(),
                    'to'   => $end->toDateString(),
                ]];
            }
            case 'month': {
                $start = $now->startOfMonth();
                $end   = $now->endOfMonth();
                return ['month', $now->format('Y-m'), [
                    'from' => $start->toDateString(),
                    'to'   => $end->toDateString(),
                ]];
            }
            case 'overall':
            default:
                return ['overall', 'overall', null];
        }
    }
}

