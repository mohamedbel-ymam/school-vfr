<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminNotificationController extends Controller
{
    /**
     * GET /admin/notifications
     * Returns grouped broadcasts (one row per broadcast_id)
     */
    public function index(Request $r)
    {
        $page    = max(1, (int) $r->integer('page', 1));
        $perPage = min(50, max(5, (int) $r->integer('per_page', 10)));
        $q       = trim((string) $r->query('q', ''));

        // MySQL JSON extraction for grouping/selection
        $selBroadcastId = DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.broadcast_id')) AS broadcast_id");
        $selTitle       = DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.title')) AS title");
        $selMessage     = DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.message')) AS message");
        $selAudience    = DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.audience')) AS audience");
        $selDegreeId    = DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.degree_id')) AS degree_id");

        $base = DB::table('notifications')
            ->select([
                $selBroadcastId,
                $selTitle,
                $selMessage,
                $selAudience,
                $selDegreeId,
                DB::raw('COUNT(*) AS sent_count'),
                DB::raw('SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread_count'),
                DB::raw('MIN(created_at) AS created_at'),
            ])
            ->whereNotNull(DB::raw("JSON_EXTRACT(data, '$.broadcast_id')"))
            ->where('notifiable_type', '=', User::class)
            ->groupBy('broadcast_id', 'title', 'message', 'audience', 'degree_id')
            ->orderByDesc('created_at');

        if ($q !== '') {
            $base->havingRaw('(title LIKE ? OR message LIKE ?)', ["%{$q}%", "%{$q}%"]);
        }

        $paginator = $base->paginate($perPage, ['*'], 'page', $page);

        // degree name map (optional)
        $degrees = DB::table('degrees')->pluck('name', 'id')->all();

        $items = collect($paginator->items())->map(function ($row) use ($degrees) {
            $degId = is_numeric($row->degree_id ?? null) ? (int) $row->degree_id : null;
            return [
                'id'           => $row->broadcast_id,   // used by frontend delete
                'title'        => $row->title,
                'message'      => $row->message,
                'audience'     => $row->audience,
                'degree_id'    => $degId,
                'degree_name'  => $degId ? ($degrees[$degId] ?? null) : null,
                'sent_count'   => (int) $row->sent_count,
                'unread_count' => (int) $row->unread_count,
                'created_at'   => $row->created_at,
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
        ]);
    }

    /**
     * DELETE /admin/notifications/{broadcastId}
     * Deletes all rows that belong to that broadcast_id (all recipients).
     */
    public function destroy(string $broadcastId)
    {
        $deleted = DB::table('notifications')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.broadcast_id')) = ?", [$broadcastId])
            ->delete();

        return response()->json(['ok' => true, 'deleted' => $deleted]);
    }
}
