<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Attendance\AttendanceSheetController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Only minimal web routes.
| NO CSRF-sensitive endpoints.
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => response()->json([
    'app' => 'TakwaEtablissement API',
    'status' => 'ok',
]));

// Allow direct browser downloads/views of attendance sheets using web session
Route::middleware(['web'])->group(function () {
    Route::get('/attendances/weekly-sheet/pdf', [AttendanceSheetController::class, 'generateWeeklyPdf']);
    Route::get('/attendance/weekly-sheet/pdf',  [AttendanceSheetController::class, 'generateWeeklyPdf']);
});
