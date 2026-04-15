<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTimetableRequest;
use App\Http\Resources\TimetableResource;
use App\Models\Timetable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TimetableController extends Controller
{
    /* ========================= List / Filter =========================
       Query params:
         - degree_id (int, optional)
         - teacher_id (int, optional)
         - day (1..7) or day_of_week (1..7)
         - week_start (Y-m-d)
         - per_page (default 100; max 1000)
    ==================================================================*/
  public function index(Request $req)
{
    $q = Timetable::query()
        ->with(['subject', 'teacher', 'room', 'group']);

    // normalize day param
    $dow = $req->query('day_of_week') ?? $req->query('day');
    if ($dow) {
        $q->where('day_of_week', (int) $dow);
    }

    if ($req->filled('degree_id')) {
        $q->where('degree_id', (int) $req->query('degree_id'));
    }

    if ($req->filled('teacher_id')) {
        $q->where('teacher_id', (int) $req->query('teacher_id'));
    }

    if ($req->filled('week_start')) {
        $q->whereDate('week_start', $req->query('week_start'));
    }

    /* 🔥 GROUP VISIBILITY RULE 🔥 */
    if ($req->filled('group_id')) {
        $groupId = (int) $req->query('group_id');

        $q->where(function ($qq) use ($groupId) {
            $qq->whereNull('group_id')
               ->orWhere('group_id', $groupId);
        });
    }

    // ordering
    if (Schema::hasColumn('timetables', 'degree_id')) {
        $q->orderBy('degree_id');
    }
    if (Schema::hasColumn('timetables', 'day_of_week')) {
        $q->orderBy('day_of_week');
    }

    if (Schema::hasColumn('timetables', 'start_time')) {
        $q->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END');
        $q->orderBy('start_time');
    } elseif (Schema::hasColumn('timetables', 'period')) {
        $q->orderBy('period');
    }

    $perPage = max(1, min((int) $req->query('per_page', 100), 1000));

    return TimetableResource::collection(
        $q->paginate($perPage)
    );
}

    /* ============================ Create ============================ */
    public function store(StoreTimetableRequest $request)
{
    $validated = $request->validated();
    Log::info('[timetables.store] validated', $validated);

    try {
        $data = $this->normalizedPayload($validated);

        // Force SQL-friendly times (HH:MM:SS); NULL stays NULL
        $toHMS = function ($v) {
            if (!$v) return null;
            if (preg_match('/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/', $v, $m)) {
                $h = str_pad((string)((int)$m[1]), 2, '0', STR_PAD_LEFT);
                $i = str_pad((string)((int)$m[2]), 2, '0', STR_PAD_LEFT);
                $s = isset($m[3]) ? str_pad((string)((int)$m[3]), 2, '0', STR_PAD_LEFT) : '00';
                return "$h:$i:$s";
            }
            return $v; // let DB fail if truly invalid
        };
        $data['start_time'] = $toHMS($data['start_time'] ?? null);
        $data['end_time']   = $toHMS($data['end_time']   ?? null);

        Log::info('[timetables.store] normalized', $data);

        $t = \App\Models\Timetable::create($data);
        $t->load(['subject','teacher','room','group']);

        // 🔧 Return raw JSON (avoid Resource while debugging)
        return response()->json([
            'ok'   => true,
            'item' => $t,
        ], 201);
    } catch (\Throwable $e) {
        Log::error('[timetables.store] exception: '.$e->getMessage(), [
            'trace' => $e->getTraceAsString(),
        ]);
        return response()->json([
            'message' => 'Server Error (store timetable)',
            'error'   => $e->getMessage(),
        ], 500);
    }
}


    /* ============================= Read ============================= */
    public function show(Timetable $timetable)
    {
        $timetable->load(['subject','teacher','room','group']);
        return new TimetableResource($timetable);
    }

    /* ============================= Update =========================== */
    public function update(StoreTimetableRequest $request, \App\Models\Timetable $timetable)
{
    $validated = $request->validated();
    Log::info('[timetables.update] validated', $validated);

    try {
        $data = $this->normalizedPayload($validated);

        $toHMS = function ($v) {
            if (!$v) return null;
            if (preg_match('/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/', $v, $m)) {
                $h = str_pad((string)((int)$m[1]), 2, '0', STR_PAD_LEFT);
                $i = str_pad((string)((int)$m[2]), 2, '0', STR_PAD_LEFT);
                $s = isset($m[3]) ? str_pad((string)((int)$m[3]), 2, '0', STR_PAD_LEFT) : '00';
                return "$h:$i:$s";
            }
            return $v;
        };
        $data['start_time'] = $toHMS($data['start_time'] ?? null);
        $data['end_time']   = $toHMS($data['end_time']   ?? null);

        Log::info('[timetables.update] normalized', $data);

        $timetable->update($data);
        $timetable->load(['subject','teacher','room','group']);

        return response()->json([
            'ok'   => true,
            'item' => $timetable,
        ]);
    } catch (\Throwable $e) {
        Log::error('[timetables.update] exception: '.$e->getMessage(), [
            'trace' => $e->getTraceAsString(),
        ]);
        return response()->json([
            'message' => 'Server Error (update timetable)',
            'error'   => $e->getMessage(),
        ], 500);
    }
}

    /* ============================ Delete ============================ */
    public function destroy(Timetable $timetable)
    {
        $timetable->delete();
        return response()->json(['ok' => true]);
    }

    /* ========================= Role helpers =========================
       (Use in your route groups for student/teacher/parent dashboards)
    ==================================================================*/
public function student(Request $req)
{
    $user = $req->user();

    // Resolve degree
    $degreeId =
        $user->degree_id ??
        optional($user->degree)->id ??
        optional($user->classe)->degree_id ??
        optional(optional($user->classe)->degree)->id;

    if (!$degreeId) {
        return response()->json([
            'data' => [],
            'message' => 'Student has no assigned degree',
        ]);
    }

    // Resolve group (OPTIONAL)
    $groupId =
        $user->group_id ??
        optional($user->group)->id ??
        optional($user->classe)->group_id ??
        null;

    $q = Timetable::query()
        ->with(['subject', 'teacher', 'room'])
        ->where('degree_id', $degreeId);

    if ($groupId) {
        // Student WITH group:
        // show lessons for his group + global lessons
        $q->where(function ($qq) use ($groupId) {
            $qq->whereNull('group_id')
               ->orWhere('group_id', $groupId);
        });
    } else {
        // Student WITHOUT group:
        // only global lessons
        $q->whereNull('group_id');
    }

    // optional filters
    if ($req->filled('week_start')) {
        $q->whereDate('week_start', $req->query('week_start'));
    }

    return TimetableResource::collection(
        $q->orderBy('day_of_week')->paginate(100)
    );
}



    public function teacher(Request $req)
    {
        // expects teacher_id = auth()->id() or provided
        $req->merge(['teacher_id' => $req->query('teacher_id') ?? optional($req->user())->id]);
        return $this->index($req);
    }
public function parent(Request $req)
{
    $user = $req->user();

    // Resolve child (adapt if you support multiple children later)
    $child =
        $user->child ??
        optional($user->children)->first();

    if (!$child) {
        return response()->json([
            'data' => [],
            'message' => 'Parent has no linked child'
        ]);
    }

    // Resolve degree
    $degreeId =
        $child->degree_id ??
        optional($child->degree)->id ??
        optional($child->classe)->degree_id ??
        optional(optional($child->classe)->degree)->id;

    // Resolve group (OPTIONAL)
    $groupId =
        $child->group_id ??
        optional($child->group)->id ??
        optional($child->classe)->group_id ??
        optional(optional($child->classe)->group)->id;

    if (!$degreeId) {
        return response()->json([
            'data' => [],
            'message' => 'Child has no assigned degree'
        ]);
    }

    $req->merge([
        'degree_id' => $degreeId,
        'group_id'  => $groupId, // 🔥 important
    ]);

    return $this->index($req);
}


    /* ========================= Normalization ======================== */

    /**
     * Accept:
     * - day OR day_of_week  (1..7)
     * - hour_from/hour_to  OR period
     * - start_time/end_time (already in HH:MM) are also accepted
     */
    private function normalizedPayload(array $in): array
    {
        $out = $in;

        // day normalization
        if (!empty($in['day']) && empty($in['day_of_week'])) {
            $out['day_of_week'] = (int)$in['day'];
        }
        unset($out['day']);

        // hours normalization
        // Priority: explicit start_time/end_time > hour_from/hour_to > period
        if (!empty($in['hour_from'])) $out['start_time'] = $this->hhmm($in['hour_from']);
        if (!empty($in['hour_to']))   $out['end_time']   = $this->hhmm($in['hour_to']);

        if (!empty($out['start_time'])) $out['start_time'] = $this->hhmm($out['start_time']);
        if (!empty($out['end_time']))   $out['end_time']   = $this->hhmm($out['end_time']);

        // If only period given, keep start/end null (model will expose computed start/end)
        // If both times present, period optional.
        return $out;
    }

    private function hhmm(string $v): string
    {
        if (preg_match('/^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*$/', $v, $m)) {
            $h = str_pad((string)((int)$m[1]), 2, '0', STR_PAD_LEFT);
            $i = $m[2];
            return "$h:$i";
        }
        // last fallback: return unchanged, DB rule will catch if invalid
        return $v;
    }
}

