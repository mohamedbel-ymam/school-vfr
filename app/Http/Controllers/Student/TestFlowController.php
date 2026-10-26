<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestAssignment;
use App\Models\TestAttempt;
use App\Models\TestAttemptAnswer;
use Illuminate\Http\Request;

class TestFlowController extends Controller
{
    /** List tests assigned to student */
    public function myTests()
    {
        $studentId = auth()->id();

        $tests = TestAssignment::where('student_id', $studentId)
            ->with('test')
            ->get()
            ->pluck('test')
            ->filter()
            ->values();

        return response()->json($tests);
    }

    /** Start test → create attempt */
    public function start(Request $request, Test $test)
    {
        $studentId = auth()->id();

        // Check assignment
        $assignment = TestAssignment::where('test_id', $test->id)
            ->where('student_id', $studentId)
            ->first();

        if (!$assignment) {
            return response()->json(['error' => 'Not allowed'], 403);
        }

        // Attempts
        $attemptCount = TestAttempt::where('test_id', $test->id)
            ->where('student_id', $studentId)
            ->where('is_valid', true)
            ->count();

        if ($attemptCount >= 1 && !$assignment->can_retry) {
            return response()->json(['error' => 'No remaining attempts'], 403);
        }

        // Create attempt
        $attempt = TestAttempt::create([
            'test_id' => $test->id,
            'student_id' => $studentId,
            'attempt_number' => $attemptCount + 1,
            'started_at' => now(),
        ]);

        return response()->json([
            'attempt_id' => $attempt->id
        ]);
    }

    /** Load attempt data (test + questions + timer) */
    public function getAttempt(TestAttempt $attempt)
    {
        $studentId = auth()->id();

        if ($attempt->student_id !== $studentId) {
            return response()->json(['error' => 'Not allowed'], 403);
        }

        $test = $attempt->test;

        return response()->json([
            'test' => $test,
            'questions' => $test->questions()->orderBy('order')->get(),
            'remaining_seconds' => ((int) ($test->global_time_minutes ?? 60)) * 60,
        ]);
    }

    /** Save answer for a question */
    public function saveAnswer(Request $request, TestAttempt $attempt)
    {
        $studentId = auth()->id();

        if ($attempt->student_id !== $studentId) {
            return response()->json(['error' => 'Not allowed'], 403);
        }

        $data = $request->validate([
            'question_id' => 'required|integer',
            'answer' => 'required'
        ]);

        TestAttemptAnswer::updateOrCreate(
            [
                'attempt_id' => $attempt->id,
                'question_id' => $data['question_id']
            ],
            [
                'student_answer' => $data['answer']
            ]
        );

        return response()->json(['message' => 'Saved']);
    }

    /** Submit attempt */
    public function submitAttempt(Request $request, TestAttempt $attempt)
    {
        $studentId = auth()->id();

        if ($attempt->student_id !== $studentId) {
            return response()->json(['error' => 'Not allowed'], 403);
        }

        $test = $attempt->test;
        $answers = TestAttemptAnswer::where('attempt_id', $attempt->id)->get();
        $correct = 0;

        foreach ($answers as $a) {
            $question = $test->questions()->find($a->question_id);
            if ($question) {
                $expected = $question->correct_answer ?? ($question->correct_index ?? null);
                if ($expected !== null && (string)$expected === (string)$a->student_answer) {
                    $correct++;
                }
            }
        }

        $totalQuestions = (int)$test->total_questions > 0
            ? (int)$test->total_questions
            : max(1, $test->questions()->count());

        $gradeValue = (float)($test->grade_value ?? 20);
        $score = round(($correct / $totalQuestions) * $gradeValue, 2);

        $attempt->update([
            'score' => $score,
            'completed_at' => now(),
            'is_valid' => true,
        ]);

        return response()->json(['message' => 'Submitted', 'score' => $score]);
    }

    /** View result */
    public function result(Test $test)
    {
        $studentId = auth()->id();

        $attempt = TestAttempt::where('test_id', $test->id)
            ->where('student_id', $studentId)
            ->latest()
            ->first();

        return response()->json($attempt);
    }
}
