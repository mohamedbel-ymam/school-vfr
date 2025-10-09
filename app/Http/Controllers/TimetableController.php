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
            'teacher:id,firstname,lastname',
        ]);

        if ($t = $req->query('teacher_id')) $q->where('teacher_id', $t);
        if ($d = $req->query('degree_id'))  $q->where('degree_id', $d);

        $perPage = max(1, min((int)$req->query('per_page', 100), 1000));

        // ✅ Never order by a column that might not exist; delegate to helper.
        $q->orderBy('degree_id');
        $q = $this->applyTimeOrdering($q);

        $page = $q->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
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
        private function mapTimeColumns(array $data): array
    {
        $hasStartTime = Schema::hasColumn('timetables', 'start_time');
        $hasStartsAt  = Schema::hasColumn('timetables', 'starts_at');

        // If the table only has starts_at/ends_at, move start_time/end_time into those.
        if (!$hasStartTime && $hasStartsAt) {
            if (array_key_exists('start_time', $data)) {
                $data['starts_at'] = $data['start_time'];
                unset($data['start_time']);
            }
            if (array_key_exists('end_time', $data)) {
                $data['ends_at'] = $data['end_time'];
                unset($data['end_time']);
            }
        }

        // If the table only has start_time/end_time, move starts_at/ends_at into those.
        if ($hasStartTime && !$hasStartsAt) {
            if (array_key_exists('starts_at', $data)) {
                $data['start_time'] = $data['starts_at'];
                unset($data['starts_at']);
            }
            if (array_key_exists('ends_at', $data)) {
                $data['end_time'] = $data['ends_at'];
                unset($data['ends_at']);
            }
        }

        return $data;
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

        // ✅ ensure correct column names for your schema
        $data = $this->mapTimeColumns($data);

        $row = Timetable::create($data)->load([
            'subject:id,name','degree:id,name','room:id,name','teacher:id,firstname,lastname',
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
        $start_time = array_key_exists('start_time', $data) ? $data['start_time'] : $timetable->start_time ?? $timetable->starts_at;
        $end_time   = array_key_exists('end_time', $data)   ? $data['end_time']   : $timetable->end_time   ?? $timetable->ends_at;

        if (empty($period) && (empty($start_time) || empty($end_time))) {
            return response()->json([
                'message' => 'Fournissez une période ou bien start_time & end_time (HH:MM).',
            ], 422);
        }

        if (!array_key_exists('title', $data)) {
            $dirtyPreview = array_merge($timetable->only([
                'subject_id','teacher_id','day_of_week','period','start_time','end_time','starts_at','ends_at'
            ]), $data);
            $data['title'] = $this->composeTitle($dirtyPreview);
        }

        // ✅ ensure correct column names
        $data = $this->mapTimeColumns($data);

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
            // day_of_week first if present
            if (Schema::hasColumn('timetables', 'day_of_week')) {
                $q->orderBy('day_of_week');
            }
        
            $hasStartTime = Schema::hasColumn('timetables', 'start_time'); // TIME
            $hasStartsAt  = Schema::hasColumn('timetables', 'starts_at');  // TIME or DATETIME
        
            // ✅ Do NOT COALESCE across different types; pick one branch that exists.
            if ($hasStartTime) {
                // push NULLs to bottom, then order by start_time
                $q->orderByRaw('CASE WHEN start_time IS NULL OR start_time = "" THEN 1 ELSE 0 END');
                $q->orderBy('start_time');
            } elseif ($hasStartsAt) {
                $q->orderByRaw('CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END');
                $q->orderBy('starts_at');
            }
        
            // If you have a string 'period' column, this lexicographic order is harmless;
            // we only apply it when the column actually exists.
            if (Schema::hasColumn('timetables', 'period')) {
                $q->orderBy('period');
            }
        
            return $q;
        }
}
