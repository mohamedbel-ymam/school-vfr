<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Models\Degree;
use App\Enums\UserRole;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // --- Roles (Spatie) -------------------------------------------------
        $guard = 'web';
        foreach (['admin','teacher','student','parent'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => $guard]);
        }


        // --- Ensure a degree exists (don’t assume a 'code' column) ----------
        $degree = Degree::query()->first();
        if (!$degree) {
            $payload = ['name' => 'General Studies'];
            if (Schema::hasColumn('degrees', 'description')) {
                $payload['description'] = 'Default degree';
            }
            if (Schema::hasColumn('degrees', 'code')) {
                $payload['code'] = 'GEN';
            }
            $degree = Degree::create($payload);
        }

        // Helper: upsert user by email and sync Spatie role
        $upsertUser = function (array $attrs, string $spatieRole) {
            /** @var \App\Models\User $u */
            $u = User::updateOrCreate(
                ['email' => $attrs['email']],
                array_merge([
                    'password'          => Hash::make('123456789'),
                    'email_verified_at' => now(),
                ], $attrs)
            );

            // keep your enum/string role column in sync
            if (array_key_exists('role', $attrs)) {
                $u->role = $attrs['role'];
                $u->save();
            }

            // Spatie roles for middleware: role:xxx
            $u->syncRoles([$spatieRole]);

            return $u->fresh();
        };

        // --- Seed accounts --------------------------------------------------
        // Student
        

        // Admin
        $user1 = $upsertUser([
            'firstname' => 'Youssra',
            'lastname'  => 'Yassir',
            'email'     => 'youssrayassir@takwa.com',
            'role'      => UserRole::ADMIN->value,
            'degree_id' => null,
        ], 'admin');
        $user2 = $upsertUser([
                    'firstname' => 'Zineb  ',
                    'lastname'  => 'El hounaini',
                    'email'     => 'zinebelhounaini@takwa.com',
                    'role'      => UserRole::ADMIN->value,
                    'degree_id' => null,
                ], 'admin');
        // Parent
        

        // Teacher
      
        // --- Link parent → child (HasMany/BelongsTo) -----------------------
        // Use the BelongsTo side to associate:
        
    }
}
