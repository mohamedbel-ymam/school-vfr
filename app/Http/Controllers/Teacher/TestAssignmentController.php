<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestAssignment;
use App\Models\TestAttempt;
use Illuminate\Http\Request;

class TestAssignmentController extends Controller
{
    /** Assign students */
    public function assignStudents(Request $request, Test $test)
{
    $validated = $request->validate([
        'student_ids' => 'required|array'
    ]);

    foreach ($validated['student_ids'] as $studentId) {
        TestAssignment::updateOrCreate(
            ['test_id' => $test->id, 'student_id' => $studentId],
            []
        );
    }

    return response()->json(['message' => 'Students assigned']);
}

    /** Invalidate attempt */
    public function invalidateAttempt(TestAttempt $attempt)
    {
        $attempt->update(['is_valid' => false]);

        return response()->json(['message' => 'Attempt invalidated']);
    }

    /** Allow retry for a student */
    public function allowRetry(TestAssignment $assignment)
    {
        $assignment->update(['can_retry' => true]);

        return response()->json(['message' => 'Retry allowed']);
    }
}

