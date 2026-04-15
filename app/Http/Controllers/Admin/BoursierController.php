<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBoursierRequest;
use App\Http\Requests\UpdateBoursierRequest;
use App\Models\BoursierProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class BoursierController extends Controller
{
    /**
     * GET /api/admin/boursiers
     * Returns paginated list of boursier profiles + attached user.
     */
    public function index(Request $request)
    {
        $query = BoursierProfile::with('user')->latest();

        if ($search = $request->get('q')) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $perPage = (int) $request->get('per_page', 15);
        $perPage = $perPage > 0 ? $perPage : 15;

        return response()->json($query->paginate($perPage));
    }

    /**
     * POST /api/admin/boursiers
     * Create new boursier user + profile
     */
    public function store(StoreBoursierRequest $request)
{
    $data = $request->validated();

    [$user, $profile] = DB::transaction(function () use ($data) {
        $first = $data['first_name'] ?? $data['firstname'] ?? '';
        $last  = $data['last_name']  ?? $data['lastname']  ?? '';
        $full  = trim($data['name'] ?? trim($first . ' ' . $last));

        $user = User::create([
            'name'      => $full,
            'firstname' => $first ?: null,
            'lastname'  => $last ?: null,
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
        ]);

        $user->assignRole('boursier');

        $profile = BoursierProfile::create([
            'user_id'        => $user->id,
            'university'     => $data['university']     ?? null,
            'field_of_study' => $data['field_of_study'] ?? null,
            'start_year'     => $data['start_year']     ?? null,
            'duration_years' => $data['duration_years'] ?? 3,
            'status'         => 'active',
        ]);

        return [$user, $profile];
    });

    return response()->json(
        $profile->load('user'),
        201
    );
}


    /**
     * GET /api/admin/boursiers/{boursier}
     */
    public function show(BoursierProfile $boursier)
    {
        return response()->json(
            $boursier->load('user', 'disbursements')
        );
    }

    /**
     * PUT /api/admin/boursiers/{boursier}
     */
    public function update(UpdateBoursierRequest $request, BoursierProfile $boursier)
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $boursier) {
            $profileData = [
                'university'     => $data['university']     ?? $boursier->university,
                'field_of_study' => $data['field_of_study'] ?? $boursier->field_of_study,
                'start_year'     => $data['start_year']     ?? $boursier->start_year,
                'duration_years' => $data['duration_years'] ?? $boursier->duration_years,
                'status'         => $data['status']         ?? $boursier->status,
            ];
            $boursier->update($profileData);

            $user = $boursier->user;

            if (isset($data['name'])) {
                $user->name = $data['name'];
            }
            if (isset($data['email'])) {
                $user->email = $data['email'];
            }
            if (!empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            $user->save();
        });

        return response()->json($boursier->load('user'));
    }

    /**
     * DELETE /api/admin/boursiers/{boursier}
     * Deletes user and cascades profile + disbursements
     */
    public function destroy(BoursierProfile $boursier)
    {
        $user = $boursier->user;
        if ($user) {
            $user->delete();
        } else {
            $boursier->delete();
        }

        return response()->noContent();
    }
}

