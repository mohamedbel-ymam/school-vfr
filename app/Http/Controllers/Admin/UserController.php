<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Services\DegreeResolver;

class UserController extends Controller
{
    /** Map FR/aliases -> EN codes used by DB/Spatie */
    private function normalizeRole(?string $r): ?string
    {
        if ($r === null) return null;
        // strip NBSP + trim + lower
        $r = preg_replace('/\x{00A0}|\xC2\xA0/u', '', $r);
        $r = strtolower(trim((string)$r));

        return match ($r) {
            'élève', 'eleve'                 => 'student',
            'enseignant'                     => 'teacher',
            'administrateur','administrator' => 'admin',
            'parent', 'teacher', 'student', 'admin' => $r,
            default                          => $r, // sera rejeté plus loin
        };
    }

    /** GET /admin/users */
    public function index(Request $r, DegreeResolver $resolver)
    {
        $perPage = (int) $r->query('per_page', 15);
        $perPage = max(1, min($perPage, 200));

        $query = User::query()
            ->with([
                'subject:id,name',
                // 👇 inclure slug
                'degree:id,name,slug',
                'parentUser:id,firstname,lastname',
            ])
            ->select([
                'id','firstname','lastname','email',
                'role',
                'degree_id','subject_id','student_parent_id',
                'created_at','updated_at',
            ]);

        // Filtre: role (FR ou EN)
        if ($r->filled('role')) {
            $role = $this->normalizeRole((string)$r->query('role'));
            if (in_array($role, ['student','teacher','parent','admin'], true)) {
                $modelHasRoles = config('permission.table_names.model_has_roles', 'model_has_roles');
                // Si Spatie présent, utiliser scope role(), sinon colonne role
                if (Schema::hasTable($modelHasRoles)) {
                    try { $query->role($role); }
                    catch (\Throwable $e) { $query->where('role', $role); }
                } else {
                    $query->where('role', $role);
                }
            } else {
                // rôle invalide → résultat vide
                return response()->json([
                    'data' => [],
                    'meta' => ['current_page'=>1,'last_page'=>1,'per_page'=>$perPage,'total'=>0],
                ]);
            }
        }

        // Filtre: degree (id | slug | alias FR)
        if ($r->filled('degree')) {
            $degreeInput = $r->query('degree');
            $degreeId = $resolver->resolveToId($degreeInput);
            if ($degreeId) {
                $query->where('degree_id', $degreeId);
            } else {
                // invalide → résultat vide
                return response()->json([
                    'data' => [],
                    'meta' => ['current_page'=>1,'last_page'=>1,'per_page'=>$perPage,'total'=>0],
                ]);
            }
        }

        // Filtre de recherche (?q=)
        if ($r->filled('q')) {
            $q = trim((string)$r->query('q', ''));
            if ($q !== '') {
                $query->where(function ($sub) use ($q) {
                    $sub->where('firstname', 'like', "%{$q}%")
                        ->orWhere('lastname', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            }
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

    /** POST /admin/users */
    public function store(Request $r, DegreeResolver $resolver)
    {
        // Validation de base
        $data = $r->validate([
            'firstname'          => ['required','string','max:255'],
            'lastname'           => ['required','string','max:255'],
            'email'              => ['required','email','unique:users,email'],
            'password'           => ['required','string','min:8'],
            'role'               => ['required','string'],
            'address'            => ['nullable','string','max:255'],
            'phone'              => ['nullable','string','max:50'],
            'gender'             => ['nullable', Rule::in(['m','f'])],
            'blood_type'         => ['nullable','string','max:10'],
            'date_of_birth'      => ['nullable','date'],
            // On autorise l’entrée via degree_id (déjà validée) OU via degree/alias/slug
            'degree_id'          => ['nullable','exists:degrees,id'],
            'subject_id'         => ['nullable','exists:subjects,id'],
            'student_parent_id'  => ['nullable','exists:users,id'],
            // 'degree' non validable via Rule -> résolu plus bas (id|slug|alias)
        ]);

        // Rôle
        $data['role'] = $this->normalizeRole($data['role']);
        if (!in_array($data['role'], ['student','teacher','parent','admin'], true)) {
            return response()->json([
                'message' => "Rôle invalide. Utilisez: élève, enseignant, parent, admin.",
            ], 422);
        }

        // Degree: résoudre id|slug|alias si présent (priority: degree param > degree_id déjà donné)
        $degreeInput = $r->input('degree', null);
        if ($degreeInput !== null && $degreeInput !== '') {
            $resolvedId = $resolver->resolveToId($degreeInput);
            if (!$resolvedId) {
                return response()->json(['message' => 'Degree invalide (id/slug/alias).'], 422);
            }
            $data['degree_id'] = $resolvedId;
        }

        // Exigences spécifiques au rôle
        if ($data['role'] === 'teacher') {
            $r->validate(['subject_id' => ['required','exists:subjects,id']]);
        }
        if ($data['role'] === 'student') {
            $r->validate(['degree_id' => ['required','exists:degrees,id']]);
        }

        // Password hash
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data)->load([
            'subject:id,name',
            'degree:id,name,slug',
            'parentUser:id,firstname,lastname',
        ]);

        // Sync Spatie role si présent
        $modelHasRoles = config('permission.table_names.model_has_roles', 'model_has_roles');
        if (Schema::hasTable($modelHasRoles) && method_exists($user, 'syncRoles')) {
            try { $user->syncRoles([$data['role']]); } catch (\Throwable $e) {}
        }

        return response()->json(['data' => $user, 'message' => 'User created successfully'], 201);
    }

    /** GET /admin/users/{id} */
    public function show($id)
    {
        $user = User::with([
            'subject:id,name',
            'degree:id,name,slug',
            'parentUser:id,firstname,lastname',
        ])->findOrFail($id);

        return response()->json(['data' => $user]);
    }

    /** PUT/PATCH /admin/users/{id} */
    public function update(Request $r, $id, DegreeResolver $resolver)
    {
        $user = User::findOrFail($id);

        $data = $r->validate([
            'firstname'          => ['sometimes','string','max:255'],
            'lastname'           => ['sometimes','string','max:255'],
            'email'              => ['sometimes','email', Rule::unique('users','email')->ignore($user->id)],
            'password'           => ['sometimes','nullable','string','min:8'],
            'role'               => ['sometimes','string'],
            'address'            => ['nullable','string','max:255'],
            'phone'              => ['nullable','string','max:50'],
            'gender'             => ['nullable', Rule::in(['m','f'])],
            'blood_type'         => ['nullable','string','max:10'],
            'date_of_birth'      => ['nullable','date'],
            'degree_id'          => ['nullable','exists:degrees,id'],
            'subject_id'         => ['nullable','exists:subjects,id'],
            'student_parent_id'  => ['nullable','exists:users,id'],
            // 'degree' traité à part
        ]);

        // Role (si fourni)
        if (array_key_exists('role', $data)) {
            $data['role'] = $this->normalizeRole($data['role']);
            if (!in_array($data['role'], ['student','teacher','parent','admin'], true)) {
                return response()->json(['message' => 'Rôle invalide.'], 422);
            }
        }

        // Degree (si fourni via 'degree' id|slug|alias)
        if ($r->filled('degree')) {
            $resolvedId = $resolver->resolveToId($r->input('degree'));
            if (!$resolvedId) {
                return response()->json(['message' => 'Degree invalide (id/slug/alias).'], 422);
            }
            $data['degree_id'] = $resolvedId;
        }

        // Password hashing
        if (array_key_exists('password', $data)) {
            if (!empty($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            } else {
                unset($data['password']);
            }
        }

        // Rôle effectif (prend en compte le rôle actuel si non modifié)
        $effectiveRole = $data['role'] ?? (
            is_string($user->role) ? $user->role :
            (method_exists($user->role,'value') ? $user->role->value : (string)$user->role)
        );

        // Exigences par rôle au final
        if ($effectiveRole === 'teacher' && empty($data['subject_id']) && !$user->subject_id) {
            return response()->json(['errors' => ['subject_id' => ['Subject is required for teachers.']]], 422);
        }
        if ($effectiveRole === 'student' && array_key_exists('degree_id', $data) && empty($data['degree_id']) && !$user->degree_id) {
            return response()->json(['errors' => ['degree_id' => ['Degree is required for students.']]], 422);
        }

        $user->update($data);

        // Sync Spatie sur changement de rôle
        if (array_key_exists('role', $data)) {
            $modelHasRoles = config('permission.table_names.model_has_roles', 'model_has_roles');
            if (Schema::hasTable($modelHasRoles) && method_exists($user, 'syncRoles')) {
                try { $user->syncRoles([$data['role']]); } catch (\Throwable $e) {}
            }
        }

        $user->load(['subject:id,name','degree:id,name,slug','parentUser:id,firstname,lastname']);

        return response()->json([
            'data'    => $user,
            'message' => 'User updated successfully',
        ]);
    }

    /** DELETE /admin/users/{id} */
    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->noContent();
    }
}
