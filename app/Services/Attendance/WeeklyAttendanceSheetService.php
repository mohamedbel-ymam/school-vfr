<?php

namespace App\Services\Attendance;

use App\Models\AttendanceSession;
use App\Models\Degree;
use App\Models\Group;
use App\Models\Timetable;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class WeeklyAttendanceSheetService
{
    /**
     * Ensure all effective sessions exist for the degree in the specified ISO week.
     * Maps recurring timetable slots to real dated AttendanceSessions,
     * and includes any makeup/replacement sessions (rattrapages/changements).
     */
    public function ensureEffectiveSessionsForWeek(int $degreeId, int $weekNumber, int $year, ?int $groupId = null): array
    {
        // Monday of ISO week
        $monday = Carbon::now()->setISODate($year, $weekNumber)->startOfWeek(Carbon::MONDAY);
        $sunday = (clone $monday)->addDays(6);

        // Fetch recurring timetable slots
        $ttQuery = Timetable::query()
            ->where('degree_id', $degreeId)
            ->with(['subject', 'teacher', 'room']);

        if ($groupId) {
            $ttQuery->where(function ($q) use ($groupId) {
                $q->whereNull('group_id')->orWhere('group_id', $groupId);
            });
        }

        $timetables = $ttQuery->get();

        foreach ($timetables as $tt) {
            // Day of week: 1 = Monday ... 7 = Sunday
            $dayOffset = max(0, min(6, (int)$tt->day_of_week - 1));
            $sessionDate = (clone $monday)->addDays($dayOffset)->toDateString();

            AttendanceSession::firstOrCreate(
                [
                    'degree_id'    => $degreeId,
                    'session_date' => $sessionDate,
                    'timetable_id' => $tt->id,
                ],
                [
                    'group_id'     => $tt->group_id,
                    'teacher_id'   => $tt->teacher_id,
                    'subject_id'   => $tt->subject_id,
                    'start_time'   => $tt->start_time ?? ($tt->period ? '08:00:00' : '08:00:00'),
                    'end_time'     => $tt->end_time ?? '09:30:00',
                    'session_type' => 'regular',
                    'week_number'  => $weekNumber,
                    'year'         => $year,
                    'room'         => $tt->room ? ($tt->room->name ?? (string)$tt->room_id) : null,
                    'status'       => 'scheduled',
                ]
            );
        }

        // Return all effective sessions for this degree in this week
        $sessions = AttendanceSession::query()
            ->where('degree_id', $degreeId)
            ->whereBetween('session_date', [$monday->toDateString(), $sunday->toDateString()])
            ->when($groupId, fn($q) => $q->where(fn($sub) => $sub->whereNull('group_id')->orWhere('group_id', $groupId)))
            ->with(['subject', 'teacher', 'timetable'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get();

        return [
            'monday'   => $monday,
            'sunday'   => $sunday,
            'sessions' => $sessions,
        ];
    }

    /**
     * Build all view data for the weekly printable sheet.
     */
    public function getSheetData(int $degreeId, int $weekNumber, int $year, ?int $groupId = null): array
    {
        $degree = Degree::findOrFail($degreeId);
        $group  = $groupId ? Group::find($groupId) : null;

        $weekData = $this->ensureEffectiveSessionsForWeek($degreeId, $weekNumber, $year, $groupId);
        $monday   = $weekData['monday'];
        $sunday   = $weekData['sunday'];
        $sessions = $weekData['sessions'];

        // Enrolled students
        $studentsQuery = User::query()
            ->where('role', 'student')
            ->where('degree_id', $degreeId);

        if ($groupId) {
            $studentsQuery->where(function ($q) use ($groupId) {
                $q->where('group_id', $groupId)
                  ->orWhereHas('groups', fn($g) => $g->where('groups.id', $groupId));
            });
        }

        $students = $studentsQuery
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get(['id', 'firstname', 'lastname', 'degree_id', 'group_id']);

        // QR Code Payload: {"classe_id": X, "semaine_num": Y, "annee": Z, "version": 1.0}
        $qrPayload = json_encode([
            'classe_id'   => $degreeId,
            'group_id'    => $groupId,
            'semaine_num' => $weekNumber,
            'annee'       => $year,
            'version'     => 1.0,
        ], JSON_UNESCAPED_SLASHES);

        // Generate SVG base64 for DomPDF embedding
        $qrSvg = (string) QrCode::size(120)->generate($qrPayload);
        $qrBase64 = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        return [
            'degree'     => $degree,
            'group'      => $group,
            'weekNumber' => $weekNumber,
            'year'       => $year,
            'startDate'  => $monday->locale('fr')->isoFormat('D MMMM YYYY'),
            'endDate'    => $sunday->locale('fr')->isoFormat('D MMMM YYYY'),
            'startIso'   => $monday->toDateString(),
            'endIso'     => $sunday->toDateString(),
            'sessions'   => $sessions,
            'students'   => $students,
            'qrPayload'  => $qrPayload,
            'qrBase64'   => $qrBase64,
        ];
    }

    /**
     * Render the weekly sheet to PDF.
     */
    public function generatePdf(int $degreeId, int $weekNumber, int $year, ?int $groupId = null)
    {
        $data = $this->getSheetData($degreeId, $weekNumber, $year, $groupId);

        $pdf = Pdf::loadView('attendance.weekly_sheet', $data)
            ->setPaper('a4', 'landscape')
            ->setOption('isRemoteEnabled', true)
            ->setOption('dpi', 150);

        return $pdf;
    }
}
