<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\AdminBroadcast;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationBroadcastController extends Controller
{
    public function store(Request $req)
    {
        // Accept both flat body and { payload: {...} }
        $raw = $req->input('payload', $req->all());

        $rules = [
            'audience'   => ['required', Rule::in([
                'all_students','all_teachers','all_parents','degree_students','user','users'
            ])],
            'title'      => ['required','string','max:150'],
            'message'    => ['required','string'],
            'content'    => ['sometimes','string'],
            'channels'   => ['sometimes','array'],
            'channels.*' => [Rule::in(['database','mail'])],

            'degree_id'  => ['sometimes','nullable','integer','exists:degrees,id'],
            'user_id'    => ['sometimes','nullable','integer','exists:users,id'],
            'user_ids'   => ['sometimes','array'],
            'user_ids.*' => ['integer','exists:users,id'],
        ];

        // Validate explicitly against the array
        $data = validator($raw, $rules)->validate();

        $audience = $data['audience'];
        $title    = $data['title'];
        $message  = $data['message'] ?? ($data['content'] ?? '');
        $channels = !empty($data['channels']) ? $data['channels'] : ['database']; // kept for future via()

        // Per-audience guards
        if ($audience === 'degree_students' && empty($data['degree_id'])) {
            return response()->json(['message' => 'degree_id est requis pour degree_students.'], 422);
        }
        if ($audience === 'user' && empty($data['user_id'])) {
            return response()->json(['message' => 'user_id est requis pour user.'], 422);
        }
        if ($audience === 'users' && empty($data['user_ids'])) {
            return response()->json(['message' => 'user_ids est requis pour users.'], 422);
        }

        // Role aliases (column or Spatie)
        $ROLE_ALIASES = [
            'student' => ['student','élève','eleve','etudiant','étudiant'],
            'teacher' => ['teacher','enseignant','prof','professeur'],
            'parent'  => ['parent'],
            'admin'   => ['admin','administrateur','administrator'],
        ];

        // Helper to OR-match a canonical role against column OR spatie roles
        $applyRole = function ($q, string $key) use ($ROLE_ALIASES) {
            $aliases = $ROLE_ALIASES[$key] ?? [$key];
            $q->where(function ($qq) use ($aliases) {
                $qq->whereIn('role', $aliases)
                   ->orWhereHas('roles', function ($qr) use ($aliases) {
                       $qr->whereIn('name', $aliases);
                   });
            });
        };

        // Build recipients query
        $q = User::query();

        $roleMap = [
            'all_students' => ['student'],
            'all_teachers' => ['teacher'],
            'all_parents'  => ['parent'],
        ];

        if (isset($roleMap[$audience])) {
            // OR across mapped roles (usually one)
            $q->where(function ($wrap) use ($roleMap, $audience, $applyRole) {
                foreach ($roleMap[$audience] as $canon) {
                    $wrap->orWhere(function ($qq) use ($applyRole, $canon) {
                        $applyRole($qq, $canon);
                    });
                }
            });
        }

        if ($audience === 'degree_students') {
            $q->where(function ($qq) use ($applyRole) {
                $applyRole($qq, 'student');
            })->where('degree_id', (int) $data['degree_id']);
        } elseif ($audience === 'user') {
            $q->where('id', (int) $data['user_id']);
        } elseif ($audience === 'users') {
            $q->whereIn('id', array_map('intval', $data['user_ids']));
        }

        $users = $q->get()->unique('id');
        if ($users->isEmpty()) {
            return response()->json(['message' => 'Aucun destinataire trouvé.'], 422);
        }

        // Notify — AdminBroadcast expects (title, message)
        foreach ($users as $u) {
            $u->notify(new AdminBroadcast($title, $message));
        }

        return response()->json([
            'ok'       => true,
            'count'    => $users->count(),
            'audience' => $audience,
            'channels' => $channels,
        ], 201);
    }
}
