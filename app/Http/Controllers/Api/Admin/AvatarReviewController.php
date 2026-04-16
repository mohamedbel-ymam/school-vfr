<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AvatarReviewController extends Controller
{
    public function pending(Request $request)
{
    $perPage = max(1, min((int) $request->query('per_page', 20), 100));

    $q = User::query()
        ->where('role', 'student')
        ->whereNotNull('avatar_pending_url')
        ->where('avatar_pending_url', '!=', '')
        ->select(['id','firstname','lastname','degree_id','avatar_pending_url','avatar_status','created_at'])
        ->latest();

    $page = $q->paginate($perPage);

    $items = collect($page->items())->map(function ($u) {
        return [
            'id' => $u->id,
            'firstname' => $u->firstname,
            'lastname' => $u->lastname,
            'degree_id' => $u->degree_id,
            'status' => $u->avatar_status, // peut être null -> ok
            'avatar_pending_url' => $u->avatar_pending_url
                ? Storage::disk('public')->url($u->avatar_pending_url)
                : null,
        ];
    });

    return response()->json([
        'data' => $items,
        'meta' => [
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ],
    ]);
}
    public function approve(Request $request, User $student)
    {
        abort_unless($student->role === 'student', 404);
        abort_unless($student->avatar_status === 'pending' && $student->avatar_pending_url, 422);

        $pending = $student->avatar_pending_url;
        $ext = pathinfo($pending, PATHINFO_EXTENSION) ?: 'jpg';
        $approvedPath = "avatars/approved/{$student->id}/avatar." . $ext;

        // ensure directory + replace if exists
        Storage::disk('public')->delete($approvedPath);
        Storage::disk('public')->makeDirectory("avatars/approved/{$student->id}");

        // move pending -> approved
        Storage::disk('public')->move($pending, $approvedPath);

        $student->forceFill([
            'avatar_url' => $approvedPath,
            'avatar_pending_url' => null,
            'avatar_status' => 'approved',
            'avatar_reviewed_at' => now(),
            'avatar_reviewed_by' => $request->user()->id,
        ])->save();

        return response()->json([
            'message' => 'Photo approuvée.',
            'data' => [
                'avatar_url' => Storage::disk('public')->url($approvedPath),
            ],
        ]);
    }

    public function reject(Request $request, User $student)
    {
        abort_unless($student->role === 'student', 404);

        if ($student->avatar_pending_url) {
            Storage::disk('public')->delete($student->avatar_pending_url);
        }

        $student->forceFill([
            'avatar_pending_url' => null,
            'avatar_status' => 'rejected',
            'avatar_reviewed_at' => now(),
            'avatar_reviewed_by' => $request->user()->id,
        ])->save();

        return response()->json(['message' => 'Photo refusée.']);
    }

    public function remove(Request $request, User $student)
    {
        abort_unless($student->role === 'student', 404);

        if ($student->avatar_pending_url) Storage::disk('public')->delete($student->avatar_pending_url);
        if ($student->avatar_url) Storage::disk('public')->delete($student->avatar_url);

        $student->forceFill([
            'avatar_url' => null,
            'avatar_pending_url' => null,
            'avatar_status' => 'none',
            'avatar_reviewed_at' => now(),
            'avatar_reviewed_by' => $request->user()->id,
        ])->save();

        return response()->json(['message' => 'Photo supprimée.']);
    }
}

