<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTimetableRequest;
use App\Http\Resources\TimetableResource;
use App\Models\Timetable;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;


class TimetableController extends Controller
{
    /** Admin listing with optional filters. */
    public function adminList(Request $req)
    {
        $q = Timetable::with([
            'subject:id,name',
            'degree:id,name',
            'room:id,name',
            'teacher:id,firstname,lastname',
        ]);

        if ($t = $req->query('teacher_id')) $q->where('teacher_id', $t);
        if ($d = $req->query('degree_id'))  $q->where('degree_id', $d);

        // optional filter by week_start (YYYY-MM-DD or ISO week YYYY-Www)
        if (Schema::hasColumn('timetables', 'week_start')) {
            if ($ws = $this->normalizeWeekStart($req->query('week_start'))) {
                $q->whereDate('week_start', $ws);
            }
        }

        $perPage = max(1, min((int) $req->query('per_page', 100), 1000));

        if (Schema::hasColumn('timetables', 'degree_id'))   $q->orderBy('degree_id');
        if (Schema::hasColumn('timetables', 'day_of_week')) $q->orderBy('day_of_week');

        if (Schema::hasColumn('timetables', 'start_time')) {
            $q->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END');
            $q->orderBy('start_time');
        }

        if (Schema::hasColumn('timetables', 'period')) {
            $q->orderBy('period');
        }

        $page = $q->paginate($perPage);

        return response()->json([
            'data' => TimetableResource::collection($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }

    /** Student → lessons for the authenticated student (optional ?week_start=...) */
    public function student(Request $request)
    {
        $user = $request->user(); // role: student

        $degreeId = $this->resolveStudentDegreeId($user->id);
        if (!$degreeId) {
            return response()->json([
                'data' => ['lessons' => []],
            ]);
        }

        $q = Timetable::with([
                'subject:id,name',
                'degree:id,name',
                'room:id,name',
                'teacher:id,firstname,lastname',
            ])
            ->where('degree_id', $degreeId);

        // week_start filter
        if (Schema::hasColumn('timetables', 'week_start')) {
            if ($ws = $this->normalizeWeekStart($request->query('week_start'))) {
                $q->whereDate('week_start', $ws);
            }
        }

        $q->when(Schema::hasColumn('timetables','day_of_week'), fn($q) => $q->orderBy('day_of_week'))
          ->when(Schema::hasColumn('timetables','start_time'), function ($q) {
                $q->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END')
                  ->orderBy('start_time');
           })
          ->when(Schema::hasColumn('timetables','period'), fn($q) => $q->orderBy('period'));

        $lessons = $q->get();

        return response()->json([
            'data' => [
                // Return normalized payload via Resource
                'lessons' => TimetableResource::collection($lessons),
            ],
        ]);
    }

    /** Teacher → lessons for the authenticated teacher (optional ?degree_id=...&week_start=...) */
    public function teacher(Request $request)
    {
        $user = $request->user(); // role: teacher
        $degreeId = $request->query('degree_id');

        $q = Timetable::with([
                'subject:id,name',
                'degree:id,name',
                'room:id,name',
                'teacher:id,firstname,lastname',
            ])
            ->where('teacher_id', $user->id)
            ->when($degreeId, fn($q) => $q->where('degree_id', $degreeId));

        // week_start filter
        if (Schema::hasColumn('timetables', 'week_start')) {
            if ($ws = $this->normalizeWeekStart($request->query('week_start'))) {
                $q->whereDate('week_start', $ws);
            }
        }

        $q->when(Schema::hasColumn('timetables', 'day_of_week'), fn($q) => $q->orderBy('day_of_week'))
          ->when(Schema::hasColumn('timetables', 'start_time'), function ($q) {
                $q->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END')
                  ->orderBy('start_time');
           })
          ->when(Schema::hasColumn('timetables', 'period'), fn($q) => $q->orderBy('period'));

        $lessons = $q->get();

        return response()->json([
            'data' => [
                'lessons' => TimetableResource::collection($lessons),
            ],
        ]);
    }

    /** Parent → lessons for a selected child (?child_id=…&week_start=…) */
    public function parent(Request $request)
    {
        $parent = $request->user(); // role: parent
        $childId = (int) $request->query('child_id');
        if (!$childId) {
            return response()->json(['message' => 'Le paramètre child_id est requis.'], 422);
        }

        $degreeId = $this->resolveStudentDegreeId($childId);
        if (!$degreeId) {
            return response()->json(['message' => "Aucun niveau trouvé pour l'enfant sélectionné."], 404);
        }

        $q = Timetable::with([
                'subject:id,name',
                'degree:id,name',
                'room:id,name',
                'teacher:id,firstname,lastname',
            ])
            ->where('degree_id', $degreeId);

        // week_start filter
        if (Schema::hasColumn('timetables', 'week_start')) {
            if ($ws = $this->normalizeWeekStart($request->query('week_start'))) {
                $q->whereDate('week_start', $ws);
            }
        }

        $q->when(Schema::hasColumn('timetables', 'day_of_week'), fn($q) => $q->orderBy('day_of_week'))
          ->when(Schema::hasColumn('timetables', 'start_time'), function ($q) {
                $q->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END')
                  ->orderBy('start_time');
           })
          ->when(Schema::hasColumn('timetables', 'period'), fn($q) => $q->orderBy('period'));

        $lessons = $q->get();

        return response()->json([
            'data' => [
                'lessons' => TimetableResource::collection($lessons),
            ],
        ]);
    }

    /** Create */
 public function store(StoreTimetableRequest $request)
{
    $data = $request->validated();

    // Canonical values from the request (the request already normalized them)
    $day        = $data['day'] ?? $data['day_of_week'] ?? null;     // 1..7
    $start_time = $data['hour_from'] ?? $data['start_time'] ?? null; // H:i
    $end_time   = $data['hour_to']   ?? $data['end_time']   ?? null; // H:i
    $week_start = $data['week_start'] ?? null;

    // Start with FK & misc fields (same in both schemas)
    $insert = [
        'degree_id'  => $data['degree_id'],
        'subject_id' => $data['subject_id'],
        'teacher_id' => $data['teacher_id'],
        'room_id'    => $data['room_id'] ?? null,
        'title'      => $data['title']   ?? null,
    ];

    // Conditionally map to the columns your table actually has
    if (Schema::hasColumn('timetables', 'day_of_week')) {
        $insert['day_of_week'] = (int) $day;
    } elseif (Schema::hasColumn('timetables', 'day')) {
        $insert['day'] = (int) $day;
    }

    if (Schema::hasColumn('timetables', 'start_time')) {
        $insert['start_time'] = $start_time;
    } elseif (Schema::hasColumn('timetables', 'hour_from')) {
        $insert['hour_from'] = $start_time;
    }

    if (Schema::hasColumn('timetables', 'end_time')) {
        $insert['end_time'] = $end_time;
    } elseif (Schema::hasColumn('timetables', 'hour_to')) {
        $insert['hour_to'] = $end_time;
    }

    if (Schema::hasColumn('timetables', 'week_start')) {
        $insert['week_start'] = $week_start;
    } elseif (Schema::hasColumn('timetables', 'week_start_date')) {
        $insert['week_start_date'] = $week_start;
    }

    $timetable = \App\Models\Timetable::create($insert);

    // Load relations for consistency with your resources
    $fresh = $timetable->fresh()->load([
        'subject:id,name','degree:id,name','room:id,name','teacher:id,firstname,lastname'
    ]);

    return response()->json(['data' => new \App\Http\Resources\TimetableResource($fresh)], 201);
}


    /** Update */
    public function update(Request $request, Timetable $timetable)
    {
        // normalize any incoming time fields into start_time/end_time (HH:MM)
        $this->normalizeTimeInputs($request);

        $data = $request->validate([
            'degree_id'   => ['sometimes','exists:degrees,id'],
            'subject_id'  => ['sometimes','exists:subjects,id'],
            'teacher_id'  => ['sometimes','exists:users,id'],
            'room_id'     => ['sometimes','nullable','exists:rooms,id'],
            'day_of_week' => ['sometimes','integer', Rule::in([1,2,3,4,5,6,7])],
            'period'      => ['sometimes','nullable','integer','min:1','max:50'],
            'start_time'  => ['sometimes','nullable','date_format:H:i'],
            'end_time'    => ['sometimes','nullable','date_format:H:i','after:start_time'],
            'title'       => ['sometimes','nullable','string','max:255'],
            'week_start'  => ['sometimes','nullable','date'],
        ]);

        // Invariant: either period or a time range
        $period     = array_key_exists('period', $data) ? $data['period'] : $timetable->period;
        $start_time = array_key_exists('start_time', $data) ? $data['start_time'] : $timetable->start_time;
        $end_time   = array_key_exists('end_time', $data) ? $data['end_time'] : $timetable->end_time;

        if (empty($period) && (empty($start_time) || empty($end_time))) {
            return response()->json([
                'message' => 'Fournissez une période ou bien start_time & end_time (HH:MM).',
            ], 422);
        }

        if (!array_key_exists('title', $data)) {
            $dirtyPreview = array_merge($timetable->only([
                'subject_id','teacher_id','day_of_week','period','start_time','end_time'
            ]), $data);
            $data['title'] = $this->composeTitle($dirtyPreview);
        }

        $timetable->update($data);

        $fresh = $timetable->fresh()->load([
            'subject:id,name','degree:id,name','room:id,name','teacher:id,firstname,lastname'
        ]);

        return response()->json(['data' => new TimetableResource($fresh)]);
    }

    public function destroy(Timetable $timetable)
    {
        $timetable->delete();
        return response()->noContent();
    }

    /** ---------- helpers ---------- */

    private function composeTitle(array $d): string
    {
        $subject = !empty($d['subject_id']) ? optional(Subject::find($d['subject_id']))->name : null;
        $teacher = !empty($d['teacher_id']) ? optional(User::find($d['teacher_id'])) : null;
        $teacherName = $teacher ? trim(($teacher->firstname ?? '').' '.($teacher->lastname ?? '')) : null;

        $dayNames = [1=>'Lun',2=>'Mar',3=>'Mer',4=>'Jeu',5=>'Ven',6=>'Sam',7=>'Dim'];
        $day = $dayNames[$d['day_of_week'] ?? null] ?? 'Jour';

        if (!empty($d['start_time']) && !empty($d['end_time'])) {
            $when = "{$day} {$d['start_time']}–{$d['end_time']}";
        } elseif (!empty($d['period'])) {
            $when = "{$day} • Période {$d['period']}";
        } else {
            $when = $day;
        }

        $pieces = array_filter([
            $subject ?: 'Cours',
            $when,
            $teacherName ? "— {$teacherName}" : null,
        ]);

        return implode(' — ', $pieces);
    }

    protected function safeValue(string $table, array $where, string $column)
    {
        if (!Schema::hasTable($table)) return null;
        try { return DB::table($table)->where($where)->value($column); }
        catch (\Throwable $e) { return null; }
    }

    /** Best-effort resolver for a student’s degree_id without assuming specific schema. */
    protected function resolveStudentDegreeId(int $userId): ?int
    {
        $id = $this->safeValue('users',        ['id' => $userId], 'degree_id'); if ($id) return (int) $id;
        $id = $this->safeValue('degree_user',  ['user_id'=>$userId], 'degree_id'); if ($id) return (int) $id;
        foreach (['student_degrees','enrollments','user_degrees','students'] as $tbl) {
            $id = $this->safeValue($tbl, ['user_id' => $userId], 'degree_id');
            if ($id) return (int) $id;
        }
        return null;
    }

    /**
     * Normalize ?week_start= param:
     *  - 'YYYY-MM-DD' -> same
     *  - 'YYYY-Www'   -> Monday of that ISO week
     * Returns null if input is empty or invalid.
     */
    private function normalizeWeekStart(?string $value): ?string
    {
        if (!$value) return null;

        $value = trim($value);

        // Exact date
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }

        // ISO week: YYYY-Wnn
        if (preg_match('/^(\d{4})-W(\d{2})$/', $value, $m)) {
            try {
                $date = Carbon::now()->setISODate((int)$m[1], (int)$m[2], 1); // Monday
                return $date->toDateString();
            } catch (\Throwable $e) {
                return null;
            }
        }

        return null;
    }

    /**
     * ---- Time normalization helpers ----
     * Accepts "9", "09", "9:30", "09:30:00", "9h30", "9.30", RFC strings...
     * Returns "HH:MM" or null if unparseable.
     */
    private function toHHMM(?string $v): ?string
    {
        if (!$v) return null;

        if (preg_match('/^\d{1,2}:\d{1,2}(:\d{1,2})?$/', $v)) {
            [$h, $m] = explode(':', substr($v, 0, 5));
            return sprintf('%02d:%02d', (int)$h, (int)$m);
        }
        if (preg_match('/^(\d{1,2})h(\d{0,2})$/i', $v, $m)) {
            return sprintf('%02d:%02d', (int)$m[1], (int)($m[2] !== '' ? $m[2] : 0));
        }
        if (preg_match('/^(\d{1,2})\.(\d{1,2})$/', $v, $m)) {
            return sprintf('%02d:%02d', (int)$m[1], (int)$m[2]);
        }
        if (preg_match('/^(\d{1,2})$/', $v, $m)) {
            return sprintf('%02d:00', (int)$m[1]);
        }

        try {
            return Carbon::parse($v)->format('H:i');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Merge canonical start_time/end_time into the request if we detect alternates.
     */
    private function normalizeTimeInputs(Request $request): void
    {
        $start = $request->input('start_time') ?? $request->input('start') ?? $request->input('starts_at');
        $end   = $request->input('end_time')   ?? $request->input('end')   ?? $request->input('ends_at');

        $start = $this->toHHMM($start);
        $end   = $this->toHHMM($end);

        $merge = [];
        if ($start !== null) $merge['start_time'] = $start;
        if ($end   !== null) $merge['end_time']   = $end;
        if ($merge) $request->merge($merge);
    }
}
