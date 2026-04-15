<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = ['admin', 'teacher', 'student', 'parent', 'boursier'];

        foreach ($roles as $roleName) {
            Role::findOrCreate($roleName, 'web'); // or 'sanctum' guard if you use API tokens
        }

        $this->command->info('Roles seeded: ' . implode(', ', $roles));
    }
}

