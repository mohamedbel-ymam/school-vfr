<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class TeacherStudentController extends Controller
{
    public function byDegree(Request $request)
    {
        $degreeId = $request->degree_id;

        if (!$degreeId) {
            return response()->json(['message' => 'degree_id manquant'], 422);
        }

        // Only students
        $students = User::whereHas('roles', fn($q) => $q->where('name', 'student'))
            ->where('degree_id', $degreeId)
            ->select('id', 'firstname', 'lastname')
            ->orderBy('firstname')
            ->get();

        return response()->json($students);
    }
}

