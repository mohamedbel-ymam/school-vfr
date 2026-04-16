<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Models\User;
use App\Enums\UserRole;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Clear Spatie cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Ensure base roles exist
        $guard = config('auth.defaults.guard', 'web');
        foreach (['admin','teacher','student','parent'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => $guard]);
        }

        // ⚠️ Wipe ALL users and their role links so only the two admins remain
        $this->wipeUsers();

        // Create the two admins
        $this->mkAdmin('Youssra', 'Yassir', 'youssrayassir@takwa.com', '123456789');
        $this->mkAdmin('Zineb', 'El Hounaini', 'zinebelhounaini@takwa.com', '123456789');

        $this->command?->info('Seeded 2 admin users with password: 123456789');
    }

    /**
     * Hard-delete all users and detach role pivots.
     * Keeps Role/Permission tables intact.
     */
    private function wipeUsers(): void
    {
        // Detach role pivots first
        if (Schema::hasTable('model_has_roles')) {
            if ($this->usingMySQL()) {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                DB::table('model_has_roles')->truncate();
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            } else {
                DB::table('model_has_roles')->delete();
            }
        }

        // Now wipe users
        if ($this->usingMySQL()) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            DB::table('users')->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } else {
            DB::table('users')->delete();
        }
    }

    /**
     * Create one admin user, handling different name/role columns safely.
     */
    private function mkAdmin(string $first, string $last, string $email, string $plainPwd = '123456789'): User
    {
        $attrs = [
            'email'             => $email,
            'password'          => Hash::make($plainPwd),
        ];

        // Name columns detection
        if (Schema::hasColumn('users', 'firstname'))  $attrs['firstname']  = $first;
        if (Schema::hasColumn('users', 'lastname'))   $attrs['lastname']   = $last;
        if (Schema::hasColumn('users', 'first_name')) $attrs['first_name'] = $first;
        if (Schema::hasColumn('users', 'last_name'))  $attrs['last_name']  = $last;
        if (
            Schema::hasColumn('users', 'name') &&
            !isset($attrs['firstname']) && !isset($attrs['first_name']) &&
            !isset($attrs['lastname'])  && !isset($attrs['last_name'])
        ) {
            $attrs['name'] = "{$first} {$last}";
        }

        // Email verification / remember token (if columns exist)
        if (Schema::hasColumn('users', 'email_verified_at')) {
            $attrs['email_verified_at'] = now();
        }
        if (Schema::hasColumn('users', 'remember_token')) {
            $attrs['remember_token'] = Str::random(10);
        }

        // If your users table has a 'role' column (enum/string), set it to ADMIN
        if (Schema::hasColumn('users', 'role')) {
            // Use enum if available; fall back to string 'admin'
            $attrs['role'] = defined(UserRole::class.'::ADMIN')
                ? (UserRole::ADMIN->value ?? 'admin')
                : 'admin';
        }

        // If you have degree_id and it's NOT nullable, set it to null safely (or your default)
        if (Schema::hasColumn('users', 'degree_id')) {
            $attrs['degree_id'] = null; // change if you need a specific degree
        }

        // Create user
        $u = new User();
        $u->forceFill($attrs)->save();

        // Attach Spatie role
        $u->syncRoles(['admin']);

        return $u->fresh();
    }

    private function usingMySQL(): bool
    {
        return DB::getDriverName() === 'mysql';
    }
}

