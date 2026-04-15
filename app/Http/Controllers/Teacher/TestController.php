<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestAttempt;
use Illuminate\Http\Request;

class TestController extends Controller
{
public function show(Test $test)
{
    $test->load('questions');

    return response()->json([
        'id' => $test->id,
        'title' => $test->title,
        'description' => $test->description,
        'degree_id' => $test->degree_id,
        'global_time_minutes' => $test->global_time_minutes,
        'question_time_minutes' => $test->question_time_minutes,
        'total_questions' => $test->total_questions,
        'grade_value' => $test->grade_value,
        'questions' => $test->questions,
    ]);
}
	public function index()
	{
    	return \App\Models\Test::where('teacher_id', auth()->id())->get();
	}
    /** Create a new test */
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'global_time_minutes' => 'required|numeric',
            'question_time_minutes' => 'nullable|numeric',
            'total_questions' => 'required|numeric',
            'grade_value' => 'required|numeric',
        ]);

        $data['teacher_id'] = auth()->id();

        $test = Test::create($data);

        return response()->json($test, 201);
    }

    /** Update test */
    public function update(Request $request, Test $test)
    {
        $this->authorize('update', $test);

        $data = $request->only([
            'title', 'description',
            'global_time_minutes',
            'question_time_minutes',
            'total_questions',
            'grade_value'
        ]);

        $test->update($data);

        return response()->json($test);
    }

    /** Activate test — allow students to enter */
    public function activate(Test $test)
    {
        $test->update(['is_active' => true]);

        return response()->json(['message' => 'Test activated']);
    }

    /** Results */
    public function results(Test $test)
    {
        $results = TestAttempt::with('student')
            ->where('test_id', $test->id)
            ->orderBy('attempt_number', 'desc')
            ->get();

        return response()->json($results);
    }
public function destroy(Test $test)
{
    // sécurité : un enseignant ne supprime que ses propres tests
    if (auth()->id() !== $test->teacher_id && !auth()->user()->hasRole('admin')) {
        return response()->json(['message' => 'Non autorisé'], 403);
    }

    // suppression en cascade (assignments, questions, attempts)
    $test->questions()->delete();
    $test->assignments()->delete();
    $test->attempts()->delete();

    $test->delete();

    return response()->json(['message' => 'Test supprimé avec succès']);
}

}

