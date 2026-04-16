<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function index()
    {
        $groups = Group::with(['degree', 'students', 'teachers'])->get();
        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'degree_id' => 'required|exists:degrees,id',
            'name'      => 'required|string|max:255',
            'slug'      => 'required|string|max:255|unique:groups,slug',
            'description' => 'nullable|string',
        ]);

        $group = Group::create($data);
        return response()->json($group, 201);
    }

    public function show(Group $group)
    {
        return response()->json($group->load(['degree', 'students', 'teachers']));
    }

    public function update(Request $request, Group $group)
    {
        $data = $request->validate([
            'degree_id' => 'required|exists:degrees,id',
            'name'      => 'required|string|max:255',
            'slug'      => 'required|string|max:255|unique:groups,slug,' . $group->id,
            'description' => 'nullable|string',
        ]);

        $group->update($data);
        return response()->json($group);
    }

    public function destroy(Group $group)
    {
        $group->delete();
        return response()->json(['success' => true]);
    }

    // 🔥 custom endpoint for assigning students
public function assign(Request $request, Group $group)
{
    $data = $request->validate([
        'student_id' => 'required|exists:users,id',
    ]);

    $student = User::findOrFail($data['student_id']);

    // 🔥 Remove student from ALL groups of the SAME degree
    $student->groups()
        ->where('degree_id', $group->degree_id)
        ->detach();

    // 🔥 Assign to the selected group
    $group->students()->attach($student->id, [
        'role' => 'student',
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Student assigned to group successfully.',
    ]);
}

}

