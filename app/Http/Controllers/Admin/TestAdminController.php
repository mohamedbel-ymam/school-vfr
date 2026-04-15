<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestAttempt;

class TestAdminController extends Controller
{
    /** List all tests */
    public function index()
    {
        $tests = Test::with('teacher')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tests);
    }

    /** Full test info */
    public function show(Test $test)
    {
        return response()->json([
            'test' => $test->load('teacher', 'questions'),
            'assignments' => $test->assignments()->with('student')->get(),
        ]);
    }

    /** Attempts for a test */
    public function attempts(Test $test)
    {
        $attempts = TestAttempt::with(['student', 'answers.question'])
            ->where('test_id', $test->id)
            ->orderBy('attempt_number')
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'student' => $a->student,
                    'score' => $a->score,
                    'started_at' => $a->started_at,
                    'completed_at' => $a->completed_at,
                    'time_spent_seconds' => $a->started_at && $a->completed_at
                        ? $a->started_at->diffInSeconds($a->completed_at)
                        : null,
                    'is_valid' => $a->is_valid,
                    'answers' => $a->answers
                ];
            });

        return response()->json($attempts);
    }

    /** Invalidate attempt */
    public function invalidateAttempt(TestAttempt $attempt)
    {
        $attempt->update(['is_valid' => false]);

        return response()->json(['message' => 'Attempt invalidated']);
    }

    /** Delete entire test */
    public function destroy(Test $test)
    {
        $test->delete();
        return response()->json(['message' => 'Test deleted']);
    }
}

