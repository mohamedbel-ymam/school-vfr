<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Timetable;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class TimetableController extends Controller
{
    /** Admin listing with optional filters. */
    public function adminList(Request $req)
    {
        $q = Timetable::with([
            'subject:id,name',
            'degree:id,name',
            'room:id,name',
            // keep relation identifiers in EN in your models. If your Timetable model relation is `teacher()`, use 'teacher' here.
            'teacher:id,firstname,lastname',
        ]);

        if ($t = $req->query('teacher_id')) $q->where('teacher_id', $t);
        if ($d = $req->query('degree_id'))  $q->where('degree_id', $d);
        
        $q = $this->applyTimeOrdering(
            $q->orderBy('degree_id')
        );

        return $q->orderBy('degree_id')
                 ->orderBy('day_of_week')
                 ->orderByRaw("CASE WHEN period IS NOT NULL AND period <> '' THEN 0 ELSE 1 END")
                 ->orderBy('period')
                 ->orderBy('start_time')
                 ->paginate((int)$req->query('per_page', 100));
    }

    /** Student → lessons for the authenticated student (optional ?degree_id=...) */
    public function student(Request $request)
    {
        $user = $request->user(); // role: student
        $degreeId = $request->query('degree_id') ?: $this->resolveStudentDegreeId($user->id);

        if (!$degreeId) {
            return response()->json([
                'message' => "Aucun niveau trouvé pour cet élève. Passez ?degree_id=… si nécessaire."
            ], 422);
        }

        $lessons = $this->applyTimeOrdering(
            Timetable::with([
                'subject:id,name',
                'degree:id,name',
                'room:id,name',
                'teacher:id,firstname,lastname',
            ])->where('degree_id', $degreeId)
        )->get();

        return response()->json(['data' => ['lessons' => $lessons]]);
    }

    /** Teacher → lessons for the authenticated teacher (optional ?degree_id=...) */
    public function teacher(Request $request)
    {
        $user = $request->user(); // role: teacher
        $degreeId = $request->query('degree_id');

        $lessons = $this->applyTimeOrdering(
            Timetable::with([
                'subject:id,name',
                'degree:id,name',
                'room:id,name',
                'teacher:id,firstname,lastname',
            ])
            ->where('teacher_id', $user->id) // adjust if FK points elsewhere
            ->when($degreeId, fn($q) => $q->where('degree_id', $degreeId))
        )->get();

        return response()->json(['data' => ['lessons' => $lessons]]);
    }

    /** Parent → lessons for a selected child (?child_id=…) */
    public function parent(Request $request)
    {
        $parent = $request->user(); // role: parent
        $childId = (int) $request->query('child_id');
        if (!$childId) {
            return response()->json(['message' => 'Le paramètre child_id est requis.'], 422);
        }

        // Optionally verify linkage parent->child here if you have a linking table.

        $degreeId = $this->resolveStudentDegreeId($childId);

        if (!$degreeId) {
            return response()->json(['message' => "Aucun niveau trouvé pour l'enfant sélectionné."], 404);
        }

        $lessons = $this->applyTimeOrdering(
            Timetable::with([
                'subject:id,name',
                'degree:id,name',
                'room:id,name',
                'teacher:id,firstname,lastname',
            ])->where('degree_id', $degreeId)
        )->get();

        return response()->json(['data' => ['lessons' => $lessons]]);
    }

    protected function safeValue(string $table, array $where, string $column)
    {
        if (!Schema::hasTable($table)) return null;
        try {
            return DB::table($table)->where($where)->value($column);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Best-effort resolver for a student’s degree_id without assuming specific schema. */
    protected function resolveStudentDegreeId(int $userId): ?int
    {
        // 1) users.degree_id
        $id = $this->safeValue('users', ['id' => $userId], 'degree_id');
        if ($id) return (int) $id;

        // 2) degree_user pivot (user_id, degree_id)
        $id = $this->safeValue('degree_user', ['user_id' => $userId], 'degree_id');
        if ($id) return (int) $id;

        // 3) common alternates
        foreach (['student_degrees', 'enrollments', 'user_degrees', 'students'] as $tbl) {
            $id = $this->safeValue($tbl, ['user_id' => $userId], 'degree_id');
            if ($id) return (int) $id;
        }

        // (Avoid accented table names in schema; keep identifiers ASCII)
        return null;
    }

    public function store(Request $request)
    {
        // normalize keys from FE
        $request->merge([
            'start_time' => $request->input('start_time') ?? $request->input('starts_at'),
            'end_time'   => $request->input('end_time')   ?? $request->input('ends_at'),
        ]);

        $data = $request->validate([
            'degree_id'   => ['required','exists:degrees,id'],
            'subject_id'  => ['required','exists:subjects,id'],
            'teacher_id'  => ['required','exists:users,id'],
            'room_id'     => ['nullable','exists:rooms,id'],
            'day_of_week' => ['required','integer', Rule::in([1,2,3,4,5,6,7])],

            'period'      => ['nullable','string','max:50','required_without_all:start_time,end_time'],
            'start_time'  => ['nullable','date_format:H:i','required_without:period'],
            'end_time'    => ['nullable','date_format:H:i','required_with:start_time','after:start_time'],

            'title'       => ['sometimes','string','max:255'],
        ]);

        if (empty($data['title'])) {
            $data['title'] = $this->composeTitle($data);
        }

        $row = Timetable::create($data)->load([
            'subject:id,name',
            'degree:id,name',
            'room:id,name',
            'teacher:id,firstname,lastname',
        ]);

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, Timetable $timetable)
    {
        $request->merge([
            'start_time' => $request->input('start_time') ?? $request->input('starts_at'),
            'end_time'   => $request->input('end_time')   ?? $request->input('ends_at'),
        ]);

        $data = $request->validate([
            'degree_id'   => ['sometimes','exists:degrees,id'],
            'subject_id'  => ['sometimes','exists:subjects,id'],
            'teacher_id'  => ['sometimes','exists:users,id'],
            'room_id'     => ['sometimes','nullable','exists:rooms,id'],
            'day_of_week' => ['sometimes','integer', Rule::in([1,2,3,4,5,6,7])],
            'period'      => ['sometimes','nullable','string','max:50'],
            'start_time'  => ['sometimes','nullable','date_format:H:i'],
            'end_time'    => ['sometimes','nullable','date_format:H:i','after:start_time'],
            'title'       => ['sometimes','string','max:255'],
        ]);

        // Invariant: at least a period or a time range
        $period     = array_key_exists('period', $data)     ? $data['period']     : $timetable->period;
        $start_time = array_key_exists('start_time', $data) ? $data['start_time'] : $timetable->start_time;
        $end_time   = array_key_exists('end_time', $data)   ? $data['end_time']   : $timetable->end_time;

        if (empty($period) && (empty($start_time) || empty($end_time))) {
            return response()->json([
                'message' => 'Fournissez une période ou bien start_time & end_time (HH:MM).',
            ], 422);
        }

        // Recompose title if not explicitly provided
        if (!array_key_exists('title', $data)) {
            $dirtyPreview = array_merge($timetable->only([
                'subject_id','teacher_id','day_of_week','period','start_time','end_time'
            ]), $data);
            $data['title'] = $this->composeTitle($dirtyPreview);
        }

        $timetable->update($data);

        return response()->json([
            'data' => $timetable->fresh()->load([
                'subject:id,name','degree:id,name','room:id,name','teacher:id,firstname,lastname'
            ]),
        ]);
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

    protected function applyTimeOrdering($q)
    {
        if (Schema::hasColumn('timetables', 'day_of_week')) {
            $q->orderBy('day_of_week');
        }

        $hasStartTime = Schema::hasColumn('timetables', 'start_time');
        $hasStartsAt  = Schema::hasColumn('timetables', 'starts_at');

        if ($hasStartTime && $hasStartsAt) {
            $q->orderByRaw('CASE WHEN COALESCE(starts_at, start_time) IS NULL THEN 1 ELSE 0 END');
            $q->orderByRaw('COALESCE(starts_at, start_time)');
        } elseif ($hasStartsAt) {
            $q->orderByRaw('CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END');
            $q->orderBy('starts_at');
        } elseif ($hasStartTime) {
            $q->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END');
            $q->orderBy('start_time');
        }

        if (Schema::hasColumn('timetables', 'period')) {
            $q->orderBy('period');
        }

        return $q;
    }
}
