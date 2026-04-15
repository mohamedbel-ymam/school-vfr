<?php
// app/Http/Controllers/Api/Admin/AttendanceAdminController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\Degree;
use App\Models\User;
use App\Models\AttendanceRecord;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Exports\AttendanceRecordsExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\AttendanceWeeklySummaryExport;



class AttendanceAdminController extends Controller
{

public function weekly(Request $request)
{
    $request->validate([
        'degree_id'  => ['required','integer','exists:degrees,id'],
        'week_start' => ['required','date'], // Monday recommended
    ]);

    $degreeId = (int) $request->degree_id;
    $start = Carbon::parse($request->week_start)->startOfWeek(Carbon::MONDAY);
    $end   = (clone $start)->addDays(6);

    $degree = Degree::query()->select(['id','name'])->findOrFail($degreeId);

    // Days array: YYYY-MM-DD for the week
    $days = collect(range(0, 6))
        ->map(fn($i) => (clone $start)->addDays($i)->toDateString())
        ->values()
        ->all();

    // Students of this degree
    $students = User::query()
        ->where('role', 'student')
        ->where('degree_id', $degreeId)
        ->select(['id','firstname','lastname','degree_id'])
        ->orderBy('lastname')
        ->orderBy('firstname')
        ->get();

    // Sessions for this degree in this week
    $sessions = AttendanceSession::query()
        ->where('degree_id', $degreeId)
        ->whereBetween('session_date', [$start->toDateString(), $end->toDateString()])
        ->get(['id','session_date']);

    $sessionIds = $sessions->pluck('id')->all();
    $sessionDateById = $sessions->keyBy('id')->map(fn($s) => $s->session_date->toDateString());

    // Records for these sessions
    $records = AttendanceRecord::query()
        ->whereIn('attendance_session_id', $sessionIds)
        ->get(['id','attendance_session_id','student_id','status','marked_by','marked_at']);

    // Build map: map[student_id][date] = {record_id, status}
    $map = [];
    foreach ($records as $r) {
        $date = $sessionDateById[$r->attendance_session_id] ?? null;
        if (!$date) continue;
        $map[$r->student_id][$date] = [
            'record_id' => $r->id,
            'status'    => $r->status,
        ];
    }

    // Build rows (matrix)
    $rows = $students->map(function ($s) use ($days, $map, $degree) {
        $present = 0; $absence = 0; $just = 0;

        $byDay = [];
        foreach ($days as $d) {
            $cell = $map[$s->id][$d] ?? null;
            $status = $cell['status'] ?? 'not_marked';

            if ($status === 'presence') $present++;
            if ($status === 'absence') $absence++;
            if ($status === 'absence_justifiee') $just++;

            $byDay[$d] = [
                'record_id' => $cell['record_id'] ?? null,
                'status'    => $status,
            ];
        }

        return [
            'student_id' => $s->id,
            'full_name'  => $s->full_name,
            'degree_id'  => $degree->id,
            'degree_name'=> $degree->name,
            'counts'     => [
                'presence' => $present,
                'absence'  => $absence,
                'absence_justifiee' => $just,
            ],
            'days'       => $byDay,
        ];
    });

    return response()->json([
        'degree' => [
            'id' => $degree->id,
            'name' => $degree->name,
        ],
        'week' => [
            'start' => $start->toDateString(),
            'end'   => $end->toDateString(),
            'days'  => $days,
        ],
        'rows' => $rows,
    ]);
}


    public function monthly(Request $request)
    {
        $request->validate([
            'degree_id' => ['required','integer','exists:degrees,id'],
            'month'     => ['required','date_format:Y-m'],
        ]);

        $start = Carbon::createFromFormat('Y-m', $request->month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        $data = AttendanceRecord::query()
            ->whereHas('session', fn($q) =>
                $q->where('degree_id', $request->degree_id)
                  ->whereBetween('session_date', [$start->toDateString(), $end->toDateString()])
            )
	    ->with(['student:id,firstname,lastname,degree_id,avatar_url,avatar_status', 'session:id,session_date,degree_id'])
            ->get();

        return response()->json([
            'from' => $start->toDateString(),
            'to'   => $end->toDateString(),
            'records' => $data,
        ]);
    }

    public function updateStatus(Request $request, AttendanceRecord $record)
    {
        $request->validate([
            'status' => ['required','in:presence,absence,absence_justifiee'],
        ]);

        $record->update([
            'status'    => $request->status,
            'marked_by' => $request->user()->id,
            'marked_at' => now(),
        ]);

        return response()->json($record);
    }
    public function export(Request $request)
{
    $request->validate([
        'degree_id' => ['required','integer','exists:degrees,id'],
        'from'      => ['required','date'],
        'to'        => ['required','date','after_or_equal:from'],
    ]);

    $fileName = "attendance_degree_{$request->degree_id}_{$request->from}_to_{$request->to}.xlsx";

    return Excel::download(
        new AttendanceRecordsExport((int)$request->degree_id, $request->from, $request->to),
        $fileName
    );
}
public function exportWeeklySummary(Request $request)
{
    $request->validate([
        'degree_id' => ['required','integer','exists:degrees,id'],
        'from'      => ['required','date'],
        'to'        => ['required','date','after_or_equal:from'],
    ]);

    $fileName = "attendance_weekly_summary_degree_{$request->degree_id}_{$request->from}_to_{$request->to}.xlsx";

    return Excel::download(
        new AttendanceWeeklySummaryExport((int)$request->degree_id, $request->from, $request->to),
        $fileName
    );
}

public function backfill(Request $request)
{
    $request->validate([
        'degree_id'       => ['required','integer','exists:degrees,id'],
        'date'            => ['required','date'],
        'default_status'  => ['required','in:presence,absence,absence_justifiee,not_marked'],
        'only_missing'    => ['boolean'],
        'student_ids'     => ['array'],
        'student_ids.*'   => ['integer','exists:users,id'],
    ]);

    $onlyMissing = (bool)($request->only_missing ?? true);

    $session = \App\Models\AttendanceSession::firstOrCreate(
        ['degree_id' => (int)$request->degree_id, 'session_date' => $request->date],
        ['teacher_id' => null]
    );

    $studentsQuery = \App\Models\User::query()
        ->where('role', 'student')
        ->where('degree_id', $request->degree_id);

    if ($request->filled('student_ids')) {
        $studentsQuery->whereIn('id', $request->student_ids);
    }

    $studentIds = $studentsQuery->pluck('id')->all();

    foreach ($studentIds as $sid) {
        if ($onlyMissing) {
            \App\Models\AttendanceRecord::firstOrCreate(
                ['attendance_session_id' => $session->id, 'student_id' => $sid],
                [
                    'status'    => $request->default_status,
                    'marked_by' => $request->user()->id,
                    'marked_at' => now(),
                ]
            );
        } else {
            \App\Models\AttendanceRecord::updateOrCreate(
                ['attendance_session_id' => $session->id, 'student_id' => $sid],
                [
                    'status'    => $request->default_status,
                    'marked_by' => $request->user()->id,
                    'marked_at' => now(),
                ]
            );
        }
    }

    return response()->json([
        'session_id'    => $session->id,
        'filled'        => count($studentIds),
        'only_missing'  => $onlyMissing,
        'status'        => $request->default_status,
    ]);
}

}
