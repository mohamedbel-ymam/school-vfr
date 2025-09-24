<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $r)
    {
        $user = $r->user();
        $q = $user->notifications()->latest();

        if ($r->boolean('unread')) {
            $q->whereNull('read_at');
        }

        $page = (int) $r->integer('page', 1);
        $perPage = min(50, max(5, (int) $r->integer('per_page', 15)));
        $paginator = $q->paginate($perPage, ['*'], 'page', $page);

        // Normalize payload (for frontend)
        $items = collect($paginator->items())->map(function ($n) {
            return [
                'id'        => $n->id,
                'title'     => $n->data['title'] ?? '',
                'message'   => $n->data['message'] ?? '',
                'meta'      => $n->data['meta'] ?? [],
                'read_at'   => $n->read_at,
                'created_at'=> $n->created_at,
            ];
        });

        return response()->json([
            'data' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function markRead(Request $r, string $id)
    {
        $n = $r->user()->notifications()->whereKey($id)->firstOrFail();
        if (!$n->read_at) $n->markAsRead();
        return response()->json(['ok'=>true]);
    }

    public function markAllRead(Request $r)
    {
        $r->user()->unreadNotifications->markAsRead();
        return response()->json(['ok'=>true]);
    }
}
