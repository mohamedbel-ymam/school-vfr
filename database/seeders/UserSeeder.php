<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Degree;
use App\Enums\UserRole;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Make sure Spatie uses a clean cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // --- Roles ------------------------------------------------------
        $guard = config('auth.defaults.guard', 'web');
        foreach (['admin','teacher','student','parent'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => $guard]);
        }

        // --- Ensure at least one degree exists --------------------------
        $degree = Degree::query()->first();
        if (!$degree) {
            $payload = ['name' => 'General Studies'];
            if (Schema::hasColumn('degrees', 'description')) $payload['description'] = 'Default degree';
            if (Schema::hasColumn('degrees', 'code'))        $payload['code']        = 'GEN';
            $degree = Degree::create($payload);
        }

        // Helper to create/update a user safely (column-name agnostic)
        $mkAdmin = function (string $first, string $last, string $email) use ($degree) {
            $attrs = [
                'email'    => $email,
                'password' => Hash::make('123456789'),
            ];

            // Name columns (whichever your schema uses)
            if (Schema::hasColumn('users', 'firstname'))  $attrs['firstname']  = $first;
            if (Schema::hasColumn('users', 'lastname'))   $attrs['lastname']   = $last;
            if (Schema::hasColumn('users', 'first_name')) $attrs['first_name'] = $first;
            if (Schema::hasColumn('users', 'last_name'))  $attrs['last_name']  = $last;
            if (
                (Schema::hasColumn('users', 'name'))
                && !isset($attrs['firstname']) && !isset($attrs['first_name'])
                && !isset($attrs['lastname'])  && !isset($attrs['last_name'])
            ) {
                $attrs['name'] = "$first $last";
            }

            // Degree (use existing degree id if column exists)
            if (Schema::hasColumn('users', 'degree_id')) {
                // If your column is NOT nullable, this prevents an insert failure.
                $attrs['degree_id'] = $degree->id;
            }

            // Role column in your users table (enum or string)
            if (Schema::hasColumn('users', 'role')) {
                // Backed enum value if you use App\Enums\UserRole
                $attrs['role'] = UserRole::ADMIN->value ?? 'admin';
            }

            if (Schema::hasColumn('users', 'email_verified_at')) {
                $attrs['email_verified_at'] = now();
            }
            if (Schema::hasColumn('users', 'remember_token')) {
                $attrs['remember_token'] = Str::random(10);
            }

            // Upsert without mass-assignment headaches
            $u = User::firstOrNew(['email' => $email]);
            $u->forceFill($attrs)->save();

            // Spatie role binding
            $u->syncRoles(['admin']);

            return $u->fresh();
        };

        DB::transaction(function () use ($mkAdmin) {
            $mkAdmin('Youssra', 'Yassir', 'youssrayassir@takwa.com');
            $mkAdmin('Zineb', 'El hounaini', 'zinebelhounaini@takwa.com');
        });
    }
}
