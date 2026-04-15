<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MyAvatarController extends Controller
{
    public function show(Request $request)
    {
        $u = $request->user();

        return response()->json([
            'data' => [
                'status' => $u->avatar_status,
                'avatar_url' => $u->avatar_url ? Storage::disk('public')->url($u->avatar_url) : null,
                'avatar_pending_url' => $u->avatar_pending_url ? Storage::disk('public')->url($u->avatar_pending_url) : null,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $u = $request->user();

        $data = $request->validate([
            'avatar' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'], // 4MB
        ]);

        // delete old pending if exists
        if ($u->avatar_pending_url) {
            Storage::disk('public')->delete($u->avatar_pending_url);
        }

        $path = $data['avatar']->store("avatars/pending/{$u->id}", 'public');

        $u->forceFill([
            'avatar_pending_url' => $path,
            'avatar_status' => 'pending',
            'avatar_reviewed_at' => null,
            'avatar_reviewed_by' => null,
        ])->save();

        return response()->json([
            'message' => 'Photo envoyée. En attente de validation.',
            'data' => [
                'status' => $u->avatar_status,
                'avatar_pending_url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }
}
