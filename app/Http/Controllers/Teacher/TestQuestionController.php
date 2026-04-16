<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestQuestion;
use Illuminate\Http\Request;

class TestQuestionController extends Controller
{
    public function store(Request $request, Test $test)
    {
        if ($test->teacher_id !== auth()->id() && !auth()->user()->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'statement'      => 'required|string',   // rich text HTML
            'options'        => 'required|array|min:2',
            'options.*'      => 'required|string',
            'correct_index'  => 'required|integer|min:0',
            'order'          => 'nullable|integer',
            'difficulty'     => 'nullable|integer|min:1|max:5',
            'categories'     => 'nullable|array',
            'categories.*'   => 'nullable|string',
            'images'         => 'nullable|array',
            'images.*'       => 'nullable|string',   // URLs
        ]);

        $order = $data['order'] ?? ($test->questions()->max('order') + 1);

        $question = TestQuestion::create([
            'test_id'    => $test->id,
            'statement'  => $data['statement'],
            'options'    => $data['options'],
            'correct_answer' => (string)$data['correct_index'], // we store index as string
            'order'      => $order,
            'difficulty' => $data['difficulty'] ?? 1,
            'categories' => $data['categories'] ?? [],
            'images'     => $data['images'] ?? [],
        ]);

        return response()->json($question, 201);
    }
}

