<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;

class AdminUserCrudController extends Controller
{
    /**
     * GET /api/admin/users/admins
     * Paginated list of admin users only.
     */
    public function index(Request $r)
    {
        $perPage = (int) $r->query('per_page', 15);
        $perPage = max(1, min($perPage, 200));

        // Try Spatie scope; fall back to role column.
        try {
            $query = User::role('admin');
        } catch (\Throwable $e) {
            $query = User::query()->where('role', 'admin');
        }

        // Optional search (?q=)
        if ($r->filled('q')) {
            $q = trim((string) $r->query('q', ''));
            $query->where(function ($sub) use ($q) {
                $sub->where('firstname', 'like', "%{$q}%")
                    ->orWhere('lastname', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $query->orderByDesc('id');
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }

    /**
     * POST /api/admin/users
     * Create a new admin user.
     */
    public function store(Request $r)
    {
        $data = $r->validate([
            'firstname' => ['required','string','max:100'],
            'lastname'  => ['required','string','max:100'],
            'email'     => ['required','email','max:190','unique:users,email'],
            'password'  => ['required','string','min:8'],
        ]);

        $user = User::create([
            'firstname' => $data['firstname'],
            'lastname'  => $data['lastname'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            // If you also use a "role" column, uncomment:
            // 'role'       => 'admin',
        ]);

        $this->ensureAdminRole($user);

        return response()->json(['data' => $user], 201);
    }

    /**
     * GET /api/admin/users/{user}
     */
    public function show(User $user)
    {
        return response()->json(['data' => $user]);
    }

    /**
     * PUT/PATCH /api/admin/users/{user}
     * Update basic fields; keep admin role.
     */
    public function update(Request $r, User $user)
    {
        $data = $r->validate([
            'firstname' => ['sometimes','required','string','max:100'],
            'lastname'  => ['sometimes','required','string','max:100'],
            'email'     => [
                'sometimes','required','email','max:190',
                Rule::unique('users','email')->ignore($user->id),
            ],
            'password'  => ['sometimes','nullable','string','min:8'],
        ]);

        if (\array_key_exists('firstname', $data)) $user->firstname = $data['firstname'];
        if (\array_key_exists('lastname',  $data)) $user->lastname  = $data['lastname'];
        if (\array_key_exists('email',     $data)) $user->email     = $data['email'];

        if (\array_key_exists('password', $data)) {
            // Only change if not empty
            if (!empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }
        }

        $user->save();

        // Ensure / keep admin role
        $this->ensureAdminRole($user);

        return response()->json(['data' => $user]);
    }

    /**
     * DELETE /api/admin/users/{user}
     */
    public function destroy(User $user)
    {
        // (Optional) prevent deleting yourself:
        // if (auth()->id() === $user->id) {
        //     return response()->json(['message' => "Vous ne pouvez pas supprimer votre propre compte."], 422);
        // }

        $user->delete();
        return response()->noContent();
    }

    /**
     * Ensure the "admin" role is assigned if Spatie is installed.
     */
    private function ensureAdminRole(User $user): void
    {
        if (method_exists($user, 'assignRole')) {
            try {
                if (method_exists($user, 'hasRole')) {
                    if (!$user->hasRole('admin')) {
                        $user->assignRole('admin');
                    }
                } else {
                    $user->assignRole('admin');
                }
            } catch (\Throwable $e) {
                // silently ignore if roles not configured
            }
        }

        // If you also keep a "role" column, you can force it too:
        // if (Schema::hasColumn($user->getTable(), 'role') && $user->role !== 'admin') {
        //     $user->forceFill(['role' => 'admin'])->save();
        // }
    }
}
