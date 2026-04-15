<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StudentRating;
use Illuminate\Http\Request;

class AdminRatingController extends Controller
{
    public function index(Request $request)
    {
        $q = StudentRating::query()
            ->with([
                'student:id,firstname,lastname,degree_id',
                'rater:id,firstname,lastname',
            ])
            ->orderByDesc('rated_at')
	    ->orderByDesc('id');

        if ($request->filled('student_id')) $q->where('student_id', $request->integer('student_id'));
        if ($request->filled('term'))       $q->where('term', $request->string('term'));
        if ($request->filled('rater_role')) $q->where('rater_role', $request->string('rater_role'));
	if ($request->filled('period')) $q->where('period', $request->string('period')); // YYYY-MM

        return response()->json($q->paginate(20));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:users,id'],
            'term'       => ['required', 'string', 'max:10'],
            'stars'      => ['required', 'integer', 'min:1', 'max:5'],
            'rated_at'   => ['nullable', 'date'],
            'comment'    => ['nullable', 'string'],
        ]);

        // admin rating is separate (rater_role = admin)
       
	$period = $request->filled('rated_at')
    	? \Carbon\Carbon::parse($data['rated_at'])->format('Y-m')
    	: now()->format('Y-m');

	$rating = StudentRating::updateOrCreate(
    	[
        'student_id' => $data['student_id'],
        'rater_id'   => $request->user()->id,
        'rater_role' => 'teacher',
        'term'       => $data['term'],
        'period'     => $period,
    	],
    	[
        'stars'    => $data['stars'],
        'rated_at' => $data['rated_at'] ?? now()->toDateString(),
        'comment'  => $data['comment'] ?? null,
    	]
	);

	return response()->json($rating->fresh()->load([
    	'student:id,firstname,lastname,degree_id',
    	'rater:id,firstname,lastname',
	]), 200);
    }

    public function update(Request $request, StudentRating $rating)
    {
        // admin can edit any rating, or if you want only admin ratings, enforce:
        // abort_unless($rating->rater_role === 'admin', 403);

        $data = $request->validate([
            'stars'    => ['sometimes', 'integer', 'min:1', 'max:5'],
            'rated_at' => ['nullable', 'date'],
            'comment'  => ['nullable', 'string'],
        ]);

        $rating->update($data);

        return response()->json($rating->fresh()->load([
            'student:id,firstname,lastname,degree_id',
            'rater:id,firstname,lastname',
        ]));
    }

    public function destroy(StudentRating $rating)
    {
        $rating->delete();
        return response()->json(['ok' => true]);
    }
}
