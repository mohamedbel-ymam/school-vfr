<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ParentApiController extends Controller
{
    public function children(Request $req)
    {
        // assumes a hasMany/belongsToMany relation `children()` on User
        $children = $req->user()->children()
            ->select('id', 'firstname', 'lastname')
            ->orderBy('firstname')
            ->get();

        return response()->json(['data' => $children]);
    }

    public function timetable(Request $req)
    {
        return response()->json([
            'data' => [
                'timetable' => ['title' => 'Emploi du temps enfant'],
                'lessons'   => [],
            ]
        ]);
    }

    public function notifications(Request $req)
    {
        return response()->json(['data' => []]);
    }
}
