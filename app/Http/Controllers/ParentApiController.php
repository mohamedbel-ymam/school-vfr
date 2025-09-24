<?php


namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ParentApiController extends Controller
{
    public function children(Request $req) {
        // TODO: replace with your real relation
        // return response()->json(['data' => auth()->user()->children()->select('id','firstname','lastname','name')->get()]);
        return response()->json(['data' => []]); // placeholder so UI doesn’t 404
    }

    public function timetable(Request $req) {
        // TODO: implement real query; for now return empty lessons
        return response()->json(['data' => ['emploi du temps' => ['title' => 'Enfant Emploi du temps'], 'lessons' => []]]);
    }

    public function notifications(Request $req) {
        // from=teacher|admin
        return response()->json(['data' => []]); // placeholder
    }
}
