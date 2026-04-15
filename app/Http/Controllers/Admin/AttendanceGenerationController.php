<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AttendanceGenerationController extends Controller
{
    /**
     * Generate attendance entries from timetable
     * (Tu pourras mettre la vraie logique ici plus tard)
     */
    public function generateFromTimetable(Request $request)
    {
        return response()->json([
            'message' => 'Présences générées avec succès.'
        ]);
    }
}
