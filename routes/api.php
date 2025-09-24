<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AccountController;
use App\Http\Controllers\TimetableController;
use App\Http\Controllers\Admin\UserController as AdminUserControllerV2;
use App\Http\Controllers\Admin\DegreeController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\MonthlySubjectPlanController;
use App\Http\Controllers\Role\MonthlyPlanViewController;
use App\Http\Controllers\ParentApiController;
use App\Http\Controllers\EventController as PublicEventController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\NotificationBroadcastController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\HomeworkController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminUserCrudController;
use App\Http\Controllers\Auth\MeController;

/*
|--------------------------------------------------------------------------
| Public / unauthenticated
|--------------------------------------------------------------------------
| Expose a read-only list of degrees for UIs that don’t want to call admin endpoints.
*/
Route::get('/degrees', [DegreeController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Authenticated
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // ---- Current user
    Route::get('/me', MeController::class);
    Route::put('/me/password', [AccountController::class, 'updatePassword']);

    // ---- Public events for any authenticated role
    Route::middleware('role:student|teacher|parent|admin')->group(function () {
        Route::get('evenements',         [PublicEventController::class, 'index']);
        Route::get('evenements/{event}', [PublicEventController::class, 'show']);
    });

    // ---- Notifications (auth)
    Route::get( 'notifications',           [NotificationController::class, 'index']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all',  [NotificationController::class, 'markAllRead']);

    /*
    |--------------------------------------------------------------------------
    | Admin area
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('ping', fn () => response()->json(['ok' => true]));

        // Users CRUD (+ ?role=student|teacher|parent|admin)
        Route::apiResource('users', AdminUserControllerV2::class);

        // Admin helpers (list/promote/revoke)
        Route::get('/admins',                [AdminUserController::class, 'index']);
        Route::get('/admins/candidates',     [AdminUserController::class, 'candidates']);
        Route::post('/admins/{user}/assign', [AdminUserController::class, 'assign']);
        Route::post('/admins/{user}/revoke', [AdminUserController::class, 'revoke']);

        // Dedicated admin account CRUD (avoid conflict with /admin/users)
        Route::post('/admin-users',       [AdminUserCrudController::class, 'store']);
        Route::put('/admin-users/{user}', [AdminUserCrudController::class, 'update']);

        // Catalogs / planning
        Route::apiResource('degrees',  DegreeController::class);
        Route::apiResource('subjects', SubjectController::class);
        Route::apiResource('rooms',    RoomController::class)->only(['index','store','show','update','destroy']);

        // Timetables
        Route::get(   'timetables',                 [TimetableController::class, 'adminList']);
        Route::post(  'timetables',                 [TimetableController::class, 'store']);
        Route::match(['put','patch'], 'timetables/{timetable}', [TimetableController::class, 'update']);
        Route::delete('timetables/{timetable}',     [TimetableController::class, 'destroy']);

        // Monthly plans
        Route::get(   'monthly-plans',          [MonthlySubjectPlanController::class, 'index']);
        Route::post(  'monthly-plans',          [MonthlySubjectPlanController::class, 'store']);
        Route::patch( 'monthly-plans/{plan}',   [MonthlySubjectPlanController::class, 'update']);
        Route::delete('monthly-plans/{plan}',   [MonthlySubjectPlanController::class, 'destroy']);

        // Admin events
        Route::get(   'evenements',           [AdminEventController::class, 'index']);
        Route::post(  'evenements',           [AdminEventController::class, 'store']);
        Route::get(   'evenements/{event}',   [AdminEventController::class, 'show']);
        Route::put(   'evenements/{event}',   [AdminEventController::class, 'update']);
        Route::delete('evenements/{event}',   [AdminEventController::class, 'destroy']);

        // Broadcast notifications
        Route::post('notifications/broadcast', [NotificationBroadcastController::class, 'store']);

        // Documents (admin)
        Route::get(   'documents',            [DocumentController::class, 'adminIndex']);
        Route::delete('documents/{document}', [DocumentController::class, 'destroy']);

        // Devoirs (admin)
        Route::get(   'devoirs',              [HomeworkController::class, 'adminIndex']);
        Route::delete('devoirs/{homework}',   [HomeworkController::class, 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | Teacher area
    |--------------------------------------------------------------------------
    */
    Route::prefix('enseignant')->middleware('role:teacher')->group(function () {
        Route::get('emploi-du-temps', [TimetableController::class, 'teacher']);
        Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'teacher']);

        Route::get(   'documents',  [DocumentController::class, 'teacherIndex']);
        Route::post(  'documents',  [DocumentController::class, 'store']);
        Route::delete('documents/{doc}', [DocumentController::class, 'destroy'])->whereNumber('doc');

        Route::get('devoirs',              [HomeworkController::class, 'teacherIndex']);
        Route::post('devoirs',             [HomeworkController::class, 'store']);
        Route::delete('devoirs/{homework}',[HomeworkController::class, 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | Student area
    |--------------------------------------------------------------------------
    */
    Route::prefix('eleve')->middleware('role:student')->group(function () {
        Route::get('emploi-du-temps', [TimetableController::class, 'student']);
        Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'student']);
        Route::get('documents',       [DocumentController::class, 'studentIndex']);
        Route::get('devoirs',         [HomeworkController::class, 'studentIndex']);
    });

    /*
    |--------------------------------------------------------------------------
    | Parent area
    |--------------------------------------------------------------------------
    */
    Route::prefix('parent')->middleware('role:parent')->group(function () {
        Route::get('emploi-du-temps', [TimetableController::class, 'parent']); // ?child_id=...
        Route::get('children',        [ParentApiController::class, 'children']);
        Route::get('notifications',   [ParentApiController::class, 'notifications']);
        Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'parent']);
        Route::get('documents',       [DocumentController::class, 'parentIndex']);
        Route::get('devoirs',         [HomeworkController::class, 'parentIndex']);
    });

    // ⚠️ REMOVE duplicated public degrees route inside auth group (keep only the public one above)
});
