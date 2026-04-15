<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\Request;
use App\Support\AppliesTermDateFilter;

class GradeController extends Controller
{
     use AppliesTermDateFilter;
    public function index(Request $request)
    {
        $this->authorize('viewAny', Grade::class);

        $q = Grade::query()
            ->with(['subject:id,name', 'student:id,firstname,lastname,email', 'teacher:id,firstname,lastname'])
            ->latest();

        if ($request->filled('student_id')) $q->where('student_id', $request->integer('student_id'));
        if ($request->filled('subject_id')) $q->where('subject_id', $request->integer('subject_id'));
	if ($request->filled('term')) {
            $term = (string) $request->string('term');
            $q->where('term', $term);               // optionnel si tu veux garder term
            $this->applyTermDateFilter($q, $term);  // ✅ dates
        }
        // safe default: teacher sees only what they entered
        if ($request->user()->hasRole('teacher')) {
   	$data['teacher_id'] = $request->user()->id;
    	$data['subject_id'] = $request->user()->subject_id; // or $request->user()->subject->id
	}


        return response()->json($q->paginate(20));
    }

    public function store(Request $request)
    {
        $this->authorize('create', Grade::class);

        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:users,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:users,id'],
            'term'       => ['required', 'string', 'max:10'],
            'exam_type'  => ['required', 'string', 'max:20'],
            'title'      => ['nullable', 'string', 'max:80'],
            'score'      => ['required', 'numeric', 'min:0'],
            'max_score'  => ['required', 'numeric', 'min:1'],
            'graded_at'  => ['nullable', 'date'],
            'comment'    => ['nullable', 'string'],
        ]);

        $data['entered_by'] = $request->user()->id;

        $grade = Grade::create($data); // exam_key computed by model

        return response()->json($grade->load(['subject:id,name', 'student:id,firstname,lastname,email', 'teacher:id,firstname,lastname']), 201);
    }

    public function show(Grade $grade)
    {
        $this->authorize('view', $grade);

        return response()->json($grade->load(['subject:id,name', 'student:id,firstname,lastname,email', 'teacher:id,firstname,lastname']));
    }

public function update(Request $request, Grade $grade)
{
    $this->authorize('update', $grade);

    $data = $request->validate([
        'teacher_id' => ['nullable', 'integer', 'exists:users,id'],
        'term'       => ['sometimes', 'string', 'max:10'],
        'exam_type'  => ['sometimes', 'string', 'max:20'],
        'title'      => ['nullable', 'string', 'max:80'],
        'score'      => ['sometimes', 'numeric', 'min:0'],
        'max_score'  => ['sometimes', 'numeric', 'min:1'],
        'graded_at'  => ['nullable', 'date'],
        'comment'    => ['nullable', 'string'],
    ]);

    // ✅ compute final values (if not provided, use current values)
    $finalScore    = array_key_exists('score', $data) ? (float) $data['score'] : (float) $grade->score;
    $finalMaxScore = array_key_exists('max_score', $data) ? (float) $data['max_score'] : (float) $grade->max_score;

    if ($finalScore > $finalMaxScore) {
        return response()->json([
            'message' => 'score cannot exceed max_score',
            'errors'  => ['score' => ['score must be <= max_score']],
        ], 422);
    }

    $grade->update($data);

    return response()->json(
        $grade->fresh()->load(['subject:id,name', 'student:id,firstname,lastname,email', 'teacher:id,firstname,lastname'])
    );
}


    public function destroy(Grade $grade)
    {
        $this->authorize('delete', $grade);

        $grade->delete();

        return response()->json(['deleted' => true]);
    }
}
