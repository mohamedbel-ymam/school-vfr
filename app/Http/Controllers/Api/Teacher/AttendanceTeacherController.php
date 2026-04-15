<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Http\Request;

class AttendanceTeacherController extends Controller
{
    public function students(int $degree)
    {
        return User::query()
            ->where('role', 'student') // if you use spatie only, tell me and I’ll switch this
            ->where('degree_id', $degree)
            ->select([	
		'id',
	 	'firstname',
	 	'lastname',
        	'avatar_status',
        	'avatar_url', // needed for accessor, even if hidden in output
    
	 ])
            ->orderBy('lastname')
            ->get();
    }



    public function getOrCreateSession(Request $request)
    {
        $request->validate([
            'degree_id' => ['required','integer','exists:degrees,id'],
            'date'      => ['nullable','date'],
        ]);

        $date = $request->input('date', now()->toDateString());

        // One session per degree per date (unique constraint)
        $session = AttendanceSession::query()->firstOrCreate(
            ['degree_id' => (int)$request->degree_id, 'session_date' => $date],
            ['teacher_id' => $request->user()->id],
        );

        // If session exists with teacher_id null (admin-created), attach teacher if you want:
        if ($session->teacher_id === null) {
            $session->update(['teacher_id' => $request->user()->id]);
        }

        return response()->json($session);
    }

    public function sessionRecords(AttendanceSession $session)
    {
        $records = AttendanceRecord::query()
            ->where('attendance_session_id', $session->id)
	    ->with(['student:id,firstname,lastname,avatar_status,avatar_url'])
            ->get();

        return response()->json([
            'session' => $session,
            'records' => $records,
        ]);
    }
public function roster(Request $request)
{
    $request->validate([
        'degree_id' => ['required', 'integer', 'exists:degrees,id'],
        'date'      => ['nullable', 'date'],
    ]);

    $degreeId = (int) $request->degree_id;
    $date     = $request->input('date', now()->toDateString());
    $teacher  = $request->user();

    // 1) Get or create session (one per degree per date)
    $session = \App\Models\AttendanceSession::query()->firstOrCreate(
        ['degree_id' => $degreeId, 'session_date' => $date],
        ['teacher_id' => $teacher->id]
    );

    // If admin created session before with teacher_id null, attach teacher now (optional)
    if ($session->teacher_id === null) {
        $session->update(['teacher_id' => $teacher->id]);
    }

    // 2) Load students of this degree
    // IMPORTANT: include avatar_status + avatar_url so avatar_public_url accessor can compute.
    $students = \App\Models\User::query()
        ->where('role', 'student')
        ->where('degree_id', $degreeId)
        ->select([
            'id',
            'firstname',
            'lastname',
            'degree_id',
            'avatar_status',
            'avatar_url',
        ])
        ->orderBy('lastname')
        ->orderBy('firstname')
        ->get();

    // 3) Load existing records for that session (key by student_id)
    $recordsByStudentId = \App\Models\AttendanceRecord::query()
        ->where('attendance_session_id', $session->id)
        ->get()
        ->keyBy('student_id');

    // 4) Merge status into students list
    $payloadStudents = $students->map(function ($s) use ($recordsByStudentId) {
        $r = $recordsByStudentId->get($s->id);

        return [
            'id' => $s->id,
            'full_name' => $s->full_name,
            'avatar_public_url' => $s->avatar_public_url,
            'status' => $r?->status ?? 'not_marked',
        ];
    });
$session->loadMissing('degree:id,name');

return response()->json([
    'session' => [
        'id' => $session->id,
        'degree_id' => $session->degree_id,
        'degree_name' => $session->degree?->name,
        'session_date' => $session->session_date->toDateString(),
        'teacher_id' => $session->teacher_id,
    ],
    'students' => $payloadStudents,
]);
}
public function mark(Request $request)
{
    $request->validate([
        'session_id' => ['required','integer','exists:attendance_sessions,id'],
        'student_id' => ['required','integer','exists:users,id'],
        'status'     => ['required','in:presence,absence,absence_justifiee,not_marked'],
    ]);

    $teacher = $request->user();

    // (Optional but recommended) ensure the session belongs to this teacher
    $session = AttendanceSession::query()->findOrFail((int)$request->session_id);
    if ($session->teacher_id !== null && (int)$session->teacher_id !== (int)$teacher->id) {
        return response()->json(['message' => 'Session non autorisée.'], 403);
    }

    // ✅ This is the missing part: create/update the record
    $record = AttendanceRecord::query()->updateOrCreate(
        [
            'attendance_session_id' => $session->id,
            'student_id' => (int)$request->student_id,
        ],
        [
            'status'    => $request->status,
            'marked_by' => $teacher->id,
            'marked_at' => now(),
        ]
    );

    return response()->json([
        'ok' => true,
        'record' => $record,
    ]);
}
}
