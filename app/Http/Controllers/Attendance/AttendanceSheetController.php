<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Services\Attendance\WeeklyAttendanceSheetService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceSheetController extends Controller
{
    public function __construct(
        protected WeeklyAttendanceSheetService $sheetService
    ) {}

    /**
     * Generate and download or stream the printable weekly A4 PDF attendance sheet.
     * 
     * Route: GET /api/attendances/weekly-sheet/pdf
     * Route: GET /attendances/weekly-sheet/pdf
     */
    public function generateWeeklyPdf(Request $request)
    {
        $user = $request->user() ?? Auth::guard('web')->user() ?? Auth::guard('sanctum')->user();
        if (!$user) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
            }
            return redirect('/connexion');
        }

        $validated = $request->validate([
            'degree_id'   => ['required', 'integer', 'exists:degrees,id'],
            'group_id'    => ['nullable', 'integer', 'exists:groups,id'],
            'week_number' => ['nullable', 'integer', 'min:1', 'max:53'],
            'year'        => ['nullable', 'integer', 'min:2020', 'max:2035'],
            'date'        => ['nullable', 'date'],
        ]);

        $degreeId = (int) $validated['degree_id'];
        $groupId  = isset($validated['group_id']) ? (int) $validated['group_id'] : null;

        if (!empty($validated['date'])) {
            $carbonDate = Carbon::parse($validated['date']);
            $weekNumber = (int) $carbonDate->isoWeek();
            $year       = (int) $carbonDate->isoWeekYear();
        } else {
            $weekNumber = (int) ($validated['week_number'] ?? Carbon::now()->isoWeek());
            $year       = (int) ($validated['year'] ?? Carbon::now()->isoWeekYear());
        }

        $pdf = $this->sheetService->generatePdf($degreeId, $weekNumber, $year, $groupId);

        $filename = sprintf('fiche_presence_classe_%d_semaine_%d_%d.pdf', $degreeId, $weekNumber, $year);

        if ($request->query('download')) {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }

    /**
     * Get JSON metadata and session structure of the weekly sheet.
     * Useful for frontend previews or mobile app integration.
     * 
     * Route: GET /api/attendances/weekly-sheet/data
     */
    public function getSheetData(Request $request)
    {
        $user = $request->user() ?? Auth::guard('web')->user() ?? Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
        }

        $validated = $request->validate([
            'degree_id'   => ['required', 'integer', 'exists:degrees,id'],
            'group_id'    => ['nullable', 'integer', 'exists:groups,id'],
            'week_number' => ['nullable', 'integer', 'min:1', 'max:53'],
            'year'        => ['nullable', 'integer', 'min:2020', 'max:2035'],
            'date'        => ['nullable', 'date'],
        ]);

        $degreeId = (int) $validated['degree_id'];
        $groupId  = isset($validated['group_id']) ? (int) $validated['group_id'] : null;

        if (!empty($validated['date'])) {
            $carbonDate = Carbon::parse($validated['date']);
            $weekNumber = (int) $carbonDate->isoWeek();
            $year       = (int) $carbonDate->isoWeekYear();
        } else {
            $weekNumber = (int) ($validated['week_number'] ?? Carbon::now()->isoWeek());
            $year       = (int) ($validated['year'] ?? Carbon::now()->isoWeekYear());
        }

        $data = $this->sheetService->getSheetData($degreeId, $weekNumber, $year, $groupId);

        return response()->json([
            'degree'     => $data['degree'],
            'group'      => $data['group'],
            'weekNumber' => $data['weekNumber'],
            'year'       => $data['year'],
            'startDate'  => $data['startDate'],
            'endDate'    => $data['endDate'],
            'startIso'   => $data['startIso'],
            'endIso'     => $data['endIso'],
            'sessions'   => $data['sessions'],
            'students'   => $data['students'],
            'qrPayload'  => json_decode($data['qrPayload'], true),
        ]);
    }
}
