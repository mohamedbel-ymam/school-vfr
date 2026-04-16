<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TeacherSubjectController extends Controller
{
    public function __invoke(Request $request)
    {
        $u = $request->user()->load('subject:id,name,code');

        return response()->json([
            'data' => $u->subject ? [
                'id'   => $u->subject->id,
                'name' => $u->subject->name,
                'code' => $u->subject->code,
            ] : null,
            'subject_id' => $u->subject_id,
        ]);
    }
}
