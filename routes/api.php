<?php

use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Models\User;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin\DegreeController;
use App\Http\Controllers\EventController as PublicEventController;
use App\Http\Controllers\WaitingListController;

use App\Http\Controllers\Api\PublicLabExperimentController;
use App\Http\Controllers\Api\LabAttemptController;

use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\TimetableController;
use App\Http\Controllers\Admin\UserController as AdminUserControllerV2;
use App\Http\Controllers\Admin\UserController;
use App\Services\DegreeResolver;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\MonthlySubjectPlanController;
use App\Http\Controllers\Role\MonthlyPlanViewController;
use App\Http\Controllers\ParentApiController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\NotificationBroadcastController;
use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\HomeworkController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminUserCrudController;
use App\Http\Controllers\Admin\GroupController;
use App\Http\Controllers\Admin\BoursierController;
use App\Http\Controllers\Admin\DisbursementController;

use App\Http\Controllers\Admin\AttendanceGenerationController;


use App\Http\Controllers\Boursier\SelfController;
use App\Http\Controllers\Boursier\ContributionController;

use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Api\AttendanceReadController;

use App\Http\Controllers\Admin\TestAdminController;
use App\Http\Controllers\Teacher\TestController;
use App\Http\Controllers\Teacher\TestQuestionController;
use App\Http\Controllers\Teacher\TestAssignmentController;
use App\Http\Controllers\Student\TestFlowController;
use App\Http\Controllers\Teacher\TestMediaController;
use App\Http\Controllers\Teacher\TeacherStudentController;

use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\Student\MyGradesController;
use App\Http\Controllers\Api\Parent\ChildGradesController;
use App\Http\Controllers\Api\Admin\DegreeGradesLeaderboardController;
use App\Http\Controllers\Teacher\TeacherDegreeGradesLeaderboardController;
use App\Http\Controllers\Api\Teacher\TeacherDegreeController;
use App\Http\Controllers\Teacher\TeacherRatingController;
use App\Http\Controllers\Api\Admin\AdminRatingController;
use App\Http\Controllers\Api\Student\MyRatingsController;
use App\Http\Controllers\Api\Parent\ChildRatingsController;
use App\Http\Controllers\Api\Admin\DegreeRatingsLeaderboardController;
use App\Http\Controllers\Api\Teacher\TeacherSubjectController;
use App\Http\Controllers\Api\Teacher\TeacherDegreeRatingsLeaderboardController;

use App\Http\Controllers\Api\Student\MyAvatarController;
use App\Http\Controllers\Api\Admin\AvatarReviewController;
use App\Http\Controllers\Api\Admin\AttendanceAdminController;
use App\Http\Controllers\Api\Teacher\AttendanceTeacherController;
use App\Http\Controllers\Attendance\AttendanceSheetController;
use App\Http\Controllers\Attendance\ScanProcessingController;


Route::post('/connexion', [AuthController::class, 'login'])
    ->name('login')
    ->middleware(['api', 'throttle:auth-login']);

Route::post('/login', [AuthController::class, 'login'])
    ->middleware(['api', 'throttle:auth-login']);

// Public read endpoints: throttle to reduce scraping/abuse
Route::get('/degrees', [DegreeController::class, 'index'])
    ->middleware(['api', 'throttle:public-read']);

Route::prefix('evenements')
    ->middleware(['api', 'throttle:public-read'])
    ->group(function () {
        Route::get('/',        [PublicEventController::class, 'index']);
        Route::get('/{event}', [PublicEventController::class, 'show']);
    });

Route::get('/waiting-list', [WaitingListController::class, 'publicList'])
    ->middleware(['api', 'throttle:public-read']);
//Experiment Read P&C
Route::prefix('lab')
    ->middleware(['api', 'throttle:public-read'])
    ->group(function () {
        // Catalog
        Route::get('/experiments', [PublicLabExperimentController::class, 'index']);
        Route::get('/experiments/{slug}', [PublicLabExperimentController::class, 'show']);
    });
//Experiment Write P&C
Route::prefix('lab')
    ->middleware(['api', 'throttle:public-write'])
    ->group(function () {
        // Start attempt (anonymous or logged-in)
        Route::post('/experiments/{experiment}/attempts', [LabAttemptController::class, 'start']);

        // Resume / save manipulation state
        Route::get('/attempts/{attempt}', [LabAttemptController::class, 'show']);
        Route::patch('/attempts/{attempt}/state', [LabAttemptController::class, 'updateState']);

        // Instant correction
        Route::post('/attempts/{attempt}/answers', [LabAttemptController::class, 'submitAnswer']);
    });
