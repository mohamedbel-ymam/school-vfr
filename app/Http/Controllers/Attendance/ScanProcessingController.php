<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceStat;
use App\Models\Degree;
use App\Services\Attendance\SheetOmrService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ScanProcessingController extends Controller
{
    public function __construct(
        protected SheetOmrService $omrService
    ) {}

    /**
     * Upload and analyze a weekly paper attendance scan.
     * Route: POST /api/attendances/upload-scan
     */
    public function uploadScan(Request $request)
    {
        $request->validate([
            'scan_file'   => ['required', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:20480'], // max 20MB
            'degree_id'   => ['nullable', 'integer', 'exists:degrees,id'],
            'week_number' => ['nullable', 'integer', 'min:1', 'max:53'],
            'year'        => ['nullable', 'integer', 'min:2020', 'max:2035'],
            'qr_data'     => ['nullable', 'string'],
        ]);

        $file = $request->file('scan_file');
        $filename = 'scan_' . date('Ymd_His') . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

        // Store inside storage/app/public/attendance_scans
        $path = $file->storeAs('attendance_scans', $filename, 'public');
        $fullPath = Storage::disk('public')->path($path);
        $publicUrl = asset('storage/' . $path);

        // Parse QR data if provided by frontend QR reader or header payload
        $degreeId   = $request->filled('degree_id') ? (int) $request->degree_id : null;
        $weekNumber = $request->filled('week_number') ? (int) $request->week_number : null;
        $year       = $request->filled('year') ? (int) $request->year : null;

        if ($request->filled('qr_data')) {
            try {
                $decoded = json_decode($request->qr_data, true);
                if (is_array($decoded)) {
                    $degreeId   = $degreeId ?: ($decoded['classe_id'] ?? null);
                    $weekNumber = $weekNumber ?: ($decoded['semaine_num'] ?? null);
                    $year       = $year ?: ($decoded['annee'] ?? null);
                }
            } catch (\Throwable $e) {
                // Ignore fallback to manual inputs
            }
        }

        // Run OMR recognition
        try {
            $analysis = $this->omrService->processScan(
                $fullPath,
                $degreeId,
                $weekNumber,
                $year,
                $publicUrl
            );

            return response()->json([
                'success' => true,
                'scan'    => [
                    'filename'   => $filename,
                    'public_url' => $publicUrl,
                    'path'       => $path,
                ],
                'data'    => $analysis,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'analyse de l\'image : ' . $e->getMessage(),
                'scan'    => [
                    'public_url' => $publicUrl,
                ],
            ], 422);
        }
    }

    /**
     * Validate and persist the verified attendance matrix to database.
     * Route: POST /api/attendances/confirm-scan
     */
    public function confirmScan(Request $request)
    {
        $validated = $request->validate([
            'records'                 => ['required', 'array', 'min:1'],
            'records.*.student_id'    => ['required', 'integer', 'exists:users,id'],
            'records.*.session_id'    => ['required', 'integer', 'exists:attendance_sessions,id'],
            'records.*.status'        => ['required', 'string', 'in:present,absent,retard,presence,absence,absence_justifiee'],
        ]);

        $markedBy = $request->user()?->id;
        $now = now();
        $savedCount = 0;
        $affectedStudentIds = [];

        // Cache session dates to avoid repetitive queries
        $sessionIds = collect($validated['records'])->pluck('session_id')->unique()->all();
        $sessions = AttendanceSession::whereIn('id', $sessionIds)->get()->keyBy('id');

        DB::transaction(function () use ($validated, $sessions, $markedBy, $now, &$savedCount, &$affectedStudentIds) {
            foreach ($validated['records'] as $item) {
                $session = $sessions->get($item['session_id']);
                if (!$session) continue;

                $studentId = (int) $item['student_id'];
                $affectedStudentIds[$studentId] = true;

                // Normalize status: 'present' -> 'present', 'absent' -> 'absent', 'retard' -> 'retard'
                $rawStatus = strtolower(trim($item['status']));
                $status = match ($rawStatus) {
                    'presence', 'present' => 'present',
                    'absence', 'absent'   => 'absent',
                    'retard', 'late'      => 'retard',
                    'absence_justifiee'   => 'absence_justifiee',
                    default               => 'present',
                };

                AttendanceRecord::updateOrCreate(
                    [
                        'attendance_session_id' => $session->id,
                        'student_id'            => $studentId,
                    ],
                    [
                        'status'    => $status,
                        'date'      => $session->session_date,
                        'marked_by' => $markedBy,
                        'marked_at' => $now,
                    ]
                );

                $savedCount++;
            }

            // Sync attendance_stats for affected students
            $this->syncAttendanceStats(array_keys($affectedStudentIds));
        });

        return response()->json([
            'success'     => true,
            'message'     => "Émargement validé avec succès. {$savedCount} fiches d'assiduité enregistrées.",
            'saved_count' => $savedCount,
        ]);
    }

    /**
     * Recalculate attendance stats counters for students.
     */
    protected function syncAttendanceStats(array $studentIds): void
    {
        if (empty($studentIds)) return;

        foreach ($studentIds as $sId) {
            $absences = AttendanceRecord::where('student_id', $sId)
                ->whereIn('status', ['absent', 'absence'])
                ->count();

            $justified = AttendanceRecord::where('student_id', $sId)
                ->where('status', 'absence_justifiee')
                ->count();

            $presences = AttendanceRecord::where('student_id', $sId)
                ->whereIn('status', ['present', 'presence', 'retard'])
                ->count();

            AttendanceStat::updateOrCreate(
                [
                    'student_id' => $sId,
                    'scope'      => 'overall',
                    'period_key' => 'overall',
                ],
                [
                    'absences'           => $absences,
                    'justified_absences' => $justified,
                    'presences'          => $presences,
                ]
            );
        }
    }
}
