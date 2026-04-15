<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\User;
use Illuminate\Http\Request;

class ChildGradesController extends Controller
{
    public function __invoke(Request $request, User $child)
    {
        $parent = $request->user();

        // IMPORTANT: adjust this to your real parent-child relation
        if (!method_exists($parent, 'children') || !$parent->children()->whereKey($child->id)->exists()) {
            abort(403, 'Not your child.');
        }

        $grades = Grade::query()
            ->where('student_id', $child->id)
            ->with(['subject:id,name', 'teacher:id,name'])
            ->latest()
            ->get()
            ->groupBy(fn($g) => $g->subject->name);

        return response()->json([
            'child' => ['id' => $child->id, 'name' => $child->name],
            'grades_by_subject' => $grades,
        ]);
    }
}