Route::middleware([EnsureFrontendRequestsAreStateful::class,'auth:sanctum','throttle:api-auth',])->group(function () {
    /*
    | Current user
    */
    Route::post('/deconnexion', [AuthController::class, 'logout'])->name('logout');
    Route::post('/déconnexion', [AuthController::class, 'logout']);

    Route::get('/me', MeController::class);
    Route::put('/me/password', [AccountController::class, 'updatePassword']);
    // Per-user notifications
    Route::get( 'notifications',           [NotificationController::class, 'index']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all',  [NotificationController::class, 'markAllRead']);
Route::middleware('role:admin|superadmin')
        ->prefix('admin')
        ->group(function () {
    Route::get('ping', fn () => response()->json(['ok' => true]));
        // Users CRUD (+ ?role=student|teacher|parent|admin)
       // Users CRUD (+ ?role=student|teacher|parent|admin)
        Route::apiResource('users', AdminUserControllerV2::class);

        // Admin helpers
        Route::get(   'admins',                [AdminUserController::class, 'index']);
        Route::get(   'admins/candidates',     [AdminUserController::class, 'candidates']);
        Route::post(  'admins/{user}/assign',  [AdminUserController::class, 'assign']);
        Route::post(  'admins/{user}/revoke',  [AdminUserController::class, 'revoke']);

        // Dedicated admin account CRUD
        Route::post(  'admin-users',           [AdminUserCrudController::class, 'store']);
        Route::put(   'admin-users/{user}',    [AdminUserCrudController::class, 'update']);

        Route::get('/students', function (Request $request, DegreeResolver $resolver) {
	// Force ?role=student
                $request->merge(['role' => 'student']);
        return app(UserController::class)->index($request, $resolver);
        });
        Route::apiResource('groups', GroupController::class);
        Route::post('groups/{group}/assign', [GroupController::class, 'assign']);
	//Admin Student Image
	Route::get('avatars/pending', [\App\Http\Controllers\Api\Admin\AvatarReviewController::class, 'pending']);
	Route::post('avatars/{student}/approve', [\App\Http\Controllers\Api\Admin\AvatarReviewController::class, 'approve']);
	Route::post('avatars/{student}/reject', [\App\Http\Controllers\Api\Admin\AvatarReviewController::class, 'reject']);
	Route::delete('avatars/{student}', [\App\Http\Controllers\Api\Admin\AvatarReviewController::class, 'remove']);
        // Catalogs / planning
        Route::apiResource('degrees',  DegreeController::class);
        Route::apiResource('subjects', SubjectController::class);
        Route::apiResource('rooms',    RoomController::class)->only(['index','store','show','update','destroy']);
	Route::apiResource('grades', GradeController::class);
        Route::get('degrees/{degree}/grades-leaderboard', DegreeGradesLeaderboardController::class);
	//Rating Student as  Admin
	Route::get('ratings', [AdminRatingController::class, 'index']);
        Route::post('ratings', [AdminRatingController::class, 'store']);
        Route::put('ratings/{rating}', [AdminRatingController::class, 'update']);
        Route::patch('ratings/{rating}', [AdminRatingController::class, 'update']);
        Route::delete('ratings/{rating}', [AdminRatingController::class, 'destroy']);

	Route::get('degrees/{degree}/ratings-leaderboard', DegreeRatingsLeaderboardController::class);

	// >>> Timetables (NO extra /admin here)
        Route::get(   'timetables',             [TimetableController::class, 'index']);
        Route::get(   'timetables/week',        [TimetableController::class, 'week']); // optional
        Route::post(  'timetables',             [TimetableController::class, 'store']);
        Route::put(   'timetables/{timetable}', [TimetableController::class, 'update']);
        Route::delete('timetables/{timetable}', [TimetableController::class, 'destroy']);

        // Monthly plans
        Route::get(   'monthly-plans',          [MonthlySubjectPlanController::class, 'index']);
        Route::post(  'monthly-plans',          [MonthlySubjectPlanController::class, 'store']);
        Route::patch( 'monthly-plans/{plan}',   [MonthlySubjectPlanController::class, 'update']);
        Route::delete('monthly-plans/{plan}',   [MonthlySubjectPlanController::class, 'destroy']);
       // Admin events
        Route::get(   'evenements',             [AdminEventController::class, 'index']);
        Route::post(  'evenements',             [AdminEventController::class, 'store']);
        Route::get(   'evenements/{event}',     [AdminEventController::class, 'show']);
        Route::put(   'evenements/{event}',     [AdminEventController::class, 'update']);
        Route::delete('evenements/{event}',     [AdminEventController::class, 'destroy']);

        // Broadcast notifications
        Route::post('notifications/broadcast',  [NotificationBroadcastController::class, 'store']);
        Route::get('notifications',           [AdminNotificationController::class, 'index']);
        Route::delete('notifications/{id}',   [AdminNotificationController::class, 'destroy']);
        // Documents (admin)
        Route::get(   'documents',              [DocumentController::class, 'adminIndex']);
        Route::delete('documents/{document}',    [DocumentController::class, 'destroy']) // ← rename {doc} → {document}
        ->whereNumber('document');

        // Devoirs (admin)
        Route::get(   'devoirs',                [HomeworkController::class, 'adminIndex']);
        Route::delete('devoirs/{homework}',     [HomeworkController::class, 'destroy']);

        // Attendance (admin)
	Route::get('attendance/weekly',   [AttendanceAdminController::class, 'weekly']);   // ?degree_id=&week_start=
        Route::get('attendance/monthly',  [AttendanceAdminController::class, 'monthly']);  // ?degree_id=&month=YYYY-MM
        Route::put('attendance/record/{record}', [AttendanceAdminController::class, 'updateStatus']);
        Route::get('attendance/export',   [AttendanceAdminController::class, 'export']);   // ?degree_id=&from=&to=
	Route::get('attendance/export-weekly-summary', [AttendanceAdminController::class, 'exportWeeklySummary']);
	Route::post('attendance/backfill', [AttendanceAdminController::class, 'backfill']);

        // Scanned paper sheet generation & OMR processing
        Route::get('attendance/weekly-sheet/pdf',  [AttendanceSheetController::class, 'generateWeeklyPdf']);
        Route::get('attendance/weekly-sheet/data', [AttendanceSheetController::class, 'getSheetData']);
        Route::post('attendance/upload-scan',      [ScanProcessingController::class, 'uploadScan']);
        Route::post('attendance/confirm-scan',     [ScanProcessingController::class, 'confirmScan']);

        // Boursier
        Route::get('boursiers', [BoursierController::class,'index']);
        Route::post('boursiers', [BoursierController::class,'store']);
        Route::get('boursiers/{boursier}', [BoursierController::class,'show']);
        Route::put('boursiers/{boursier}', [BoursierController::class,'update']);
        Route::delete('boursiers/{boursier}', [BoursierController::class,'destroy']);
        Route::post('boursiers/{boursier}/disbursements', [DisbursementController::class,'createOne']);
        Route::post('boursiers/{boursier}/disbursements/{disb}/pay', [DisbursementController::class,'pay']);
        //Liste d'attente
        Route::post('/admin/waiting-list/upload', [WaitingListController::class, 'upload']);
        Route::get('/admin/waiting-list', [WaitingListController::class, 'index']);
        Route::delete('/admin/waiting-list/clear', [WaitingListController::class, 'clear']);
     Route::middleware(['role:teacher|admin'])->group(function () {
    	Route::get('/students', function (Request $request) {

        $q = User::query()->role('student');

        if ($request->filled('degree_id')) {
            $q->where('degree_id', $request->degree_id);
        }

        return $q
            ->select('id','firstname','lastname','email','degree_id')
            ->orderBy('firstname')
            ->get();
    	});
	});
    Route::middleware(['role:admin'])->prefix('tests')->group(function () {
                Route::get('/', [TestAdminController::class, 'index']);
                Route::get('/{test}', [TestAdminController::class, 'show']);
                Route::get('/{test}/attempts', [TestAdminController::class, 'attempts']);
                Route::delete('/attempts/{attempt}', [TestAdminController::class, 'invalidateAttempt']);
                Route::delete('/{test}', [TestAdminController::class, 'destroy']);
        });
    Route::middleware(['role:admin'])->prefix('admin/tests')->group(function () {
                Route::get('/', [TestAdminController::class, 'index']);
                Route::get('/{test}', [TestAdminController::class, 'show']);
                Route::get('/{test}/attempts', [TestAdminController::class, 'attempts']);
                Route::delete('/attempts/{attempt}', [TestAdminController::class, 'invalidateAttempt']);
                Route::delete('/{test}', [TestAdminController::class, 'destroy']);
        });
        }); // <-- CLOSE admin group



    Route::prefix('enseignant')->middleware('role:teacher')->group(function () {
        Route::get('emploi-du-temps', [TimetableController::class, 'teacher']);
        Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'teacher']);
	Route::get('degrees', TeacherDegreeController::class);

	//Attendance Teacher 
        Route::get('attendance/roster', [AttendanceTeacherController::class, 'roster']);
	Route::get('degrees/{degree}/students', [AttendanceTeacherController::class, 'students']);
        Route::post('attendance/session',       [AttendanceTeacherController::class, 'getOrCreateSession']); // degree_id, date?
        Route::put('attendance/mark',           [AttendanceTeacherController::class, 'mark']); // session_id, student_id, status
        Route::get('attendance/session/{session}', [AttendanceTeacherController::class, 'sessionRecords']);
	//get..
        Route::get(   'documents',            [DocumentController::class, 'teacherIndex']);
        Route::post(  'documents',            [DocumentController::class, 'store']);
        Route::delete('documents/{document}',    [DocumentController::class, 'destroy']) // ← rename {doc} → {document}
        ->whereNumber('document');

        Route::get('devoirs',                 [HomeworkController::class, 'teacherIndex']);
        Route::post('devoirs',                [HomeworkController::class, 'store']);
        Route::delete('devoirs/{homework}',   [HomeworkController::class, 'destroy']);
	//Notes enseignant
        Route::get('degrees/{degree}/grades-leaderboard', TeacherDegreeGradesLeaderboardController::class);
	Route::get('grades',        [GradeController::class, 'index']);
        Route::post('grades',       [GradeController::class, 'store']);
        Route::get('grades/{grade}',[GradeController::class, 'show']);
        Route::put('grades/{grade}',[GradeController::class, 'update']);
        Route::patch('grades/{grade}',[GradeController::class, 'update']);
	//Rating Student as Teacher
	Route::get('ratings', [TeacherRatingController::class, 'index']);
        Route::post('ratings', [TeacherRatingController::class, 'store']); // upsert
        Route::put('ratings/{rating}', [TeacherRatingController::class, 'update']);
        Route::patch('ratings/{rating}', [TeacherRatingController::class, 'update']);
        Route::get('degrees/{degree}/ratings-leaderboard', TeacherDegreeRatingsLeaderboardController::class);

	});
	
        //teachers Tests area
         Route::prefix('enseignant/tests')->middleware('role:teacher|admin')->group(function () {
         Route::get('/students', [TeacherStudentController::class, 'byDegree']);

        Route::get('/{test}', [TestController::class, 'show']);
      Route::get('/', [TestController::class, 'index']);

        Route::post('/', [TestController::class, 'store']);
        Route::put('/{test}', [TestController::class, 'update']);

        Route::post('/{test}/activate', [TestController::class, 'activate']);

        Route::post('/{test}/questions', [TestQuestionController::class, 'store']);

        Route::post('/{test}/assign', [TestAssignmentController::class, 'assignStudents']);
        Route::delete('/attempts/{attempt}', [TestAssignmentController::class, 'invalidateAttempt']);
        Route::post('/allow-retry/{assignment}', [TestAssignmentController::class, 'allowRetry']);

        Route::get('/{test}/results', [TestController::class, 'results']);
        Route::post('/{test}/upload-image', [TestMediaController::class, 'uploadImage']);
        Route::post('/', [TestController::class, 'store']);
        Route::put('/{test}', [TestController::class, 'update']);
        Route::post('/{test}/activate', [TestController::class, 'activate']);
        Route::delete('/{test}', [TestController::class, 'destroy']);
        Route::post('/{test}/questions', [TestQuestionController::class, 'store']);

        Route::post('/{test}/assign', [TestAssignmentController::class, 'assignStudents']);
        Route::delete('/attempts/{attempt}', [TestAssignmentController::class, 'invalidateAttempt']);
        Route::post('/allow-retry/{assignment}', [TestAssignmentController::class, 'allowRetry']);

        Route::get('/{test}/results', [TestController::class, 'results']);
        Route::post('/{test}/upload-image', [TestMediaController::class, 'uploadImage']);

});

    /* ------------- Student area ------------- */
    Route::prefix('eleve')->middleware('role:student')->group(function () {
        Route::get('emploi-du-temps', [TimetableController::class, 'student']);
        Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'student']);
        Route::get('documents',       [DocumentController::class, 'studentIndex']);
        Route::get('devoirs',         [HomeworkController::class, 'studentIndex']);
        Route::get('attendance',      [AttendanceReadController::class, 'me']);
	Route::get('grades', MyGradesController::class);
   	Route::get('ratings', MyRatingsController::class); 
	Route::get('avatar', [MyAvatarController::class, 'show']);
        Route::post('avatar', [MyAvatarController::class, 'store']);
});
Route::prefix('student')->middleware(['auth:sanctum','role:student'])->group(function () {
    Route::get('emploi-du-temps', [TimetableController::class, 'student']);
    Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'student']);
    Route::get('documents',       [DocumentController::class, 'studentIndex']);
    Route::get('devoirs',         [HomeworkController::class, 'studentIndex']);
    Route::get('attendance',      [AttendanceReadController::class, 'me']);
    Route::get('grades',          MyGradesController::class);
    Route::get('ratings',         MyRatingsController::class);
    Route::get('avatar',          [MyAvatarController::class, 'show']);
    Route::post('avatar',         [MyAvatarController::class, 'store']);
});
     Route::prefix('eleve')->middleware('role:student')->group(function () {

    // List assigned tests
    Route::get('/tests', [\App\Http\Controllers\Student\TestFlowController::class, 'myTests']);

    // Start test → creates attempt
    Route::post('/tests/{test}/start', [\App\Http\Controllers\Student\TestFlowController::class, 'start']);

    // Get attempt data (questions, timer, test info)
    Route::get('/attempts/{attempt}', [\App\Http\Controllers\Student\TestFlowController::class, 'getAttempt']);

    // Save answer
    Route::post('/attempts/{attempt}/answer', [\App\Http\Controllers\Student\TestFlowController::class, 'saveAnswer']);

    // Submit test
    Route::post('/attempts/{attempt}/submit', [\App\Http\Controllers\Student\TestFlowController::class, 'submitAttempt']);

    // Show result
    Route::get('/tests/{test}/result', [\App\Http\Controllers\Student\TestFlowController::class, 'result']);
});



        /*------------Boursier area------------ */

    Route::prefix('boursier')->middleware('role:boursier')->group(function () {
        Route::get('me', [SelfController::class, 'me']);
        Route::get('contributions', [ContributionController::class, 'index']);
        Route::post('contributions', [ContributionController::class, 'store']);
    });

    /* ------------- Parent area ------------- */
    Route::prefix('parent')->middleware('role:parent')->group(function () {
        Route::get('emploi-du-temps', [TimetableController::class, 'parent']); // ?child_id=...
        Route::get('children',        [ParentApiController::class, 'children']);
        Route::get('notifications',   [ParentApiController::class, 'notifications']);
        Route::get('monthly-plans',   [MonthlyPlanViewController::class, 'parent']);
        Route::get('documents',       [DocumentController::class, 'parentIndex']);
        Route::get('devoirs',         [HomeworkController::class, 'parentIndex']);
        Route::get('children/{child}/grades', ChildGradesController::class);
        Route::get('children/{child}/ratings', ChildRatingsController::class);

});
});




// Scanned Paper Attendance Module (Direct prefix)
Route::middleware([EnsureFrontendRequestsAreStateful::class, 'auth:sanctum', 'throttle:api-auth'])
    ->prefix('attendances')
    ->group(function () {
        Route::get('weekly-sheet/pdf',  [AttendanceSheetController::class, 'generateWeeklyPdf']);
        Route::get('weekly-sheet/data', [AttendanceSheetController::class, 'getSheetData']);
        Route::post('upload-scan',      [ScanProcessingController::class, 'uploadScan']);
        Route::post('confirm-scan',     [ScanProcessingController::class, 'confirmScan']);
    });
