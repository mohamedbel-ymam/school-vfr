<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Test;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TestMediaController extends Controller
{
    public function uploadImage(Request $request, Test $test)
    {
        // (optional) check that the auth user is the test owner
        if ($test->teacher_id !== auth()->id() && !auth()->user()->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'image' => 'required|image|max:4096', // 4MB max
        ]);

        $path = $request->file('image')->store("tests/{$test->id}", 'public');

        $url = Storage::disk('public')->url($path);

        return response()->json([
            'path' => $path,
            'url'  => $url,
        ]);
    }
}

