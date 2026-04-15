<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * Query params:
     *   - page (int, default 1)
     *   - per_page (int, 5..50, default 15)
     *   - unread (bool) -> only unread if true
     */
    public function index(Request $r)
    {
        $user = $r->user();
        $q = $user->notifications()->latest();

        if ($r->boolean('unread')) {
            $q->whereNull('read_at');
        }

        $page    = max(1, (int) $r->integer('page', 1));
        $perPage = min(50, max(5, (int) $r->integer('per_page', 15)));

        $paginator = $q->paginate($perPage, ['*'], 'page', $page);

        // Normalize items for the frontend
        $items = collect($paginator->items())->map(function (DatabaseNotification $n) {
            $data = $n->data ?? [];
            return [
                'id'          => $n->id,
                'title'       => $data['title']   ?? '',
                'message'     => $data['message'] ?? '',
                'meta'        => [
                    'broadcast_id' => $data['broadcast_id'] ?? null,
                    'audience'     => $data['audience']     ?? null,
                    'degree_id'    => $data['degree_id']    ?? null,
                    'user_id'      => $data['user_id']      ?? null,
                    'user_ids'     => $data['user_ids']     ?? [],
                    'sent_by'      => $data['sent_by']      ?? null,
                    'channels'     => $data['channels']     ?? ['database'],
                ],
                'read_at'     => $n->read_at,
                'created_at'  => $n->created_at,
            ];
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * POST /api/notifications/{id}/read
     * Marks a single notification as read.
     */
    public function markRead(Request $r, string $id)
    {
        /** @var DatabaseNotification $n */
        $n = $r->user()->notifications()->whereKey($id)->firstOrFail();
        if (is_null($n->read_at)) {
            $n->markAsRead();
        }
        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/notifications/read-all
     * Marks all unread notifications as read for the current user.
     */
    public function markAllRead(Request $r)
    {
        $r->user()->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }

    /**
     * DELETE /api/notifications/{id}
     * (Optional) Allow a user to remove a single notification from their inbox.
     * Add the route only if you want this capability.
     */
    public function destroy(Request $r, string $id)
    {
        $deleted = $r->user()
            ->notifications()
            ->whereKey($id)
            ->delete();

        return response()->json(['ok' => true, 'deleted' => $deleted]);
    }
}

